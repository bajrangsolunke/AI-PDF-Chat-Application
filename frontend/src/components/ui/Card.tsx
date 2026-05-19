import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-rule bg-surface rounded-[4px]",
        className,
      )}
      {...rest}
    />
  );
}
