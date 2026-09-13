"use client";
import { useState, type KeyboardEvent } from "react";
import { Add01Icon, Cancel01Icon } from "hugeicons-react";

interface TagListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export default function TagListEditor({ label, items, onChange, placeholder }: TagListEditorProps) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(items.filter((i) => i !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[#8A8271]">{label}</p>
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {items.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-md bg-[#E4E9DC] px-2 py-1 text-[11px] font-medium text-[#3F5A43]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-[#4F6B52] hover:text-[#B5654B] transition-colors"
                aria-label={`Hapus ${tag}`}
              >
                <Cancel01Icon size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Tambah item lalu Enter"}
          className="flex-1 rounded-lg border border-[#E2D9C2] px-3 py-1.5 text-xs text-[#1D1B16] placeholder:text-[#A39C89] outline-none focus:ring-2 focus:ring-[#B4884F]/50 focus:border-[#B4884F] transition-all"
        />
        <button
          type="button"
          onClick={addTag}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4F6B52] text-white hover:bg-[#3F5A43] transition-colors"
          aria-label={`Tambah ${label}`}
        >
          <Add01Icon size={14} />
        </button>
      </div>
    </div>
  );
}