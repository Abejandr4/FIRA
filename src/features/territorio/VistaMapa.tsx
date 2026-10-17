/**
 * Pantalla principal: mapa + panel derecho. Compone piezas de territorio, parcela y asistente.
 * Responsable: territorio. Las piezas de parcela/ y asistente/ las mantiene su responsable.
 */
import { useState } from "react";
import type { Ruta } from "../../app/ruta";
import { Topbar } from "../../components/layout/Topbar";
import { Icon, Label } from "../../components/ui";
import { useParcelas } from "../../data/hooks";
import { Chat } from "../asistente/Chat";
import { PanelDx } from "../parcela/PanelDx";
import { QueSiModelo } from "../parcela/QueSiModelo";
import { PanelRendimiento } from "../parcela/PanelRendimiento";
import { TarjetaParcela } from "../parcela/TarjetaParcela";
import { MapaEstudio } from "./MapaEstudio";
import { PanelTerritorial } from "./PanelTerritorial";
import "./territorio.css";

/** Parcela de ejemplo que abre el mapa esquemático mientras no exista el mapa real. */
const PARCELA_EJEMPLO = "AGC_011";

export function VistaMapa({ ruta, navegar }: { ruta: Extract<Ruta, { vista: "mapa" }>; navegar: (r: Ruta) => void }) {
  const parcelas = useParcelas();
  const [cajon, setCajon] = useState<"dx" | "quesi" | null>(null);
  const [chat, setChat] = useState(false);
  const parcela = parcelas.datos?.find((p) => p.id === ruta.parcela) ?? null;
  const estado = parcela?.estado ?? ruta.estado;
  const abrirSimulador = () => parcela && navegar({ vista: "simulador", parcela: parcela.id, pestana: "resultados" });

  return (
    <div className="app-shell">
      <Topbar ruta={ruta} navegar={navegar} parcelas={parcelas.datos} />
      <main className="workspace">
        <section className="map-area">
          <MapaEstudio estado={estado} parcelaSeleccionada={parcela?.id}
            onEstado={(e) => navegar({ vista: "mapa", estado: e })}
            onParcela={() => navegar({ vista: "mapa", parcela: PARCELA_EJEMPLO })} />
          <div className="map-controls">
            <button type="button" aria-label="Acercar">+</button><button type="button" aria-label="Alejar">−</button>
            <button type="button" aria-label="Capas"><Icon name="layers" size={17} /></button>
          </div>
          <div className="map-legend">
            <Label>RENDIMIENTO ESTIMADO</Label><div className="gradient-key" />
            {/* TODO(territorio): mínimo y máximo de `pred` */}
            <div><span>Bajo · XX,X t/ha</span><span>Alto · XX,X t/ha</span></div>
          </div>
          <div className="map-attribution">© CARTO · © OpenStreetMap</div>
          {!estado && <div className="map-hint"><Icon name="location" size={17} /> Selecciona un estado para explorar sus parcelas</div>}
          {ruta.parcela && parcelas.estado === "listo" && !parcela && (
            <div className="map-hint" role="alert"><Icon name="warning" size={17} /> No existe la parcela “{ruta.parcela}”</div>
          )}
          {parcela && <TarjetaParcela parcela={parcela} onDx={() => setCajon("dx")} onSimulador={abrirSimulador} />}
          {parcela && cajon === "dx" && <PanelDx parcela={parcela} onCerrar={() => setCajon(null)} />}
          {parcela && cajon === "quesi" && <QueSiModelo parcela={parcela} onCerrar={() => setCajon(null)} />}
          <button type="button" className="chat-fab" onClick={() => setChat(!chat)} aria-label="Abrir asistente" aria-expanded={chat}><Icon name="message" /></button>
          {chat && <Chat parcela={parcela} onCerrar={() => setChat(false)} />}
        </section>
        {parcela ? <PanelRendimiento parcela={parcela} onSimulador={abrirSimulador} onQueSi={() => setCajon("quesi")} /> : <PanelTerritorial />}
      </main>
    </div>
  );
}
