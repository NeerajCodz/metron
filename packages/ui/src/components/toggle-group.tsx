import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface ToggleGroupContextValue {
  type: "single" | "multiple";
  value: string[];
  onItemToggle: (val: string) => void;
  disabled: boolean;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

export interface ToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple" | undefined;
  value?: string | string[] | undefined;
  defaultValue?: string | string[] | undefined;
  onValueChange?: ((value: string | string[]) => void) | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      type = "single",
      value: controlledValue,
      defaultValue,
      onValueChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const toArray = (val: string | string[] | undefined): string[] => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(() =>
      toArray(defaultValue),
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? toArray(controlledValue) : uncontrolledValue;

    const onItemToggle = (itemValue: string) => {
      if (disabled) return;
      let next: string[];
      if (type === "single") {
        next = value.includes(itemValue) ? [] : [itemValue];
      } else {
        next = value.includes(itemValue)
          ? value.filter((v) => v !== itemValue)
          : [...value, itemValue];
      }

      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(type === "single" ? (next[0] ?? "") : next);
    };

    return (
      <ToggleGroupContext.Provider value={{ type, value, onItemToggle, disabled }}>
        <div ref={ref} className={cn("metron-toggle-group", className)} role="group" {...props}>
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children?: ReactNode | undefined;
}

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, disabled = false, className, children, onClick, ...props }, ref) => {
    const context = useContext(ToggleGroupContext);
    const isPressed = Boolean(context?.value.includes(value));
    const isDisabled = disabled || Boolean(context?.disabled);

    return (
      <button
        ref={ref}
        aria-pressed={isPressed}
        className={cn("metron-toggle", className)}
        data-state={isPressed ? "on" : "off"}
        disabled={isDisabled}
        onClick={(e) => {
          onClick?.(e);
          if (!isDisabled) context?.onItemToggle(value);
        }}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
ToggleGroupItem.displayName = "ToggleGroupItem";
