"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";
import { LiquidGlass } from "./liquid-glass.js";

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "title"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  closeIcon?: ReactNode;
  showCloseButton?: boolean;
  bodyClassName?: string;
  surfaceClassName?: string;
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  {
    open,
    defaultOpen = false,
    onOpenChange,
    title,
    description,
    header,
    footer,
    closeLabel = "Close dialog",
    closeIcon,
    showCloseButton = true,
    bodyClassName,
    surfaceClassName,
    className,
    children,
    onCancel,
    onClick,
    onClose,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  forwardedRef,
) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const isOpen = open ?? internalOpen;
  const hasTitle = title !== undefined && title !== null;
  const hasDescription = description !== undefined && description !== null;

  const setDialogRef = (node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const requestClose = () => {
    if (!isOpen) return;
    closingRef.current = true;
    if (open === undefined) setInternalOpen(false);
    onOpenChange?.(false);
    queueMicrotask(() => {
      if (dialogRef.current?.open) closingRef.current = false;
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      closingRef.current = false;
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleCancel: DialogHTMLAttributes<HTMLDialogElement>["onCancel"] = (event) => {
    onCancel?.(event);
    if (!event.defaultPrevented) requestClose();
  };

  const handleClose: DialogHTMLAttributes<HTMLDialogElement>["onClose"] = (event) => {
    onClose?.(event);
    if (closingRef.current) {
      closingRef.current = false;
      return;
    }

    if (isOpen) {
      if (open === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && event.target === event.currentTarget) requestClose();
  };

  return (
    <dialog
      {...props}
      aria-describedby={ariaDescribedBy ?? (hasDescription ? descriptionId : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (!ariaLabel && hasTitle ? titleId : undefined)}
      className={cn("metron-dialog", className)}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onClose={handleClose}
      ref={setDialogRef}
    >
      <LiquidGlass
        blurIntensity="xl"
        className={cn("metron-dialog__surface", surfaceClassName)}
        contentClassName="metron-dialog__surface-content"
        glowIntensity="lg"
      >
        {(hasTitle || hasDescription || header !== undefined || showCloseButton) && (
          <DialogHeader>
            <div className="metron-dialog__heading">
              {hasTitle && <DialogTitle id={titleId}>{title}</DialogTitle>}
              {hasDescription && (
                <DialogDescription id={descriptionId}>{description}</DialogDescription>
              )}
            </div>
            {header}
            {showCloseButton && (
              <DialogClose aria-label={closeLabel}>
                {closeIcon ?? <span aria-hidden="true">×</span>}
              </DialogClose>
            )}
          </DialogHeader>
        )}
        <DialogBody className={bodyClassName}>{children}</DialogBody>
        {footer !== undefined && <DialogFooter>{footer}</DialogFooter>}
      </LiquidGlass>
    </dialog>
  );
});

export interface DialogSectionProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function DialogHeader({ className, ...props }: DialogSectionProps) {
  return <header className={cn("metron-dialog__header", className)} {...props} />;
}

export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return <div className={cn("metron-dialog__body", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: DialogSectionProps) {
  return <footer className={cn("metron-dialog__footer", className)} {...props} />;
}

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn("metron-dialog__title", className)} {...props} />;
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn("metron-dialog__description", className)} {...props} />;
}

export interface DialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}


export interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("metron-dialog-trigger", className)}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
DialogTrigger.displayName = "DialogTrigger";

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-dialog-modal", className)} {...props}>
        {children}
      </div>
    );
  },
);
DialogContent.displayName = "DialogContent";
export function DialogClose({ className, onClick, type = "button", ...props }: DialogCloseProps) {
  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) event.currentTarget.closest("dialog")?.close();
  };

  return (
    <button
      className={cn("metron-dialog__close", className)}
      onClick={handleClick}
      type={type}
      {...props}
    />
  );
}
