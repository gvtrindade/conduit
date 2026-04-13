import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    disableStaticImages: true,
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.1.9"]
};

export default nextConfig;