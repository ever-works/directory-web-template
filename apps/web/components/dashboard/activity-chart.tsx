"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityData {
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}

interface ActivityChartProps {
  data: ActivityData[];
  isLoading?: boolean;
}

export function ActivityChart({ data, isLoading = false }: ActivityChartProps) {
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

  // Validate data structure
  const validData = data.filter(item => 
    item && 
    typeof item.date === 'string' && 
    typeof item.submissions === 'number' && 
    typeof item.views === 'number' && 
    typeof item.engagement === 'number'
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Weekly Activity
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart 
          data={validData} 
          aria-label="Weekly activity chart showing submissions, views, and engagement over time"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tick={{ fill: '#6B7280' }}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tick={{ fill: '#6B7280' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="submissions" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Content Created"
          />
          <Line 
            type="monotone" 
            dataKey="views" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Views Received"
          />
          <Line 
            type="monotone" 
            dataKey="engagement" 
            stroke="#F59E0B" 
            strokeWidth={2}
            name="Votes Received"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 