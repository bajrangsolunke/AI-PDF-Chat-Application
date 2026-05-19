import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
      "px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand",
      className,
    )}
    {...rest}
  />
));
Input.displayName = "Input";
