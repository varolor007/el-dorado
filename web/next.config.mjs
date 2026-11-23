// La web de El Dorado. Lee la forma del viaje y el ritmo de la carpeta del agente (un nivel más arriba): por eso
// `externalDir`. Las fotos que no son nuestras se sirven encogidas por aquí, para no bajar las originales.
/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: { externalDir: true },
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
