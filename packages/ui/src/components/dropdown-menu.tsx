"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DetailsHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface DropdownMenuProps
  extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "open"> {
  label: string;
  trigger?: ReactNode;
  indicator?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "end";
  error?: ReactNode;
  panelClassName?: string;
}

export function DropdownMenu({
  label,
  trigger,
  indicator,
  open,
  defaultOpen = false,
  onOpenChange,
  align = "start",
  error,
  panelClassName,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const isOpen = open ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (nextOpen === isOpen) return;
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !detailsRef.current?.contains(target)) setOpen(false);
    };

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [isOpen]);

  const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setOpen(!isOpen);
  };

  const handleClick = (event: MouseEvent<HTMLDetailsElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof Element) || target.closest("summary")) return;

    const item = target.closest<HTMLElement>(
      "[data-metron-menu-item], a[href], button, [role='menuitem']",
    );
    if (!item || item.matches(":disabled, [aria-disabled='true']")) return;
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || !isOpen) return;

    event.preventDefault();
    setOpen(false);
    queueMicrotask(() => summaryRef.current?.focus());
  };

  return (
    <details
      {...props}
      className={cn("metron-dropdown", `metron-dropdown--${align}`, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      open={isOpen}
      ref={detailsRef}
    >
      <summary
        aria-expanded={isOpen}
        aria-label={label}
        className="metron-dropdown__summary"
        onClick={handleSummaryClick}
        ref={summaryRef}
      >
        <span className="metron-dropdown__trigger">{trigger ?? label}</span>
        <span aria-hidden="true" className="metron-dropdown__indicator">
          {indicator ?? "▾"}
        </span>
      </summary>
      <div className={cn("metron-dropdown__panel", panelClassName)}>
        <div className="metron-dropdown__items">{children}</div>
        {error !== undefined && (
          <div className="metron-dropdown__error" role="alert">
            {error}
          </div>
        )}
      </div>
    </details>
  );
}

export interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  destructive?: boolean;
}

export function DropdownMenuItem({
  icon,
  trailing,
  loading = false,
  loadingLabel = "Loading",
  destructive = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: DropdownMenuItemProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cn(
        "metron-dropdown__item",
        destructive && "metron-dropdown__item--destructive",
        loading && "metron-dropdown__item--loading",
        className,
      )}
      data-metron-menu-item=""
      disabled={isDisabled}
      type={type}
    >
      {icon !== undefined && (
        <span aria-hidden="true" className="metron-dropdown__item-icon">
          {icon}
        </span>
      )}
      <span className="metron-dropdown__item-label">
        {loading ? <span className="metron-sr-only">{loadingLabel}</span> : children}
        {loading && <span aria-hidden="true">{children}</span>}
      </span>
      {trailing !== undefined && (
        <span className="metron-dropdown__item-trailing">{trailing}</span>
      )}
    </button>
  );
}
