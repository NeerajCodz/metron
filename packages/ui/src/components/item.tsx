import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface ItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-item", className)} {...props}>
      {children}
    </div>
  ),
);
Item.displayName = "Item";

export const ItemMedia = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-item-media", className)} {...props} />
  ),
);
ItemMedia.displayName = "ItemMedia";

export const ItemContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-item-content", className)} {...props} />
  ),
);
ItemContent.displayName = "ItemContent";

export const ItemTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4 ref={ref} className={cn("metron-item-title", className)} {...props} />
  ),
);
ItemTitle.displayName = "ItemTitle";

export const ItemDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("metron-item-description", className)} {...props} />
));
ItemDescription.displayName = "ItemDescription";

export const ItemActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-item-actions", className)} {...props} />
  ),
);
ItemActions.displayName = "ItemActions";
