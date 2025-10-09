import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Abaikan semua error TypeScript saat build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
