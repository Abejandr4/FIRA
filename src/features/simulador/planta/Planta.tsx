/**
 * Planta de la parcela: intenta la escena 3D (Three.js, carga diferida) y, si no hay WebGL o falla la carga,
 * usa la ilustración esquemática 2D. Ambas reciben el mismo EstadoPlanta.
 */
import { useEffect, useRef, useState } from "react";
import { estadoA3D } from "./puente";
import { PlantaEsquema } from "./PlantaEsquema";
import type { EstadoPlanta } from "./tipos";
import type { Escena3D } from "./escena3d";

export function Planta({ estado, etiqueta, reproduciendo = false, permitir3D = true }: {
  estado: EstadoPlanta;
  etiqueta: string;
  reproduciendo?: boolean;
  permitir3D?: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena3D | null>(null);
  const [modo, setModo] = useState<"3d" | "esquema">("esquema");
  const ultimo = useRef(estado);
  ultimo.current = estado;

  useEffect(() => {
    if (!permitir3D) return;
    let vivo = true;
    import("./escena3d")
      .then((m) => {
        if (!vivo || !contenedor.current || !m.soportaWebGL()) return;
        escena.current = m.crearEscena(contenedor.current);
        escena.current.actualizar(estadoA3D(ultimo.current));
        setModo("3d");
      })
      .catch((e) => console.info("Planta 3D no disponible; se usa el esquema 2D.", e));
    return () => { vivo = false; escena.current?.destruir(); escena.current = null; setModo("esquema"); };
  }, [permitir3D]);

  useEffect(() => { escena.current?.actualizar(estadoA3D(estado)); }, [estado]);

  return (
    <div className={`plant ${reproduciendo ? "plant--playing" : ""}`} data-modo={modo}>
      <div ref={contenedor} className="plant-3d" hidden={modo !== "3d"} />
      {modo === "esquema" && <PlantaEsquema estado={estado} />}
      <span className="plant-stage">{etiqueta}</span>
    </div>
  );
}
