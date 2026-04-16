'use client';

import { shouldShowFallback } from "@/lib/utils/image-domains";
import Image from "next/image";
import { useState } from "react";

interface ItemIconProps {
  iconUrl?: string;
  name: string;
}

export function ItemIcon({ iconUrl, name }: ItemIconProps) {
  const [imageError, setImageError] = useState(false);

  const shouldShowFallbackIcon = imageError || shouldShowFallback(iconUrl || '');
  return (
    <div className="shrink-0 w-16 h-16 relative group">
      <div className="w-full h-full bg-white dark:bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center p-3.5 border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-white/15">
        {shouldShowFallbackIcon ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ) : (
          <Image
            src={iconUrl!}
            alt={`${name} icon`}
            width={100}
            height={100}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
}
