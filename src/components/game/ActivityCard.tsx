import { cn } from "@/lib/utils";
import { ACTIVITY_LABELS, ACTIVITY_LINES } from "@/game/recipes";
import type { ActivityType } from "@/game/types";

interface ActivityCardProps {
  type: ActivityType;
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

export function ActivityCard({
  type,
  onSelect,
  selected = false,
  disabled = false,
  compact = false,
  label,
}: ActivityCardProps) {
  const interactive = Boolean(onSelect) && !disabled;
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onSelect}
      disabled={interactive ? disabled : undefined}
      aria-pressed={interactive ? selected : undefined}
      data-testid={`activity-${type}`}
      className={cn(
        "flex min-h-11 w-full flex-col items-start gap-1 rounded-card border-2 bg-card px-3 text-left",
        compact ? "py-2" : "py-3",
        selected ? "border-accent" : "border-outline",
        interactive
          ? "cursor-pointer transition-transform hover:bg-paper motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-95"
          : "cursor-default",
        disabled && "opacity-40",
      )}
    >
      <span className="text-base font-semibold text-ink">{ACTIVITY_LABELS[type]}</span>
      <span className="text-xs leading-relaxed text-ink/75">{ACTIVITY_LINES[type]}</span>
      {label ? <span className="text-xs font-medium text-outline">{label}</span> : null}
    </Tag>
  );
}
