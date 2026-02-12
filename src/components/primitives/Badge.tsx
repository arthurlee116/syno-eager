import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "outline" | "default";

export type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap",
        variant === "default" && "bg-primary text-primary-foreground border-primary",
        variant === "outline" && "border-border text-foreground",
        className
      )}
      {...props}
    />
  );
}

