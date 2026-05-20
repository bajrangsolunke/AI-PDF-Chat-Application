import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant }

const styles: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:opacity-90",
  secondary: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700",
  ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, Props>(({ variant = "primary", className, ...rest }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      styles[variant], className,
    )}
    {...rest}
  />
));
Button.displayName = "Button";
