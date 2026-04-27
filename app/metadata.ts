import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CONDUIT // Grocery Intelligence",
  description: "Receipt tracking and inventory management for household crews",
  manifest: "/manifest.webmanifest",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CONDUIT",
  },
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};