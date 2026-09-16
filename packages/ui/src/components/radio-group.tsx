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

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      value: controlledValue,
      defaultValue = "",
      onValueChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    };

    return (
      <RadioGroupContext.Provider
        value={{ value, onValueChange: handleValueChange, disabled }}
      >
        <div ref={ref} className={cn("metron-radio-group", className)} role="radiogroup" {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, disabled = false, className, onClick, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const isChecked = context?.value === value;
    const isDisabled = disabled || Boolean(context?.disabled);

    return (
      <button
        ref={ref}
        aria-checked={isChecked}
        className={cn("metron-radio-item", className)}
        data-state={isChecked ? "checked" : "unchecked"}
        disabled={isDisabled}
        onClick={(e) => {
          onClick?.(e);
          if (!isDisabled) context?.onValueChange(value);
        }}
        role="radio"
        type="button"
        {...props}
      >
        {isChecked && <span className="metron-radio-indicator" />}
      </button>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";
