import type { SortDirection } from "@/schemas";
import { Button } from "@/components/ui/button";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";

interface SortToggleProps {
  direction: SortDirection;
  onToggle: () => void;
}

export function SortToggle({ direction, onToggle }: SortToggleProps) {
  const Icon = direction === "desc" ? ArrowDownNarrowWide : ArrowUpNarrowWide;
  const label = direction === "desc" ? "Newest first" : "Oldest first";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-label={`Sort by date: ${label}`}
    >
      <Icon className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
