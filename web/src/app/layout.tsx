import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

// La letra de El Dorado: Fraunces, con su cursiva de mapa antiguo, para los lugares y los títulos; Inter para leer y
// JetBrains Mono para los números y las coordenadas, que son las de la familia de Cortex.
const titulos = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--f-titulos",
});
const texto = Inter({ subsets: ["latin"], variable: "--f-texto" });
const numeros = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-numeros" });

export const metadata: Metadata = {
  title: "El Dorado",
  description: "Your whole trip, researched live and drawn on the map, day by day, at the best price we can find.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Raiz({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${titulos.variable} ${texto.variable} ${numeros.variable}`}>
      <body>{children}</body>
    </html>
  );
}
