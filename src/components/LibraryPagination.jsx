import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LibraryPagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-5 py-10">
      <Button
        variant="ghost"
        size="icon"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums select-none">
        {page} <span className="opacity-50">de</span> {pageCount}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}