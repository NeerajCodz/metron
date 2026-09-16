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

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export interface PopoverProps {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children: ReactNode;
}

export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen: handleOpen }}>
      <div style={{ position: "relative", display: "inline-block" }}>{children}</div>
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(PopoverContext);
    return (
      <button
        ref={ref}
        aria-expanded={context?.open}
        aria-haspopup="dialog"
        className={className}
        onClick={(e) => {
          onClick?.(e);
          context?.setOpen(!context.open);
        }}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
PopoverTrigger.displayName = "PopoverTrigger";

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end" | undefined;
  children?: ReactNode | undefined;
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ align = "center", className, style, children, ...props }, ref) => {
    const context = useContext(PopoverContext);
    if (!context?.open) return null;

    const alignStyles =
      align === "start"
        ? { left: 0 }
        : align === "end"
          ? { right: 0 }
          : { left: "50%", transform: "translateX(-50%)" };

    return (
      <div
        ref={ref}
        className={cn("metron-popover-content", className)}
        role="dialog"
        style={{ top: "calc(100% + 0.5rem)", ...alignStyles, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PopoverContent.displayName = "PopoverContent";

export interface PopoverCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(
  ({ onClick, children, ...props }, ref) => {
    const context = useContext(PopoverContext);
    return (
      <button
        ref={ref}
        onClick={(e) => {
          onClick?.(e);
          context?.setOpen(false);
        }}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
PopoverClose.displayName = "PopoverClose";
