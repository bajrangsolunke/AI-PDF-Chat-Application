import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display font-medium tracking-tight text-ink", className)}
      style={{ fontFeatureSettings: "'opsz' 144" }}
    >
      Atlas
    </span>
  );
}

export function WordmarkBlock({ subtitle }: { subtitle?: string }) {
  return (
    <div className="space-y-1.5">
      <Wordmark className="text-[2.75rem] leading-none" />
      <div className="h-px w-12 bg-accent" />
      {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}
