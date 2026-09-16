import {
  createContext,
  forwardRef,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type Direction = "ltr" | "rtl";

const DirectionContext = createContext<Direction>("ltr");

export interface DirectionProviderProps {
  dir: Direction;
  children: ReactNode;
}

export function DirectionProvider({ dir, children }: DirectionProviderProps) {
  return <DirectionContext.Provider value={dir}>{children}</DirectionContext.Provider>;
}

export function useDirection(): Direction {
  return useContext(DirectionContext);
}

export interface DirectionProps extends HTMLAttributes<HTMLDivElement> {
  dir?: Direction | undefined;
  children?: ReactNode | undefined;
}

export const DirectionContainer = forwardRef<HTMLDivElement, DirectionProps>(
  ({ dir = "ltr", className, children, ...props }, ref) => {
    return (
      <DirectionProvider dir={dir}>
        <div ref={ref} className={className} dir={dir} {...props}>
          {children}
        </div>
      </DirectionProvider>
    );
  },
);

DirectionContainer.displayName = "DirectionContainer";
