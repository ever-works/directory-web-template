"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface EngagementData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface EngagementChartProps {
  data: EngagementData[];
  isLoading?: boolean;
}

export function EngagementChart({ data, isLoading = false }: EngagementChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
        <div className="animate-pulse">
          <div className="h-3.5 bg-neutral-200 dark:bg-white/8 rounded-sm mb-4 w-1/2"></div>
          <div className="h-62.5 bg-neutral-100 dark:bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
        Community Engagement
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name?: string; percent?: number }) => {
              if ((percent ?? 0) === 0) return '';
              return `${name ?? 'Unknown'} ${((percent ?? 0) * 100).toFixed(0)}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 