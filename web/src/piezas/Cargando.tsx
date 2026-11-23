// La pantalla de carga: el sol de El Dorado, con su anillo, mientras el mapa se despliega. Tapa la pantalla desde el
// primer instante y se va, sin saltos, cuando el mapa ya se ha pintado.

export function Cargando({ texto, fuera }: { texto: string; fuera?: boolean }) {
  return (
    <div className="cargando" data-fuera={fuera ?? false} aria-hidden={fuera ?? false} role="status">
      <span className="cargando__sol" />
      <span className="cargando__texto">{texto}</span>
    </div>
  );
}
