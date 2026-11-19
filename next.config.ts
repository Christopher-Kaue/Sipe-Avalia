import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // a planilha do SIPE tem ~1,5 MB; o padrão é 1 MB
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
