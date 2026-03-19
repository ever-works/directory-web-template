import { AdminAnalyticsOptimizedRepository } from '@/lib/repositories/admin-analytics-optimized.repository';

// Constants for export formats
const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  EXCEL: 'xlsx'
} as const;

type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  compression?: boolean;
}

interface ExportResult {
  data: string | Buffer;
  filename: string;
  contentType: string;
  size: number;
  timestamp: Date;
}

interface ExportMetadata {
  generatedAt: string;
  dateRange?: string;
  totalRecords: number;
  exportFormat: string;
  version: string;
}

export class AnalyticsExportService {
  private repository: AdminAnalyticsOptimizedRepository;

  constructor(repo: AdminAnalyticsOptimizedRepository = new AdminAnalyticsOptimizedRepository()) {
    this.repository = repo;
  }

  /**
   * Export user growth trends data
   */
  async exportUserGrowthTrends(months: number = 12, options: ExportOptions): Promise<ExportResult> {
    if (!this.validateExportOptions(options)) throw new Error('Invalid export options');
    
    const data = await this.repository.getUserGrowthTrends(months);
    
    if (options.format === EXPORT_FORMATS.CSV) {
      return this.exportToCSV(data, 'user-growth-trends');
    } else if (options.format === EXPORT_FORMATS.JSON) {
      return this.exportToJSON(data, 'user-growth-trends', options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export activity trends data
   */
  async exportActivityTrends(days: number = 7, options: ExportOptions): Promise<ExportResult> {
    if (!this.validateExportOptions(options)) throw new Error('Invalid export options');
    
    const data = await this.repository.getActivityTrends(days);
    
    if (options.format === EXPORT_FORMATS.CSV) {
      return this.exportToCSV(data, 'activity-trends');
    } else if (options.format === EXPORT_FORMATS.JSON) {
      return this.exportToJSON(data, 'activity-trends', options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export top items data
   */
  async exportTopItems(limit: number = 10, options: ExportOptions): Promise<ExportResult> {
    if (!this.validateExportOptions(options)) throw new Error('Invalid export options');
    
    const data = await this.repository.getTopItems(limit);
    
    if (options.format === EXPORT_FORMATS.CSV) {
      return this.exportToCSV(data, 'top-items');
    } else if (options.format === EXPORT_FORMATS.JSON) {
      return this.exportToJSON(data, 'top-items', options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export recent activity data
   */
  async exportRecentActivity(limit: number = 10, options: ExportOptions): Promise<ExportResult> {
    if (!this.validateExportOptions(options)) throw new Error('Invalid export options');
    
    const data = await this.repository.getRecentActivity(limit);
    
    if (options.format === EXPORT_FORMATS.CSV) {
      return this.exportToCSV(data, 'recent-activity');
    } else if (options.format === EXPORT_FORMATS.JSON) {
      return this.exportToJSON(data, 'recent-activity', options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export comprehensive analytics report
   */
  async exportComprehensiveReport(options: ExportOptions): Promise<ExportResult> {
    if (!this.validateExportOptions(options)) throw new Error('Invalid export options');
    
    const [userGrowth, activityTrends, topItems, recentActivity] = await Promise.all([
      this.repository.getUserGrowthTrends(12),
      this.repository.getActivityTrends(30),
      this.repository.getTopItems(50),
      this.repository.getRecentActivity(100)
    ]);

    const comprehensiveData = {
      userGrowth,
      activityTrends,
      topItems,
      recentActivity,
      summary: {
        totalUsers: userGrowth[userGrowth.length - 1]?.active || 0,
        totalVotes: activityTrends.reduce((sum, day) => sum + day.votes, 0),
        totalComments: activityTrends.reduce((sum, day) => sum + day.comments, 0),
        topPerformingItem: topItems[0]?.name || 'N/A'
      }
    };

    if (options.format === EXPORT_FORMATS.CSV) {
      return this.exportToCSV(comprehensiveData, 'comprehensive-analytics');
    } else if (options.format === EXPORT_FORMATS.JSON) {
      return this.exportToJSON(comprehensiveData, 'comprehensive-analytics', options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(data: any, filename: string): ExportResult {
    let csvContent = '';
    
    if (Array.isArray(data)) {
      // Handle array data
      if (data.length > 0) {
        // Get union of all keys from all rows to handle missing properties
        const headers = Array.from(
          data.reduce((s: Set<string>, r: Record<string, any>) => {
            if (r && typeof r === 'object') {
              Object.keys(r).forEach((k) => s.add(k));
            }
            return s;
          }, new Set<string>())
        );
        csvContent += headers.join(',') + '\n';
        
        // Improved CSV escaping function
        const esc = (v: any) => {
          if (v === null || v === undefined) return '';
          const s = typeof v === 'string' ? v : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        
        for (const row of data) {
          const values = headers.map((h) => {
            if (row && typeof row === 'object' && row !== null) {
              const typedRow = row as Record<string, any>;
              return esc(typedRow[h as keyof typeof typedRow]);
            }
            return esc(undefined);
          });
          csvContent += values.join(',') + '\n';
        }
      }
    } else {
      // Handle object data (comprehensive report)
      csvContent = this.objectToCSV(data);
    }

    const finalFilename = this.generateFilename(filename, 'csv');
    
    return {
      data: csvContent,
      filename: finalFilename,
      contentType: 'text/csv; charset=utf-8',
      size: Buffer.byteLength(csvContent, 'utf8'),
      timestamp: new Date()
    };
  }

  /**
   * Convert nested object to CSV format
   */
  private objectToCSV(obj: any, prefix: string = ''): string {
    let csvContent = '';
    
    // CSV escaping function
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    
    for (const [key, value] of Object.entries(obj)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value)) {
        // Handle arrays
        if (value.length > 0 && typeof value[0] === 'object') {
          // Array of objects - create separate CSV section
          csvContent += `\n${currentKey}\n`;
          const headers = Object.keys(value[0]);
          csvContent += headers.join(',') + '\n';
          
          for (const row of value) {
            if (row && typeof row === 'object') {
              const values = headers.map(header => {
                const cellValue = (row as Record<string, any>)[header];
                return esc(cellValue);
              });
              csvContent += values.join(',') + '\n';
            }
          }
        } else {
          // Simple array
          csvContent += `${currentKey},${value.map(v => esc(v)).join(',')}\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively handle nested objects
        csvContent += this.objectToCSV(value, currentKey);
      } else {
        // Simple value
        csvContent += `${currentKey},${esc(value)}\n`;
      }
    }
    
    return csvContent;
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(data: any, filename: string, options: ExportOptions): ExportResult {
    let jsonData = data;
    
    if (options.includeMetadata) {
      const metadata: ExportMetadata = {
        generatedAt: new Date().toISOString(),
        totalRecords: Array.isArray(data) ? data.length : 1,
        exportFormat: 'JSON',
        version: '1.0.0'
      };
      
      if (options.dateRange) {
        metadata.dateRange = `${options.dateRange.start.toISOString()} to ${options.dateRange.end.toISOString()}`;
      }
      
      jsonData = {
        metadata,
        data
      };
    }

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}-${timestamp}.json`;
    
    return {
      data: jsonContent,
      filename: finalFilename,
      contentType: 'application/json',
      size: Buffer.byteLength(jsonContent, 'utf8'),
      timestamp: new Date()
    };
  }

  /**
   * Generate export filename with timestamp
   */
  private generateFilename(baseName: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${baseName}-${timestamp}.${format}`;
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): string[] {
    return Object.values(EXPORT_FORMATS);
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): boolean {
    if (!Object.values(EXPORT_FORMATS).includes(options.format)) {
      return false;
    }
    
    if (options.dateRange) {
      if (options.dateRange.start > options.dateRange.end) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(): Promise<{
    totalExports: number;
    lastExport: Date | null;
    popularFormats: string[];
    averageExportSize: number;
  }> {
    // In a real implementation, this would track export history
    // For now, return mock data
    return {
      totalExports: 0,
      lastExport: null,
      popularFormats: ['csv', 'json'],
      averageExportSize: 0
    };
  }
}
