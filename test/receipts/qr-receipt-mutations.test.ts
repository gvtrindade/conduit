import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("QR scan pending receipt creation", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("creates Unknown Merchant and pending receipt on QR scan", async () => {
    const { createPendingReceiptFromQR } = await import("@/lib/qr-receipt-mutations");

    const mockDb = { execute: mockExecute } as any;
    const chave = "53230146064212345678901234567890123456789000";
    const userId = "user-123";

    const receiptId = await createPendingReceiptFromQR(mockDb, chave, userId);

    expect(mockExecute).toHaveBeenCalledTimes(2);

    const [merchantSql, merchantParams] = mockExecute.mock.calls[0];
    expect(merchantSql).toContain("INSERT INTO merchants");
    expect(merchantSql).toContain("name");
    expect(merchantParams).toContain("Unknown Merchant");

    const [receiptSql, receiptParams] = mockExecute.mock.calls[1];
    expect(receiptSql).toContain("INSERT INTO receipts");
    expect(receiptSql).toContain("status");
    expect(receiptParams).toContain("PENDING");
    expect(receiptParams).toContain(userId);

    expect(receiptId).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("calls external API with correct payload and handles 200 response", async () => {
    const { createPendingReceiptFromQR } = await import("@/lib/qr-receipt-mutations");

    const mockDb = { execute: mockExecute } as any;
    const chave = "53230146064212345678901234567890123456789000";
    const userId = "user-123";

    const mockFetch = mock(() =>
      Promise.resolve({ ok: true, status: 200 })
    );
    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    const originalEnv = process.env.NEXT_PUBLIC_NFCE_API_URL;
    process.env.NEXT_PUBLIC_NFCE_API_URL = "https://api.example.com/nfce";

    const receiptId = await createPendingReceiptFromQR(mockDb, chave, userId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/nfce");
    expect(options.method).toBe("POST");
    expect(options.headers?.["Content-Type"]).toBe("application/json");
    expect(options.body).toContain(receiptId);
    expect(options.body).toContain(chave);

    const body = JSON.parse(options.body);
    expect(body.receiptId).toBe(receiptId);
    expect(body.chave).toBe(chave);
    expect(body.projectUrl).toBeDefined();

    expect(options.signal).toBeDefined();

    process.env.NEXT_PUBLIC_NFCE_API_URL = originalEnv;
    global.fetch = originalFetch;
  });

  it("handles API timeout gracefully", async () => {
    const { createPendingReceiptFromQR } = await import("@/lib/qr-receipt-mutations");

    const mockDb = { execute: mockExecute } as any;
    const chave = "53230146064212345678901234567890123456789000";
    const userId = "user-123";

    const mockFetch = mock(() => new Promise((_, reject) => {
      const error = new Error("Aborted") as Error & { name: string; code: string };
      error.name = "AbortError";
      error.code = "ECONNABORTED";
      reject(error);
    }));
    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    const originalEnv = process.env.NEXT_PUBLIC_NFCE_API_URL;
    process.env.NEXT_PUBLIC_NFCE_API_URL = "https://api.example.com/nfce";

    const receiptId = await createPendingReceiptFromQR(mockDb, chave, userId);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    process.env.NEXT_PUBLIC_NFCE_API_URL = originalEnv;
    global.fetch = originalFetch;
  });
});