import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["5b67724ae2feba.lhr.life", "televisions-loaded-quote-digit.trycloudflare.com", "*.trycloudflare.com"],
  // Fija la raíz del workspace: sin esto, Next la infiere mal cuando hay
  // otros lockfiles (ej. bun.lock) en carpetas superiores del usuario.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;