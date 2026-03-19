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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-4 w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-16 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Top Performing Items
        </h3>
      </div>
      
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <span role="img" aria-label="No items" className="text-4xl mb-4">📦</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No top items found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Once your content gets more engagement, your top items will appear here.
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {item.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.views}</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.votes}</span>
                </div>
                <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.comments}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 