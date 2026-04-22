"use client";

import { TrendingUp, Eye, ThumbsUp, MessageSquare } from "lucide-react";

interface TopItem {
  id: string;
  title: string;
  views: number;
  votes: number;
  comments: number;
}

interface TopItemsProps {
  items: TopItem[];
  isLoading?: boolean;
}

export function TopItems({ items, isLoading = false }: TopItemsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
        <div className="animate-pulse">
          <div className="h-3.5 bg-neutral-200 dark:bg-white/8 rounded-sm mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-neutral-100 dark:bg-white/5 h-14 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
			<div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Top Performing Items
        </h3>
      </div>
      
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-white/6 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
              No top items found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Once your content gets more engagement, your top items will appear here.
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={item.id}
              className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 dark:bg-white/3 rounded-lg border border-neutral-100 dark:border-white/5 hover:border-neutral-200 dark:hover:border-white/8 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 rounded-md text-xs font-semibold shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-xs font-medium text-neutral-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    ID: {item.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{item.views}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{item.votes}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{item.comments}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 