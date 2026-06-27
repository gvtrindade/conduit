import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    disableStaticImages: true,
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.1.10", "localhost"],
};

export default nextConfig;