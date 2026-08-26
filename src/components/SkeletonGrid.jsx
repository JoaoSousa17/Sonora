import React from "react";

export default function SkeletonGrid({ count = 12, variant = "card" }) {
  if (variant === "row") {
    return (
      <div className="px-4 md:px-6 space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="w-6 h-6 rounded bg-white/5 animate-pulse" />
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
    <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}