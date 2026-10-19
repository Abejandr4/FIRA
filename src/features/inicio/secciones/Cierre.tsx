/**
 * 05 · Para qué sirve: uso en inclusión financiera (reporte, sección 6) y llamada a explorar el mapa.
 * Datos: meta.json y el resumen de parcelas.json.
 */
import { Icon, type IconName } from "../../../components/ui";
import type { MetaModelo } from "../../../data/tipos";
import { fechaLarga, num } from "../../../lib/formato";
import { Revelar } from "../animacion";
import { Encabezado } from "../comunes";
import type { Resumen } from "../datos";

export function Cierre({ res, meta, irMapa }: { res: Resumen; meta: MetaModelo; irMapa: () => void }) {
  const ton = meta.q80 * res.areaMedia;
  const usos: { icono: IconName; titulo: string; texto: string }[] = [
    { icono: "map", titulo: "Riesgo de crédito por zona",
      texto: `Ubica el nivel de rendimiento de cada zona con un error de ~${num(meta.cv_aleatorio.rmse, 1)} t/ha (${num((100 * meta.cv_aleatorio.rmse) / meta.media_general_entren, 0)} % de la media) para fijar montos y calendarios de pago.` },
    { icono: "coins", titulo: "Ingreso estimado con rango",
      texto: `Rendimiento × superficie × precio, siempre con el intervalo al 80 %. En una parcela de ${num(res.areaMedia, 1)} ha (la media), ± ${num(meta.q80, 2)} t/ha equivalen a ± ${num(ton, 1)} toneladas.` },
    { icono: "shield", titulo: "Seguros y visitas de campo",
      texto: "La estimación por zona y los intervalos ayudan a calibrar umbrales de pérdida y a priorizar qué parcelas verificar." },
  ];
  return (
    <section id="uso" className="seccion" aria-labelledby="uso-titulo">
      <div className="contenedor">
        <Encabezado numero="05" eyebrow="Para qué sirve" icono="bank" titulo={<span id="uso-titulo">Datos públicos al servicio del crédito agrícola</span>}>
          Un modelo honesto sobre sus límites es más útil para decidir sobre riesgo que uno que parece más preciso de lo que es.
        </Encabezado>
        <div className="tarjetas-3">
          {usos.map((u, i) => (
            <Revelar key={u.titulo} retraso={i * 110} className="tarjeta tarjeta--icono">
              <span className="tarjeta__icono"><Icon name={u.icono} size={22} /></span>
              <h3>{u.titulo}</h3>
              <p>{u.texto}</p>
            </Revelar>
          ))}
        </div>

        <Revelar efecto="zoom" className="cta">
          <div className="cta__texto">
            <span className="cta__icono"><Icon name="location" size={26} /></span>
            <div>
              <h3>Explora las {res.n} parcelas</h3>
              <p>Abre el mapa, elige una parcela y mira su estimación, su intervalo, la cascada del modelo, su curva de NDVI y el simulador biofísico.</p>
            </div>
          </div>
          <button type="button" className="boton boton--primario boton--grande" onClick={irMapa}>
            Abrir el mapa <Icon name="chevron" size={18} />
          </button>
        </Revelar>

        <footer className="pie">
          <span><Icon name="leaf" size={15} /> AgroCebada · Reto FIRA 2026</span>
          <span>Datos generados el {fechaLarga(meta.generado)} · {meta.fuente}</span>
          <span>Las cifras de comparación de variantes provienen del reporte técnico del equipo.</span>
        </footer>
      </div>
    </section>
  );
}
