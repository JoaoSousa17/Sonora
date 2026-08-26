import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

export default function SectionRow({ title, to, items = [], renderCard }) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {to && (
          <Link to={to} className="text-sm text-primary hover:underline">
            Ver tudo
          </Link>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {items.map((item, i) => (
          <div key={item.id || i} className="w-40 md:w-48 flex-shrink-0">
            {renderCard(item)}
          </div>
        ))}
      </div>
    </section>
  );
}