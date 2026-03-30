import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the auth-client module
const mockUseSession = mock(() => ({
  data: null,
  isPending: false,
  error: null,
}));

mock.module("@/lib/auth-client", () => ({
  useSession: mockUseSession,
}));

describe("SystemProvider", () => {
  beforeEach(() => {
    mockUseSession.mockClear();
  });

  it("does not call connect() when no auth session exists", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
    });

    const connectSpy = mock(() => Promise.resolve());
    const mockDb = {
      connect: connectSpy,
      disconnectAndClear: mock(() => Promise.resolve()),
      connected: false,
    };

    const { resolveConnectionEffect } = await import(
      "@/lib/powersync-connection"
    );
    resolveConnectionEffect(mockDb as any, null);

    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("calls connect() when auth session exists", async () => {
    const connectSpy = mock(() => Promise.resolve());
    const mockDb = {
      connect: connectSpy,
      disconnectAndClear: mock(() => Promise.resolve()),
      connected: false,
    };
    const mockConnector = { fetchCredentials: mock(), uploadData: mock() };
    const session = { user: { id: "123", email: "test@test.com" } };

    const { resolveConnectionEffect } = await import(
      "@/lib/powersync-connection"
    );
    resolveConnectionEffect(mockDb as any, session, mockConnector as any);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith(mockConnector);
  });

  it("does not call connect() again when already connected", async () => {
    const connectSpy = mock(() => Promise.resolve());
    const mockDb = {
      connect: connectSpy,
      disconnectAndClear: mock(() => Promise.resolve()),
      connected: true,
    };
    const mockConnector = { fetchCredentials: mock(), uploadData: mock() };
    const session = { user: { id: "123", email: "test@test.com" } };

    const { resolveConnectionEffect } = await import(
      "@/lib/powersync-connection"
    );
    resolveConnectionEffect(mockDb as any, session, mockConnector as any);

    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("calls disconnectAndClear() on logout (session becomes null)", async () => {
    const disconnectSpy = mock(() => Promise.resolve());
    const mockDb = {
      connect: mock(() => Promise.resolve()),
      disconnectAndClear: disconnectSpy,
      connected: true,
    };

    const { resolveConnectionEffect } = await import(
      "@/lib/powersync-connection"
    );
    resolveConnectionEffect(mockDb as any, null);

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
