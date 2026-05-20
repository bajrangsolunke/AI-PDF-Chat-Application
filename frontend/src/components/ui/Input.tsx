import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-transparent border-0 border-b border-rule",
        "px-0 py-2.5 text-base placeholder:text-ink-soft",
        "focus:outline-none focus:border-accent transition-colors",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";
