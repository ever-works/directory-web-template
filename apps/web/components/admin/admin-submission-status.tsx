import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { CheckCircle, Clock, XCircle, BarChart3, TrendingUp } from "lucide-react";
import { AdminPieChartSkeleton } from "./admin-loading-skeleton";


interface AdminSubmissionStatusProps {
  data: AdminStats['submissionStatusData'];
  isLoading: boolean;
}

export function AdminSubmissionStatus({ data, isLoading }: AdminSubmissionStatusProps) {
  if (isLoading) {
    return <AdminPieChartSkeleton />;
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  // Guard against empty data - show demo chart instead
  if (total === 0) {
    // Show demo chart when no submissions exist

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Submission Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Demo Pie Chart */}
            <div className="flex justify-center">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                <svg width="96" height="96" className="sm:w-32 sm:h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    fill="#6366F1"
                    className="hover:opacity-80 transition-opacity"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                    <div className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Legend */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-3 h-3 rounded-full bg-indigo-500"
                  />
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ready to Accept Submissions
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                    --
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (0%)
                  </span>
                </div>
              </div>
            </div>

            {/* Demo Insight Card */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                    Awaiting Your First Submissions
                  </h4>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                    Once users start submitting projects, you&apos;ll see a detailed breakdown of approval statuses, trends, and metrics here.
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white dark:bg-indigo-800/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">--</div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300">Approved</div>
                    </div>
                    <div className="bg-white dark:bg-indigo-800/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">--</div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300">Pending</div>
                    </div>
                    <div className="bg-white dark:bg-indigo-800/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">--</div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300">Rejected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Submissions
                </span>
                <span className="text-base sm:text-lg font-bold text-gray-400 dark:text-gray-500">
                  0
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate angles for pie chart - only include segments with count > 0
  let currentAngle = 0;
  const segments = data
    .filter(item => item.count > 0)
    .map(item => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const segment = {
        ...item,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Simple Pie Chart */}
          <div className="flex justify-center">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <svg width="160" height="160" className="sm:w-48 sm:h-48 transform -rotate-90">
                {segments.map((segment, index) => {
                  const radius = 70;
                  const centerX = 80;
                  const centerY = 80;

                  // Special case for full circle (100% of one status)
                  if (segment.endAngle - segment.startAngle >= 360 || Math.abs(segment.endAngle - segment.startAngle - 360) < 0.1) {
                    return (
                      <g key={index}>
                        {/* Outer circle */}
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r={radius}
                          fill={segment.color}
                          className="hover:opacity-80 transition-opacity"
                        />
                        {/* Inner circle to create donut effect */}
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r={radius * 0.45}
                          fill="currentColor"
                          className="text-white dark:text-gray-900"
                        />
                        {/* Center text */}
                        <text
                          x={centerX}
                          y={centerY - 6}
                          textAnchor="middle"
                          className="fill-current text-gray-900 dark:text-gray-100 text-base font-bold"
                          transform={`rotate(90 ${centerX} ${centerY})`}
                        >
                          {Math.round(segment.percentage)}%
                        </text>
                        <text
                          x={centerX}
                          y={centerY + 6}
                          textAnchor="middle"
                          className="fill-current text-gray-600 dark:text-gray-400 text-xs"
                          transform={`rotate(90 ${centerX} ${centerY})`}
                        >
                          {segment.status}
                        </text>
                      </g>
                    );
                  }

                  const startAngleRad = (segment.startAngle * Math.PI) / 180;
                  const endAngleRad = (segment.endAngle * Math.PI) / 180;

                  const x1 = centerX + radius * Math.cos(startAngleRad);
                  const y1 = centerY + radius * Math.sin(startAngleRad);
                  const x2 = centerX + radius * Math.cos(endAngleRad);
                  const y2 = centerY + radius * Math.sin(endAngleRad);

                  const largeArc = segment.endAngle - segment.startAngle > 180 ? 1 : 0;

                  const pathData = [
                    `M ${centerX} ${centerY}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                    'Z'
                  ].join(' ');

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={segment.color}
                      className="hover:opacity-80 transition-opacity"
                    />
                  );
                })}
                {/* Center information for multi-segment charts */}
                {segments.length > 1 && (
                  <g>
                    <circle
                      cx="80"
                      cy="80"
                      r="28"
                      fill="currentColor"
                      className="text-white dark:text-gray-900"
                    />
                    <text
                      x="80"
                      y="74"
                      textAnchor="middle"
                      className="fill-current text-gray-900 dark:text-gray-100 text-base font-bold"
                      transform="rotate(90 80 80)"
                    >
                      {total}
                    </text>
                    <text
                      x="80"
                      y="86"
                      textAnchor="middle"
                      className="fill-current text-gray-600 dark:text-gray-400 text-xs"
                      transform="rotate(90 80 80)"
                    >
                      Total
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 sm:space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span style={{ color: item.color }}>
                      {getStatusIcon(item.status)}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({Math.round((item.count / total) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Submissions
              </span>
              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                {total}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 