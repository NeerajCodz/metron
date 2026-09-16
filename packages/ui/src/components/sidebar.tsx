"use client";

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
import { LiquidGlass } from "./liquid-glass.js";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  defaultCollapsed?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const SidebarProvider = forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ defaultCollapsed = false, className, children, ...props }, ref) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const toggleCollapsed = () => setCollapsed((previous) => !previous);

    return (
      <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
        <div ref={ref} className={cn("metron-sidebar-provider", className)} {...props}>
          {children}
        </div>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode | undefined;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    const { collapsed } = useSidebar();
    return (
      <aside
        ref={ref}
        className={cn("metron-sidebar", collapsed && "metron-sidebar--collapsed", className)}
        {...props}
      >
        {children}
      </aside>
    );
  },
);
Sidebar.displayName = "Sidebar";

export const SidebarHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-header", className)} {...props} />
  ),
);
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-content", className)} {...props} />
  ),
);
SidebarContent.displayName = "SidebarContent";

export const SidebarGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-group", className)} {...props} />
  ),
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-group-label", className)} {...props} />
  ),
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarMenu = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("metron-sidebar-menu", className)} {...props} />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("metron-sidebar-menu-item", className)} {...props} />
  ),
);
SidebarMenuItem.displayName = "SidebarMenuItem";

export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const SidebarMenuButton = forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ isActive = false, className, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      className={cn("metron-sidebar-menu-button", className)}
      data-active={isActive || undefined}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-footer", className)} {...props} />
  ),
);
SidebarFooter.displayName = "SidebarFooter";

export interface SidebarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const SidebarTrigger = forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { toggleCollapsed } = useSidebar();
    return (
      <button
        ref={ref}
        aria-label="Toggle sidebar"
        className={cn("metron-button metron-button--glass metron-button--sm", className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggleCollapsed();
        }}
        type="button"
        {...props}
      >
        {children ?? (
          <span aria-hidden="true" className="metron-sidebar-trigger-glyph">
            <span />
            <span />
          </span>
        )}
      </button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarRail = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-sidebar-rail", className)} {...props} />
  ),
);
SidebarRail.displayName = "SidebarRail";

export interface LiquidGlassSidebarItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode | undefined;
  badge?: ReactNode | undefined;
  disabled?: boolean | undefined;
}

export interface LiquidGlassSidebarMenuProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange" | "title"> {
  items: readonly LiquidGlassSidebarItem[];
  activeId?: string | undefined;
  defaultActiveId?: string | undefined;
  onActiveChange?: ((id: string) => void) | undefined;
  heading?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  draggable?: boolean | undefined;
  label?: string | undefined;
}

export const LiquidGlassSidebarMenu = forwardRef<HTMLElement, LiquidGlassSidebarMenuProps>(
  (
    {
      items,
      activeId,
      defaultActiveId,
      onActiveChange,
      heading,
      footer,
      draggable = false,
      label = "Primary navigation",
      className,
      ...props
    },
    ref,
  ) => {
    const [internalActiveId, setInternalActiveId] = useState(defaultActiveId ?? items[0]?.id);
    const selectedId = activeId ?? internalActiveId;

    const selectItem = (item: LiquidGlassSidebarItem) => {
      if (item.disabled) return;
      if (activeId === undefined) setInternalActiveId(item.id);
      onActiveChange?.(item.id);
    };

    return (
      <nav ref={ref} aria-label={label} className={cn("metron-liquid-sidebar", className)} {...props}>
        <LiquidGlass
          blurIntensity="lg"
          borderRadius="var(--metron-radius-panel)"
          className="metron-liquid-sidebar__glass"
          contentClassName="metron-liquid-sidebar__surface"
          draggable={draggable}
          glowIntensity="md"
          shadowIntensity="lg"
        >
          {heading !== undefined ? (
            <div className="metron-liquid-sidebar__heading">{heading}</div>
          ) : null}
          <ul className="metron-liquid-sidebar__menu">
            {items.map((item) => {
              const selected = selectedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    aria-current={selected ? "page" : undefined}
                    className="metron-liquid-sidebar__item"
                    data-active={selected || undefined}
                    disabled={item.disabled}
                    onClick={() => selectItem(item)}
                    type="button"
                  >
                    {item.icon !== undefined ? (
                      <span aria-hidden="true" className="metron-liquid-sidebar__icon">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="metron-liquid-sidebar__label">{item.label}</span>
                    {item.badge !== undefined ? (
                      <span className="metron-liquid-sidebar__badge">{item.badge}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {footer !== undefined ? (
            <div className="metron-liquid-sidebar__footer">{footer}</div>
          ) : null}
        </LiquidGlass>
      </nav>
    );
  },
);
LiquidGlassSidebarMenu.displayName = "LiquidGlassSidebarMenu";
