/**
 * Interruptor de tema claro/oscuro. Misma idea que el ThemeToggle con framer-motion, pero sin dependencias:
 * la perilla se desliza con una transición CSS con rebote (ver .tema-toggle en src/styles/tema.css).
 */

import { useTema } from "../../app/tema.ts";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const [tema, alternar] = useTema();
  const oscuro = tema === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      aria-label="Modo oscuro"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={alternar}
      className="tema-toggle"
    >
      <span className="tema-toggle__fondo" aria-hidden="true">
        <Icon name="sun" size={13} />
        <Icon name="moon" size={13} />
      </span>
      <span className="tema-toggle__perilla" aria-hidden="true">
        <Icon name={oscuro ? "moon" : "sun"} size={15} />
      </span>
    </button>
  );
}
