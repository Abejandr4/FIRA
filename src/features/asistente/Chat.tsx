/**
 * Asistente del dashboard.
 * TODO(asistente): definir cómo responde (reglas sobre los datos visibles, o un modelo con contexto
 * limitado a parcelas.json/meta.json). Debe responder solo con datos del dashboard.
 * Hoy reproduce la interacción de ejemplo del diseño.
 */
import { useState } from "react";
import type { Parcela } from "../../data/tipos";
import { Icon, Label } from "../../components/ui";
import "./asistente.css";

const SUGERENCIAS = ["¿Cómo se calculó esta estimación?", "¿Qué significa confianza baja?", "Compara con el municipio"];

export function Chat({ parcela, onCerrar }: { parcela: Parcela | null; onCerrar: () => void }) {
  const [pregunta, setPregunta] = useState<string | null>(null);
  return (
    <div className="chat-panel" role="dialog" aria-label="Asistente del dashboard">
      <div className="drawer-head"><div><Label>ASISTENTE DEL DASHBOARD</Label>
        <div className="chat-title">{parcela ? `Parcela ${parcela.id} · ${parcela.municipio}` : "Sin selección"}</div></div>
        <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar asistente"><Icon name="close" /></button></div>
      <div className="chat-body">
        {!pregunta ? <>
          <div className="bot-message">Puedo ayudarte a interpretar la estimación y las variables visibles.</div>
          <div className="chips">{SUGERENCIAS.map((x) => <button type="button" onClick={() => setPregunta(x)} key={x}>{x}</button>)}</div>
        </> : <>
          <div className="user-message">{pregunta}</div>
          <div className="bot-message">La estimación combina la referencia municipal, las parcelas vecinas y una corrección satelital pequeña. Consulta “Cómo se obtuvo” para ver cada componente.</div>
        </>}
      </div>
      <div className="chat-input"><input placeholder="Escribe una pregunta…" aria-label="Pregunta" /><button type="button" aria-label="Enviar"><Icon name="arrow" /></button></div>
      <div className="chat-warning">Responde solo con datos de este dashboard; no sustituye una asesoría agronómica.</div>
    </div>
  );
}
