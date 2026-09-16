import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}

export interface SheetTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const SheetTrigger = forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(SheetContext);
    return (
      <button
        ref={ref}
        className={cn("metron-sheet-trigger", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.onOpenChange(true);
        }}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
SheetTrigger.displayName = "SheetTrigger";

export interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: SheetSide | undefined;
  children?: ReactNode | undefined;
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => {
    const context = useContext(SheetContext);
    if (!context?.open) return null;

    return (
      <>
        <div
          aria-hidden="true"
          className="metron-sheet-overlay"
          onClick={() => context.onOpenChange(false)}
        />
        <div
          ref={ref}
          aria-modal="true"
          className={cn("metron-sheet-content", `metron-sheet-content--${side}`, className)}
          role="dialog"
          {...props}
        >
          {children}
        </div>
      </>
    );
  },
);
SheetContent.displayName = "SheetContent";

export const SheetHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-dialog-modal-header", className)} {...props} />
  ),
);
SheetHeader.displayName = "SheetHeader";

export const SheetTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("metron-dialog-modal-title", className)} {...props} />
  ),
);
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("metron-dialog-modal-description", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export const SheetFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-dialog-modal-footer", className)} {...props} />
  ),
);
SheetFooter.displayName = "SheetFooter";

export interface SheetCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const SheetClose = forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(SheetContext);
    return (
      <button
        ref={ref}
        className={cn("metron-button metron-button--glass", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.onOpenChange(false);
        }}
        type="button"
        {...props}
      >
        {children ?? "Close"}
      </button>
    );
  },
);
SheetClose.displayName = "SheetClose";
