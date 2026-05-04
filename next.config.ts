import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    disableStaticImages: true,
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.1.9", "localhost"],
};

export default withSerwist(nextConfig);