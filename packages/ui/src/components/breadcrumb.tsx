import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export const Breadcrumb = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="breadcrumb" className={cn("metron-breadcrumb", className)} {...props} />
  ),
);
Breadcrumb.displayName = "Breadcrumb";

export const BreadcrumbList = forwardRef<HTMLOListElement, HTMLAttributes<HTMLOListElement>>(
  ({ className, ...props }, ref) => (
    <ol ref={ref} className={cn("metron-breadcrumb-list", className)} {...props} />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

export const BreadcrumbItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("metron-breadcrumb-item", className)} {...props} />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

export interface BreadcrumbLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode | undefined;
}

export const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, ...props }, ref) => (
    <a ref={ref} className={cn("metron-breadcrumb-link", className)} {...props} />
  ),
);
BreadcrumbLink.displayName = "BreadcrumbLink";

export const BreadcrumbPage = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-current="page"
      className={cn("metron-breadcrumb-page", className)}
      role="link"
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

export const BreadcrumbSeparator = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ children = "/", className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("metron-breadcrumb-separator", className)}
      role="presentation"
      {...props}
    >
      {children}
    </span>
  ),
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export const BreadcrumbEllipsis = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("metron-breadcrumb-separator", className)}
      role="presentation"
      {...props}
    >
      …
    </span>
  ),
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";
