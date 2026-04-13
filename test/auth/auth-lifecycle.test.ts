import { describe, it, expect, mock, beforeEach } from "bun:test";

const mockSession = mock(() => ({ data: null, isPending: false, error: null }));
mock.module("@/lib/auth-client", () => ({ useSession: mockSession }));

describe("auth lifecycle", () => {
  beforeEach(() => mockSession.mockClear());

  it("signupMigrateLocalToDb migrates NULL user_id rows to new user", async () => {
    const mockDb = {
      execute: mock(() => Promise.resolve({ rowsAffected: 5 })),
    };
    const { signupMigrateLocalToDb } = await import("@/lib/auth-lifecycle");
    await signupMigrateLocalToDb(mockDb as any, "new-user-123");

    expect(mockDb.execute).toHaveBeenCalledTimes(6);
  });

  it("logoutWipeLocal deletes local data where user_id IS NULL", async () => {
    const mockDb = {
      execute: mock(() => Promise.resolve({ rowsAffected: 10 })),
    };
    const { logoutWipeLocal } = await import("@/lib/auth-lifecycle");
    await logoutWipeLocal(mockDb as any);

    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("loginWipeLocal clears local data on login", async () => {
    const mockDb = {
      execute: mock(() => Promise.resolve({ rowsAffected: 10 })),
    };
    const { loginWipeLocal } = await import("@/lib/auth-lifecycle");
    await loginWipeLocal(mockDb as any);

    expect(mockDb.execute).toHaveBeenCalled();
  });
});