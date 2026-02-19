import type { PhotoFilter } from "@/schemas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeFilter: PhotoFilter;
  counts: {
    all: number;
    unreviewed: number;
    keep: number;
    discard: number;
    maybe: number;
  };
  onFilterChange: (filter: PhotoFilter) => void;
}

const FILTERS: Array<{ value: PhotoFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "maybe", label: "Maybe" },
  { value: "discard", label: "Discard" },
];

function getCountPillClasses(filter: PhotoFilter, count: number): string {
  if (count === 0)
    return "rounded-full bg-muted px-1.5 text-xs text-muted-foreground";
  if (filter === "keep")
    return "rounded-full bg-green-100 px-1.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (filter === "maybe")
    return "rounded-full bg-amber-100 px-1.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (filter === "discard")
    return "rounded-full bg-red-100 px-1.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "rounded-full bg-muted px-1.5 text-xs text-muted-foreground";
}

export function FilterBar({
  activeFilter,
  counts,
  onFilterChange,
}: FilterBarProps) {
  return (
    <ToggleGroup
      type="single"
      value={activeFilter}
      onValueChange={(value) => {
        if (value) onFilterChange(value as PhotoFilter);
      }}
      variant="outline"
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem
          key={filter.value}
          value={filter.value}
          aria-label={`Filter by ${filter.label}`}
        >
          {filter.label}
          <span
            className={cn(
              "ml-1.5",
              getCountPillClasses(filter.value, counts[filter.value]),
            )}
          >
            {counts[filter.value]}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
