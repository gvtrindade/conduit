import type { Metadata } from "next";
import { Inter, Roboto_Mono, JetBrains_Mono, Inter_Tight } from "next/font/google";
import { metadata } from "./metadata";
import ClientLayout from "./client-layout";
import "./globals.css";

export { metadata } from "./metadata";

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

export const viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${jetbrainsMono.variable} ${interTight.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-hull text-cream scanlines">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
