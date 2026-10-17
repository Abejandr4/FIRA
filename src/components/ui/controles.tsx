import { useId, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Button({ children, onClick, variant = "secondary", className = "", title, disabled, ariaLabel }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  title?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button type="button" title={title} aria-label={ariaLabel} disabled={disabled}
      className={`button button--${variant} ${className}`} onClick={onClick}>{children}</button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

/** Tooltip accesible por hover y por teclado (el botón recibe foco y describe el contenido). */
export function Tooltip({ text, column, label = "Más información" }: { text: ReactNode; column?: string; label?: string }) {
  const id = useId();
  return (
    <span className="tooltip">
      <button type="button" className="icon-button info-button" aria-label={label} aria-describedby={id}>
        <Icon name="info" size={15} />
      </button>
      <span role="tooltip" id={id} className="tooltip__content">
        {text}{column && <small>Columna: {column}</small>}
      </span>
    </span>
  );
}

/** Control segmentado (Resultados/Explorador, Estimada/Ingresada). */
export function SegmentedControl<T extends string>({ value, options, onChange, small, label }: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  small?: boolean;
  label: string;
}) {
  return (
    <div className={`segmented ${small ? "small" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} className={value === o.value ? "active" : ""} aria-pressed={value === o.value}
          disabled={o.disabled} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Estado de carga: bloques grises del tamaño aproximado del contenido. */
export function Cargando({ lineas = 3, texto = "Cargando datos…" }: { lineas?: number; texto?: string }) {
  return (
    <div className="estado-carga" role="status" aria-live="polite">
      <span className="sr-only">{texto}</span>
      {Array.from({ length: lineas }, (_, i) => <i key={i} style={{ width: `${90 - i * 15}%` }} />)}
    </div>
  );
}

/** Estado de error de datos, con reintento. */
export function ErrorDatos({ error, onReintentar }: { error?: Error; onReintentar?: () => void }) {
  return (
    <div className="estado-error" role="alert">
      <Icon name="warning" size={17} />
      <div>
        <strong>No se pudieron cargar los datos</strong>
        <p>{error?.message ?? "Error desconocido."}</p>
        {onReintentar && <Button onClick={onReintentar}><Icon name="reset" size={15} /> Reintentar</Button>}
      </div>
    </div>
  );
}
