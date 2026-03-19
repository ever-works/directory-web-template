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
      <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow-xs border border-gray-200 dark:border-white/[0.06] p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.08] rounded-sm mb-4 w-1/3"></div>
          <div className="h-[250px] bg-gray-200 dark:bg-white/[0.08] rounded-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow-xs border border-gray-200 dark:border-white/[0.06] p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Submission Timeline
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-prose-hr, #e5e7eb)" />
          <XAxis 
            dataKey="month" 
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
          <Bar 
            dataKey="submissions" 
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 