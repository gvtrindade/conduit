import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import AddItemsModal from "@/components/add-items-modal";

// Mock PowerSync
const mockExecute = mock(() => Promise.resolve({ rows: [] }));
const mockPowerSync = {
  execute: mockExecute,
};

let catalogData: any[] = [
  { id: "cat-1", name: "BANANAS", category: "FRUIT", user_id: "user-1", created_at: "now", updated_at: "now" },
  { id: "cat-2", name: "APPLES", category: "FRUIT", user_id: "user-1", created_at: "now", updated_at: "now" },
];

mock.module("@powersync/react", () => ({
  usePowerSync: () => mockPowerSync,
  useQuery: (_q: unknown) => ({
    // MERCHANT_CATEGORIES_QUERY contains "DISTINCT category";
    // CATALOG_ITEMS_QUERY returns catalog rows. Distinguish by SQL shape.
    data: typeof _q === "string" && /DISTINCT category/i.test(_q) ? categoryData : catalogData,
    isLoading: false,
  }),
}));

// Mock mutations
const mockAddManifestItem = mock(() => Promise.resolve("new-id"));
const mockCreateCatalogItem = mock(() => Promise.resolve("new-cat-id"));
const mockUpdateCatalogItem = mock(() => Promise.resolve());
const mockDeleteCatalogItem = mock(() => Promise.resolve());
mock.module("@/lib/manifest-mutations", () => ({
  addManifestItem: mockAddManifestItem,
  createCatalogItem: mockCreateCatalogItem,
  updateCatalogItem: mockUpdateCatalogItem,
  deleteCatalogItem: mockDeleteCatalogItem,
}));

// Categories available as registered aisles (distinct categories across merchants).
let categoryData: { category: string }[] = [{ category: "FRUIT" }];

describe("AddItemsModal", () => {
  beforeEach(() => {
    mockAddManifestItem.mockClear();
    mockCreateCatalogItem.mockClear();
    mockUpdateCatalogItem.mockClear();
    mockDeleteCatalogItem.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders when show is true", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    expect(screen.getByText("// ADD_ITEMS //")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SEARCH_CATALOG...")).toBeInTheDocument();
  });

  it("shows catalog items from manifest_items", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    expect(screen.getByText("BANANAS")).toBeInTheDocument();
    expect(screen.getByText("APPLES")).toBeInTheDocument();
  });

  it("filters items based on search input", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "BAN" } });

    expect(screen.getByText("BANANAS")).toBeInTheDocument();
    expect(screen.queryByText("APPLES")).not.toBeInTheDocument();
  });

  it("filters items based on category search", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "FRUIT" } });

    expect(screen.getByText("BANANAS")).toBeInTheDocument();
    expect(screen.getByText("APPLES")).toBeInTheDocument();
  });

  it("toggles item selection when clicked", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const bananas = screen.getByText("BANANAS");
    fireEvent.click(bananas);

    expect(screen.getByText((content, el) =>
      !!el?.textContent?.match(/^\/\/ SELECTED \(1\) \/\/$/),
    )).toBeInTheDocument();

    // Toggle off
    fireEvent.click(bananas);
    expect(screen.queryByText((content, el) =>
      !!el?.textContent?.match(/^\/\/ SELECTED \(1\) \/\/$/),
    )).not.toBeInTheDocument();
  });

  it("shows ADD_TO_CATALOG button when search term not found", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "ORANGES" } });

    expect(screen.getByText(/ADD.*ORANGES.*TO_CATALOG/)).toBeInTheDocument();
  });

  it("calls addManifestItem with correct params for selected items", async () => {
    const onItemsAdded = mock(() => {});
    const onClose = mock(() => {});

    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={onClose}
        onItemsAdded={onItemsAdded}
      />
    );

    // Select an item
    fireEvent.click(screen.getByText("BANANAS"));

    const addButton = screen.getByText(/ADD_SELECTED/);
    fireEvent.click(addButton);

    await new Promise(r => setTimeout(r, 0));

    expect(mockAddManifestItem).toHaveBeenCalledTimes(1);
    expect(mockAddManifestItem).toHaveBeenCalledWith(mockPowerSync, "m-1", {
      manifestItemId: "cat-1",
      name: "BANANAS",
      category: "FRUIT",
      estimated_cost: "0",
    });
    expect(onItemsAdded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("exposes EDIT and DEL buttons on each catalog item", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />,  // eslint-disable-next-line
    );

    const editButtons = screen.getAllByText("EDIT");
    const delButtons = screen.getAllByText("DEL");
    // One per visible catalog item (BANANAS + APPLES)
    expect(editButtons).toHaveLength(2);
    expect(delButtons).toHaveLength(2);
  });

  it("EDIT on a catalog item opens an inline editor with the name and category picker", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />,
    );

    // Click the first EDIT button (top of list)
    const editButtons = screen.getAllByText("EDIT");
    fireEvent.click(editButtons[0]);

    // The inline editor appears with a header and the existing item name and category
    expect(screen.getByText("// EDIT_CATALOG_ITEM //")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ITEM_NAME")).toBeInTheDocument();
  });

  it("DELETE on a catalog item calls deleteCatalogItem after confirm", async () => {
    // Auto-confirm window.confirm
    const confirmSpy = mock(() => true);
    const w = window as unknown as { confirm: typeof confirmSpy };
    const originalConfirm = w.confirm;
    w.confirm = confirmSpy;

    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />,
    );

    const delButtons = screen.getAllByText("DEL");
    fireEvent.click(delButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();

    // Microtask flush
    await new Promise((r) => setTimeout(r, 0));

    expect(mockDeleteCatalogItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteCatalogItem.mock.calls[0]).toContain("cat-1");
    expect(mockDeleteCatalogItem.mock.calls[0]).toContain("user-1");

    w.confirm = originalConfirm;
  });

  it("the new-item category field is constrained to registered aisles", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        userId="user-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />,
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "CHOCOLATE" } });

    // Propose a new item (no existing match)
    fireEvent.click(screen.getByText(/ADD.*CHOCOLATE.*TO_CATALOG/));

    // The new-item form appears with a constrained category picker.
    expect(screen.getByText("// NEW_CATALOG_ITEM //")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SELECT_CATEGORY (OPTIONAL)")).toBeInTheDocument();
  });
});
