import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "../../lib/cn.js";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null> | undefined;
  enableBlur?: boolean | undefined;
  baseOpacity?: number | undefined;
  baseRotation?: number | undefined;
  blurStrength?: number | undefined;
  containerClassName?: string | undefined;
  textClassName?: string | undefined;
  rotationEnd?: string | undefined;
  wordAnimationEnd?: string | undefined;
}

export function ScrollReveal({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName,
  textClassName,
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const splitText = useMemo(() => {
    if (typeof children !== "string") return null;
    return children.split(/(\s+)/).map((part, index) =>
      /^\s+$/.test(part) ? part : <span className="metron-scroll-reveal__word" key={`${part}-${index}`}>{part}</span>,
    );
  }, [children]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scroller = scrollContainerRef?.current ?? window;
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: { trigger: element, scroller, start: "top bottom", end: rotationEnd, scrub: true },
        },
      );
      const words = element.querySelectorAll<HTMLElement>(".metron-scroll-reveal__word");
      if (!words.length) return;
      gsap.fromTo(words, { opacity: baseOpacity, willChange: "opacity" }, { ease: "none", opacity: 1, stagger: 0.05, scrollTrigger: { trigger: element, scroller, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true } });
      if (enableBlur) {
        gsap.fromTo(words, { filter: `blur(${blurStrength}px)` }, { ease: "none", filter: "blur(0px)", stagger: 0.05, scrollTrigger: { trigger: element, scroller, start: "top bottom-=20%", end: wordAnimationEnd, scrub: true } });
      }
    }, element);
    return () => context.revert();
  }, [baseOpacity, baseRotation, blurStrength, enableBlur, rotationEnd, scrollContainerRef, wordAnimationEnd]);

  return (
    <div ref={containerRef} className={cn("metron-scroll-reveal", containerClassName)}>
      <p className={cn("metron-scroll-reveal__text", textClassName)}>{splitText ?? children}</p>
    </div>
  );
}
