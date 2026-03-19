"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
ToastProvider.displayName = "ToastProvider";

const ToastViewport = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn(
    "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
    className
  )}>
    {children}
  </div>
);
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type ToastVariantProps = VariantProps<typeof toastVariants>;
interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, ToastVariantProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive";
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, action, children, ...props }, ref) => {
    return (
      <div
        role="status"
        aria-live="polite"
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
    );
  }
);
Toast.displayName = "Toast";

const ToastAction = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-hidden focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  >
    {children}
  </button>
);
ToastAction.displayName = "ToastAction";

const ToastClose = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-hidden focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 hover:group-[.destructive]:text-red-50 focus:group-[.destructive]:ring-red-400 focus:group-[.destructive]:ring-offset-red-600",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
);
ToastClose.displayName = "ToastClose";

const ToastTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  >
    {children}
  </div>
);
ToastTitle.displayName = "ToastTitle";

const ToastDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("text-sm opacity-90", className)}
    {...props}
  >
    {children}
  </div>
);
ToastDescription.displayName = "ToastDescription";

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
