import { subHours, subDays, startOfDay } from "date-fns";

export interface TimeRange {
  label: string;
  from: Date;
  to: Date;
}

export const RANGES: TimeRange[] = [
  { label: "1 час", from: subHours(new Date(), 1), to: new Date() },
  { label: "24 часа", from: subHours(new Date(), 24), to: new Date() },
  { label: "7 дней", from: subDays(new Date(), 7), to: new Date() },
  { label: "30 дней", from: subDays(new Date(), 30), to: new Date() },
];

interface Props {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg border bg-muted p-1">
      {RANGES.map((r) => (
        <button
          key={r.label}
          onClick={() => onChange({ ...r, from: r.from, to: new Date() })}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            value.label === r.label
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function rangeToParams(r: TimeRange) {
  return {
    from: r.from.toISOString(),
    to: r.to.toISOString(),
  };
}
