"use client";

import { useEffect } from "react";
import { PowerSyncContext } from "@powersync/react";
import { useSession } from "@/lib/auth-client";
import { db } from "@/lib/powersync";
import { PowerSyncConnector } from "@/lib/powersync-connector";
import { resolveConnectionEffect } from "@/lib/powersync-connection";

const connector = new PowerSyncConnector();

export default function SystemProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  useEffect(() => {
    resolveConnectionEffect(db, session, connector);
  }, [session]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
