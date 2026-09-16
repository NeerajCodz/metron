import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface ComboboxItem {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

export interface ComboboxProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: ComboboxItem[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyText?: ReactNode | undefined;
  disabled?: boolean | undefined;
}

export const Combobox = forwardRef<HTMLDivElement, ComboboxProps>(
  (
    {
      items,
      value: controlledValue,
      defaultValue = "",
      onValueChange,
      placeholder = "Select...",
      searchPlaceholder = "Search...",
      emptyText = "No results found.",
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const filteredItems = items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()),
    );

    const selectedItem = items.find((item) => item.value === value);

    const handleSelect = (itemVal: string) => {
      if (!isControlled) setUncontrolledValue(itemVal);
      onValueChange?.(itemVal);
      setOpen(false);
    };

    return (
      <div
        ref={ref}
        className={cn("metron-combobox", className)}
        style={{ position: "relative", width: "100%" }}
        {...props}
      >
        <button
          aria-expanded={open}
          className="metron-select-trigger"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span>{selectedItem?.label ?? placeholder}</span>
          <span aria-hidden="true" style={{ opacity: 0.6 }}>
            ▾
          </span>
        </button>

        {open && (
          <div
            className="metron-select-content"
            style={{ width: "100%", marginTop: "0.25rem", zIndex: 60 }}
          >
            <div style={{ padding: "0.25rem" }}>
              <input
                className="metron-input"
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{ height: "2.25rem", padding: "0.35rem 0.65rem", fontSize: "0.85rem" }}
                type="text"
                value={search}
              />
            </div>
            <div style={{ maxHeight: "12rem", overflowY: "auto", marginTop: "0.25rem" }}>
              {filteredItems.length === 0 ? (
                <div style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.85rem", opacity: 0.6 }}>
                  {emptyText}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.value === value;
                  return (
                    <div
                      key={item.value}
                      className="metron-select-item"
                      data-highlighted={isSelected || undefined}
                      onClick={() => handleSelect(item.value)}
                    >
                      <span>{item.label}</span>
                      {isSelected && <span aria-hidden="true">✓</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

Combobox.displayName = "Combobox";
