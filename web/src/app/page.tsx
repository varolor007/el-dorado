import { redirect } from "next/navigation";

// La portada llega en su punto (10.8). Mientras, la entrada lleva al mapa.
export default function Portada() {
  redirect("/plan");
}
