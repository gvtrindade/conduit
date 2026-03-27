import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
} from "@powersync/web";

/**
 * Pure function that resolves what connection action to take based on
 * the current session state. Extracted from the React component for
 * testability.
 *
 * - session exists + not connected → connect(connector)
 * - no session + connected → disconnectAndClear()
 * - no session + not connected → no-op
 * - session exists + already connected → no-op (don't re-connect)
 */
export function resolveConnectionEffect(
  db: AbstractPowerSyncDatabase,
  session: unknown,
  connector?: PowerSyncBackendConnector
): void {
  if (session && !db.connected && connector) {
    db.connect(connector);
  } else if (!session && db.connected) {
    db.disconnectAndClear();
  }
}
