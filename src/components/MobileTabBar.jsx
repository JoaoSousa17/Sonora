import React from "react";
import { NavLink } from "react-router-dom";
import { Play, Search, ListMusic, Mic2, BarChart3 } from "lucide-react";

const items = [
  { to: "/", label: "Ouvir", icon: Play, end: true },
  { to: "/search", label: "Procurar", icon: Search },
  { to: "/library/recentes", label: "Biblioteca", icon: ListMusic },
  { to: "/estatisticas", label: "Stats", icon: BarChart3 },
  { to: "/podcasts", label: "Podcasts", icon: Mic2 },
];

export default function MobileTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-sidebar-border flex">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}