import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";

import { cn } from "../lib/cn.js";

export interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "checked" | "onChange"> {
  checked?: boolean | "indeterminate" | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (disabled) return;
      const next = isChecked === "indeterminate" ? true : !isChecked;
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        aria-checked={isChecked === "indeterminate" ? "mixed" : isChecked}
        className={cn("metron-checkbox", className)}
        data-state={
          isChecked === "indeterminate" ? "indeterminate" : isChecked ? "checked" : "unchecked"
        }
        disabled={disabled}
        onClick={handleClick}
        role="checkbox"
        type="button"
        {...props}
      >
        {isChecked && (
          <span className="metron-checkbox-indicator">
            {isChecked === "indeterminate" ? (
              <svg
                fill="none"
                height="12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                width="12"
              >
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
            ) : (
              <svg
                fill="none"
                height="12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                width="12"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        )}
      </button>
    );
  },
);

Checkbox.displayName = "Checkbox";
