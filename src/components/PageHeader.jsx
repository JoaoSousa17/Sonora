import React from "react";

export default function PageHeader({ title, subtitle, image, children, tall = false }) {
  return (
    <div className="relative">
      {image && (
        <div className="absolute inset-0 h-64 md:h-80 overflow-hidden">
          <img src={image} className="w-full h-full object-cover blur-2xl opacity-40" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}
      <div className={`relative px-6 md:px-10 pt-8 ${tall ? "pb-6" : "pb-4"}`}>
        {subtitle && <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">{subtitle}</p>}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}