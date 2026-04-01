'use client';

import { useState } from 'react';
import { DatePicker } from './date-picker';
import { ReceiptItemSelector, type ItemOption } from './receipt-item-selector';
import ReceiptItemRow from './receipt-item-row';

export interface Merchant {
  id: string;
  name: string;
  emoji: string | null;
}

export interface ReceiptSubmitItem {
  itemId: string;
  qty: string;
  unitPrice: number;
  total: number;
}

export interface ReceiptSubmitData {
  merchantId: string;
  date: string;
  items: ReceiptSubmitItem[];
}

interface ManualReceiptFormProps {
  merchants: Merchant[];
  onSubmit: (data: ReceiptSubmitData) => void;
  onCancel?: () => void;
  onCreateMerchant: (name: string, emoji: string | null) => Promise<string>;
  items?: ItemOption[];
  onCreateItem?: (data: { name: string; unit: string }) => Promise<string>;
}

export function ManualReceiptForm({
  merchants,
  onSubmit,
  onCancel,
  onCreateMerchant,
  items = [],
  onCreateItem,
}: ManualReceiptFormProps) {
  const [merchantId, setMerchantId] = useState('');
  const [showMerchantCustom, setShowMerchantCustom] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [merchantEmoji, setMerchantEmoji] = useState('');
  const [newlyCreatedMerchants, setNewlyCreatedMerchants] = useState<Merchant[]>([]);

  const [receiptDate, setReceiptDate] = useState('');
  const [formItems, setFormItems] = useState<Array<{ id: string; item: ItemOption; qty: string; unitPrice: number }>>([]);
  const [errors, setErrors] = useState<{ merchant?: string; date?: string; items?: string }>({});

  // Merge merchants from props and locally created ones, deduplicating by id
  const allMerchants = Array.from(new Map([...merchants, ...newlyCreatedMerchants].map(m => [m.id, m])).values());

  const validate = () => {
    const newErrors: { merchant?: string; date?: string; items?: string } = {};
    if (!merchantId) {
      newErrors.merchant = 'MERCHANT IS REQUIRED';
    }
    if (!receiptDate) {
      newErrors.date = 'DATE IS REQUIRED';
    }
    if (formItems.length === 0) {
      newErrors.items = 'AT LEAST ONE ITEM IS REQUIRED';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        merchantId,
        date: receiptDate,
        items: formItems.map(fi => ({
          itemId: fi.item.id,
          qty: fi.qty,
          unitPrice: fi.unitPrice,
          total: (parseFloat(fi.qty) || 0) * fi.unitPrice,
        })),
      });
    }
  };

  const handleMerchantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'other') {
      setShowMerchantCustom(true);
    } else {
      setShowMerchantCustom(false);
      setMerchantId(e.target.value);
    }
  };

  const handleCreateMerchant = async () => {
    if (!merchantName.trim()) return;
    const emoji = merchantEmoji.trim() || null;
    const newId = await onCreateMerchant(merchantName.trim(), emoji);
    const newMerchant: Merchant = { id: newId, name: merchantName.trim(), emoji };
    setNewlyCreatedMerchants(prev => [...prev, newMerchant]);
    setMerchantId(newId);
    setShowMerchantCustom(false);
    setMerchantName('');
    setMerchantEmoji('');
  };

  const handleItemSelect = (item: ItemOption) => {
    setFormItems(prev => [...prev, {
      id: crypto.randomUUID(),
      item,
      qty: '1',
      unitPrice: item.last_price ?? 0,
    }]);
  };

  const handleItemQtyChange = (itemId: string, qty: string) => {
    setFormItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, qty } : i
    ));
  };

  const handleItemPriceChange = (itemId: string, price: number) => {
    setFormItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, unitPrice: price } : i
    ));
  };

  const handleItemRemove = (itemId: string) => {
    setFormItems(prev => prev.filter(i => i.id !== itemId));
  };

  const runningTotal = formItems.reduce((sum, i) => {
    return sum + (parseFloat(i.qty) || 0) * i.unitPrice;
  }, 0);

  const selectedItemIds = formItems.map(fi => fi.item.id);

  return (
    <div className="space-y-3">
      {/* Merchant Dropdown */}
      <div>
        <label
          htmlFor="receipt-merchant"
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5"
        >
          // MERCHANT //
        </label>
        {showMerchantCustom ? (
          <div className="space-y-2">
            <div>
              <label
                htmlFor="receipt-merchant-name"
                className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5"
              >
                // MERCHANT_NAME //
              </label>
              <input
                id="receipt-merchant-name"
                type="text"
                value={merchantName}
                onChange={(e) => { setMerchantName(e.target.value); setErrors(prev => ({ ...prev, merchant: undefined })); }}
                className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
                placeholder="ENTER_MERCHANT_NAME"
              />
            </div>
            <div>
              <label
                htmlFor="receipt-merchant-emoji"
                className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5"
              >
                // MERCHANT_EMOJI //
              </label>
              <input
                id="receipt-merchant-emoji"
                type="text"
                value={merchantEmoji}
                onChange={(e) => setMerchantEmoji(e.target.value)}
                className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
                placeholder="OPTIONAL_EMOJI"
                maxLength={2}
              />
            </div>
            <button
              type="button"
              onClick={handleCreateMerchant}
              className="w-full bg-amber border-2 border-[#C07830] rounded-lg py-2 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
              style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
            >
              [ CREATE_MERCHANT ]
            </button>
          </div>
        ) : (
          <div>
            <select
              id="receipt-merchant"
              value={merchantId}
              onChange={(e) => { handleMerchantChange(e); setErrors(prev => ({ ...prev, merchant: undefined })); }}
              className={`w-full bg-hull border-[1.5px] rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors ${errors.merchant ? 'border-red' : 'border-border-custom'}`}
            >
              <option value="">SELECT_MERCHANT</option>
              {allMerchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji ? `${m.emoji} ${m.name}` : m.name}
                </option>
              ))}
              <option value="other">Other...</option>
            </select>
            {errors.merchant && (
              <div className="font-mono text-[9px] text-red mt-1">{errors.merchant}</div>
            )}
          </div>
        )}
      </div>

      {/* Date Picker */}
      <div>
        <label
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5"
        >
          // DATE //
        </label>
        <div className={errors.date ? 'border-red border rounded-md p-0.5' : ''}>
          <DatePicker
            value={receiptDate}
            onChange={(date) => { setReceiptDate(date); setErrors(prev => ({ ...prev, date: undefined })); }}
          />
        </div>
        {errors.date && (
          <div className="font-mono text-[9px] text-red mt-1">{errors.date}</div>
        )}
      </div>

      {/* Items Section */}
      <div>
        <label
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5"
        >
          // ITEMS //
        </label>
        <ReceiptItemSelector
          items={items}
          selectedIds={selectedItemIds}
          onSelect={handleItemSelect}
          onCreateItem={onCreateItem ?? (async () => '')}
        />
        {errors.items && (
          <div className="font-mono text-[9px] text-red mt-1">{errors.items}</div>
        )}
        {formItems.length > 0 && (
          <div className="mt-2 border border-border-custom rounded-md overflow-hidden">
            {formItems.map((fi) => (
              <ReceiptItemRow
                key={fi.id}
                itemName={fi.item.name}
                qty={fi.qty}
                unitPrice={fi.unitPrice}
                onQtyChange={(qty) => handleItemQtyChange(fi.id, qty)}
                onPriceChange={(price) => handleItemPriceChange(fi.id, price)}
                onRemove={() => handleItemRemove(fi.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Running Total */}
      {formItems.length > 0 && (
        <div className="flex justify-between items-center px-2 py-1.5 bg-panel2 border border-border-custom rounded-md">
          <span className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand">// TOTAL //</span>
          <span className="font-mono text-xs font-bold text-amber">{runningTotal.toFixed(2)}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full bg-amber border-2 border-[#C07830] rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
        style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
      >
        [ LOG_RECEIPT ]
      </button>
    </div>
  );
}

export default ManualReceiptForm;
