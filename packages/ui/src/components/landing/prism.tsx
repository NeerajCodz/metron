import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { clock, effect, frameLoop, init, surface } from "vgpu";

import { cn } from "../../lib/cn.js";

const prismShader = /* wgsl */ `
struct Params {
  time: f32,
  resolution: vec2f,
  pointer: vec2f,
  motion: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const PI: f32 = 3.14159265359;
const SQRT3: f32 = 1.73205080757;

fn rotate2d(p: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn sdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

fn sdEquilateralTriangle(p0: vec2f, radius: f32) -> f32 {
  var p = p0;
  p.x = abs(p.x) - radius;
  p.y = p.y + radius / SQRT3;
  if (p.x + SQRT3 * p.y > 0.0) {
    p = vec2f(p.x - SQRT3 * p.y, -SQRT3 * p.x - p.y) * 0.5;
  }
  p.x = p.x - clamp(p.x, -2.0 * radius, 0.0);
  return -length(p) * sign(p.y);
}

fn gaussian(value: f32, width: f32) -> f32 {
  let scaled = value / max(width, 0.0001);
  return exp(-scaled * scaled);
}

fn spectralColor(t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0);
  let red = gaussian(x - 0.82, 0.22) + gaussian(x - 0.06, 0.11) * 0.45;
  let green = gaussian(x - 0.52, 0.18);
  let blue = gaussian(x - 0.22, 0.17) + gaussian(x - 0.02, 0.08) * 0.4;
  return pow(clamp(vec3f(red, green, blue), vec3f(0.0), vec3f(1.0)), vec3f(0.82));
}

fn hash21(p: vec2f) -> f32 {
  let q = fract(p * vec2f(123.34, 345.45));
  return fract((q.x + q.y) * (q.x + q.y + 34.345));
}

@fragment
fn fs_main(@location(0) uv0: vec2f) -> @location(0) vec4f {
  let aspect = params.resolution.x / max(params.resolution.y, 1.0);
  var uv = (uv0 * 2.0 - 1.0) * vec2f(aspect, 1.0);
  uv.y = -uv.y;

  let pointer = (params.pointer * 2.0 - 1.0) * vec2f(1.0, -1.0);
  let drift = sin(params.time * 0.23) * 0.018 * params.motion;
  let center = vec2f(0.19 + pointer.x * 0.035, -0.015 + pointer.y * 0.025 + drift);
  let angle = -0.075 + pointer.x * 0.018;
  let local = rotate2d(uv - center, angle);
  let triangle = sdEquilateralTriangle(local, 0.355);

  var color = vec3f(0.0);

  let entryStart = vec2f(-1.55, 0.31 + pointer.y * 0.035);
  let entryEnd = center + rotate2d(vec2f(-0.31, 0.055), -angle);
  let entryDistance = sdSegment(uv, entryStart, entryEnd);
  let entryLength = length(entryEnd - entryStart);
  let entryTravel = clamp(length(uv - entryStart) / max(entryLength, 0.001), 0.0, 1.0);
  let entryCore = gaussian(entryDistance, 0.0065) * smoothstep(0.0, 0.05, entryTravel);
  let entryBloom = gaussian(entryDistance, 0.035) * 0.19;
  color += vec3f(1.0, 0.985, 0.94) * (entryCore * 2.1 + entryBloom);

  let rayOrigin = center + rotate2d(vec2f(0.275, -0.035), -angle);
  var spectrum = vec3f(0.0);
  for (var index = 0; index < 24; index = index + 1) {
    let t = f32(index) / 23.0;
    let fanAngle = mix(-0.19, 0.38, t) + pointer.y * 0.025;
    let rayDirection = normalize(vec2f(1.0, fanAngle));
    let rayEnd = rayOrigin + rayDirection * 1.7;
    let distance = sdSegment(uv, rayOrigin, rayEnd);
    let along = clamp(dot(uv - rayOrigin, rayDirection) / 1.7, 0.0, 1.0);
    let reveal = smoothstep(0.0, 0.035, along) * (1.0 - smoothstep(0.78, 1.0, along));
    let core = gaussian(distance, 0.0068) * 0.21;
    let halo = gaussian(distance, 0.031) * 0.045;
    spectrum += spectralColor(t) * (core + halo) * reveal * (1.0 - along * 0.34);
  }
  color += spectrum * 2.35;

  let interiorStart = entryEnd;
  let interiorEnd = rayOrigin;
  let interiorDistance = sdSegment(uv, interiorStart, interiorEnd);
  let interiorMask = 1.0 - smoothstep(-0.008, 0.014, triangle);
  color += vec3f(0.98, 0.99, 1.0) * gaussian(interiorDistance, 0.012) * interiorMask * 1.3;

  let edge = gaussian(abs(triangle), 0.0065);
  let outerEdge = gaussian(abs(triangle), 0.025) * 0.18;
  let glassFill = (1.0 - smoothstep(-0.02, 0.035, triangle)) * 0.052;
  let faceLight = clamp(0.56 + local.x * 0.65 - local.y * 0.18, 0.0, 1.0);
  color += vec3f(0.82, 0.9, 1.0) * edge * 0.76;
  color += vec3f(0.34, 0.5, 0.62) * outerEdge;
  color += mix(vec3f(0.018, 0.024, 0.031), vec3f(0.095, 0.12, 0.15), faceLight) * glassFill;

  let contact = gaussian(uv.y - (center.y + 0.33), 0.055) * gaussian(uv.x - center.x, 0.42);
  color += vec3f(0.18, 0.12, 0.12) * contact * 0.11;

  let grain = hash21(uv0 * params.resolution + floor(params.time * 18.0));
  color += (grain - 0.5) * 0.008;
  color = 1.0 - exp(-color * 1.28);
  color = pow(max(color, vec3f(0.0)), vec3f(0.88));

  return vec4f(color, 1.0);
}
`;

export interface LandingPrismProps extends HTMLAttributes<HTMLDivElement> {
  canvasClassName?: string | undefined;
}

export function LandingPrism({ className, canvasClassName, ...props }: LandingPrismProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<[number, number]>([0.5, 0.5]);
  const activeRef = useRef(true);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = Boolean(entry?.isIntersecting) && document.visibilityState === "visible";
      },
      { rootMargin: "180px" },
    );
    visibilityObserver.observe(canvas);

    const handleVisibility = () => {
      activeRef.current = document.visibilityState === "visible";
    };
    const handlePointer = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current = [
        Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1))),
        Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(bounds.height, 1))),
      ];
    };
    const resetPointer = () => {
      pointerRef.current = [0.5, 0.5];
    };

    document.addEventListener("visibilitychange", handleVisibility);
    canvas.addEventListener("pointermove", handlePointer, { passive: true });
    canvas.addEventListener("pointerleave", resetPointer);

    let disposeGpu: (() => void) | undefined;
    void (async () => {
      try {
        const gpu = await init({ label: "Metron spectral prism" });
        if (disposed) {
          gpu.dispose();
          return;
        }
        const canvasSurface = surface(gpu, canvas, {
          autoResize: true,
          clearColor: [0, 0, 0, 1],
          dpr: [1, 2],
          label: "Metron hero canvas",
        });
        const prism = effect(gpu, prismShader, {
          label: "Metron prism and spectral ray",
          set: {
            params: {
              time: 0,
              resolution: [1, 1],
              pointer: pointerRef.current,
              motion: reducedMotion ? 0 : 1,
            },
          },
        });
        const gpuClock = clock(gpu);
        const loop = frameLoop(gpu, (currentFrame) => {
          if (!activeRef.current) return;
          prism.set({
            params: {
              time: reducedMotion ? 0 : gpuClock.time,
              resolution: canvasSurface.size,
              pointer: pointerRef.current,
              motion: reducedMotion ? 0 : 1,
            },
          });
          currentFrame.pass(canvasSurface, prism);
        });
        setStatus("ready");
        disposeGpu = () => {
          loop.stop();
          canvasSurface.dispose();
          gpu.dispose();
        };
      } catch (error) {
        console.error("Metron prism could not initialize WebGPU.", error);
        if (!disposed) setStatus("fallback");
      }
    })();

    return () => {
      disposed = true;
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("pointermove", handlePointer);
      canvas.removeEventListener("pointerleave", resetPointer);
      disposeGpu?.();
    };
  }, []);

  return (
    <div
      {...props}
      className={cn("metron-landing-prism", className)}
      data-renderer={status}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn("metron-landing-prism__canvas", canvasClassName)}
      />
      <div aria-hidden="true" className="metron-landing-prism__fallback">
        <span className="metron-landing-prism__fallback-beam" />
        <span className="metron-landing-prism__fallback-glass" />
        <span className="metron-landing-prism__fallback-spectrum" />
      </div>
      <span className="metron-sr-only" role="status">
        {status === "fallback" ? "Static spectral prism shown because WebGPU is unavailable." : "Interactive spectral prism."}
      </span>
    </div>
  );
}
