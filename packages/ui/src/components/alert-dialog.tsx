import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const AlertDialogTrigger = forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        className={cn("metron-alert-dialog-trigger", className)}
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
AlertDialogTrigger.displayName = "AlertDialogTrigger";

export interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(AlertDialogContext);
    if (!context?.open) return null;

    return (
      <>
        <div
          aria-hidden="true"
          className="metron-alert-dialog-overlay"
          onClick={() => context.onOpenChange(false)}
        />
        <div
          ref={ref}
          aria-modal="true"
          className={cn("metron-alert-dialog-modal", className)}
          role="alertdialog"
          {...props}
        >
          {children}
        </div>
      </>
    );
  },
);
AlertDialogContent.displayName = "AlertDialogContent";

export const AlertDialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-alert-dialog-header", className)} {...props} />
  ),
);
AlertDialogHeader.displayName = "AlertDialogHeader";

export const AlertDialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("metron-alert-dialog-title", className)} {...props} />
  ),
);
AlertDialogTitle.displayName = "AlertDialogTitle";

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("metron-alert-dialog-description", className)} {...props} />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

export const AlertDialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-alert-dialog-footer", className)} {...props} />
  ),
);
AlertDialogFooter.displayName = "AlertDialogFooter";

export interface AlertDialogActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        className={cn("metron-button metron-button--solid metron-button--md", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.onOpenChange(false);
        }}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
AlertDialogAction.displayName = "AlertDialogAction";

export const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        className={cn("metron-button metron-button--glass metron-button--md", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.onOpenChange(false);
        }}
        type="button"
        {...props}
      >
        {children ?? "Cancel"}
      </button>
    );
  },
);
AlertDialogCancel.displayName = "AlertDialogCancel";
