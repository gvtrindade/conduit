import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import ReceiptItemRow from "@/components/receipt-item-row";

afterEach(cleanup);

describe("ReceiptItemRow", () => {
  const defaultProps = () => ({
    itemName: "MEDKIT_BASIC",
    qty: "2",
    unitPrice: 150,
    onQtyChange: mock(() => {}),
    onPriceChange: mock(() => {}),
    onRemove: mock(() => {}),
  });

  describe("renders all elements", () => {
    it("displays the item name as read-only text", () => {
      render(<ReceiptItemRow {...defaultProps()} />);
      expect(screen.getByText("MEDKIT_BASIC")).toBeInTheDocument();
    });

    it("renders qty input with correct value", () => {
      render(<ReceiptItemRow {...defaultProps()} />);
      const qtyInput = screen.getByRole("spinbutton", { name: /qty/i });
      expect(qtyInput).toBeInTheDocument();
      expect((qtyInput as HTMLInputElement).value).toBe("2");
    });

    it("renders price input with correct value", () => {
      render(<ReceiptItemRow {...defaultProps()} />);
      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      expect(priceInput).toBeInTheDocument();
      expect((priceInput as HTMLInputElement).value).toBe("150");
    });

    it("displays computed line total", () => {
      render(<ReceiptItemRow {...defaultProps()} />);
      expect(screen.getByText("300.00")).toBeInTheDocument();
    });

    it("renders a remove button", () => {
      render(<ReceiptItemRow {...defaultProps()} />);
      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });
  });

  describe("qty input change", () => {
    it("calls onQtyChange with new value", () => {
      const onQtyChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} onQtyChange={onQtyChange} />);
      const qtyInput = screen.getByRole("spinbutton", { name: /qty/i });
      fireEvent.change(qtyInput, { target: { value: "5" } });
      expect(onQtyChange).toHaveBeenCalledWith("5");
    });
  });

  describe("price input change", () => {
    it("calls onPriceChange with new value as number", () => {
      const onPriceChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} onPriceChange={onPriceChange} />);
      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      fireEvent.change(priceInput, { target: { value: "200" } });
      expect(onPriceChange).toHaveBeenCalledWith(200);
    });
  });

  describe("computed line total", () => {
    it("updates when qty prop changes", () => {
      const { rerender } = render(<ReceiptItemRow {...defaultProps()} />);
      expect(screen.getByText("300.00")).toBeInTheDocument();
      rerender(<ReceiptItemRow {...defaultProps()} qty="3" />);
      expect(screen.getByText("450.00")).toBeInTheDocument();
    });

    it("updates when price prop changes", () => {
      const { rerender } = render(<ReceiptItemRow {...defaultProps()} />);
      expect(screen.getByText("300.00")).toBeInTheDocument();
      rerender(<ReceiptItemRow {...defaultProps()} unitPrice={200} />);
      expect(screen.getByText("400.00")).toBeInTheDocument();
    });

    it("shows 0.00 when qty is empty", () => {
      render(<ReceiptItemRow {...defaultProps()} qty="" />);
      expect(screen.getByText("0.00")).toBeInTheDocument();
    });
  });

  describe("remove button", () => {
    it("calls onRemove when clicked", () => {
      const onRemove = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} onRemove={onRemove} />);
      fireEvent.click(screen.getByRole("button", { name: /remove/i }));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("clear zero on focus", () => {
    it("clears qty input to empty when focused and value is \"0\"", () => {
      const onQtyChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} qty="0" onQtyChange={onQtyChange} />);
      const qtyInput = screen.getByRole("spinbutton", { name: /qty/i });
      fireEvent.focus(qtyInput);
      expect(onQtyChange).toHaveBeenCalledWith("");
    });

    it("clears price input to empty when focused and value is 0", () => {
      render(<ReceiptItemRow {...defaultProps()} unitPrice={0} />);
      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      fireEvent.focus(priceInput);
      expect((priceInput as HTMLInputElement).value).toBe("");
    });

    it("does not clear qty input when focused and value is non-zero", () => {
      const onQtyChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} qty="5" onQtyChange={onQtyChange} />);
      const qtyInput = screen.getByRole("spinbutton", { name: /qty/i });
      fireEvent.focus(qtyInput);
      expect(onQtyChange).not.toHaveBeenCalled();
    });

    it("does not clear price input when focused and value is non-zero", () => {
      render(<ReceiptItemRow {...defaultProps()} unitPrice={100} />);
      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      fireEvent.focus(priceInput);
      expect((priceInput as HTMLInputElement).value).toBe("100");
    });

    it("restores qty to \"0\" on blur if left empty", () => {
      const onQtyChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} qty="" onQtyChange={onQtyChange} />);
      const qtyInput = screen.getByRole("spinbutton", { name: /qty/i });
      fireEvent.blur(qtyInput);
      expect(onQtyChange).toHaveBeenCalledWith("0");
    });

    it("restores price to 0 on blur if left empty", () => {
      const onPriceChange = mock(() => {});
      render(<ReceiptItemRow {...defaultProps()} unitPrice={0} onPriceChange={onPriceChange} />);
      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      fireEvent.focus(priceInput);
      fireEvent.blur(priceInput);
      expect(onPriceChange).toHaveBeenCalledWith(0);
    });
  });
});
