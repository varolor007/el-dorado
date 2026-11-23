import { Cargando } from "../../../piezas/Cargando.tsx";

// Lo que se ve al instante al entrar en el mapa, mientras llega su código.
export default function CargandoElMapa() {
  return (
    <main className="app">
      <Cargando texto="El Dorado" />
    </main>
  );
}
