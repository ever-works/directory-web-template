/**
 * Scheduled report task identifiers and suggested cron schedules.
 */

export const ReportTaskIds = {
  dailyActivity: 'report-daily-activity-summary',
  weeklyUserGrowth: 'report-weekly-user-growth',
  monthlyComprehensive: 'report-monthly-comprehensive',
  quarterlyPerformance: 'report-quarterly-performance'
} as const;

export type ReportTaskId = typeof ReportTaskIds[keyof typeof ReportTaskIds];

export const ReportCrons: Record<keyof typeof ReportTaskIds, string> = {
  // Every day at 09:00
  dailyActivity: '0 9 * * *',
  // Every Monday at 09:00
  weeklyUserGrowth: '0 9 * * 1',
  // First day of month at 09:00
  monthlyComprehensive: '0 9 1 * *',
  // First day of quarter at 09:00 (approximate via months 1,4,7,10)
  quarterlyPerformance: '0 9 1 1,4,7,10 *'
};

export type ReportCronKey = keyof typeof ReportCrons;


