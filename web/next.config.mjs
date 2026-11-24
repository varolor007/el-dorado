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
  // Nadie mete la web en un marco de otra página (para hacer pulsar un botón que gasta), ni adivina el tipo de lo
  // que se sirve, ni recibe de dónde viene quien sale por un enlace.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.cupid.travel" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
  },
};

export default config;
