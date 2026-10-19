/**
 * Asistente del dashboard. Tres capas, de la más barata a la más cara:
 *  1) glosario y preguntas frecuentes, respondidas en el navegador con los datos reales (sin IA);
 *  2) pregunta libre → proxy seguro → modelo, con contexto acotado a los datos del dashboard;
 *  3) si el proxy no está configurado, solo responde (1).
 * Se mantiene montado aunque esté cerrado para conservar la conversación (ver VistaMapa).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon, Label } from "../../components/ui";
import { useMeta, useParcelas } from "../../data/hooks";
import type { Parcela } from "../../data/tipos";
import { asistenteDisponible, preguntarLLM, type MensajeApi } from "./api";
import { construirContexto } from "./contexto";
import { definicion, GLOSARIO, normalizar, type Ctx } from "./glosario";
import { responderLocal, SUGERENCIAS_GENERALES, SUGERENCIAS_PARCELA } from "./respuestas";
import "./asistente.css";

type Fuente = "glosario" | "datos" | "ia";
interface Msg { id: number; rol: "usuario" | "asistente" | "nota"; texto: string; fuente?: Fuente; error?: boolean }

const MAX_PREGUNTA = 500;
const MAX_PREGUNTAS_IA = 20;   // tope de cortesía por sesión; el límite real está en el proxy
const HISTORIAL_API = 6;
const ETIQUETA: Record<Fuente, string> = {
  glosario: "Respuesta del glosario del dashboard",
  datos: "Respuesta calculada con los datos del dashboard",
  ia: "Respuesta generada por IA con los datos del dashboard; verifica las cifras importantes",
};

export function Chat({ abierto, parcela, onCerrar }: { abierto: boolean; parcela: Parcela | null; onCerrar: () => void }) {
  const rParcelas = useParcelas(), rMeta = useMeta();
  const todas = useMemo(() => rParcelas.datos ?? [], [rParcelas.datos]);
  const meta = rMeta.datos ?? null;
  const delMunicipio = useMemo(() => (parcela ? todas.filter((x) => x.municipio === parcela.municipio) : []), [todas, parcela]);
  const ctx: Ctx = useMemo(() => ({ parcela, delMunicipio, todas, meta }), [parcela, delMunicipio, todas, meta]);

  const [vista, setVista] = useState<"chat" | "glosario">("chat");
  const [minimizado, setMinimizado] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nIA, setNIA] = useState(0);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);
  const prevRef = useRef<string | null>(null);
  const nextId = () => ++idRef.current;

  // Aviso en la conversación cuando cambia la parcela consultada.
  useEffect(() => {
    const id = parcela?.id ?? null;
    if (prevRef.current !== id && (prevRef.current !== null || id !== null)) {
      const nota = id && parcela ? `Ahora consultas la parcela ${id} (${parcela.municipio}).` : "Sin parcela seleccionada.";
      setMsgs((m) => (m.length === 0 ? m : [...m, { id: nextId(), rol: "nota", texto: nota }]));
    }
    prevRef.current = id;
  }, [parcela]);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [msgs, vista, minimizado, abierto]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function enviar(entrada: string) {
    const t = entrada.trim().slice(0, MAX_PREGUNTA);
    if (!t || enviando) return;
    setTexto("");
    const idU = nextId(), usuario: Msg = { id: idU, rol: "usuario", texto: t };

    const local = responderLocal(t, ctx);
    if (local) { setMsgs((m) => [...m, usuario, { id: nextId(), rol: "asistente", texto: local.texto, fuente: local.fuente }]); return; }

    const sinIA = !asistenteDisponible ? "No tengo una respuesta guardada para esa pregunta. Prueba con las preguntas sugeridas o consulta el glosario."
      : nIA >= MAX_PREGUNTAS_IA ? "Llegaste al límite de preguntas libres de esta sesión. Las preguntas sugeridas y el glosario siguen disponibles." : null;
    if (sinIA) { setMsgs((m) => [...m, usuario, { id: nextId(), rol: "asistente", texto: sinIA, error: true }]); return; }

    const idA = nextId();
    const historial: MensajeApi[] = [...msgs, usuario]
      .filter((m): m is Msg & { rol: "usuario" | "asistente" } => (m.rol === "usuario" || m.rol === "asistente") && !m.error && m.texto !== "")
      .slice(-HISTORIAL_API).map((m) => ({ rol: m.rol, texto: m.texto }));
    setMsgs((m) => [...m, usuario, { id: idA, rol: "asistente", texto: "", fuente: "ia" }]);
    setEnviando(true); setNIA((n) => n + 1);
    const ac = new AbortController(); abortRef.current = ac;
    const editar = (f: (x: Msg) => Msg) => setMsgs((m) => m.map((x) => (x.id === idA ? f(x) : x)));
    try {
      await preguntarLLM(historial, construirContexto(ctx), (tok) => editar((x) => ({ ...x, texto: x.texto + tok })), ac.signal);
      editar((x) => (x.texto ? x : { ...x, texto: "No recibí una respuesta. Intenta reformular la pregunta.", error: true, fuente: undefined }));
    } catch (e) {
      const motivo = e instanceof Error ? e.message : "";
      const aviso = ac.signal.aborted ? "Respuesta detenida."
        : motivo === "limite" ? "Se alcanzó el límite de uso del asistente. Intenta de nuevo en unos minutos."
        : "No pude conectar con el asistente. Las preguntas sugeridas y el glosario siguen disponibles.";
      editar((x) => (x.texto ? { ...x, texto: `${x.texto}\n\n[${aviso}]`, error: true } : { ...x, texto: aviso, error: true, fuente: undefined }));
    } finally { setEnviando(false); abortRef.current = null; }
  }

  function nueva() { abortRef.current?.abort(); setMsgs([]); setNIA(0); setEnviando(false); }

  if (!abierto) return null;
  const sugerencias = parcela ? SUGERENCIAS_PARCELA : SUGERENCIAS_GENERALES;

  return (
    <div className={`chat-panel${minimizado ? " min" : ""}`} role="dialog" aria-label="Asistente del dashboard">
      <div className="drawer-head">
        <div><Label>ASISTENTE DEL DASHBOARD</Label>
          <div className="chat-title">{parcela ? `Parcela ${parcela.id} · ${parcela.municipio}` : "Sin selección"}</div></div>
        <div className="chat-actions">
          <button type="button" className="icon-button" onClick={nueva} disabled={!msgs.length} aria-label="Nueva conversación" title="Nueva conversación">↺</button>
          <button type="button" className="icon-button" onClick={() => setMinimizado(!minimizado)} aria-expanded={!minimizado}
            aria-label={minimizado ? "Expandir asistente" : "Minimizar asistente"} title={minimizado ? "Expandir" : "Minimizar"}>{minimizado ? "▢" : "–"}</button>
          <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar asistente"><Icon name="close" /></button>
        </div>
      </div>

      {!minimizado && <>
        <div className="chat-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={vista === "chat"} className={vista === "chat" ? "on" : ""} onClick={() => setVista("chat")}>Preguntas</button>
          <button type="button" role="tab" aria-selected={vista === "glosario"} className={vista === "glosario" ? "on" : ""} onClick={() => setVista("glosario")}>Glosario</button>
        </div>

        {vista === "glosario" ? <Glosario ctx={ctx} /> : (
          <div className="chat-body" role="log" aria-live="polite">
            {msgs.length === 0 && <div className="bot-message">Puedo explicar cómo se calcula cada estimación, qué significan las variables y qué tan confiable es el modelo. Responde con los datos de este dashboard.</div>}
            {msgs.map((m) => m.rol === "nota" ? <div key={m.id} className="chat-note">{m.texto}</div> : (
              <div key={m.id} className={m.rol === "usuario" ? "user-message" : `bot-message${m.error ? " error" : ""}`}>
                {m.texto || (enviando && m.fuente === "ia" ? <span className="typing">Pensando…</span> : null)}
                {m.rol === "asistente" && m.fuente && m.texto && <div className="msg-source">{ETIQUETA[m.fuente]}</div>}
              </div>
            ))}
            <div ref={finRef} />
          </div>
        )}

        {vista === "chat" && (
          <div className="chips chips-fijos" aria-label="Preguntas útiles">
            {sugerencias.map((s) => <button type="button" key={s} disabled={enviando} onClick={() => void enviar(s)}>{s}</button>)}
          </div>
        )}

        <form className="chat-input" onSubmit={(e: FormEvent) => { e.preventDefault(); void enviar(texto); }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX_PREGUNTA} disabled={enviando}
            placeholder="Escribe una pregunta…" aria-label="Pregunta" />
          {enviando
            ? <button type="button" className="stop" onClick={() => abortRef.current?.abort()} aria-label="Detener respuesta" title="Detener">■</button>
            : <button type="submit" disabled={!texto.trim()} aria-label="Enviar"><Icon name="arrow" /></button>}
        </form>
        <div className="chat-warning">
          Responde solo con datos de este dashboard; no sustituye una asesoría agronómica.
          {!asistenteDisponible && " (Asistente con IA no configurado: solo responde preguntas guardadas.)"}
        </div>
      </>}
    </div>
  );
}

function Glosario({ ctx }: { ctx: Ctx }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const n = normalizar(q);
    return GLOSARIO.filter((t) => !n || normalizar(t.termino).includes(n) || t.alias.some((a) => normalizar(a).includes(n)));
  }, [q]);
  return (
    <div className="chat-body glosario">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un término…" aria-label="Buscar en el glosario" />
      {lista.map((t) => <details key={t.id}><summary>{t.termino}</summary><p>{definicion(t, ctx)}</p></details>)}
      {lista.length === 0 && <p className="chat-note">Ningún término coincide.</p>}
    </div>
  );
}