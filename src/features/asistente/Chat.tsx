/**
 * Glosario del dashboard: términos del modelo y del simulador, con definiciones calculadas
 * con los datos reales cuando aplica (p. ej. la media general). Sin IA y sin chat.
 * Se abre con el botón flotante del mapa (ver VistaMapa).
 */
import { useMemo, useState } from "react";
import { Icon, Label } from "../../components/ui";
import { useMeta, useParcelas } from "../../data/hooks";
import type { Parcela } from "../../data/tipos";
import { definicion, GLOSARIO, normalizar, type Ctx } from "./glosario";
import "./asistente.css";

export function Chat({ abierto, parcela, onCerrar }: { abierto: boolean; parcela: Parcela | null; onCerrar: () => void }) {
  const rParcelas = useParcelas(), rMeta = useMeta();
  const todas = useMemo(() => rParcelas.datos ?? [], [rParcelas.datos]);
  const meta = rMeta.datos ?? null;
  const delMunicipio = useMemo(() => (parcela ? todas.filter((x) => x.municipio === parcela.municipio) : []), [todas, parcela]);
  const ctx: Ctx = useMemo(() => ({ parcela, delMunicipio, todas, meta }), [parcela, delMunicipio, todas, meta]);

  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const n = normalizar(q);
    return GLOSARIO.filter((t) => !n || normalizar(t.termino).includes(n) || t.alias.some((a) => normalizar(a).includes(n)));
  }, [q]);

  if (!abierto) return null;

  return (
    <div className="chat-panel" role="dialog" aria-label="Glosario del dashboard">
      <div className="drawer-head">
        <div><Label>GLOSARIO DEL DASHBOARD</Label>
          <div className="chat-title">Términos del modelo y del simulador</div></div>
        <div className="chat-actions">
          <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar glosario"><Icon name="close" /></button>
        </div>
      </div>

      <div className="chat-body glosario">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un término…" aria-label="Buscar en el glosario" />
        {lista.map((t) => <details key={t.id}><summary>{t.termino}</summary><p>{definicion(t, ctx)}</p></details>)}
        {lista.length === 0 && <p className="chat-note">Ningún término coincide.</p>}
      </div>

      <div className="chat-warning">Las definiciones usan los datos de este dashboard; no sustituyen una asesoría agronómica.</div>
    </div>
  );
}
