import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  return (
    <DrawerContext.Provider value={{ open, onOpenChange }}>{children}</DrawerContext.Provider>
  );
}

export interface DrawerTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const DrawerTrigger = forwardRef<HTMLButtonElement, DrawerTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(DrawerContext);
    return (
      <button
        ref={ref}
        className={cn("metron-drawer-trigger", className)}
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
DrawerTrigger.displayName = "DrawerTrigger";

export interface DrawerContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(DrawerContext);
    if (!context?.open) return null;

    return (
      <>
        <div
          aria-hidden="true"
          className="metron-drawer-overlay"
          onClick={() => context.onOpenChange(false)}
        />
        <div
          ref={ref}
          aria-modal="true"
          className={cn("metron-drawer-content", className)}
          role="dialog"
          {...props}
        >
          <div aria-hidden="true" className="metron-drawer-handle" />
          {children}
        </div>
      </>
    );
  },
);
DrawerContent.displayName = "DrawerContent";

export const DrawerHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-dialog-modal-header", className)} {...props} />
  ),
);
DrawerHeader.displayName = "DrawerHeader";

export const DrawerTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("metron-dialog-modal-title", className)} {...props} />
  ),
);
DrawerTitle.displayName = "DrawerTitle";

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("metron-dialog-modal-description", className)} {...props} />
));
DrawerDescription.displayName = "DrawerDescription";

export const DrawerFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-dialog-modal-footer", className)} {...props} />
  ),
);
DrawerFooter.displayName = "DrawerFooter";

export interface DrawerCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(DrawerContext);
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
DrawerClose.displayName = "DrawerClose";
