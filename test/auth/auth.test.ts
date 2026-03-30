import { describe, it, expect } from "bun:test";

describe("Better Auth setup", () => {
  it("lib/auth.ts exports auth instance", async () => {
    const auth = await import("@/lib/auth");
    expect(auth.auth).toBeDefined();
  });

  it("lib/auth-client.ts exports createAuthClient", async () => {
    const authClient = await import("@/lib/auth-client");
    expect(authClient.authClient).toBeDefined();
  });

  it("GET /api/auth/ok returns { ok: true }", async () => {
    const result = await fetch("http://localhost:3000/api/auth/ok");
    const body = await result.json();
    expect(body.ok).toBe(true);
  });

  it("GET /api/auth/jwks returns JWKS with public key", async () => {
    const result = await fetch("http://localhost:3000/api/auth/jwks");
    const body = await result.json();
    expect(body.keys).toBeDefined();
    expect(body.keys[0].kty).toBeDefined();
  });
});