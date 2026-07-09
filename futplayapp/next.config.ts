import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["5b67724ae2feba.lhr.life", "televisions-loaded-quote-digit.trycloudflare.com", "*.trycloudflare.com"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;