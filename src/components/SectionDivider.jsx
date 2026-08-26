import { Music2 } from "lucide-react";

export default function SectionDivider({ icon: Icon = Music2, className = "" }) {
  return (
    <div className={`flex items-center gap-3 mb-6 ${className}`}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <Icon className="w-4 h-4 text-primary/50" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}