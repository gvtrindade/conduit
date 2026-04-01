'use client';

import { useState, useRef, useEffect } from 'react';

interface ReceiptItemRowProps {
  itemName: string;
  qty: string;
  unitPrice: number;
  onQtyChange: (qty: string) => void;
  onPriceChange: (price: number) => void;
  onRemove: () => void;
}

export default function ReceiptItemRow({
  itemName,
  qty,
  unitPrice,
  onQtyChange,
  onPriceChange,
  onRemove,
}: ReceiptItemRowProps) {
  const lineTotal = (parseFloat(qty) || 0) * unitPrice;

  const [priceDisplay, setPriceDisplay] = useState(String(unitPrice));
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    if (!priceFocusedRef.current) {
      setPriceDisplay(String(unitPrice));
    }
  }, [unitPrice]);

  const handlePriceFocus = () => {
    priceFocusedRef.current = true;
    if (priceDisplay === "0") {
      setPriceDisplay("");
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceDisplay(e.target.value);
    onPriceChange(parseFloat(e.target.value) || 0);
  };

  const handlePriceBlur = () => {
    priceFocusedRef.current = false;
    if (priceDisplay === "") {
      setPriceDisplay("0");
      onPriceChange(0);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_52px_52px_62px_28px] px-3.5 py-2.5 border-b border-border-custom last:border-b-0 gap-2 items-start hover:bg-panel2 transition-colors">
      <div className="pt-1">
        <div className="text-xs font-medium text-cream leading-snug">{itemName}</div>
      </div>
      <input
        type="number"
        aria-label="QTY"
        value={qty}
        onChange={(e) => onQtyChange(e.target.value)}
        onFocus={() => { if (qty === "0") onQtyChange(""); }}
        onBlur={() => { if (qty === "") onQtyChange("0"); }}
        min="0"
        step="1"
        className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-1.5 py-1 font-heading text-xs text-sand text-right outline-none focus:border-amber transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <input
        type="number"
        aria-label="PRICE"
        value={priceDisplay}
        onChange={handlePriceChange}
        onFocus={handlePriceFocus}
        onBlur={handlePriceBlur}
        min="0"
        step="0.01"
        className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-1.5 py-1 font-heading text-xs text-sand text-right outline-none focus:border-amber transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="font-heading text-xs font-bold text-cream text-right pt-px">{lineTotal.toFixed(2)}</span>
      <button
        type="button"
        aria-label="Remove"
        onClick={onRemove}
        className="flex items-center justify-center text-sand hover:text-red transition-colors cursor-pointer"
      >
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
}
