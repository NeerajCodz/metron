"use client";

import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

import { cn } from "../lib/cn.js";
import { LiquidGlass } from "./liquid-glass.js";

export interface GlassNavigationItem
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href" | "id"> {
  id: string;
  label: ReactNode;
  href: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface GlassNavigationProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  brand: ReactNode;
  items: readonly GlassNavigationItem[];
  actions?: ReactNode;
  activeItem?: string;
  label?: string;
  brandHref?: string;
  brandLabel?: string;
  surfaceClassName?: string;
  onNavigate?: (item: GlassNavigationItem) => void;
}

export function GlassNavigation({
  brand,
  items,
  actions,
  activeItem,
  label = "Primary navigation",
  brandHref,
  brandLabel,
  surfaceClassName,
  onNavigate,
  className,
  ...props
}: GlassNavigationProps) {
  return (
    <nav {...props} aria-label={label} className={cn("metron-glass-navigation", className)}>
      <LiquidGlass
        blurIntensity="lg"
        className={cn("metron-glass-navigation__surface", surfaceClassName)}
        contentClassName="metron-glass-navigation__layout"
        glowIntensity="sm"
      >
        <div className="metron-glass-navigation__brand">
          {brandHref ? (
            <a aria-label={brandLabel} className="metron-glass-navigation__brand-link" href={brandHref}>
              {brand}
            </a>
          ) : (
            brand
          )}
        </div>
        <div className="metron-glass-navigation__viewport">
          <ul className="metron-glass-navigation__list">
            {items.map((item) => {
              const {
                id,
                label: itemLabel,
                href,
                icon,
                disabled = false,
                className: itemClassName,
                onClick,
                ...itemProps
              } = item;
              const isActive = id === activeItem;

              const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                onNavigate?.(item);
              };

              return (
                <li className="metron-glass-navigation__item" key={id}>
                  <a
                    {...itemProps}
                    aria-current={isActive ? "page" : undefined}
                    aria-disabled={disabled || undefined}
                    className={cn(
                      "metron-glass-navigation__link",
                      isActive && "metron-glass-navigation__link--active",
                      disabled && "metron-glass-navigation__link--disabled",
                      itemClassName,
                    )}
                    href={href}
                    onClick={handleClick}
                    tabIndex={disabled ? -1 : itemProps.tabIndex}
                  >
                    {icon !== undefined && (
                      <span aria-hidden="true" className="metron-glass-navigation__icon">
                        {icon}
                      </span>
                    )}
                    <span>{itemLabel}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        {actions !== undefined && (
          <div className="metron-glass-navigation__actions">{actions}</div>
        )}
      </LiquidGlass>
    </nav>
  );
}
