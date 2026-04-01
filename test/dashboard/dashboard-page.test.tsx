import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

afterEach(cleanup);

// Mock data
const mockItems = [
  { id: "i1", name: "RICE", unit: "kg", last_price: 5.5 },
  { id: "i2", name: "BEANS", unit: "bag", last_price: 3.25 },
];

const mockMerchants = [
  { id: "m1", name: "CORPO_MART", emoji: "🏪" },
];

const mockReceipts: any[] = [];

// Track queries passed to useQuery
const queryCalls: string[] = [];
const setQueryResult = (sql: string, data: any[]) => {
  queryResults.set(sql, data);
};
const queryResults = new Map<string, any[]>();

const mockUseQuery = mock((sql: string) => {
  queryCalls.push(sql);
  return { data: queryResults.get(sql) ?? [], isLoading: false };
});

const mockPowerSync = { execute: mock(() => Promise.resolve({ rows: [] })) };

mock.module("@powersync/react", () => ({
  useQuery: mockUseQuery,
  usePowerSync: () => mockPowerSync,
}));

mock.module("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

mock.module("@/lib/receipt-queries", () => ({
  RECEIPTS_WITH_MERCHANT_QUERY: "SELECT ... receipts",
  mapDbReceiptToReceipt: (row: any) => row,
  type: {} as any,
}));

const mockCreateMerchant = mock((_db: any, _data: any) => Promise.resolve("new-merchant-id"));
mock.module("@/lib/merchant-mutations", () => ({
  createMerchant: mockCreateMerchant,
}));

const mockCreateItem = mock((_db: any, _data: any) => Promise.resolve("new-item-id"));
mock.module("@/lib/item-mutations", () => ({
  createItem: mockCreateItem,
}));

const mockCreateReceipt = mock((_db: any, _data: any) => Promise.resolve("new-receipt-id"));
mock.module("@/lib/receipt-mutations", () => ({
  createReceipt: mockCreateReceipt,
}));

const mockPush = mock((_href: string) => {});
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mock(() => {}), back: mock(() => {}) }),
}));

describe("DashboardPage loads items from database", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    queryResults.clear();
    mockUseQuery.mockClear();
    mockPowerSync.execute.mockClear();
    mockCreateItem.mockClear();

    setQueryResult("SELECT ... receipts", mockReceipts);
    setQueryResult("SELECT id, name, emoji FROM merchants ORDER BY name", mockMerchants);
    setQueryResult("SELECT id, name, unit, last_price FROM items ORDER BY name", mockItems);
  });

  it("queries items with id, name, unit, last_price from PowerSync", async () => {
    setQueryResult("SELECT id, name, unit, last_price FROM items ORDER BY name", mockItems);

    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    expect(queryCalls).toContain("SELECT id, name, unit, last_price FROM items ORDER BY name");
  });

  it("displays items from database in the item selector when manual entry modal opens", async () => {
    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    // Open manual entry modal
    fireEvent.click(screen.getByText(/MANUAL.*ENTRY/));

    // Expand item selector
    fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

    // Items from database should be visible
    expect(screen.getByText("RICE")).toBeInTheDocument();
    expect(screen.getByText("BEANS")).toBeInTheDocument();
  });
});

describe("DashboardPage persists new items", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    queryResults.clear();
    mockUseQuery.mockClear();
    mockPowerSync.execute.mockClear();
    mockCreateItem.mockClear();

    setQueryResult("SELECT ... receipts", mockReceipts);
    setQueryResult("SELECT id, name, emoji FROM merchants ORDER BY name", mockMerchants);
    setQueryResult("SELECT id, name, unit, last_price FROM items ORDER BY name", mockItems);
  });

  it("calls createItem mutation when creating an item through the inline form", async () => {
    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    // Open manual entry modal
    fireEvent.click(screen.getByText(/MANUAL.*ENTRY/));

    // Expand item selector and click create new item
    fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
    fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

    // Fill in the form
    fireEvent.change(screen.getByLabelText(new RegExp("// NAME \\* //")), {
      target: { value: "NEW_SUPPLY" },
    });
    fireEvent.change(screen.getByLabelText(new RegExp("// UNIT //")), {
      target: { value: "box" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /create_item/i }));

    // Verify createItem was called with correct data
    await screen.findByText("NEW_SUPPLY");

    expect(mockCreateItem).toHaveBeenCalledTimes(1);
    const [db, data] = mockCreateItem.mock.calls[0];
    expect(db).toBe(mockPowerSync);
    expect(data.name).toBe("NEW_SUPPLY");
    expect(data.unit).toBe("box");
  });
});

describe("DashboardPage creates receipt on form submit", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    queryResults.clear();
    mockUseQuery.mockClear();
    mockPowerSync.execute.mockClear();
    mockCreateItem.mockClear();
    mockCreateMerchant.mockClear();
    mockCreateReceipt.mockClear();
    mockPush.mockClear();

    setQueryResult("SELECT ... receipts", mockReceipts);
    setQueryResult("SELECT id, name, emoji FROM merchants ORDER BY name", mockMerchants);
    setQueryResult("SELECT id, name, unit, last_price FROM items ORDER BY name", mockItems);
  });

  it("calls createReceipt with merchantId, date, items, total, and item_count after form submission", async () => {
    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    // Open manual entry modal
    fireEvent.click(screen.getByText(/MANUAL.*ENTRY/));

    // Select merchant
    const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
    fireEvent.change(merchantSelect, { target: { value: "m1" } });

    // Select date
    fireEvent.click(screen.getByRole("button", { name: /select_date/i }));
    fireEvent.click(screen.getByText("01"));

    // Add an item
    fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
    fireEvent.click(screen.getByText("RICE"));

    // Change quantity to 2
    const qtyInput = screen.getByLabelText("QTY");
    fireEvent.change(qtyInput, { target: { value: "2" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

    // Verify createReceipt was called
    await new Promise(r => setTimeout(r, 50));

    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
    const [db, data] = mockCreateReceipt.mock.calls[0];
    expect(db).toBe(mockPowerSync);
    expect(data.merchant_id).toBe("m1");
    expect(data.receipt_date).toBeTruthy();
    expect(data.total).toBe(11.00);
    expect(data.item_count).toBe(1);
    expect(data.status).toBe("OK");
    expect(data.receipt_items).toHaveLength(1);
    expect(data.receipt_items[0].item_id).toBe("i1");
    expect(data.receipt_items[0].qty).toBe("2");
    expect(data.receipt_items[0].unit_price).toBe(5.5);
    expect(data.receipt_items[0].total).toBe(11.00);
  });

  it("navigates to receipt detail page after successful creation", async () => {
    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    // Open manual entry modal
    fireEvent.click(screen.getByText(/MANUAL.*ENTRY/));

    // Fill required fields
    const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
    fireEvent.change(merchantSelect, { target: { value: "m1" } });

    fireEvent.click(screen.getByRole("button", { name: /select_date/i }));
    fireEvent.click(screen.getByText("01"));

    fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
    fireEvent.click(screen.getByText("RICE"));

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

    await new Promise(r => setTimeout(r, 50));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/receipts/new-receipt-id");
  });
});

describe("DashboardPage persists new merchants", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    queryResults.clear();
    mockUseQuery.mockClear();
    mockPowerSync.execute.mockClear();
    mockCreateMerchant.mockClear();
    mockCreateReceipt.mockClear();
    mockPush.mockClear();

    setQueryResult("SELECT ... receipts", mockReceipts);
    setQueryResult("SELECT id, name, emoji FROM merchants ORDER BY name", mockMerchants);
    setQueryResult("SELECT id, name, unit, last_price FROM items ORDER BY name", mockItems);
  });

  it("calls createMerchant with db, name, and emoji when creating a merchant through the inline form", async () => {
    const { default: DashboardPage } = await import("@/app/page");
    render(<DashboardPage />);

    // Open manual entry modal
    fireEvent.click(screen.getByText(/MANUAL.*ENTRY/));

    // Select "Other..." to open inline merchant creation
    const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
    fireEvent.change(merchantSelect, { target: { value: "other" } });

    // Fill in merchant name and emoji
    fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_NAME //")), {
      target: { value: "NEW_MERCHANT" },
    });
    fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_EMOJI //")), {
      target: { value: "🛒" },
    });

    // Click create merchant
    fireEvent.click(screen.getByRole("button", { name: /create_merchant/i }));

    await waitFor(() => {
      expect(mockCreateMerchant).toHaveBeenCalledTimes(1);
    });

    const [db, data] = mockCreateMerchant.mock.calls[0];
    expect(db).toBe(mockPowerSync);
    expect(data.name).toBe("NEW_MERCHANT");
    expect(data.emoji).toBe("🛒");
  });
});
