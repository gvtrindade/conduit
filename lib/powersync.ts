import { PowerSyncDatabase } from "@powersync/web";
import { conduitSchema } from "./powersync-schema";

export const db = new PowerSyncDatabase({
  schema: conduitSchema,
  database: {
    dbFilename: "conduit.db",
  },
});
