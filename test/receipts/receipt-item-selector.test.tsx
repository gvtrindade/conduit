import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

import { ReceiptItemSelector } from "@/components/receipt-item-selector";

afterEach(cleanup);

describe("ReceiptItemSelector", () => {
  const mockItems = [
    { id: "i1", name: "MEDKIT_BASIC", unit: "unit", last_price: 150 },
    { id: "i2", name: "STIMPACK_STD", unit: "pack", last_price: 75 },
    { id: "i3", name: "BANDAGE_ROLL", unit: "roll", last_price: 25 },
  ];

  const createDefaultProps = () => ({
    items: mockItems,
    onSelect: mock(() => {}),
    onCreateItem: mock((_data: { name: string; unit: string }) => Promise.resolve("new-item-id")),
  });

  const expandSelector = () => {
    fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
  };

  describe("renders with search input and items list", () => {
    it("renders search input when expanded", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      expect(screen.getByPlaceholderText(/search_items/i)).toBeInTheDocument();
    });

    it("displays all items when search is empty", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
      expect(screen.getByText("STIMPACK_STD")).toBeInTheDocument();
      expect(screen.getByText("BANDAGE_ROLL")).toBeInTheDocument();
    });

    it("shows item unit and last price", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      expect(screen.getByText(/unit/)).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });
  });

  describe("search filters items client-side", () => {
    it("filters items by name when typing in search", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      const searchInput = screen.getByPlaceholderText(/search_items/i);
      fireEvent.change(searchInput, { target: { value: "MEDKIT" } });

      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
      expect(screen.queryByText("STIMPACK_STD")).not.toBeInTheDocument();
      expect(screen.queryByText("BANDAGE_ROLL")).not.toBeInTheDocument();
    });

    it("filtering is case-insensitive", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      const searchInput = screen.getByPlaceholderText(/search_items/i);
      fireEvent.change(searchInput, { target: { value: "stim" } });

      expect(screen.getByText("STIMPACK_STD")).toBeInTheDocument();
      expect(screen.queryByText("MEDKIT_BASIC")).not.toBeInTheDocument();
    });

    it("shows all items when search is cleared", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      const searchInput = screen.getByPlaceholderText(/search_items/i);
      fireEvent.change(searchInput, { target: { value: "MEDKIT" } });
      fireEvent.change(searchInput, { target: { value: "" } });

      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
      expect(screen.getByText("STIMPACK_STD")).toBeInTheDocument();
      expect(screen.getByText("BANDAGE_ROLL")).toBeInTheDocument();
    });
  });

  describe("create new item option", () => {
    it("shows \"Create new item...\" option at bottom of results", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      expect(screen.getByRole("button", { name: /create new item/i })).toBeInTheDocument();
    });

    it("shows create option even when search has results", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      const searchInput = screen.getByPlaceholderText(/search_items/i);
      fireEvent.change(searchInput, { target: { value: "MEDKIT" } });

      expect(screen.getByRole("button", { name: /create new item/i })).toBeInTheDocument();
    });
  });

  describe("inline creation form", () => {
    it("shows inline form with name and unit when create option is clicked", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      expect(screen.getByLabelText(new RegExp("// NAME \\* //"))).toBeInTheDocument();
      expect(screen.getByLabelText(new RegExp("// UNIT //"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create_item/i })).toBeInTheDocument();
    });

    it("hides item list when inline form is shown", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      expect(screen.queryByText("MEDKIT_BASIC")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search_items/i)).not.toBeInTheDocument();
    });

    it("validates name is required", async () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      fireEvent.click(screen.getByRole("button", { name: /create_item/i }));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it("shows a cancel button that returns to the search view", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.getByPlaceholderText(/search_items/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(new RegExp("// NAME \\* //"))).not.toBeInTheDocument();
    });
  });

  describe("item selection and creation", () => {
    it("calls onSelect when an existing item is clicked", () => {
      const onSelectMock = mock(() => {});
      render(<ReceiptItemSelector {...createDefaultProps()} onSelect={onSelectMock} />);
      expandSelector();

      fireEvent.click(screen.getByText("MEDKIT_BASIC"));

      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith({ id: "i1", name: "MEDKIT_BASIC", unit: "unit", last_price: 150 });
    });

    it("calls onCreateItem with name and unit when inline form is submitted", async () => {
      const onCreateMock = mock((_data: { name: string; unit: string }) => Promise.resolve("new-item-id"));
      render(<ReceiptItemSelector {...createDefaultProps()} onCreateItem={onCreateMock} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      fireEvent.change(screen.getByLabelText(new RegExp("// NAME \\* //")), {
        target: { value: "NEW_GEAR" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp("// UNIT //")), {
        target: { value: "box" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create_item/i }));

      await waitFor(() => {
        expect(onCreateMock).toHaveBeenCalledTimes(1);
      });

      expect(onCreateMock).toHaveBeenCalledWith({ name: "NEW_GEAR", unit: "box" });
    });

    it("auto-selects newly created item by calling onSelect", async () => {
      const onSelectMock = mock(() => {});
      const onCreateMock = mock((_data: { name: string; unit: string }) => Promise.resolve("new-item-id"));
      render(
        <ReceiptItemSelector
          {...createDefaultProps()}
          onSelect={onSelectMock}
          onCreateItem={onCreateMock}
        />
      );
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      fireEvent.change(screen.getByLabelText(new RegExp("// NAME \\* //")), {
        target: { value: "NEW_GEAR" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp("// UNIT //")), {
        target: { value: "box" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create_item/i }));

      await waitFor(() => {
        expect(onSelectMock).toHaveBeenCalledWith({
          id: "new-item-id",
          name: "NEW_GEAR",
          unit: "box",
          last_price: null,
        });
      });
    });

    it("returns to search view after creating an item", async () => {
      const onCreateMock = mock((_data: { name: string; unit: string }) => Promise.resolve("new-item-id"));
      render(<ReceiptItemSelector {...createDefaultProps()} onCreateItem={onCreateMock} />);
      expandSelector();

      fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

      fireEvent.change(screen.getByLabelText(new RegExp("// NAME \\* //")), {
        target: { value: "NEW_GEAR" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create_item/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search_items/i)).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(new RegExp("// NAME \\* //"))).not.toBeInTheDocument();
    });
  });

  describe("selected items are hidden", () => {
    it("hides items whose id is in selectedIds", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} selectedIds={["i1"]} />);
      expandSelector();

      expect(screen.queryByText("MEDKIT_BASIC")).not.toBeInTheDocument();
      expect(screen.getByText("STIMPACK_STD")).toBeInTheDocument();
      expect(screen.getByText("BANDAGE_ROLL")).toBeInTheDocument();
    });

    it("shows all items when selectedIds is empty", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} selectedIds={[]} />);
      expandSelector();

      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
      expect(screen.getByText("STIMPACK_STD")).toBeInTheDocument();
      expect(screen.getByText("BANDAGE_ROLL")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("starts collapsed showing only a toggle button", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);

      expect(screen.getByRole("button", { name: /add_item/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search_items/i)).not.toBeInTheDocument();
    });

    it("expands to show search and items when toggled", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

      expect(screen.getByPlaceholderText(/search_items/i)).toBeInTheDocument();
      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
    });

    it("collapses back when toggle is clicked again", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));

      expect(screen.queryByPlaceholderText(/search_items/i)).not.toBeInTheDocument();
    });

    it("maintains search value when collapsing and expanding", () => {
      render(<ReceiptItemSelector {...createDefaultProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

      const searchInput = screen.getByPlaceholderText(/search_items/i);
      fireEvent.change(searchInput, { target: { value: "MEDKIT" } });

      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

      expect((screen.getByPlaceholderText(/search_items/i) as HTMLInputElement).value).toBe("MEDKIT");
    });
  });
});
