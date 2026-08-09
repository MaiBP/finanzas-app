import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Evita "Cannot find module './vendor-chunks/motion-dom.js'" en producción:
  // el vendor-chunk splitting de Next para paquetes ESM/CJS duales de framer-motion
  // no siempre emite el chunk que el runtime del servidor luego intenta requerir.
  transpilePackages: ["framer-motion"],
};

export default nextConfig;
