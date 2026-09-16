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

interface MenubarContextValue {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
}

const MenubarContext = createContext<MenubarContextValue | null>(null);

export interface MenubarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const Menubar = forwardRef<HTMLDivElement, MenubarProps>(
  ({ className, children, ...props }, ref) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    return (
      <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
        <div ref={ref} className={cn("metron-menubar", className)} role="menubar" {...props}>
          {children}
        </div>
      </MenubarContext.Provider>
    );
  },
);
Menubar.displayName = "Menubar";

interface MenubarMenuContextValue {
  value: string;
  isOpen: boolean;
}

const MenubarMenuContext = createContext<MenubarMenuContextValue | null>(null);

export interface MenubarMenuProps {
  value: string;
  children: ReactNode;
}

export function MenubarMenu({ value, children }: MenubarMenuProps) {
  const context = useContext(MenubarContext);
  const isOpen = context?.activeMenu === value;

  return (
    <MenubarMenuContext.Provider value={{ value, isOpen }}>
      <div style={{ position: "relative" }}>{children}</div>
    </MenubarMenuContext.Provider>
  );
}

export interface MenubarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const MenubarTrigger = forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const menubar = useContext(MenubarContext);
    const menu = useContext(MenubarMenuContext);

    return (
      <button
        ref={ref}
        aria-expanded={menu?.isOpen}
        aria-haspopup="menu"
        className={cn("metron-menubar-trigger", className)}
        data-state={menu?.isOpen ? "open" : "closed"}
        onClick={(e) => {
          onClick?.(e);
          if (menu) {
            menubar?.setActiveMenu(menu.isOpen ? null : menu.value);
          }
        }}
        role="menuitem"
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
MenubarTrigger.displayName = "MenubarTrigger";

export interface MenubarContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const MenubarContent = forwardRef<HTMLDivElement, MenubarContentProps>(
  ({ className, children, ...props }, ref) => {
    const menu = useContext(MenubarMenuContext);
    if (!menu?.isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn("metron-select-content", className)}
        role="menu"
        style={{ marginTop: "0.25rem", minWidth: "12rem" }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MenubarContent.displayName = "MenubarContent";

export interface MenubarItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const MenubarItem = forwardRef<HTMLDivElement, MenubarItemProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const menubar = useContext(MenubarContext);

    return (
      <div
        ref={ref}
        className={cn("metron-select-item", className)}
        onClick={(e) => {
          onClick?.(e);
          menubar?.setActiveMenu(null);
        }}
        role="menuitem"
        {...props}
      >
        {children}
      </div>
    );
  },
);
MenubarItem.displayName = "MenubarItem";

export const MenubarSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-separator metron-separator--horizontal", className)} {...props} />
  ),
);
MenubarSeparator.displayName = "MenubarSeparator";

export const MenubarShortcut = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("metron-command-shortcut", className)} {...props} />
  ),
);
MenubarShortcut.displayName = "MenubarShortcut";
