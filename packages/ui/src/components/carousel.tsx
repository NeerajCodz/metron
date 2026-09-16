import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface CarouselContextValue {
  scrollPrev: () => void;
  scrollNext: () => void;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, children, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const scrollPrev = () => {
      containerRef.current?.scrollBy({ left: -320, behavior: "smooth" });
    };

    const scrollNext = () => {
      containerRef.current?.scrollBy({ left: 320, behavior: "smooth" });
    };

    return (
      <CarouselContext.Provider value={{ scrollPrev, scrollNext }}>
        <div ref={ref} className={cn("metron-carousel", className)} {...props}>
          <div ref={containerRef} className="metron-carousel-content">
            {children}
          </div>
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

export const CarouselContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-carousel-content", className)} {...props}>
      {children}
    </div>
  ),
);
CarouselContent.displayName = "CarouselContent";

export const CarouselItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-carousel-item", className)} {...props}>
      {children}
    </div>
  ),
);
CarouselItem.displayName = "CarouselItem";

export const CarouselPrevious = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const context = useContext(CarouselContext);
    return (
      <button
        ref={ref}
        aria-label="Previous slide"
        className={cn("metron-button metron-button--glass metron-button--sm", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.scrollPrev();
        }}
        type="button"
        {...props}
      >
        ‹
      </button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

export const CarouselNext = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const context = useContext(CarouselContext);
    return (
      <button
        ref={ref}
        aria-label="Next slide"
        className={cn("metron-button metron-button--glass metron-button--sm", className)}
        onClick={(e) => {
          onClick?.(e);
          context?.scrollNext();
        }}
        type="button"
        {...props}
      >
        ›
      </button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";
