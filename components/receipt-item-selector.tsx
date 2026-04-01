'use client';

import { useState } from 'react';

export interface ItemOption {
  id: string;
  name: string;
  unit: string;
  last_price: number | null;
}

interface ReceiptItemSelectorProps {
  items: ItemOption[];
  selectedIds?: string[];
  onSelect: (item: ItemOption) => void;
  onCreateItem: (data: { name: string; unit: string }) => Promise<string>;
}

export function ReceiptItemSelector({
  items,
  selectedIds = [],
  onSelect,
  onCreateItem,
}: ReceiptItemSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createUnit, setCreateUnit] = useState('');
  const [nameError, setNameError] = useState(false);

  const filteredItems = items
    .filter((item) => !selectedIds.includes(item.id))
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );

  const handleCreate = async () => {
    if (!createName.trim()) {
      setNameError(true);
      return;
    }
    const id = await onCreateItem({ name: createName.trim(), unit: createUnit.trim() });
    onSelect({ id, name: createName.trim(), unit: createUnit.trim(), last_price: null });
    setShowCreate(false);
    setCreateName('');
    setCreateUnit('');
    setNameError(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-sand cursor-pointer hover:border-amber hover:text-cream transition-colors"
      >
        // ADD_ITEM //
      </button>
    );
  }

  if (showCreate) {
    return (
      <div className="space-y-2">
        <div>
          <label
            htmlFor="receipt-item-name"
            className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
          >
            // NAME <span className="text-red">*</span> //
          </label>
          <input
            id="receipt-item-name"
            type="text"
            value={createName}
            onChange={(e) => { setCreateName(e.target.value); setNameError(false); }}
            className={`w-full bg-hull border-[1.5px] rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2 ${nameError ? 'border-red' : 'border-border-custom'}`}
            placeholder="ITEM_NAME"
          />
          {nameError && (
            <div className="font-mono text-[9px] text-red mt-1">NAME IS REQUIRED</div>
          )}
        </div>
        <div>
          <label
            htmlFor="receipt-item-unit"
            className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
          >
            // UNIT //
          </label>
          <input
            id="receipt-item-unit"
            type="text"
            value={createUnit}
            onChange={(e) => setCreateUnit(e.target.value)}
            className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
            placeholder="UNIT"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowCreate(false); setCreateName(''); setCreateUnit(''); setNameError(false); }}
            className="flex-1 bg-hull border-[1.5px] border-border-custom rounded-lg py-2 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-sand cursor-pointer hover:text-cream hover:border-sand transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex-[2] bg-amber border-2 border-[#C07830] rounded-lg py-2 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
            style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
          >
            [ CREATE_ITEM ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border-[1.5px] border-border-custom rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border-custom">
        <span className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand">// SELECT_ITEM //</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="font-mono text-[9px] text-sand cursor-pointer hover:text-cream transition-colors"
        >
          // COLLAPSE //
        </button>
      </div>

      <div className="px-3.5 py-2 border-b border-border-custom">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH_ITEMS..."
          className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
        />
      </div>

      <div className="max-h-48 overflow-y-auto scrollbar-none">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full text-left px-3.5 py-2.5 border-b border-border-custom last:border-b-0 hover:bg-panel2 transition-colors cursor-pointer"
          >
            <div className="font-mono text-xs text-cream">{item.name}</div>
            <div className="font-mono text-[9px] text-sand mt-0.5">
              {item.unit}{item.last_price != null ? ` // ${item.last_price} kCr` : ''}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="w-full text-left px-3.5 py-2.5 font-mono text-xs text-amber cursor-pointer hover:bg-panel2 transition-colors"
      >
        + Create new item...
      </button>
    </div>
  );
}

export default ReceiptItemSelector;
