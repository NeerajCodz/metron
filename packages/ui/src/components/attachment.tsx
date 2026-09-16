import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface AttachmentProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: string | undefined;
  icon?: ReactNode | undefined;
  action?: ReactNode | undefined;
}

export const Attachment = forwardRef<HTMLDivElement, AttachmentProps>(
  ({ name, size, icon, action, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-attachment", className)} {...props}>
        <div className="metron-attachment-icon">{icon ?? "📎"}</div>
        <div className="metron-attachment-info">
          <span className="metron-attachment-name">{name}</span>
          {size && <span className="metron-attachment-size">{size}</span>}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  },
);

Attachment.displayName = "Attachment";
