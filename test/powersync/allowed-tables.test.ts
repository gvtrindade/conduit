import { describe, it, expect } from "bun:test";
import { ALLOWED_TABLES } from "@/lib/powersync/AppSchema";

describe("ALLOWED_TABLES", () => {
  it("contains receipt_items (not receipts_items)", () => {
    expect(ALLOWED_TABLES.has("receipt_items")).toBe(true);
    expect(ALLOWED_TABLES.has("receipts_items")).toBe(false);
  });

  it("contains receipts", () => {
    expect(ALLOWED_TABLES.has("receipts")).toBe(true);
  });
});
