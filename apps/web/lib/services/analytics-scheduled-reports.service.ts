import { AnalyticsExportService } from './analytics-export.service';
import { AdminAnalyticsOptimizedRepository } from '@/lib/repositories/admin-analytics-optimized.repository';
import { getJobManager } from '@/lib/background-jobs';

// Constants for report schedules
const REPORT_SCHEDULES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
} as const;

type ReportSchedule = typeof REPORT_SCHEDULES[keyof typeof REPORT_SCHEDULES];

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  schedule: ReportSchedule;
  format: 'csv' | 'json';
  includeMetadata: boolean;
  recipients: string[];
  lastGenerated?: Date;
  nextGeneration?: Date;
  isActive: boolean;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  generatedAt: Date;
  filename: string;
  size: number;
  status: 'generated' | 'failed' | 'pending';
  error?: string;
  downloadUrl?: string;
}

interface ReportGenerationOptions {
  template: ReportTemplate;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customRecipients?: string[];
}

export class AnalyticsScheduledReportsService {
  private exportService: AnalyticsExportService;
  private repository: AdminAnalyticsOptimizedRepository;
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private managedJobIds: Set<string> = new Set();

  constructor() {
    this.exportService = new AnalyticsExportService();
    this.repository = new AdminAnalyticsOptimizedRepository();
    this.initializeDefaultTemplates();

    // Skip report scheduling only if explicitly disabled
    if (process.env.DISABLE_AUTO_SYNC !== 'true') {
      this.scheduleReports();
    }
  }

  /**
   * Initialize default report templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'daily-activity-summary',
        name: 'Daily Activity Summary',
        description: 'Daily overview of platform activity including votes, comments, and user registrations',
        schedule: REPORT_SCHEDULES.DAILY,
        format: 'csv',
        includeMetadata: true,
        recipients: ['admin@demo.ever.works'],
        isActive: true
      },
      {
        id: 'weekly-user-growth',
        name: 'Weekly User Growth Report',
        description: 'Weekly user registration trends and growth metrics',
        schedule: REPORT_SCHEDULES.WEEKLY,
        format: 'csv',
        includeMetadata: true,
        recipients: ['admin@demo.ever.works', 'growth@example.com'],
        isActive: true
      },
      {
        id: 'monthly-comprehensive',
        name: 'Monthly Comprehensive Analytics',
        description: 'Complete monthly analytics including all metrics and trends',
        schedule: REPORT_SCHEDULES.MONTHLY,
        format: 'json',
        includeMetadata: true,
        recipients: ['admin@demo.ever.works', 'analytics@example.com', 'management@example.com'],
        isActive: true
      },
      {
        id: 'quarterly-performance',
        name: 'Quarterly Performance Review',
        description: 'Quarterly performance metrics and trend analysis',
        schedule: REPORT_SCHEDULES.QUARTERLY,
        format: 'csv',
        includeMetadata: true,
        recipients: ['admin@demo.ever.works', 'executives@example.com'],
        isActive: true
      }
    ];

    for (const template of defaultTemplates) {
      this.reportTemplates.set(template.id, template);
    }
  }

  /**
   * Schedule all active reports
   */
  private scheduleReports(): void {
    for (const template of this.reportTemplates.values()) {
      if (template.isActive) {
        this.scheduleReport(template);
      }
    }
  }

  /**
   * Get cron expression for report schedule
   */
  private getCronForSchedule(schedule: ReportSchedule): string {
    switch (schedule) {
      case REPORT_SCHEDULES.DAILY:
        return '0 9 * * *';            // 09:00 daily
      case REPORT_SCHEDULES.WEEKLY:
        return '0 9 * * 1';            // 09:00 Monday
      case REPORT_SCHEDULES.MONTHLY:
        return '0 9 1 * *';            // 09:00 on day 1
      case REPORT_SCHEDULES.QUARTERLY:
        return '0 9 1 1,4,7,10 *';     // 09:00 first day of quarter
    }
  }

  /**
   * Schedule a specific report
   */
  private scheduleReport(template: ReportTemplate): void {
    // Clear any existing timer for this template
    this.unscheduleReport(template.id);

    const now = new Date();
    const nextGeneration = this.calculateNextGenerationTime(template.schedule, now);
    template.nextGeneration = nextGeneration;
    this.reportTemplates.set(template.id, template);

    const manager = getJobManager();
    const jobId = `report-${template.id}`;
    const run = async () => {
      await this.generateScheduledReport(template);
      // Update UI-facing nextGeneration based on calendar rules
      template.nextGeneration = this.calculateNextGenerationTime(template.schedule, new Date());
      this.reportTemplates.set(template.id, template);
    };
    const cron = this.getCronForSchedule(template.schedule);
    manager.scheduleCronJob(jobId, `Report: ${template.name}`, run, cron);
    this.managedJobIds.add(jobId);
    console.log(`Scheduled report: ${template.name} (${template.schedule}) - Next: ${nextGeneration.toISOString()}`);
  }

  /**
   * Get interval in milliseconds for a schedule
   */
  private getScheduleInterval(schedule: ReportSchedule): number {
    switch (schedule) {
      case REPORT_SCHEDULES.DAILY:
        return 24 * 60 * 60 * 1000; // 24 hours
      case REPORT_SCHEDULES.WEEKLY:
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case REPORT_SCHEDULES.MONTHLY:
        return 30 * 24 * 60 * 60 * 1000; // 30 days (approximate)
      case REPORT_SCHEDULES.QUARTERLY:
        return 90 * 24 * 60 * 60 * 1000; // 90 days (approximate)
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Calculate next generation time for a schedule
   */
  private calculateNextGenerationTime(schedule: ReportSchedule, from: Date): Date {
    const next = new Date(from);
    
    switch (schedule) {
      case REPORT_SCHEDULES.DAILY:
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM
        break;
      case REPORT_SCHEDULES.WEEKLY:
        // Next Monday at 9 AM
        const daysUntilMonday = (8 - next.getDay()) % 7;
        next.setDate(next.getDate() + daysUntilMonday);
        next.setHours(9, 0, 0, 0);
        break;
      case REPORT_SCHEDULES.MONTHLY:
        // First day of next month at 9 AM
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(9, 0, 0, 0);
        break;
      case REPORT_SCHEDULES.QUARTERLY:
        // First day of next quarter at 9 AM
        const currentQuarter = Math.floor(next.getMonth() / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        next.setMonth(nextQuarterMonth, 1);
        next.setHours(9, 0, 0, 0);
        break;
    }
    
    return next;
  }

  /**
   * Generate a scheduled report
   */
  private async generateScheduledReport(template: ReportTemplate): Promise<void> {
    try {
      console.log(`Generating scheduled report: ${template.name}`);
      
      const options: ReportGenerationOptions = {
        template,
        dateRange: this.getDateRangeForSchedule(template.schedule)
      };

      const report = await this.generateReport(options);
      
      // Store the generated report
      const scheduledReport: ScheduledReport = {
        id: `${template.id}-${Date.now()}`,
        templateId: template.id,
        generatedAt: new Date(),
        filename: report.filename,
        size: report.size,
        status: 'generated',
        downloadUrl: `/api/admin/analytics/reports/download/${report.filename}`
      };

      this.scheduledReports.set(scheduledReport.id, scheduledReport);
      
      // Update template last generated time
      template.lastGenerated = new Date();
      this.reportTemplates.set(template.id, template);
      
      console.log(`Successfully generated report: ${template.name}`);
      
    } catch (error) {
      console.error(`Failed to generate scheduled report: ${template.name}`, error);
      
      // Store failed report
      const failedReport: ScheduledReport = {
        id: `${template.id}-${Date.now()}`,
        templateId: template.id,
        generatedAt: new Date(),
        filename: '',
        size: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.scheduledReports.set(failedReport.id, failedReport);
    }
  }

  /**
   * Get date range for a specific schedule
   */
  private getDateRangeForSchedule(schedule: ReportSchedule): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (schedule) {
      case REPORT_SCHEDULES.DAILY:
        start.setDate(start.getDate() - 1);
        break;
      case REPORT_SCHEDULES.WEEKLY:
        start.setDate(start.getDate() - 7);
        break;
      case REPORT_SCHEDULES.MONTHLY:
        start.setMonth(start.getMonth() - 1);
        break;
      case REPORT_SCHEDULES.QUARTERLY:
        start.setMonth(start.getMonth() - 3);
        break;
    }
    
    return { start, end };
  }

  /**
   * Generate a report manually
   */
  async generateReport(options: ReportGenerationOptions): Promise<{
    filename: string;
    size: number;
    data: string | Buffer;
    contentType: string;
  }> {
    const { template, dateRange } = options;
    
    let exportResult;
    
    switch (template.id) {
      case 'daily-activity-summary':
        exportResult = await this.exportService.exportActivityTrends(1, {
          format: template.format as 'csv' | 'json',
          dateRange,
          includeMetadata: template.includeMetadata
        });
        break;
        
      case 'weekly-user-growth':
        exportResult = await this.exportService.exportUserGrowthTrends(1, {
          format: template.format as 'csv' | 'json',
          dateRange,
          includeMetadata: template.includeMetadata
        });
        break;
        
      case 'monthly-comprehensive':
        exportResult = await this.exportService.exportComprehensiveReport({
          format: template.format as 'csv' | 'json',
          dateRange,
          includeMetadata: template.includeMetadata
        });
        break;
        
      case 'quarterly-performance':
        exportResult = await this.exportService.exportComprehensiveReport({
          format: template.format as 'csv' | 'json',
          dateRange,
          includeMetadata: template.includeMetadata
        });
        break;
        
      default:
        throw new Error(`Unknown report template: ${template.id}`);
    }
    
    return {
      filename: exportResult.filename,
      size: exportResult.size,
      data: exportResult.data,
      contentType: exportResult.contentType
    };
  }

  /**
   * Get all report templates
   */
  getReportTemplates(): ReportTemplate[] {
    return Array.from(this.reportTemplates.values());
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(): ScheduledReport[] {
    return Array.from(this.scheduledReports.values());
  }

  /**
   * Create a new report template
   */
  createReportTemplate(template: Omit<ReportTemplate, 'id'>): ReportTemplate {
    const id = `custom-${Date.now()}`;
    const newTemplate: ReportTemplate = {
      ...template,
      id,
      lastGenerated: undefined,
      nextGeneration: undefined
    };
    
    this.reportTemplates.set(id, newTemplate);
    
    if (newTemplate.isActive) {
      this.scheduleReport(newTemplate);
    }
    
    return newTemplate;
  }

  /**
   * Update a report template
   */
  updateReportTemplate(id: string, updates: Partial<ReportTemplate>): ReportTemplate | null {
    const template = this.reportTemplates.get(id);
    if (!template) return null;
    
    const updatedTemplate = { ...template, ...updates };
    this.reportTemplates.set(id, updatedTemplate);
    
    const activeChanged = updates.isActive !== undefined && updates.isActive !== template.isActive;
    const scheduleChanged = updates.schedule !== undefined && updates.schedule !== template.schedule;
    if (activeChanged || scheduleChanged) {
      this.unscheduleReport(id);
      if (updatedTemplate.isActive) {
        this.scheduleReport(updatedTemplate);
      }
    }
    
    return updatedTemplate;
  }

  /**
   * Delete a report template
   */
  deleteReportTemplate(id: string): boolean {
    const template = this.reportTemplates.get(id);
    if (!template) return false;
    
    this.unscheduleReport(id);
    this.reportTemplates.delete(id);
    
    return true;
  }

  /**
   * Unschedule a report
   */
  private unscheduleReport(id: string): void {
    const jobId = `report-${id}`;
    const manager = getJobManager();
    manager.stopJob(jobId);
    this.managedJobIds.delete(jobId);
  }

  /**
   * Get report statistics
   */
  getReportStatistics(): {
    totalTemplates: number;
    activeTemplates: number;
    totalReports: number;
    successfulReports: number;
    failedReports: number;
  } {
    const templates = Array.from(this.reportTemplates.values());
    const reports = Array.from(this.scheduledReports.values());
    
    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      totalReports: reports.length,
      successfulReports: reports.filter(r => r.status === 'generated').length,
      failedReports: reports.filter(r => r.status === 'failed').length
    };
  }

  /**
   * Stop all scheduled reports
   */
  stop(): void {
    const manager = getJobManager();
    for (const jobId of this.managedJobIds) {
      manager.stopJob(jobId);
    }
    this.managedJobIds.clear();
    console.log('All scheduled reports stopped');
  }

  /**
   * Restart all scheduled reports
   */
  restart(): void {
    this.stop();
    this.scheduleReports();
    console.log('All scheduled reports restarted');
  }
}

// Singleton instance
let scheduledReportsInstance: AnalyticsScheduledReportsService | null = null;

export function getAnalyticsScheduledReportsService(): AnalyticsScheduledReportsService {
  if (!scheduledReportsInstance) {
    scheduledReportsInstance = new AnalyticsScheduledReportsService();
  }
  return scheduledReportsInstance;
}

export function stopAnalyticsScheduledReports(): void {
  if (scheduledReportsInstance) {
    scheduledReportsInstance.stop();
    scheduledReportsInstance = null;
  }
}
