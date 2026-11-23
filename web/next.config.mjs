// La web de El Dorado. Lee la forma del viaje y el ritmo de la carpeta del agente (un nivel más arriba): por eso
// `externalDir`, y por eso la raíz de lo que se empaqueta es el repositorio y no esta carpeta. Las fotos que no son
// nuestras se sirven encogidas por aquí, para no bajar las originales.
import { join } from "node:path";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  outputFileTracingRoot: join(import.meta.dirname, ".."),
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.cupid.travel" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
  },
};

export default config;
