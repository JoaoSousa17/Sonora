import React, { useState, useEffect, useRef } from "react";

/**
 * Decorative skeletons that fill empty space when a library has few items.
 * - variant "card": a single row of 2-3 big square card skeletons (count adapts to
 *   screen width), with generous spacing. Not stretched/deformed.
 * - variant "row": a few horizontal row skeletons.
 */
export default function SkeletonFiller({ variant = "card" }) {
  const ref = useRef(null);
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (variant !== "card") return;
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const width = el.clientWidth || 600;
      setCount(width < 560 ? 2 : 3);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [variant]);

  if (variant === "row") {
    return (
      <div ref={ref} className="px-4 md:px-6 mt-3 space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-md bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
              <div className="h-2.5 w-1/4 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="px-4 md:px-6 mt-4 grid gap-6"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}