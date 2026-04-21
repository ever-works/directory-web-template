"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SubmissionTimelineData {
  month: string;
  submissions: number;
}

interface SubmissionTimelineProps {
  data: SubmissionTimelineData[];
  isLoading?: boolean;
}

export function SubmissionTimeline({ data, isLoading = false }: SubmissionTimelineProps) {
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
          <Bar 
            dataKey="submissions" 
            fill="#171717"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 