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
      <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
        <div className="animate-pulse">
          <div className="h-3.5 bg-neutral-200 dark:bg-white/8 rounded-sm mb-4 w-1/3"></div>
          <div className="h-64 bg-neutral-100 dark:bg-white/5 rounded-lg"></div>
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
    <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
        Weekly Activity
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart 
          data={validData} 
          aria-label="Weekly activity chart showing submissions, views, and engagement over time"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,163,163,0.15)" />
          <XAxis 
            dataKey="date" 
            stroke="#a3a3a3"
            fontSize={11}
            tick={{ fill: '#a3a3a3' }}
          />
          <YAxis 
            stroke="#a3a3a3"
            fontSize={11}
            tick={{ fill: '#a3a3a3' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f5f5f5',
              fontSize: '12px',
              padding: '8px 12px',
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