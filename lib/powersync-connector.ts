import type {
  PowerSyncBackendConnector,
  AbstractPowerSyncDatabase,
  PowerSyncCredentials,
} from "@powersync/web";

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const response = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const endpoint =
      process.env.NEXT_PUBLIC_POWERSYNC_URL || "http://localhost:3001";

    return {
      endpoint,
      token: data.token,
    };
  }

  async uploadData(_database: AbstractPowerSyncDatabase): Promise<void> {
    // No-op: reads-first approach, upload queue will sync later
  }
}
