import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { ReceiptEditForm, type ReceiptEditFormProps } from "@/components/receipt-edit-form";

afterEach(cleanup);

const mockMerchants = [
  { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
  { id: "m2", name: "CORPO_MART", emoji: "🏪" },
];

const mockItems = [
  { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
  { id: "i2", name: "BEANS", unit: "bag", last_price: 3.25 },
];

const createDefaultProps = (): ReceiptEditFormProps => ({
  receipt: {
    merchantId: "m1",
    date: "2024.10.14",
    items: [
      { receiptItemId: "ri1", itemId: "i1", name: "RICE", qty: "2", unitPrice: 5.50, total: 11.00 },
      { receiptItemId: "ri2", itemId: "i2", name: "BEANS", qty: "1", unitPrice: 3.25, total: 3.25 },
    ],
  },
  merchants: mockMerchants,
  items: mockItems,
  onSubmit: mock(() => {}),
  onCancel: mock(() => {}),
  onCreateMerchant: mock(() => Promise.resolve("new-m")),
  onCreateItem: mock(() => Promise.resolve("new-i")),
});

describe("ReceiptEditForm", () => {
  describe("Pre-fill", () => {
    it("merchant dropdown shows current merchant selected", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //")) as HTMLSelectElement;
      expect(merchantSelect.value).toBe("m1");
    });

    it("date picker shows current date", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      expect(screen.getByText("2024.10.14")).toBeInTheDocument();
    });

    it("existing items are shown as editable rows", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      expect(screen.getByText("RICE")).toBeInTheDocument();
      expect(screen.getByText("BEANS")).toBeInTheDocument();

      const qtyInputs = screen.getAllByLabelText("QTY");
      expect(qtyInputs).toHaveLength(2);
      expect((qtyInputs[0] as HTMLInputElement).value).toBe("2");
      expect((qtyInputs[1] as HTMLInputElement).value).toBe("1");

      const priceInputs = screen.getAllByLabelText("PRICE");
      expect((priceInputs[0] as HTMLInputElement).value).toBe("5.5");
      expect((priceInputs[1] as HTMLInputElement).value).toBe("3.25");
    });

    it("renders cancel and save buttons", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  describe("Running total", () => {
    it("shows running total based on pre-filled items", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const totalLabel = screen.getByText("// TOTAL //");
      const totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("14.25");
    });

    it("updates running total when quantity changes", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const qtyInput = screen.getAllByLabelText("QTY")[0];
      fireEvent.change(qtyInput, { target: { value: "3" } });

      const totalLabel = screen.getByText("// TOTAL //");
      const totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("19.75");
    });

    it("updates running total when price changes", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const priceInput = screen.getAllByLabelText("PRICE")[1];
      fireEvent.change(priceInput, { target: { value: "5" } });

      const totalLabel = screen.getByText("// TOTAL //");
      const totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("16.00");
    });

    it("updates running total when item is removed", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const totalLabel = screen.getByText("// TOTAL //");
      let totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("14.25");

      const removeButtons = screen.getAllByLabelText("Remove");
      fireEvent.click(removeButtons[1]);

      totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("11.00");
    });
  });

  describe("Item count", () => {
    it("shows item count based on pre-filled items", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const countSpans = screen.getAllByText("// ITEMS //");
      const countRow = countSpans[1].closest('[class*="flex"]');
      expect(countRow?.textContent).toContain("2");
    });

    it("updates item count when item is removed", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const removeButtons = screen.getAllByLabelText("Remove");
      fireEvent.click(removeButtons[0]);

      const countSpans = screen.getAllByText("// ITEMS //");
      const countRow = countSpans[1].closest('[class*="flex"]');
      expect(countRow?.textContent).toContain("1");
    });
  });

  describe("Remove item", () => {
    it("removes the item row from the form", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      expect(screen.getByText("RICE")).toBeInTheDocument();
      expect(screen.getByText("BEANS")).toBeInTheDocument();

      const removeButtons = screen.getAllByLabelText("Remove");
      fireEvent.click(removeButtons[0]);

      expect(screen.queryByText("RICE")).not.toBeInTheDocument();
      expect(screen.getByText("BEANS")).toBeInTheDocument();
    });

    it("hides total and count when all items are removed", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      fireEvent.click(screen.getAllByLabelText("Remove")[0]);
      fireEvent.click(screen.getAllByLabelText("Remove")[0]);

      expect(screen.queryByText("// TOTAL //")).not.toBeInTheDocument();
      expect(screen.queryAllByLabelText("QTY")).toHaveLength(0);
    });
  });

  describe("Modify qty and price", () => {
    it("calls onQtyChange when quantity is modified", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const qtyInput = screen.getAllByLabelText("QTY")[0];
      fireEvent.change(qtyInput, { target: { value: "5" } });

      expect((qtyInput as HTMLInputElement).value).toBe("5");
    });

    it("calls onPriceChange when price is modified", () => {
      render(<ReceiptEditForm {...createDefaultProps()} />);

      const priceInput = screen.getAllByLabelText("PRICE")[0];
      fireEvent.change(priceInput, { target: { value: "10" } });

      expect((priceInput as HTMLInputElement).value).toBe("10");
    });
  });

  describe("Add item via selector", () => {
    it("adds a new item row when selected from selector", () => {
      const allItems = [
        ...mockItems,
        { id: "i3", name: "SUGAR", unit: "kg", last_price: 2.00 },
      ];
      const props = { ...createDefaultProps(), items: allItems };
      render(<ReceiptEditForm {...props} />);

      expect(screen.getAllByLabelText("QTY")).toHaveLength(2);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("SUGAR"));

      expect(screen.getAllByLabelText("QTY")).toHaveLength(3);
      expect(screen.getByText("SUGAR")).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("shows error when submitting without merchant", () => {
      const props = createDefaultProps();
      props.receipt.merchantId = "";
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByText(/merchant is required/i)).toBeInTheDocument();
    });

    it("shows error when submitting without date", () => {
      const props = createDefaultProps();
      props.receipt.date = "";
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    });

    it("shows error when submitting without items", () => {
      const props = createDefaultProps();
      props.receipt.items = [];
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(screen.getByText(/at least one item is required/i)).toBeInTheDocument();
    });

    it("does not call onSubmit when validation fails", () => {
      const onSubmitMock = mock(() => {});
      const props = createDefaultProps();
      props.onSubmit = onSubmitMock;
      props.receipt.merchantId = "";
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });

  describe("Form submission", () => {
    it("calls onSubmit with correct data when form is valid", () => {
      const onSubmitMock = mock(() => {});
      const props = createDefaultProps();
      props.onSubmit = onSubmitMock;
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      const data = onSubmitMock.mock.calls[0][0];
      expect(data.merchantId).toBe("m1");
      expect(data.date).toBe("2024.10.14");
      expect(data.items).toHaveLength(2);
      expect(data.items[0].itemId).toBe("i1");
      expect(data.items[0].qty).toBe("2");
      expect(data.items[0].unitPrice).toBe(5.50);
      expect(data.items[0].total).toBe(11.00);
    });

    it("calls onCancel when cancel button is clicked", () => {
      const onCancelMock = mock(() => {});
      const props = createDefaultProps();
      props.onCancel = onCancelMock;
      render(<ReceiptEditForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });
  });
});
