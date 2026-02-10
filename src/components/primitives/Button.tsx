import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline";

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring border",
          variant === "default" &&
            "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
          variant === "outline" &&
            "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

