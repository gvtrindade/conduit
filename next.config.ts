import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  images: {
    disableStaticImages: true,
  },
  turbopack: {},
  allowedDevOrigins: ["192.168.1.9", "localhost"],
};

const withSerwistConfig = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  scope: "/",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwistConfig(nextConfig);