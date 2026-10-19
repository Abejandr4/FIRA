export interface MensajeApi { rol: "usuario" | "asistente"; texto: string }

const URL_ASISTENTE = import.meta.env.VITE_ASISTENTE_URL as string | undefined;
export const asistenteDisponible = Boolean(URL_ASISTENTE);

/** Llama al proxy y entrega los fragmentos de texto a medida que llegan. Errores: "limite", "http", "upstream". */
export async function preguntarLLM(mensajes: MensajeApi[], contexto: string, onToken: (t: string) => void, signal: AbortSignal) {
  if (!URL_ASISTENTE) throw new Error("sin_url");
  const r = await fetch(URL_ASISTENTE, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes, contexto }), signal,
  });
  if (r.status === 429) throw new Error("limite");
  if (!r.ok || !r.body) throw new Error("http");

  const lector = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await lector.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    const lineas = buf.split("\n");
    buf = lineas.pop() ?? "";
    for (const l of lineas) {
      const t = l.trim();
      if (!t.startsWith("data:")) continue;              // ignora comentarios del flujo (": ...")
      const d = t.slice(5).trim();
      if (d === "[DONE]") return;
      let j: { choices?: { delta?: { content?: string } }[]; error?: unknown };
      try { j = JSON.parse(d); } catch { continue; }
      if (j.error) throw new Error("upstream");
      const c = j.choices?.[0]?.delta?.content;
      if (c) onToken(c);
    }
  }
}