import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export const Pagination = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="pagination"
      className={cn("metron-pagination", className)}
      role="navigation"
      {...props}
    />
  ),
);
Pagination.displayName = "Pagination";

export const PaginationContent = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("metron-pagination-content", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

export const PaginationItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("metron-pagination-item", className)} {...props} />
  ),
);
PaginationItem.displayName = "PaginationItem";

export interface PaginationLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const PaginationLink = forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ isActive = false, className, children, ...props }, ref) => (
    <a
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      className={cn("metron-pagination-link", className)}
      data-active={isActive || undefined}
      {...props}
    >
      {children}
    </a>
  ),
);
PaginationLink.displayName = "PaginationLink";

export const PaginationPrevious = forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, children = "Previous", ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to previous page"
      className={cn("metron-pagination-previous", className)}
      {...props}
    >
      ‹ {children}
    </PaginationLink>
  ),
);
PaginationPrevious.displayName = "PaginationPrevious";

export const PaginationNext = forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, children = "Next", ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to next page"
      className={cn("metron-pagination-next", className)}
      {...props}
    >
      {children} ›
    </PaginationLink>
  ),
);
PaginationNext.displayName = "PaginationNext";

export const PaginationEllipsis = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("metron-pagination-ellipsis", className)}
      style={{ padding: "0 0.5rem", opacity: 0.6 }}
      {...props}
    >
      …
    </span>
  ),
);
PaginationEllipsis.displayName = "PaginationEllipsis";
