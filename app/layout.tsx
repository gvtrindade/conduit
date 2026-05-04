"use client";

import type { Metadata } from "next";
import { Inter, Roboto_Mono, JetBrains_Mono, Inter_Tight } from "next/font/google";
import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import { SystemProvider } from "@/components/providers/SystemProvider";
import { SerwistProvider } from "./serwist";
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

const APP_NAME = "CONDUIT";
const APP_DEFAULT_TITLE = "CONDUIT // Grocery Intelligence System";
const APP_TITLE_TEMPLATE = "%s - CONDUIT";
const APP_DESCRIPTION = "Grocery intelligence and receipt tracking system";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${jetbrainsMono.variable} ${interTight.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-hull text-cream scanlines">
      <SystemProvider>
        <SerwistProvider swUrl="/serwist/sw.js">
          <AppHeader />
          <div className="flex-1 flex flex-col pt-[34px] pb-[72px]">
            {children}
          </div>
          <BottomNav />
        </SerwistProvider>
      </SystemProvider>
      </body>
    </html>
  );
}
