import {
  forwardRef,
  useState,
  type HTMLAttributes,
} from "react";

import { cn } from "../lib/cn.js";
import { Calendar } from "./calendar.js";

export interface DatePickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: Date | undefined;
  defaultValue?: Date | undefined;
  onValueChange?: ((date: Date) => void) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onValueChange,
      placeholder = "Pick a date",
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [uncontrolledValue, setUncontrolledValue] = useState<Date | undefined>(defaultValue);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleSelect = (date: Date) => {
      if (!isControlled) setUncontrolledValue(date);
      onValueChange?.(date);
      setOpen(false);
    };

    const formattedDate = value ? value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

    return (
      <div
        ref={ref}
        className={cn("metron-date-picker", className)}
        style={{ position: "relative", display: "inline-block" }}
        {...props}
      >
        <button
          aria-expanded={open}
          className="metron-select-trigger"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span>{formattedDate ?? placeholder}</span>
          <span aria-hidden="true" style={{ opacity: 0.6, marginLeft: "0.5rem" }}>
            📅
          </span>
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 0.5rem)",
              left: 0,
              zIndex: 60,
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
            }}
          >
            <Calendar onValueChange={handleSelect} value={value} />
          </div>
        )}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
