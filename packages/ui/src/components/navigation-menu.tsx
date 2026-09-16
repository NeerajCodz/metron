import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn.js";

export interface NavigationMenuProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode | undefined;
}

export const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav ref={ref} className={cn("metron-navigation-menu", className)} {...props}>
        {children}
      </nav>
    );
  },
);
NavigationMenu.displayName = "NavigationMenu";

export const NavigationMenuList = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("metron-navigation-menu-list", className)} {...props} />
  ),
);
NavigationMenuList.displayName = "NavigationMenuList";

export const NavigationMenuItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  ({ className, style, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("metron-navigation-menu-item", className)}
      style={{ position: "relative", ...style }}
      {...props}
    />
  ),
);
NavigationMenuItem.displayName = "NavigationMenuItem";

export interface NavigationMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const NavigationMenuTrigger = forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("metron-navigation-menu-trigger", className)}
        type="button"
        {...props}
      >
        <span>{children}</span>
        <span aria-hidden="true" style={{ fontSize: "0.75rem", opacity: 0.6 }}>
          ▾
        </span>
      </button>
    );
  },
);
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

export interface NavigationMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const NavigationMenuContent = forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-navigation-menu-content", className)} {...props}>
        {children}
      </div>
    );
  },
);
NavigationMenuContent.displayName = "NavigationMenuContent";

export interface NavigationMenuLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode | undefined;
}

export const NavigationMenuLink = forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ className, ...props }, ref) => (
    <a ref={ref} className={cn("metron-navigation-menu-trigger", className)} {...props} />
  ),
);
NavigationMenuLink.displayName = "NavigationMenuLink";
