"use client";

import { useTheme } from 'next-themes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTooltipStyles } from './styles';

interface SubmissionTimelineData {
  month: string;
  submissions: number;
}

interface SubmissionTimelineProps {
  data: SubmissionTimelineData[];
  isLoading?: boolean;
}

export function SubmissionTimeline({ data, isLoading = false }: SubmissionTimelineProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
        <div className="animate-pulse">
          <div className="h-3.5 bg-neutral-200 dark:bg-white/8 rounded-sm mb-4 w-1/3"></div>
          <div className="h-62.5 bg-neutral-100 dark:bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
        Submission Timeline
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,163,163,0.15)" />
          <XAxis 
            dataKey="month" 
            stroke="#a3a3a3"
            fontSize={11}
          />
          <YAxis 
            stroke="#a3a3a3"
            fontSize={11}
          />
          <Tooltip contentStyle={getTooltipStyles(isDark)} />
          <Bar 
            dataKey="submissions" 
            fill={isDark ? '#e5e5e5' : '#171717'}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 