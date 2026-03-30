import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

describe("PowerSync connector", () => {
  const originalFetch = globalThis.fetch;
  let fetchSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchSpy = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ token: "eyJhbGciOiJSUzI1NiJ9.test.jwt" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetchCredentials() returns valid PowerSyncCredentials with endpoint and token", async () => {
    const { PowerSyncConnector } = await import("@/lib/powersync-connector");
    const connector = new PowerSyncConnector();
    const credentials = await connector.fetchCredentials();

    expect(credentials).not.toBeNull();
    expect(credentials!.endpoint).toBeDefined();
    expect(typeof credentials!.endpoint).toBe("string");
    expect(credentials!.token).toBeDefined();
    expect(typeof credentials!.token).toBe("string");
    expect(credentials!.token).toBe("eyJhbGciOiJSUzI1NiJ9.test.jwt");
  });

  it("fetchCredentials() calls POST /api/auth/token", async () => {
    const { PowerSyncConnector } = await import("@/lib/powersync-connector");
    const connector = new PowerSyncConnector();
    await connector.fetchCredentials();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/auth/token");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("fetchCredentials() returns null when token endpoint returns non-ok", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const { PowerSyncConnector } = await import("@/lib/powersync-connector");
    const connector = new PowerSyncConnector();
    const credentials = await connector.fetchCredentials();

    expect(credentials).toBeNull();
  });

  it("uploadData() returns without error (no-op)", async () => {
    const { PowerSyncConnector } = await import("@/lib/powersync-connector");
    const connector = new PowerSyncConnector();

    // uploadData should accept any AbstractPowerSyncDatabase and return void
    const mockDb = {} as any;
    await expect(connector.uploadData(mockDb)).resolves.toBeUndefined();
  });
});
