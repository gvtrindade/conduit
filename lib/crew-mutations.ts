import type { DbUserCrew } from "./db-types";

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

function now(): string {
  return new Date().toISOString();
}

function normalizePair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string];
}

export async function sendCrewRequest(
  db: AbstractPowerSyncDatabase,
  myUserId: string,
  targetCallsign: string,
): Promise<DbUserCrew> {
  let targetResult = (await db.execute(
    "SELECT id FROM users WHERE callsign = ?",
    [targetCallsign],
  )) as {
    rows: {
      item: (idx: number) => { id: string };
      length: number;
    };
  };

  let targetId: string;

  if (targetResult.rows.length > 0) {
    targetId = targetResult.rows.item(0).id;
  } else {
    const res = await fetch(
      `/api/users/lookup?callsign=${encodeURIComponent(targetCallsign)}`,
    );
    if (!res.ok) throw new Error("User not found");
    const data = (await res.json()) as { id: string };
    targetId = data.id;
  }

  const [a, b] = normalizePair(myUserId, targetId);

  const existing = (await db.execute(
    "SELECT * FROM user_crew WHERE user_id_a = ? AND user_id_b = ?",
    [a, b],
  )) as {
    rows: {
      item: (idx: number) => DbUserCrew;
      length: number;
    };
  };

  if (existing.rows.length > 0) {
    const row = existing.rows.item(0);
    if (row.status === "rejected" && row.requested_by === myUserId) {
      throw new Error("You cannot retry this request");
    }
    if (row.status === "rejected" && row.requested_by === targetId) {
      const ts = now();
      await db.execute(
        "UPDATE user_crew SET status = 'pending', requested_by = ?, updated_at = ? WHERE id = ?",
        [myUserId, ts, row.id],
      );
      return { ...row, status: "pending" as const, requested_by: myUserId, updated_at: ts };
    }
    throw new Error("Request already exists");
  }

  const id = crypto.randomUUID();
  const ts = now();
  await db.execute(
    `INSERT INTO user_crew (id, user_id_a, user_id_b, status, requested_by, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
    [id, a, b, myUserId, ts, ts],
  );

  return {
    id,
    user_id_a: a,
    user_id_b: b,
    status: "pending" as const,
    requested_by: myUserId,
    created_at: ts,
    updated_at: ts,
  };
}

export async function acceptCrewRequest(
  db: AbstractPowerSyncDatabase,
  connectionUserIdA: string,
  connectionUserIdB: string,
): Promise<void> {
  const [a, b] = normalizePair(connectionUserIdA, connectionUserIdB);
  const result = (await db.execute(
    "SELECT id, status FROM user_crew WHERE user_id_a = ? AND user_id_b = ?",
    [a, b],
  )) as {
    rows: {
      item: (idx: number) => { id: string; status: string };
      length: number;
    };
  };

  if (!result.rows.length) throw new Error("Connection not found");
  if (result.rows.item(0).status !== "pending")
    throw new Error("Connection is not pending");

  await db.execute(
    "UPDATE user_crew SET status = 'accepted', updated_at = ? WHERE id = ?",
    [now(), result.rows.item(0).id],
  );
}

export async function rejectCrewRequest(
  db: AbstractPowerSyncDatabase,
  connectionUserIdA: string,
  connectionUserIdB: string,
): Promise<void> {
  const [a, b] = normalizePair(connectionUserIdA, connectionUserIdB);
  const result = (await db.execute(
    "SELECT id, status FROM user_crew WHERE user_id_a = ? AND user_id_b = ?",
    [a, b],
  )) as {
    rows: {
      item: (idx: number) => { id: string; status: string };
      length: number;
    };
  };

  if (!result.rows.length) throw new Error("Connection not found");
  if (result.rows.item(0).status !== "pending")
    throw new Error("Connection is not pending");

  await db.execute(
    "UPDATE user_crew SET status = 'rejected', updated_at = ? WHERE id = ?",
    [now(), result.rows.item(0).id],
  );
}

export async function removeCrewMember(
  db: AbstractPowerSyncDatabase,
  myUserId: string,
  otherUserId: string,
): Promise<void> {
  const [a, b] = normalizePair(myUserId, otherUserId);

  const manifests = (await db.execute(
    `SELECT id FROM manifests WHERE created_by = ? AND status IN ('DRAFT', 'ACTIVE') AND id IN (
      SELECT manifest_id FROM manifest_crew WHERE user_id = ?
    )`,
    [myUserId, otherUserId],
  )) as {
    rows: {
      item: (idx: number) => { id: string };
      length: number;
    };
  };

  for (let i = 0; i < manifests.rows.length; i++) {
    const mId = manifests.rows.item(i).id;
    await db.execute(
      "DELETE FROM manifest_crew WHERE manifest_id = ? AND user_id = ?",
      [mId, otherUserId],
    );
  }

  await db.execute(
    "DELETE FROM user_crew WHERE user_id_a = ? AND user_id_b = ?",
    [a, b],
  );
}

export async function addCrewToManifest(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  targetUserId: string,
  role: string = "OPERATOR",
): Promise<void> {
  await db.execute(
    "INSERT INTO manifest_crew (id, manifest_id, user_id, role) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), manifestId, targetUserId, role],
  );
}

export async function removeCrewFromManifest(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  targetUserId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM manifest_crew WHERE manifest_id = ? AND user_id = ?",
    [manifestId, targetUserId],
  );
}
