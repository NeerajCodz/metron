import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn.js";

export interface CommandProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const Command = forwardRef<HTMLDivElement, CommandProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-command", className)} {...props}>
        {children}
      </div>
    );
  },
);
Command.displayName = "Command";

export interface CommandInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode | undefined;
}

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="metron-command-input-wrapper">
        <span aria-hidden="true" style={{ opacity: 0.6 }}>
          {icon ?? "🔍"}
        </span>
        <input
          ref={ref}
          className={cn("metron-command-input", className)}
          type="text"
          {...props}
        />
      </div>
    );
  },
);
CommandInput.displayName = "CommandInput";

export const CommandList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-command-list", className)} {...props}>
      {children}
    </div>
  ),
);
CommandList.displayName = "CommandList";

export const CommandEmpty = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children = "No results found.", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("metron-command-empty", className)}
      style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.875rem", opacity: 0.6 }}
      {...props}
    >
      {children}
    </div>
  ),
);
CommandEmpty.displayName = "CommandEmpty";

export interface CommandGroupProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

export const CommandGroup = forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ heading, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-command-group", className)} {...props}>
      {heading && <div className="metron-command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
);
CommandGroup.displayName = "CommandGroup";

export interface CommandItemProps extends HTMLAttributes<HTMLDivElement> {
  onSelect?: (() => void) | undefined;
  children?: ReactNode | undefined;
}

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  ({ onSelect, className, children, onClick, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("metron-command-item", className)}
      onClick={(e) => {
        onClick?.(e);
        onSelect?.();
      }}
      role="option"
      {...props}
    >
      {children}
    </div>
  ),
);
CommandItem.displayName = "CommandItem";

export const CommandShortcut = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("metron-command-shortcut", className)} {...props} />
  ),
);
CommandShortcut.displayName = "CommandShortcut";

export const CommandSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-separator metron-separator--horizontal", className)} {...props} />
  ),
);
CommandSeparator.displayName = "CommandSeparator";

export interface CommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function CommandDialog({ open, onOpenChange, children }: CommandDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="metron-dialog-overlay"
        onClick={() => onOpenChange(false)}
      />
      <div
        aria-modal="true"
        className="metron-dialog-modal"
        role="dialog"
        style={{ padding: 0, overflow: "hidden", maxWidth: "36rem" }}
      >
        <Command>{children}</Command>
      </div>
    </>
  );
}
