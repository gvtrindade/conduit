"use client";

import type { Metadata } from "next";
import { Inter, Roboto_Mono, JetBrains_Mono, Inter_Tight } from "next/font/google";
import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import { SystemProvider } from "@/components/providers/SystemProvider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: "700",
});

// export const metadata: Metadata = {
//   title: "CONDUIT // Grocery Intelligence System",
//   description: "Grocery intelligence and receipt tracking system",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${jetbrainsMono.variable} ${interTight.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-hull text-cream scanlines">
        <SystemProvider>
          <ServiceWorkerRegister />
          <AppHeader />
          <div className="flex-1 flex flex-col pt-[34px] pb-[72px]">
            {children}
          </div>
          <BottomNav />
        </SystemProvider>
      </body>
    </html>
  );
}
