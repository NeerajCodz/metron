import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize | undefined;
  children?: ReactNode | undefined;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ size = "md", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-avatar", `metron-avatar--${size}`, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Avatar.displayName = "Avatar";

export interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: ((status: "loaded" | "error") => void) | undefined;
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, className, onLoadingStatusChange, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) return null;

    return (
      <img
        ref={ref}
        alt={alt}
        className={cn("metron-avatar-image", className)}
        onError={() => {
          setHasError(true);
          onLoadingStatusChange?.("error");
        }}
        onLoad={() => onLoadingStatusChange?.("loaded")}
        src={src}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

export interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-avatar-fallback", className)} {...props}>
        {children}
      </div>
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-avatar-group", className)} {...props}>
      {children}
    </div>
  ),
);
AvatarGroup.displayName = "AvatarGroup";
