import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface HoverCardContextValue {
  open: boolean;
}

const HoverCardContext = createContext<HoverCardContextValue>({ open: false });

export interface HoverCardProps {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  children: ReactNode;
}

export function HoverCard({
  open: controlledOpen,
  defaultOpen = false,
  children,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  return (
    <HoverCardContext.Provider value={{ open }}>
      <div
        onMouseEnter={() => setInternalOpen(true)}
        onMouseLeave={() => setInternalOpen(false)}
        style={{ position: "relative", display: "inline-block" }}
      >
        {children}
      </div>
    </HoverCardContext.Provider>
  );
}

export const HoverCardTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} style={{ display: "inline-block" }} {...props}>
      {children}
    </div>
  ),
);
HoverCardTrigger.displayName = "HoverCardTrigger";

export interface HoverCardContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end" | undefined;
  children?: ReactNode | undefined;
}

export const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ align = "center", className, style, children, ...props }, ref) => {
    const { open } = useContext(HoverCardContext);
    if (!open) return null;

    const alignStyles =
      align === "start"
        ? { left: 0 }
        : align === "end"
          ? { right: 0 }
          : { left: "50%", transform: "translateX(-50%)" };

    return (
      <div
        ref={ref}
        className={cn("metron-hover-card-content", className)}
        style={{ top: "calc(100% + 0.5rem)", ...alignStyles, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
HoverCardContent.displayName = "HoverCardContent";
