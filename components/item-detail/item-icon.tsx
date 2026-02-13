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
    <div className="shrink-0 w-14 h-14 md:w-20 md:h-20 relative">
      <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-xl rounded-xl overflow-hidden flex items-center justify-center p-4 shadow-md border border-gray-200 group transition-all duration-300 hover:bg-gray-50 hover:border-indigo-100 dark:bg-gray-800/30 dark:border-gray-700/30 dark:hover:bg-gray-800/50 dark:hover:border-indigo-700/50 dark:shadow-lg dark:shadow-indigo-900/10">
        {shouldShowFallbackIcon ? (
          <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-gray-600 group-hover:text-indigo-600 transition-all duration-300 
            drop-shadow-xs group-hover:drop-shadow-md dark:text-gray-300 dark:group-hover:text-indigo-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.
              707V19a2 2 0 01-2 2z"
          />
        </svg>
        ) : (
          <Image
            src={iconUrl!}
            alt={`${name} icon`}
            width={100}
            height={100}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md dark:drop-shadow-lg dark:filter-brightness-110"                                             
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
}
