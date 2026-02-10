import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "border-input w-full min-w-0 border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

