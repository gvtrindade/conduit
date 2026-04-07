import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import AddItemsModal from "@/components/add-items-modal";

// Mock PowerSync
const mockExecute = mock(() => Promise.resolve({ rows: [] }));
const mockPowerSync = {
  execute: mockExecute,
};

mock.module("@powersync/react", () => ({
  usePowerSync: () => mockPowerSync,
  useQuery: () => ({
    data: [
      {
        id: "item-1",
        name: "BANANAS",
        category_name: "FRUIT",
        last_price: 5.99,
      },
      {
        id: "item-2",
        name: "APPLES",
        category_name: "FRUIT",
        last_price: 3.50,
      },
    ],
    isLoading: false,
  }),
}));

// Mock mutations
const mockAddManifestItem = mock(() => Promise.resolve("new-id"));
mock.module("@/lib/manifest-mutations", () => ({
  addManifestItem: mockAddManifestItem,
}));

describe("AddItemsModal", () => {
  beforeEach(() => {
    mockAddManifestItem.mockClear();
  });

  it("renders when show is true", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    expect(screen.getByText("// ADD_ITEMS //")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SEARCH_CATALOG...")).toBeInTheDocument();
  });

  it("filters items based on search input", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    expect(screen.getByText("BANANAS")).toBeInTheDocument();
    expect(screen.getByText("APPLES")).toBeInTheDocument();

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
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const bananas = screen.getByText("BANANAS");
    fireEvent.click(bananas);

    expect(screen.getByText("1 ITEM SELECTED")).toBeInTheDocument();
    
    // Toggle off
    fireEvent.click(bananas);
    expect(screen.queryByText("1 ITEM SELECTED")).not.toBeInTheDocument();
  });

  it("enables ADD_SELECTED button when items are selected", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const addButton = screen.getByRole("button", { name: /ADD_SELECTED/ });
    expect(addButton).toBeDisabled();

    fireEvent.click(screen.getByText("BANANAS"));
    expect(addButton).not.toBeDisabled();
  });

  it("calls addManifestItem for each selected item and the custom item", async () => {
    const onItemsAdded = mock(() => {});
    const onClose = mock(() => {});

    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        onClose={onClose}
        onItemsAdded={onItemsAdded}
      />
    );

    // Select two items
    fireEvent.click(screen.getByText("BANANAS"));
    fireEvent.click(screen.getByText("APPLES"));

    // Enter custom item
    const customInput = screen.getByPlaceholderText("ENTER_CUSTOM_ITEM_NAME");
    fireEvent.change(customInput, { target: { value: "ORANGES" } });

    const addButton = screen.getByRole("button", { name: /ADD_SELECTED/ });
    fireEvent.click(addButton);

    // Wait for async operations
    await new Promise(r => setTimeout(r, 0));

    expect(mockAddManifestItem).toHaveBeenCalledTimes(3);
    expect(onItemsAdded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("clears search input after successful add", async () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "BAN" } });
    expect(searchInput).toHaveValue("BAN");

    fireEvent.click(screen.getByText("BANANAS"));
    const addButton = screen.getByRole("button", { name: /ADD_SELECTED/ });
    fireEvent.click(addButton);

    await new Promise(r => setTimeout(r, 0));

    expect(searchInput).toHaveValue("");
  });

  it("filters out existing items from the list", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        existingItemIds={new Set(["item-1"])}
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    expect(screen.queryByText("BANANAS")).not.toBeInTheDocument();
    expect(screen.getByText("APPLES")).toBeInTheDocument();
  });

  it("filters out existing items from search results", () => {
    render(
      <AddItemsModal
        show={true}
        manifestId="m-1"
        existingItemIds={new Set(["item-1"])}
        onClose={() => {}}
        onItemsAdded={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText("SEARCH_CATALOG...");
    fireEvent.change(searchInput, { target: { value: "FRUIT" } });

    expect(screen.queryByText("BANANAS")).not.toBeInTheDocument();
    expect(screen.getByText("APPLES")).toBeInTheDocument();
  });
});
