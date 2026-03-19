"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EngagementOverviewData {
  week: string;
  votes: number;
  comments: number;
}

interface EngagementOverviewProps {
  data: EngagementOverviewData[];
  isLoading?: boolean;
}

export function EngagementOverview({ data, isLoading = false }: EngagementOverviewProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Engagement Overview
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-prose-hr, #e5e7eb)" />
          <XAxis 
            dataKey="week" 
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="votes" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Votes"
          />
          <Line 
            type="monotone" 
            dataKey="comments" 
            stroke="#F59E0B" 
            strokeWidth={2}
            name="Comments"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 