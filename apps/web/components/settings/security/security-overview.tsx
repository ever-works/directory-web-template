"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecuritySettings, useSecurityCache } from "@/hooks/use-security-settings";
import { Shield, Clock, Smartphone, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Score Ring ────────────────────────────────────────────────────────────

interface SecurityScoreRingProps {
  score: number;
  total?: number;
}

function SecurityScoreRing({ score, total = 4 }: SecurityScoreRingProps) {
  const percentage = (score / total) * 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color =
    score <= 1 ? "#ef4444" : score <= 2 ? "#f59e0b" : score <= 3 ? "#3b82f6" : "#10b981";

  const label =
    score <= 1 ? "At Risk" : score <= 2 ? "Fair" : score <= 3 ? "Good" : "Strong";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24" cy="24" r={radius}
            fill="none" stroke="currentColor" strokeWidth="4"
            className="text-gray-100 dark:text-white/8"
          />
          <circle
            cx="24" cy="24" r={radius}
            fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-xs font-bold leading-none" style={{ color }}>
            {score}/{total}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Security Metric ───────────────────────────────────────────────────────

interface SecurityMetricProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  status: "good" | "warning" | "danger";
  description?: string;
}

function SecurityMetric({ icon, title, value, status, description }: SecurityMetricProps) {
  const statusColors = {
    good: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  const statusBgColors = {
    good: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  return (
    <div className={cn("p-3 rounded-lg border", statusBgColors[status])}>
      <div className="flex items-start gap-2.5">
        <div className={cn("shrink-0 mt-0.5", statusColors[status])}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100">{title}</h4>
            <span className={cn("text-xs font-bold shrink-0", statusColors[status])}>{value}</span>
          </div>
          {description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SecurityOverviewSkeleton() {
  return (
    <Card className="border border-gray-200 dark:border-white/6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="w-14 h-14 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg border border-gray-100 dark:border-white/6">
            <div className="flex items-start gap-2.5">
              <Skeleton className="w-4 h-4 rounded-sm mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function SecurityOverview() {
  const { data: settings, isLoading, error, refetch, isRefetching } = useSecuritySettings();
  const { invalidateSecuritySettings } = useSecurityCache();

  const handleRefresh = () => {
    invalidateSecuritySettings();
    refetch();
  };

  if (isLoading) return <SecurityOverviewSkeleton />;

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Failed to load security settings</h3>
              <p className="text-xs mt-1 text-red-500 dark:text-red-400">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3 h-7 text-xs"
                disabled={isRefetching}
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefetching && "animate-spin")} />
                {isRefetching ? "Retrying…" : "Try Again"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  // ── Score calculation ──────────────────────────────────────────────────
  const passwordOk = (() => {
    if (!settings.lastPasswordChange) return false;
    const days = Math.floor(
      (Date.now() - new Date(settings.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days <= 90;
  })();

  const scorePoints = [
    !settings.accountLocked && settings.loginAttemptsCount <= 3, // account safe
    settings.twoFactorEnabled,                                    // 2FA on
    passwordOk,                                                   // password fresh
    settings.activeSessionsCount <= 5,                            // sessions ok
  ];
  const score = scorePoints.filter(Boolean).length;

  // ── Status helpers ─────────────────────────────────────────────────────
  const accountStatus = (() => {
    if (settings.accountLocked) return { status: "danger" as const, value: "Locked", desc: "Contact support to unlock" };
    if (settings.loginAttemptsCount > 3) return { status: "warning" as const, value: "At Risk", desc: `${settings.loginAttemptsCount} failed attempts` };
    return { status: "good" as const, value: "Secure", desc: "No issues detected" };
  })();

  const twoFactorStatus = settings.twoFactorEnabled
    ? { status: "good" as const, value: "Enabled", desc: "Account is protected" }
    : { status: "warning" as const, value: "Disabled", desc: "Enable for better security" };

  const passwordStatus = (() => {
    if (!settings.lastPasswordChange) return { status: "warning" as const, value: "Never", desc: "Password never changed" };
    const days = Math.floor(
      (Date.now() - new Date(settings.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days > 90) return { status: "danger" as const, value: `${days}d`, desc: "Consider updating soon" };
    if (days > 30) return { status: "warning" as const, value: `${days}d ago`, desc: "Last changed" };
    return { status: "good" as const, value: `${days}d ago`, desc: "Recently updated" };
  })();

  const sessionStatus = settings.activeSessionsCount > 5
    ? { status: "warning" as const }
    : { status: "good" as const };

  return (
    <Card className="border border-gray-200 dark:border-white/6 bg-white dark:bg-[#141414]">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-theme-primary-500" />
              Security Overview
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {score === 4 ? "All checks passed" : `${4 - score} issue${4 - score !== 1 ? "s" : ""} to review`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SecurityScoreRing score={score} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              aria-label="Refresh security data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2">
        <SecurityMetric
          icon={<CheckCircle className="w-4 h-4" />}
          title="Account Status"
          value={accountStatus.value}
          status={accountStatus.status}
          description={accountStatus.desc}
        />
        <SecurityMetric
          icon={<Smartphone className="w-4 h-4" />}
          title="Two-Factor Auth"
          value={twoFactorStatus.value}
          status={twoFactorStatus.status}
          description={twoFactorStatus.desc}
        />
        <SecurityMetric
          icon={<Clock className="w-4 h-4" />}
          title="Password Age"
          value={passwordStatus.value}
          status={passwordStatus.status}
          description={passwordStatus.desc}
        />
        <SecurityMetric
          icon={<Shield className="w-4 h-4" />}
          title="Active Sessions"
          value={settings.activeSessionsCount}
          status={sessionStatus.status}
          description={`${settings.activeSessionsCount} device${settings.activeSessionsCount !== 1 ? "s" : ""} connected`}
        />

        {settings.passwordExpiresAt && (
          <div className="mt-1 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-medium">
                Password expires {new Date(settings.passwordExpiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
