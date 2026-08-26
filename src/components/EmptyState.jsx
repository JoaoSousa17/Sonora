import React from "react";

export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}