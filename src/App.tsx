import { useRuta } from "./app/ruta";
import { VistaMapa } from "./features/territorio/VistaMapa";
import { VistaSimulador } from "./features/simulador/VistaSimulador";

export default function App() {
  const [ruta, navegar] = useRuta();
  return ruta.vista === "simulador"
    ? <VistaSimulador ruta={ruta} navegar={navegar} />
    : <VistaMapa ruta={ruta} navegar={navegar} />;
}
