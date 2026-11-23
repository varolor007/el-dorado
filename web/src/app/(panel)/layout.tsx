import type { ReactNode } from "react";
import { Carril } from "../../piezas/Carril.tsx";

// El panel: lo que hay por dentro. El carril a un lado y, en el resto, la parte en la que estés.
export default function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="panel">
      <Carril />
      <div className="panel__cuerpo">{children}</div>
    </div>
  );
}
