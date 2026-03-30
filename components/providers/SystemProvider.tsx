"use client";

import { AppSchema } from "@/lib/powersync/AppSchema";
import { Connector } from "@/lib/powersync/BackendConnector";
import { PowerSyncContext } from "@powersync/react";
import { PowerSyncDatabase, WASQLiteOpenFactory } from "@powersync/web";
import React, { Suspense } from "react";

const factory = new WASQLiteOpenFactory({
  dbFilename: "powersync.db",
  worker: "/@powersync/worker/WASQLiteDB.umd.js",
});

export const db = new PowerSyncDatabase({
  database: factory,
  schema: AppSchema,
  flags: {
    disableSSRWarning: true,
  },
  sync: {
    worker: "/@powersync/worker/SharedSyncImplementation.umd.js",
  },
});

const connector = new Connector();
db.connect(connector);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense>
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
};
