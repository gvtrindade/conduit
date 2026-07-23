"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import { CallsignGuard } from "@/components/providers/CallsignGuard";
import { SystemProvider } from "@/components/providers/SystemProvider";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      <SystemProvider>
        <CallsignGuard>
          <AppHeader />
          <div className="flex-1 flex flex-col pt-[34px] pb-[72px]">{children}</div>
          <BottomNav />
        </CallsignGuard>
      </SystemProvider>
    </SerwistProvider>
  );
}
