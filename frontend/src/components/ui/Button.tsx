import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent/90 rounded-[6px] px-4 py-2 text-sm font-medium transition-colors",
  ghost:
    "text-ink hover:text-accent inline-flex items-center gap-1.5 text-sm transition-colors",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
