"use client"

import * as React from "react";
import { Input as HeroInput } from "@heroui/react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithRef<typeof HeroInput>
>(({ className, ...props }, ref) => {
  return (
    <HeroInput
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
