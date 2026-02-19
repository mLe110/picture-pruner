interface StatusSummaryProps {
  total: number;
  kept: number;
  discarded: number;
  maybe: number;
  unreviewed: number;
}

export function StatusSummary({
  total,
  kept,
  discarded,
  maybe,
  unreviewed,
}: StatusSummaryProps) {
  return (
    <div
      className="flex items-center gap-3 text-sm text-muted-foreground"
      data-testid="status-summary"
    >
      <span>{total} photos</span>
      <span aria-hidden="true" className="h-3.5 w-px bg-border" />
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-full bg-green-500"
          aria-hidden="true"
        />
        <span className="font-medium text-green-600">{kept}</span> kept
      </span>
      <span aria-hidden="true" className="h-3.5 w-px bg-border" />
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        <span className="font-medium text-amber-600">{maybe}</span> maybe
      </span>
      <span aria-hidden="true" className="h-3.5 w-px bg-border" />
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-full bg-red-500"
          aria-hidden="true"
        />
        <span className="font-medium text-red-500">{discarded}</span> discarded
      </span>
      <span aria-hidden="true" className="h-3.5 w-px bg-border" />
      <span>{unreviewed} to review</span>
    </div>
  );
}
