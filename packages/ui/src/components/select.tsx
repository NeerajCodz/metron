import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { cn } from "../lib/cn.js";

interface SelectContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (val: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((val: string) => void) | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children?: ReactNode | undefined;
}

export function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlledVal = controlledValue !== undefined;
  const value = isControlledVal ? controlledValue : uncontrolledValue;

  const isControlledOpen = controlledOpen !== undefined;
  const open = isControlledOpen ? controlledOpen : uncontrolledOpen;

  const handleOpen = (next: boolean) => {
    if (!isControlledOpen) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const handleVal = (next: string) => {
    if (!isControlledVal) setUncontrolledValue(next);
    onValueChange?.(next);
    handleOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{ open, setOpen: handleOpen, value, onValueChange: handleVal }}
    >
      <div className="metron-select-root" style={{ position: "relative" }}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(SelectContext);
    return (
      <button
        ref={ref}
        aria-expanded={context?.open}
        aria-haspopup="listbox"
        className={cn("metron-select-trigger", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.setOpen(!context.open);
        }}
        type="button"
        {...props}
      >
        {children}
        <span aria-hidden="true" style={{ opacity: 0.6, marginLeft: "0.5rem" }}>
          ▾
        </span>
      </button>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: string | undefined;
}

export function SelectValue({ placeholder = "Select an option..." }: SelectValueProps) {
  const context = useContext(SelectContext);
  return <span>{context?.value || placeholder}</span>;
}

export interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(SelectContext);
    if (!context?.open) return null;

    return (
      <div
        ref={ref}
        className={cn("metron-select-content", className)}
        role="listbox"
        {...props}
      >
        {children}
      </div>
    );
  },
);
SelectContent.displayName = "SelectContent";

export interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children?: ReactNode | undefined;
}

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const context = useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
      <div
        ref={ref}
        aria-selected={isSelected}
        className={cn("metron-select-item", className)}
        data-highlighted={isSelected || undefined}
        onClick={(e) => {
          onClick?.(e);
          context?.onValueChange(value);
        }}
        role="option"
        {...props}
      >
        <span>{children}</span>
        {isSelected && <span aria-hidden="true">✓</span>}
      </div>
    );
  },
);
SelectItem.displayName = "SelectItem";

export const SelectGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-select-group", className)} {...props} />
  ),
);
SelectGroup.displayName = "SelectGroup";

export const SelectLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-command-group-heading", className)} {...props} />
  ),
);
SelectLabel.displayName = "SelectLabel";

export const SelectSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-separator metron-separator--horizontal", className)} {...props} />
  ),
);
SelectSeparator.displayName = "SelectSeparator";

/* Native Select */
export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode | undefined;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select ref={ref} className={cn("metron-select", className)} {...props}>
        {children}
      </select>
    );
  },
);
NativeSelect.displayName = "NativeSelect";
