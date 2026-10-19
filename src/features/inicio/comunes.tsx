/** Piezas compartidas por las secciones de la página de inicio. */
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../components/ui";
import { Revelar } from "./animacion";

export function Encabezado({ numero, eyebrow, titulo, children, icono }: {
  numero: string; eyebrow: string; titulo: ReactNode; children?: ReactNode; icono: IconName;
}) {
  return (
    <Revelar className="encabezado">
      <div className="encabezado__eyebrow"><span className="encabezado__icono"><Icon name={icono} size={16} /></span>{numero} · {eyebrow}</div>
      <h2 className="encabezado__titulo">{titulo}</h2>
      {children && <p className="encabezado__lead">{children}</p>}
    </Revelar>
  );
}

/** Tarjeta de gráfica: título, subtítulo, contenido y nota de fuente. */
export function Figura({ titulo, sub, fuente, children, className = "", acciones }: {
  titulo: ReactNode; sub?: ReactNode; fuente: string; children: ReactNode; className?: string; acciones?: ReactNode;
}) {
  return (
    <figure className={`figura ${className}`}>
      <figcaption className="figura__cabeza">
        <div><strong>{titulo}</strong>{sub && <span>{sub}</span>}</div>
        {acciones}
      </figcaption>
      {children}
      <div className="figura__fuente">Fuente: {fuente}</div>
    </figure>
  );
}

export function Leyenda({ items }: { items: { color: string; texto: ReactNode; forma?: "punto" | "linea" | "banda" }[] }) {
  return (
    <div className="leyenda">
      {items.map((it, i) => (
        <span key={i}><i className={`leyenda__marca leyenda__marca--${it.forma ?? "punto"}`} style={{ background: it.color }} />{it.texto}</span>
      ))}
    </div>
  );
}

/** Selector de dos o tres opciones (pestañas de una gráfica). */
export function Pestanas<T extends string>({ valor, opciones, onCambio, etiqueta }: {
  valor: T; opciones: { valor: T; texto: string }[]; onCambio: (v: T) => void; etiqueta: string;
}) {
  return (
    <div className="pestanas" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} className={valor === o.valor ? "on" : ""}
          onClick={() => onCambio(o.valor)}>{o.texto}</button>
      ))}
    </div>
  );
}

const ESTATUS: Record<string, { icono: IconName; clase: string }> = {
  REAL: { icono: "check", clase: "bueno" }, usado: { icono: "check", clase: "bueno" },
  ruido: { icono: "info", clase: "neutro" }, indirecto: { icono: "info", clase: "neutro" },
  peor: { icono: "x-circle", clase: "malo" }, descartado: { icono: "x-circle", clase: "malo" },
};
export function Estatus({ valor }: { valor: string }) {
  const e = ESTATUS[valor] ?? ESTATUS.ruido;
  return <span className={`estatus estatus--${e.clase}`}><Icon name={e.icono} size={13} />{valor}</span>;
}
