import { useRuta } from "./app/ruta";
import "./app/tema.ts"; // aplica el tema guardado antes del primer render
import { VistaInicio } from "./features/inicio/VistaInicio";
import { VistaMapa } from "./features/territorio/VistaMapa";
import { VistaSimulador } from "./features/simulador/VistaSimulador";

export default function App() {
  const [ruta, navegar] = useRuta();
  if (ruta.vista === "inicio") return <VistaInicio navegar={navegar} />;
  return ruta.vista === "simulador"
    ? <VistaSimulador ruta={ruta} navegar={navegar} />
    : <VistaMapa ruta={ruta} navegar={navegar} />;
}
