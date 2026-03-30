'use client';

import { useState } from 'react';

export interface Category {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ItemFormData {
  name: string;
  codename: string;
  emoji: string;
  category: string | null;
  category_custom?: string;
  tags?: string[];
  primary_tag_id?: string | null;
  primary_tag_custom?: string;
  unit: string;
}

interface ItemFormProps {
  categories: Category[] | string[];
  tags: Tag[] | string[];
  initialData?: Partial<ItemFormData>;
  mode: 'create' | 'edit';
  onSubmit: (data: ItemFormData) => void;
  onCancel?: () => void;
}

// Helper to normalize category/tag items to {id, name} format
function normalizeCategories(categories: Category[] | string[]): { id: string; name: string }[] {
  return categories.map((cat) =>
    typeof cat === 'string' ? { id: cat, name: cat } : cat
  );
}

function normalizeTags(tags: Tag[] | string[]): { id: string; name: string }[] {
  return tags.map((tag) =>
    typeof tag === 'string' ? { id: tag, name: tag } : tag
  );
}

export function ItemForm({
  categories,
  tags,
  initialData,
  mode,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const normalizedCategories = normalizeCategories(categories);
  const normalizedTags = normalizeTags(tags);

  const [name, setName] = useState(initialData?.name ?? '');
  const [codename, setCodename] = useState(initialData?.codename ?? '');
  const [emoji, setEmoji] = useState(initialData?.emoji ?? '📦');
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.category 
      ? normalizedCategories.find(c => c.name === initialData.category)?.id ?? initialData.category as string
      : ''
  );
  const [categoryCustom, setCategoryCustom] = useState(initialData?.category_custom ?? '');
  const [primaryTagId, setPrimaryTagId] = useState<string>(
    initialData?.tags?.[0]
      ? normalizedTags.find(t => t.name === initialData.tags?.[0])?.id ?? initialData.tags[0]
      : ''
  );
  const [primaryTagCustom, setPrimaryTagCustom] = useState(initialData?.primary_tag_custom ?? '');
  const [unit, setUnit] = useState(initialData?.unit ?? '');
  const [nameError, setNameError] = useState(false);

  // Handle "Other..." selection for category
  const showCategoryCustom = categoryId === 'other';
  const showTagCustom = primaryTagId === 'other';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required name field
    if (!name.trim()) {
      setNameError(true);
      return;
    }

    setNameError(false);

    // Build the form data based on whether custom values are used
    const formData: ItemFormData = {
      name: name.trim(),
      codename: codename.trim(),
      emoji,
      category: showCategoryCustom ? null : (categoryId || null),
      unit: unit.trim(),
    };

    // Add custom category if "Other..." was selected
    if (showCategoryCustom && categoryCustom.trim()) {
      formData.category_custom = categoryCustom.trim();
    }

    // Add tags if selected
    if (showTagCustom && primaryTagCustom.trim()) {
      formData.primary_tag_custom = primaryTagCustom.trim();
      formData.tags = [primaryTagCustom.trim()];
    } else if (primaryTagId) {
      const selectedTag = normalizedTags.find(t => t.id === primaryTagId);
      if (selectedTag) {
        formData.tags = [selectedTag.name];
      }
    }

    onSubmit(formData);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      setNameError(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name - Required */}
      <div>
        <label 
          htmlFor="item-name" 
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
        >
          // NAME <span className="text-red">*</span> //
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className={`w-full bg-hull border-[1.5px] rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2 ${
            nameError ? 'border-red' : 'border-border-custom'
          }`}
          placeholder="MEDKIT_BASIC"
        />
        {nameError && (
          <div className="font-mono text-[9px] text-red mt-1">NAME IS REQUIRED</div>
        )}
      </div>

      {/* Codename */}
      <div>
        <label 
          htmlFor="item-codename" 
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
        >
          // CODE_NAME //
        </label>
        <input
          id="item-codename"
          type="text"
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
          className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
          placeholder="MK-001"
        />
      </div>

      {/* Emoji */}
      <div>
        <label 
          htmlFor="item-emoji" 
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
        >
          // EMOJI //
        </label>
        <input
          id="item-emoji"
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
          placeholder="📦"
          maxLength={2}
        />
      </div>

      {/* Category */}
      <div>
        {showCategoryCustom ? (
          <>
            <label 
              htmlFor="item-category-custom" 
              className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
            >
              // CUSTOM CATEGORY //
            </label>
            <input
              id="item-category-custom"
              type="text"
              value={categoryCustom}
              onChange={(e) => setCategoryCustom(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
              placeholder="ENTER_CATEGORY"
            />
          </>
        ) : (
          <>
            <label 
              htmlFor="item-category" 
              className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
            >
              // CATEGORY //
            </label>
            <select
              id="item-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors"
            >
              <option value="">SELECT_CATEGORY</option>
              {normalizedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="other">Other...</option>
            </select>
          </>
        )}
      </div>

      {/* Primary Tag */}
      <div>
        {showTagCustom ? (
          <>
            <label 
              htmlFor="item-tag-custom" 
              className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
            >
              // CUSTOM TAG //
            </label>
            <input
              id="item-tag-custom"
              type="text"
              value={primaryTagCustom}
              onChange={(e) => setPrimaryTagCustom(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
              placeholder="ENTER_TAG"
            />
          </>
        ) : (
          <>
            <label 
              htmlFor="item-tag" 
              className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
            >
              // TAG //
            </label>
            <select
              id="item-tag"
              value={primaryTagId}
              onChange={(e) => setPrimaryTagId(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors"
            >
              <option value="">SELECT_TAG</option>
              {normalizedTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
              <option value="other">Other...</option>
            </select>
          </>
        )}
      </div>

      {/* Unit */}
      <div>
        <label 
          htmlFor="item-unit" 
          className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1"
        >
          // UNIT //
        </label>
        <input
          id="item-unit"
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3 py-2 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
          placeholder="BOXES"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-hull border-[1.5px] border-border-custom rounded-md py-3 font-mono text-xs font-bold tracking-[0.12em] uppercase text-sand cursor-pointer hover:text-cream hover:border-sand transition-all"
          >
            CANCEL
          </button>
        )}
        <button
          type="submit"
          className="flex-1 bg-amber border-2 border-[#C07830] rounded-md py-3 font-mono text-xs font-bold tracking-[0.12em] uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
          style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
        >
          {mode === 'create' ? 'CREATE' : 'SAVE'}
        </button>
      </div>
    </form>
  );
}

export default ItemForm;
