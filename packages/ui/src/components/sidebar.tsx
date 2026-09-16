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
    const toggleCollapsed = () => setCollapsed((prev) => !prev);

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
        className={cn(
          "metron-sidebar",
          collapsed && "metron-sidebar--collapsed",
          className,
        )}
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
  ({ isActive = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("metron-sidebar-menu-button", className)}
        data-active={isActive || undefined}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
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
        onClick={(e) => {
          onClick?.(e);
          toggleCollapsed();
        }}
        type="button"
        {...props}
      >
        {children ?? (
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
            <line x1="9" x2="9" y1="3" y2="21" />
          </svg>
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
