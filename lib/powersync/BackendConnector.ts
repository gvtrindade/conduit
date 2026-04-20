import type {
  PowerSyncBackendConnector,
  AbstractPowerSyncDatabase,
  PowerSyncCredentials,
} from "@powersync/web";
import { ALLOWED_TABLES } from "./AppSchema";
import { authClient } from "../auth-client";

export class Connector implements PowerSyncBackendConnector {
  private backendUrl: string;
  private powersyncUrl: string;
  private powersyncToken: string; // This token is for development only

  constructor() {
    this.backendUrl =
      process.env.NEXT_PUBLIC_PROJECT_URL || "https://localhost:3000";
    this.powersyncUrl =
      process.env.NEXT_PUBLIC_POWERSYNC_URL || "http://localhost:8080";
    this.powersyncToken = process.env.NEXT_PUBLIC_POWERSYNC_TOKEN || "changeme";
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data, error } = await authClient.token();

    if (error || !data) {
      throw new Error("Failed to fetch token");
    }

    return {
      endpoint: this.powersyncUrl,
      token: data.token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const operations = transaction.crud
        .filter((op) => ALLOWED_TABLES.has(op.table))
        .map((op) => ({
          id: op.id,
          op: op.op,
          table: op.table,
          opData: op.opData
            ? Object.fromEntries(
                Object.entries(op.opData).map(([k, v]) => [
                  k,
                  ["completed", "checked", "is_unknown"].includes(k)
                    ? Boolean(v)
                    : v,
                ]),
              )
            : undefined,
        }));

      if (operations.length > 0) {
        const res = await fetch(`${this.backendUrl}/api/powersync/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.powersyncToken}`,
          },
          body: JSON.stringify({ operations }),
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

        const result = await res.json();
        if (!result.success) {
          console.warn("Upload had errors:", result.error);
        }
      }

      await transaction.complete();
    } catch (ex) {
      throw ex;
    }
  }
}
