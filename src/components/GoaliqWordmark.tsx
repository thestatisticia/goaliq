import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, { word: string; tag: string }> = {
  sm: { word: "text-lg", tag: "text-[9px]" },
  md: { word: "text-xl sm:text-2xl", tag: "text-[10px]" },
  lg: { word: "text-2xl sm:text-3xl", tag: "text-[11px]" },
};

export function GoaliqWordmark({
  size = "md",
  showTagline = true,
  className,
}: {
  size?: Size;
  showTagline?: boolean;
  className?: string;
}) {
  const s = sizeClass[size];

  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-bold tracking-tight", s.word)}>
        GOAL
        <span className="bg-gradient-to-r from-goaliq-accent via-sky-300 to-goaliq-gold bg-clip-text text-transparent">
          IQ
        </span>
      </span>
      {showTagline && (
        <span
          className={cn(
            "mt-1 font-medium uppercase tracking-[0.22em] text-goaliq-muted",
            s.tag
          )}
        >
          World Cup Intelligence
        </span>
      )}
    </div>
  );
}
