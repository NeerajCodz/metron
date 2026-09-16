import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface ContextMenuContextValue {
  open: boolean;
  position: { x: number; y: number };
  setOpen: (open: boolean) => void;
  setPosition: (pos: { x: number; y: number }) => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export interface ContextMenuProps {
  children: ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = () => setOpen(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [open]);

  return (
    <ContextMenuContext.Provider value={{ open, position, setOpen, setPosition }}>
      <div style={{ position: "relative" }}>{children}</div>
    </ContextMenuContext.Provider>
  );
}

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
  ({ onContextMenu, children, ...props }, ref) => {
    const context = useContext(ContextMenuContext);

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onContextMenu?.(e);
      context?.setPosition({ x: e.clientX, y: e.clientY });
      context?.setOpen(true);
    };

    return (
      <div ref={ref} onContextMenu={handleContextMenu} {...props}>
        {children}
      </div>
    );
  },
);
ContextMenuTrigger.displayName = "ContextMenuTrigger";

export interface ContextMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ className, style, children, ...props }, ref) => {
    const context = useContext(ContextMenuContext);
    if (!context?.open) return null;

    return (
      <div
        ref={ref}
        className={cn("metron-context-menu-content", className)}
        role="menu"
        style={{
          top: context.position.y,
          left: context.position.x,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ContextMenuContent.displayName = "ContextMenuContent";

export interface ContextMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ContextMenuItem = forwardRef<HTMLDivElement, ContextMenuItemProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = useContext(ContextMenuContext);

    return (
      <div
        ref={ref}
        className={cn("metron-context-menu-item", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.setOpen(false);
        }}
        role="menuitem"
        {...props}
      >
        {children}
      </div>
    );
  },
);
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-separator metron-separator--horizontal", className)} {...props} />
  ),
);
ContextMenuSeparator.displayName = "ContextMenuSeparator";

export const ContextMenuShortcut = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("metron-command-shortcut", className)} {...props} />
  ),
);
ContextMenuShortcut.displayName = "ContextMenuShortcut";
