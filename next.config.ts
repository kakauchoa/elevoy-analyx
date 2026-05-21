import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "@hapi/boom"],
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
