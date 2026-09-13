"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown01Icon } from "hugeicons-react";

export type TagMultiSelectOption = {
    id: string;
    name: string;
    color?: string;
};

type TagMultiSelectProps = {
    options: TagMultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
};

export function TagMultiSelect({
    options,
    selected,
    onChange,
    placeholder,
}: TagMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    function toggleValue(id: string) {
        if (selected.includes(id)) {
            onChange(selected.filter((s) => s !== id));
        } else {
            onChange([...selected, id]);
        }
    }

    const selectedItems = options.filter((o) => selected.includes(o.id));

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white py-1.5 pl-2 pr-8 text-left transition-colors ${open
                        ? "border-[#4F6B52] shadow-[0_0_0_1px_#4F6B52]"
                        : "border-[#E2D9C2] hover:border-[#4F6B52]"
                    }`}
            >
                {selectedItems.length === 0 ? (
                    <span className="px-1 text-sm text-[#8A8271]">{placeholder}</span>
                ) : (
                    <>
                        {selectedItems.slice(0, 2).map((item) => (
                            <span
                                key={item.id}
                                className="inline-flex items-center gap-1 rounded-md bg-[#E4E9DC] px-2 py-0.5 text-xs font-medium text-[#4F6B52]"
                            >
                                {item.name}
                            </span>
                        ))}
                        {selectedItems.length > 2 && (
                            <span className="px-1 text-xs text-[#8A8271]">
                                +{selectedItems.length - 2} more
                            </span>
                        )}
                    </>
                )}
            </button>
            <ArrowDown01Icon
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8271] transition-transform ${open ? "rotate-180" : ""
                    }`}
            />
            {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[220px] overflow-y-auto rounded-[10px] border border-[#E2D9C2] bg-white p-1.5 shadow-[0_12px_32px_rgba(20,34,25,0.14)]">
                    {options.map((option) => (
                        <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#1D1B16] hover:bg-[#F7F4EA]"
                        >
                            <input
                                type="checkbox"
                                className="h-[15px] w-[15px] cursor-pointer accent-[#4F6B52]"
                                checked={selected.includes(option.id)}
                                onChange={() => toggleValue(option.id)}
                            />
                            {option.color && (
                                <span
                                    className="h-2 w-2 flex-shrink-0 rounded-full"
                                    style={{ background: option.color }}
                                />
                            )}
                            {option.name}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}