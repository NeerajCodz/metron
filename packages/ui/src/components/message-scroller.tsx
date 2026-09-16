import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface MessageScrollerProps extends HTMLAttributes<HTMLDivElement> {
  autoScroll?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const MessageScroller = forwardRef<HTMLDivElement, MessageScrollerProps>(
  ({ autoScroll = true, className, children, ...props }, ref) => {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (autoScroll) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [children, autoScroll]);

    return (
      <div ref={ref} className={cn("metron-message-scroller", className)} {...props}>
        {children}
        <div ref={bottomRef} style={{ height: 1, pointerEvents: "none" }} />
      </div>
    );
  },
);

MessageScroller.displayName = "MessageScroller";
