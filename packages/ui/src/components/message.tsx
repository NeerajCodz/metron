import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type MessageRole = "assistant" | "user" | "system";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  role?: MessageRole | undefined;
  avatar?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ role = "assistant", avatar, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-message", `metron-message--${role}`, className)}
        {...props}
      >
        {avatar && <div style={{ flexShrink: 0 }}>{avatar}</div>}
        <div className="metron-message-body">{children}</div>
      </div>
    );
  },
);
Message.displayName = "Message";

export const MessageHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-message-header", className)} {...props} />
  ),
);
MessageHeader.displayName = "MessageHeader";

export const MessageActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-message-actions", className)} {...props} />
  ),
);
MessageActions.displayName = "MessageActions";

export const MessageTimestamp = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("metron-message-timestamp", className)}
      style={{ fontFamily: "var(--metron-font-mono)", fontSize: "0.72rem", opacity: 0.6 }}
      {...props}
    />
  ),
);
MessageTimestamp.displayName = "MessageTimestamp";
