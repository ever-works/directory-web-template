import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { CheckCircle, Clock, XCircle, PieChart } from "lucide-react";
import { AdminPieChartSkeleton } from "./admin-loading-skeleton";
import { cn } from "@/lib/utils";

interface AdminSubmissionStatusProps {
  data: AdminStats['submissionStatusData'];
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; iconColor: string; bg: string }> = {
  Approved: { icon: CheckCircle, iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  Pending:  { icon: Clock,        iconColor: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10"   },
  Rejected: { icon: XCircle,      iconColor: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-500/10"       },
};

function DonutChart({
  segments,
  total,
}: {
  segments: { status: string; count: number; percentage: number; startAngle: number; endAngle: number; color: string }[];
  total: number;
}) {
  const R = 52;
  const cx = 64, cy = 64;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * R;

  if (segments.length === 1) {
    return (
      <svg viewBox="0 0 128 128" className="w-32 h-32" aria-hidden="true">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={segments[0].color} strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cy} r={R - strokeWidth / 2 - 2} fill="white" className="dark:fill-gray-900" />
      </svg>
    );
  }

  let offset = 0;
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 -rotate-90" aria-hidden="true">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-white/6" />
      {segments.map((seg, i) => {
        const dash = (seg.percentage / 100) * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function AdminSubmissionStatus({ data, isLoading }: AdminSubmissionStatusProps) {
  if (isLoading) return <AdminPieChartSkeleton />;

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Empty state
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <PieChart className="h-4 w-4 text-indigo-500" />
            Submission Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-4">
              <svg viewBox="0 0 128 128" className="w-28 h-28 opacity-20" aria-hidden="true">
                <circle cx="64" cy="64" r="52" fill="none" stroke="currentColor" strokeWidth="14" className="text-indigo-400" strokeDasharray="163 164" strokeLinecap="round" strokeDashoffset="0" transform="rotate(-90 64 64)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-indigo-400 opacity-60" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Awaiting Submissions</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-50 leading-relaxed">
              Once users submit projects, you&apos;ll see a breakdown by status here.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {['Approved', 'Pending', 'Rejected'].map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <div key={status} className={cn("rounded-xl p-3 text-center", cfg.bg)}>
                  <Icon className={cn("h-4 w-4 mx-auto mb-1", cfg.iconColor)} />
                  <p className="text-lg font-bold text-gray-400 dark:text-gray-500">—</p>
                  <p className={cn("text-[11px] font-semibold", cfg.iconColor)}>{status}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/6 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Total Submissions</span>
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 tabular-nums">0</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build segments for donut
  let currentAngle = 0;
  const segments = data
    .filter(item => item.count > 0)
    .map(item => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const seg = { ...item, percentage, startAngle: currentAngle, endAngle: currentAngle + angle };
      currentAngle += angle;
      return seg;
    });

  return (
    <Card className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <PieChart className="h-4 w-4 text-indigo-500" />
          Submission Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 ">
        <div className="space-y-5">
          {/* Donut chart + center info */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <DonutChart segments={segments} total={total} />
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">{total}</span>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total</span>
              </div>
            </div>
          </div>

          {/* Legend with proportion bars */}
          <div className="space-y-2.5">
            {data.map((item, index) => {
              const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Approved'];
              const Icon = cfg.icon;
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-3 w-3", cfg.iconColor)} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{item.count.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-9 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-0.5 w-full rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total footer */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/6 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Submissions</span>
            <span className="text-sm font-normal tracking-tight text-gray-900 dark:text-white tabular-nums">{total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
