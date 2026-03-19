"use client";

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StepContainerProps {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
}

export function StepContainer({
  children,
  title,
  description,
  className,
  contentClassName
}: StepContainerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Step Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className={cn("space-y-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}