import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

export default function MediaCard({ to, cover_url, title, subtitle, rounded = false, onClick }) {
  const shape = rounded ? "rounded-full" : "rounded-xl";
  return (
    <Link to={to} onClick={onClick} className="group block p-3 rounded-xl hover:bg-white/5 transition-colors">
      <div className={`overflow-hidden ${shape} aspect-square bg-white/5 mb-3 shadow-lg`}>
        <Image src={cover_url} className="w-full h-full object-cover" fittingType="fill" />
      </div>
      <p className="font-medium text-sm text-foreground truncate">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
    </Link>
  );
}