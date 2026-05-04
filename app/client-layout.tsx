"use client";

import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import { SystemProvider } from "@/components/providers/SystemProvider";
import { SerwistProvider } from "./serwist";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SystemProvider>
      <SerwistProvider swUrl="/serwist/sw.js">
        <AppHeader />
        <div className="flex-1 flex flex-col pt-[34px] pb-[72px]">
          {children}
        </div>
        <BottomNav />
      </SerwistProvider>
    </SystemProvider>
  );
}
