import {
  forwardRef,
  type BlockquoteHTMLAttributes,
  type HTMLAttributes,
} from "react";

import { cn } from "../lib/cn.js";

export const H1 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1 ref={ref} className={cn("metron-typography-h1", className)} {...props} />
  ),
);
H1.displayName = "H1";

export const H2 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("metron-typography-h2", className)} {...props} />
  ),
);
H2.displayName = "H2";

export const H3 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("metron-typography-h3", className)} {...props} />
  ),
);
H3.displayName = "H3";

export const H4 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4 ref={ref} className={cn("metron-typography-h4", className)} {...props} />
  ),
);
H4.displayName = "H4";

export const Lead = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("metron-typography-lead", className)} {...props} />
  ),
);
Lead.displayName = "Lead";

export const P = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("metron-typography-p", className)} {...props} />
  ),
);
P.displayName = "P";

export const Large = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-typography-large", className)} {...props} />
  ),
);
Large.displayName = "Large";

export const Small = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <small ref={ref} className={cn("metron-typography-small", className)} {...props} />
  ),
);
Small.displayName = "Small";

export const Muted = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("metron-typography-muted", className)} {...props} />
  ),
);
Muted.displayName = "Muted";

export const Blockquote = forwardRef<
  HTMLQuoteElement,
  BlockquoteHTMLAttributes<HTMLQuoteElement>
>(({ className, ...props }, ref) => (
  <blockquote ref={ref} className={cn("metron-typography-blockquote", className)} {...props} />
));
Blockquote.displayName = "Blockquote";

export const InlineCode = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <code ref={ref} className={cn("metron-typography-code", className)} {...props} />
  ),
);
InlineCode.displayName = "InlineCode";
