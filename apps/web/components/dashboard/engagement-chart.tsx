"use client";

import { useTheme } from 'next-themes';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getTooltipStyles } from './styles';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
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
          <Tooltip contentStyle={getTooltipStyles(isDark)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 