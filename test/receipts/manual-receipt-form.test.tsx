import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { useState } from 'react';

import { ManualReceiptForm } from "@/components/manual-receipt-form";

afterEach(cleanup);

const mockMerchants = [
  { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
  { id: "m2", name: "CORPO_MART", emoji: "🏪" },
];

const createDefaultProps = () => ({
  merchants: mockMerchants,
  onSubmit: mock(() => Promise.resolve()),
  onCancel: mock(() => {}),
  onCreateMerchant: mock((name: string, emoji: string | null) => Promise.resolve("new-merchant-id")),
});

describe("ManualReceiptForm", () => {
  const getByLabel = (label: string) => {
    return screen.getByLabelText(new RegExp(`// ${label} //`));
  };

  describe("Merchant dropdown displays merchants", () => {
    it("renders merchant dropdown with all merchants from props", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      const options = merchantSelect.querySelectorAll("option");
      const optionTexts = Array.from(options).map(o => o.textContent);

      expect(optionTexts.some(t => t?.includes("SECTOR_7_WHOLE_FOODS"))).toBe(true);
      expect(optionTexts.some(t => t?.includes("CORPO_MART"))).toBe(true);
    });

    it("shows Other... option at bottom of dropdown", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      const options = merchantSelect.querySelectorAll("option");
      const lastOption = options[options.length - 1];

      expect(lastOption.textContent).toBe("Other...");
    });

    it("shows placeholder option when no merchant selected", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //")) as HTMLSelectElement;

      expect(merchantSelect.value).toBe("");
    });
  });

  describe("Selecting Other... shows inline creation form", () => {
    it("reveals merchant name and emoji inputs when Other... is selected", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      expect(screen.getByLabelText(new RegExp("// MERCHANT_NAME //"))).toBeInTheDocument();
      expect(screen.getByLabelText(new RegExp("// MERCHANT_EMOJI //"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create_merchant/i })).toBeInTheDocument();
    });

    it("hides dropdown when inline form is shown", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      expect(merchantSelect).not.toBeInTheDocument();
    });
  });

  describe("Inline merchant creation", () => {
    it("calls onCreateMerchant with name and emoji when CREATE_MERCHANT is clicked", async () => {
      const onCreateMock = mock(() => Promise.resolve("new-merchant-id"));
      render(<ManualReceiptForm {...createDefaultProps()} onCreateMerchant={onCreateMock} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_NAME //")), {
        target: { value: "NEW_MERCHANT" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_EMOJI //")), {
        target: { value: "🏪" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create_merchant/i }));

      await waitFor(() => {
        expect(onCreateMock).toHaveBeenCalledTimes(1);
      });

      expect(onCreateMock).toHaveBeenCalledWith("NEW_MERCHANT", "🏪");
    });

    it("auto-selects the newly created merchant after creation", async () => {
      const initialMerchants = [
        { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
        { id: "m2", name: "CORPO_MART", emoji: "🏪" },
      ];
      const updatedMerchants = [
        ...initialMerchants,
        { id: "new-merchant-id", name: "NEW_MERCHANT", emoji: "🆕" },
      ];
      const onCreateMock = mock(() => Promise.resolve("new-merchant-id"));
      const onSubmitMock = mock(() => {});

      // Wrapper component to manage merchants state
      const Wrapper = () => {
        const [merchants, setMerchants] = useState(initialMerchants);
        const handleCreateMerchant = async (name: string, emoji: string | null) => {
          const newId = await onCreateMock(name, emoji);
          // Simulate parent updating merchants after creation
          setMerchants(updatedMerchants);
          return newId;
        };
        return (
          <ManualReceiptForm
            merchants={merchants}
            onSubmit={onSubmitMock}
            onCreateMerchant={handleCreateMerchant}
          />
        );
      };

      render(<Wrapper />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_NAME //")), {
        target: { value: "NEW_MERCHANT" },
      });
      fireEvent.click(screen.getByRole("button", { name: /create_merchant/i }));

      await waitFor(() => {
        expect(onCreateMock).toHaveBeenCalled();
      });

      await waitFor(() => {
        const selectAfterCreation = screen.getByLabelText(new RegExp("// MERCHANT //")) as HTMLSelectElement;
        expect(selectAfterCreation.value).toBe("new-merchant-id");
      });
    });
    it("does not duplicate merchants when parent prop updates after creation", async () => {
      const initialMerchants = [
        { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
        { id: "m2", name: "CORPO_MART", emoji: "🏪" },
      ];
      const updatedMerchants = [
        ...initialMerchants,
        { id: "new-merchant-id", name: "NEW_MERCHANT", emoji: "🏪" },
      ];
      const onCreateMock = mock(() => Promise.resolve("new-merchant-id"));
      const onSubmitMock = mock(() => {});

      // Wrapper component to manage merchants state
      const Wrapper = () => {
        const [merchants, setMerchants] = useState(initialMerchants);
        const handleCreateMerchant = async (name: string, emoji: string | null) => {
          const newId = await onCreateMock(name, emoji);
          // Simulate parent updating merchants after creation
          setMerchants(updatedMerchants);
          return newId;
        };
        return (
          <ManualReceiptForm
            merchants={merchants}
            onSubmit={onSubmitMock}
            onCreateMerchant={handleCreateMerchant}
          />
        );
      };

      render(<Wrapper />);

      // Open dropdown and select Other...
      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      // Fill merchant name and emoji
      fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_NAME //")), {
        target: { value: "NEW_MERCHANT" },
      });
      fireEvent.change(screen.getByLabelText(new RegExp("// MERCHANT_EMOJI //")), {
        target: { value: "🏪" },
      });

      // Click create merchant
      fireEvent.click(screen.getByRole("button", { name: /create_merchant/i }));

      // Wait for async creation
      await waitFor(() => {
        expect(onCreateMock).toHaveBeenCalledTimes(1);
      });

      // After creation, dropdown should have merchants from updatedMerchants
      const merchantSelectAfter = screen.getByLabelText(new RegExp("// MERCHANT //"));
      const options = merchantSelectAfter.querySelectorAll("option");
      const optionTexts = Array.from(options).map(o => o.textContent);

      // Count occurrences of each merchant name
      const counts: Record<string, number> = {};
      optionTexts.forEach(text => {
        if (text) counts[text] = (counts[text] || 0) + 1;
      });

      // Ensure no merchant appears more than once (excluding placeholder and Other...)
      Object.entries(counts).forEach(([text, count]) => {
        if (text && !text.includes("SELECT_MERCHANT") && !text.includes("Other...")) {
          expect(count).toBe(1);
        }
      });

      // Also ensure the new merchant appears exactly once
      const newMerchantOptions = optionTexts.filter(text => text?.includes("NEW_MERCHANT"));
      expect(newMerchantOptions).toHaveLength(1);
    });
  });

    it("does not create merchant when name is empty", async () => {
      const onCreateMock = mock(() => Promise.resolve("new-merchant-id"));
      render(<ManualReceiptForm {...createDefaultProps()} onCreateMerchant={onCreateMock} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "other" } });

      fireEvent.click(screen.getByRole("button", { name: /create_merchant/i }));

      expect(onCreateMock).not.toHaveBeenCalled();
    });
  });

  describe("Form layout", () => {
    const mockMerchants = [
      { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
      { id: "m2", name: "CORPO_MART", emoji: "🏪" },
    ];
    const createDefaultProps = () => ({
      merchants: mockMerchants,
      onSubmit: mock(() => Promise.resolve()),
      onCancel: mock(() => {}),
      onCreateMerchant: mock((name: string, emoji: string | null) => Promise.resolve("new-merchant-id")),
    });
    it("renders all form sections: merchant, date picker, item selector, and submit button", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      expect(screen.getByLabelText(new RegExp("// MERCHANT //"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /select_date/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add_item/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /log_receipt/i })).toBeInTheDocument();
    });
  });

  describe("Date picker integration", () => {
    const mockMerchants = [
      { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
      { id: "m2", name: "CORPO_MART", emoji: "🏪" },
    ];
    const createDefaultProps = () => ({
      merchants: mockMerchants,
      onSubmit: mock(() => Promise.resolve()),
      onCancel: mock(() => {}),
      onCreateMerchant: mock((name: string, emoji: string | null) => Promise.resolve("new-merchant-id")),
    });
    it("renders date picker with SELECT_DATE placeholder", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      const dateButton = screen.getByRole("button", { name: /select_date/i });
      expect(dateButton).toBeInTheDocument();
    });

    it("opens calendar when date picker button is clicked", () => {
      render(<ManualReceiptForm {...createDefaultProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /select_date/i }));

      expect(screen.getByText("JAN")).toBeInTheDocument();
    });
  });

  describe("Item management", () => {
    const mockMerchants = [
      { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
      { id: "m2", name: "CORPO_MART", emoji: "🏪" },
    ];
    const createDefaultProps = () => ({
      merchants: mockMerchants,
      onSubmit: mock(() => Promise.resolve()),
      onCancel: mock(() => {}),
      onCreateMerchant: mock((name: string, emoji: string | null) => Promise.resolve("new-merchant-id")),
    });
    const mockItems = [
      { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
      { id: "i2", name: "BEANS", unit: "bag", last_price: 3.25 },
    ];

    const propsWithItems = () => ({
      ...createDefaultProps(),
      items: mockItems,
      onCreateItem: mock(() => Promise.resolve("new-item-id")),
    });

    it("shows item selector with ADD_ITEM button", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      expect(screen.getByRole("button", { name: /add_item/i })).toBeInTheDocument();
    });

    it("adds an item row when an item is selected from the selector", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const qtyInputs = screen.getAllByLabelText("QTY");
      expect(qtyInputs).toHaveLength(1);
      expect((qtyInputs[0] as HTMLInputElement).value).toBe("1");
    });

    it("updates line total when quantity changes", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const qtyInput = screen.getByLabelText("QTY");
      fireEvent.change(qtyInput, { target: { value: "3" } });

      const totalSpans = screen.getAllByText("16.50");
      expect(totalSpans.length).toBeGreaterThanOrEqual(1);
    });

    it("updates line total when price changes", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const priceInput = screen.getByLabelText("PRICE");
      fireEvent.change(priceInput, { target: { value: "10" } });

      const totalSpans = screen.getAllByText("10.00");
      expect(totalSpans.length).toBeGreaterThanOrEqual(1);
    });

    it("removes an item row when remove button is clicked", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const qtyInputsBefore = screen.getAllByLabelText("QTY");
      expect(qtyInputsBefore).toHaveLength(1);

      const removeButton = screen.getByLabelText("Remove");
      fireEvent.click(removeButton);

      const qtyInputsAfter = screen.queryAllByLabelText("QTY");
      expect(qtyInputsAfter).toHaveLength(0);
    });

    it("allows adding multiple items", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("BEANS"));

      expect(screen.getAllByLabelText("QTY")).toHaveLength(2);
    });

    it("hides selected items from the selector", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      // Collapse and re-expand to see the selector list fresh
      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

      // BEANS should be in the selector, but RICE should only appear in the item row, not the selector
      const selectorContainer = screen.getByPlaceholderText(/search_items/i).closest('.bg-panel');
      expect(selectorContainer).not.toHaveTextContent("RICE");
      expect(selectorContainer).toHaveTextContent("BEANS");
    });

    it("re-adds removed items back to the selector", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      // Collapse, then remove the item from the form
      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByLabelText("Remove"));

      // Re-expand selector - RICE should be back in the list
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));

      const selectorContainer = screen.getByPlaceholderText(/search_items/i).closest('.bg-panel');
      expect(selectorContainer).toHaveTextContent("RICE");
    });
  });

  describe("Running total", () => {
    const mockItems = [
      { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
      { id: "i2", name: "BEANS", unit: "bag", last_price: 3.25 },
    ];

    const propsWithItems = () => ({
      ...createDefaultProps(),
      items: mockItems,
      onCreateItem: mock(() => Promise.resolve("new-item-id")),
    });

    it("shows running total when items are added", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      expect(screen.queryByText("// TOTAL //")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const totalLabel = screen.getByText("// TOTAL //");
      const totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("5.50");
    });

    it("updates running total when quantity changes", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      const qtyInput = screen.getByLabelText("QTY");
      fireEvent.change(qtyInput, { target: { value: "2" } });

      const totalLabel = screen.getByText("// TOTAL //");
      const totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("11.00");
    });

    it("updates running total when item is removed", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));
      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("BEANS"));

      let totalLabel = screen.getByText("// TOTAL //");
      let totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("8.75");

      const removeButtons = screen.getAllByLabelText("Remove");
      fireEvent.click(removeButtons[0]);

      totalLabel = screen.getByText("// TOTAL //");
      totalRow = totalLabel.closest('[class*="flex"]');
      expect(totalRow?.textContent).toContain("3.25");
    });

    it("hides running total when all items are removed", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      expect(screen.getByText("// TOTAL //")).toBeInTheDocument();

      const removeButton = screen.getByLabelText("Remove");
      fireEvent.click(removeButton);

      expect(screen.queryByText("// TOTAL //")).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    const mockItems = [
      { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
    ];

    const propsWithItems = () => ({
      ...createDefaultProps(),
      items: mockItems,
      onCreateItem: mock(() => Promise.resolve("new-item-id")),
    });

    it("shows error when submitting without merchant", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

      expect(screen.getByText(/merchant is required/i)).toBeInTheDocument();
    });

    it("shows error when submitting without date", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "m1" } });

      fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    });

    it("shows error when submitting without items", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "m1" } });

      fireEvent.click(screen.getByRole("button", { name: /select_date/i }));
      const dayButton = screen.getByText("01");
      fireEvent.click(dayButton);

      fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

      expect(screen.getByText(/at least one item is required/i)).toBeInTheDocument();
    });

    it("clears validation errors when fields are filled", () => {
      render(<ManualReceiptForm {...propsWithItems()} />);

      fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));
      expect(screen.getByText(/merchant is required/i)).toBeInTheDocument();

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "m1" } });

      expect(screen.queryByText(/merchant is required/i)).not.toBeInTheDocument();
    });

    it("does not call onSubmit when validation fails", () => {
      const onSubmitMock = mock(() => {});
      const props = { ...propsWithItems(), onSubmit: onSubmitMock };
      render(<ManualReceiptForm {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /log_receipt/i }));

      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });

  describe("Form submission", () => {
    const mockItems = [
      { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
    ];

    const fillRequiredFields = () => {
      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "m1" } });

      fireEvent.click(screen.getByRole("button", { name: /select_date/i }));
      const dayButton = screen.getByText("01");
      fireEvent.click(dayButton);

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));
    };

    it("calls onSubmit with merchantId, date, and items when form is valid", () => {
      const onSubmitMock = mock(() => {});
      const props = { ...createDefaultProps(), onSubmit: onSubmitMock, items: mockItems, onCreateItem: mock(() => Promise.resolve("new-item-id")) };
      render(<ManualReceiptForm {...props} />);

      fillRequiredFields();

      const submitButton = screen.getByRole("button", { name: /log_receipt/i });
      fireEvent.click(submitButton);

      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      const submittedData = onSubmitMock.mock.calls[0][0];
      expect(submittedData.merchantId).toBe("m1");
      expect(submittedData.date).toBeTruthy();
      expect(submittedData.items).toHaveLength(1);
      expect(submittedData.items[0].itemId).toBe("i1");
      expect(submittedData.items[0].qty).toBe("1");
      expect(submittedData.items[0].unitPrice).toBe(5.50);
      expect(submittedData.items[0].total).toBe(5.50);
    });

    it("includes correct totals when item quantity is changed", () => {
      const onSubmitMock = mock(() => {});
      const props = { ...createDefaultProps(), onSubmit: onSubmitMock, items: mockItems, onCreateItem: mock(() => Promise.resolve("new-item-id")) };
      render(<ManualReceiptForm {...props} />);

      fillRequiredFields();

      const qtyInput = screen.getByLabelText("QTY");
      fireEvent.change(qtyInput, { target: { value: "3" } });

      const submitButton = screen.getByRole("button", { name: /log_receipt/i });
      fireEvent.click(submitButton);

      const submittedData = onSubmitMock.mock.calls[0][0];
      expect(submittedData.items[0].qty).toBe("3");
      expect(submittedData.items[0].unitPrice).toBe(5.50);
      expect(submittedData.items[0].total).toBe(16.50);
    });

    it("includes multiple items in submission data", () => {
      const mockTwoItems = [
        { id: "i1", name: "RICE", unit: "kg", last_price: 5.50 },
        { id: "i2", name: "BEANS", unit: "bag", last_price: 3.25 },
      ];
      const onSubmitMock = mock(() => {});
      const props = { ...createDefaultProps(), onSubmit: onSubmitMock, items: mockTwoItems, onCreateItem: mock(() => Promise.resolve("new-item-id")) };
      render(<ManualReceiptForm {...props} />);

      const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
      fireEvent.change(merchantSelect, { target: { value: "m1" } });

      fireEvent.click(screen.getByRole("button", { name: /select_date/i }));
      fireEvent.click(screen.getByText("01"));

      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("RICE"));

      fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
      fireEvent.click(screen.getByRole("button", { name: /add_item/i }));
      fireEvent.click(screen.getByText("BEANS"));

      const submitButton = screen.getByRole("button", { name: /log_receipt/i });
      fireEvent.click(submitButton);

      const submittedData = onSubmitMock.mock.calls[0][0];
      expect(submittedData.items).toHaveLength(2);
      expect(submittedData.items[0].itemId).toBe("i1");
      expect(submittedData.items[1].itemId).toBe("i2");
    });

    it("does not call onSubmit when no merchant is selected", () => {
      const onSubmitMock = mock(() => {});
      render(<ManualReceiptForm {...createDefaultProps()} onSubmit={onSubmitMock} />);

      const submitButton = screen.getByRole("button", { name: /log_receipt/i });
      fireEvent.click(submitButton);

      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });
