"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, Clock, Settings, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
// Removed dummy data service; scheduled reports will be backed by DB seeding

// Constants for className strings
const EXPORT_CONTAINER_STYLES = "space-y-6";
const EXPORT_GRID_STYLES = "grid grid-cols-1 lg:grid-cols-2 gap-5";
const EXPORT_HEADER_STYLES = "flex items-center gap-2.5";
const EXPORT_ICON_STYLES = "h-4.5 w-4.5 text-blue-600 shrink-0";
const EXPORT_OPTIONS_STYLES = "space-y-3";
const EXPORT_OPTION_STYLES = "flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50/70 dark:bg-transparent hover:bg-gray-100/50 dark:hover:bg-white/6 transition-colors duration-150";
const EXPORT_OPTION_LEFT_STYLES = "flex items-center gap-3 min-w-0";
const EXPORT_OPTION_RIGHT_STYLES = "flex items-center gap-2 shrink-0";
const SCHEDULED_REPORTS_STYLES = "space-y-3";
const REPORT_ITEM_STYLES = "flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-white/8";
const REPORT_STATUS_STYLES = "px-2.5 py-1 rounded-full text-xs font-medium";
const REPORT_STATUS_SUCCESS_STYLES = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
const REPORT_STATUS_FAILED_STYLES = "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
const REPORT_STATUS_PENDING_STYLES = "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  formats: ('csv' | 'json')[];
  icon: React.ReactNode;
  action: () => void;
}



export function AdminDataExport() {
  const t = useTranslations('admin.DATA_EXPORT');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Placeholder until DB-backed scheduled reports are seeded
  const scheduledReports: Array<{ id: string; name: string; schedule: string; format: string; status: string; lastGenerated?: string; nextGeneration?: string; recipients: string[]; }> = [];

  const exportOptions: ExportOption[] = [
    {
      id: 'user-growth',
      name: t('EXPORT_OPTIONS_DATA.USER_GROWTH_TRENDS.NAME'),
      description: t('EXPORT_OPTIONS_DATA.USER_GROWTH_TRENDS.DESCRIPTION'),
      formats: ['csv', 'json'],
      icon: <Download className="h-4 w-4" />,
      action: () => handleExport('user-growth')
    },
    {
      id: 'activity-trends',
      name: t('EXPORT_OPTIONS_DATA.ACTIVITY_TRENDS.NAME'),
      description: t('EXPORT_OPTIONS_DATA.ACTIVITY_TRENDS.DESCRIPTION'),
      formats: ['csv', 'json'],
      icon: <FileText className="h-4 w-4" />,
      action: () => handleExport('activity-trends')
    },
    {
      id: 'top-items',
      name: t('EXPORT_OPTIONS_DATA.TOP_PERFORMING_ITEMS.NAME'),
      description: t('EXPORT_OPTIONS_DATA.TOP_PERFORMING_ITEMS.DESCRIPTION'),
      formats: ['csv', 'json'],
      icon: <FileText className="h-4 w-4" />,
      action: () => handleExport('top-items')
    },
    {
      id: 'recent-activity',
      name: t('EXPORT_OPTIONS_DATA.RECENT_ACTIVITY_FEED.NAME'),
      description: t('EXPORT_OPTIONS_DATA.RECENT_ACTIVITY_FEED.DESCRIPTION'),
      formats: ['csv', 'json'],
      icon: <FileText className="h-4 w-4" />,
      action: () => handleExport('recent-activity')
    },
    {
      id: 'comprehensive',
      name: t('EXPORT_OPTIONS_DATA.COMPREHENSIVE_REPORT.NAME'),
      description: t('EXPORT_OPTIONS_DATA.COMPREHENSIVE_REPORT.DESCRIPTION'),
      formats: ['csv', 'json'],
      icon: <FileText className="h-4 w-4" />,
      action: () => handleExport('comprehensive')
    }
  ];

  const handleExport = async (type: string) => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setExportProgress(i);
    }

    // Simulate file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}-${timestamp}.${selectedFormat}`;
    
    // Create a mock download
    const content = `Mock ${type} data exported on ${timestamp}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportProgress(0);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'generated':
        return REPORT_STATUS_SUCCESS_STYLES;
      case 'failed':
        return REPORT_STATUS_FAILED_STYLES;
      case 'pending':
        return REPORT_STATUS_PENDING_STYLES;
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated':
        return t('GENERATED');
      case 'failed':
        return t('FAILED');
      case 'pending':
        return t('PENDING');
      default:
        return t('UNKNOWN');
    }
  };

  return (
    <div className={EXPORT_CONTAINER_STYLES}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('SUBTITLE')}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex cursor-pointer items-center dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/3 gap-1.5 shrink-0 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('REFRESH')}</span>
        </button>
      </div>

      {/* Export Options */}
      <Card className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
        <CardHeader>
          <CardTitle className={EXPORT_HEADER_STYLES}>
            <Download className={EXPORT_ICON_STYLES} />
            <span>{t('EXPORT_OPTIONS')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={EXPORT_OPTIONS_STYLES}>
            {/* Format Selection */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">{t('EXPORT_FORMAT')}</label>
              <div className="flex space-x-2">
                {(['csv', 'json'] as const).map((format) => (
                  <Button
                    key={format}
                    variant={selectedFormat === format ? "default" : "outline-solid"}
                    size="sm"
                    onClick={() => setSelectedFormat(format)}
                    className="w-16"
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Metadata Option */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-metadata"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded-sm border-gray-300"
              />
              <label htmlFor="include-metadata" className="text-sm">
                {t('INCLUDE_METADATA')}
              </label>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
              <div className="flex items-center justify-between text-sm mb-2.5">
                <span className="font-medium text-blue-700 dark:text-blue-300">{t('EXPORTING')}</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums">{exportProgress}%</span>
              </div>
              <div className="w-full bg-blue-200/60 dark:bg-blue-800/40 rounded-full h-0.5 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-0.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options Grid */}
      <div className={EXPORT_GRID_STYLES}>
        {/* Manual Export Options */}
        <Card className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardHeader>
            <CardTitle className={EXPORT_HEADER_STYLES}>
              <Download className={EXPORT_ICON_STYLES} />
              <span>{t('MANUAL_EXPORT')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportOptions.map((option) => (
                <div key={option.id} className={EXPORT_OPTION_STYLES}>
                  <div className={EXPORT_OPTION_LEFT_STYLES}>
                    {option.icon}
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{option.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
                    </div>
                  </div>
                  <div className={EXPORT_OPTION_RIGHT_STYLES}>
                    <button
                      onClick={option.action}
                      disabled={isExporting}
                      className='flex cursor-pointer justify-between items-center bg-white dark:bg-white/4 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8'
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('EXPORT')} {selectedFormat.toUpperCase()}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardHeader>
            <CardTitle className={EXPORT_HEADER_STYLES}>
              <Calendar className={EXPORT_ICON_STYLES} />
              <span>{t('SCHEDULED_REPORTS')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={SCHEDULED_REPORTS_STYLES}>
              {scheduledReports.map((report) => (
                <div key={report.id} className={REPORT_ITEM_STYLES}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{report.name}</h4>
                      <span className={`${REPORT_STATUS_STYLES} ${getStatusStyles(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{report.schedule}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-3 w-3" />
                        <span>{t('FORMAT')} {report.format}</span>
                      </div>
                      {report.lastGenerated && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-3 w-3" />
                          <span>{t('LAST')} {report.lastGenerated}</span>
                        </div>
                      )}
                      {report.nextGeneration && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>{t('NEXT')} {report.nextGeneration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Management */}
      <Card className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
        <CardHeader>
          <CardTitle className={EXPORT_HEADER_STYLES}>
            <Settings className={EXPORT_ICON_STYLES} />
            <span>{t('REPORT_MANAGEMENT')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <button className='flex cursor-pointer justify-between items-center dark:bg-white/4 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8'>
              <Calendar className="h-3 w-3 mr-2" />
              {t('CREATE_NEW_TEMPLATE')}
            </button>
            <button className='flex cursor-pointer justify-between items-center dark:bg-white/4 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8'>
              <Settings className="h-4 w-4 mr-2" />
              {t('MANAGE_TEMPLATES')}
            </button>
            <button className='flex cursor-pointer justify-between items-center dark:bg-white/4 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8'>
              <Clock className="h-4 w-4 mr-2" />
              {t('VIEW_HISTORY')}
            </button>
            <button className='flex cursor-pointer justify-between items-center dark:bg-white/4 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8'>
              <FileText className="h-4 w-4 mr-2" />
              {t('EXPORT_SETTINGS')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
