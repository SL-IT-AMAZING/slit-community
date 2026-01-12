"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FaCheck } from "react-icons/fa6";

const Checkbox = React.forwardRef(
  ({ className, checked, onCheckedChange, onClick, ...props }, ref) => {
    const handleClick = (e) => {
      onClick?.(e);
      onCheckedChange?.(!checked);
    };

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        onClick={handleClick}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-primary text-primary-foreground"
            : "bg-background",
          className
        )}
        {...props}
      >
        {checked && (
          <FaCheck className="h-3 w-3 mx-auto" />
        )}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
