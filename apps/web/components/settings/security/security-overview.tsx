"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecuritySettings, useSecurityCache } from "@/hooks/use-security-settings";
import { Shield, Clock, Smartphone, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className={cn("p-4 rounded-lg border", statusBgColors[status])}>
      <div className="flex items-start gap-3">
        <div className={cn("shrink-0", statusColors[status])}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h4>
            <span className={cn("text-lg font-bold", statusColors[status])}>
              {value}
            </span>
          </div>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SecurityOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <div className="flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded-sm" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SecurityOverview() {
  const { data: settings, isLoading, error, refetch, isRefetching } = useSecuritySettings();
  const { invalidateSecuritySettings } = useSecurityCache();

  const handleRefresh = () => {
    invalidateSecuritySettings();
    refetch();
  };

  if (isLoading) {
    return <SecurityOverviewSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Failed to load security settings</h3>
              <p className="text-sm mt-1">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  const getPasswordChangeStatus = () => {
    if (!settings.lastPasswordChange) {
      return { status: "warning" as const, description: "Password never changed" };
    }
    
    const lastChange = new Date(settings.lastPasswordChange);
    const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceChange > 90) {
      return { status: "danger" as const, description: `${daysSinceChange} days ago (consider updating)` };
    } else if (daysSinceChange > 30) {
      return { status: "warning" as const, description: `${daysSinceChange} days ago` };
    } else {
      return { status: "good" as const, description: `${daysSinceChange} days ago` };
    }
  };

  const getTwoFactorStatus = () => {
    return settings.twoFactorEnabled
      ? { status: "good" as const, value: "Enabled", description: "Your account is protected" }
      : { status: "warning" as const, value: "Disabled", description: "Enable for better security" };
  };

  const getAccountStatus = () => {
    if (settings.accountLocked) {
      return { status: "danger" as const, value: "Locked", description: "Contact support to unlock" };
    }
    if (settings.loginAttemptsCount > 3) {
      return { status: "warning" as const, value: "At Risk", description: `${settings.loginAttemptsCount} failed attempts` };
    }
    return { status: "good" as const, value: "Secure", description: "No security issues detected" };
  };

  const passwordStatus = getPasswordChangeStatus();
  const twoFactorStatus = getTwoFactorStatus();
  const accountStatus = getAccountStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-theme-primary-600" />
            Security Overview
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SecurityMetric
          icon={<CheckCircle className="w-5 h-5" />}
          title="Account Status"
          value={accountStatus.value}
          status={accountStatus.status}
          description={accountStatus.description}
        />

        <SecurityMetric
          icon={<Smartphone className="w-5 h-5" />}
          title="Two-Factor Authentication"
          value={twoFactorStatus.value}
          status={twoFactorStatus.status}
          description={twoFactorStatus.description}
        />

        <SecurityMetric
          icon={<Clock className="w-5 h-5" />}
          title="Last Password Change"
          value={settings.lastPasswordChange ? "Updated" : "Never"}
          status={passwordStatus.status}
          description={passwordStatus.description}
        />

        <SecurityMetric
          icon={<Shield className="w-5 h-5" />}
          title="Active Sessions"
          value={settings.activeSessionsCount}
          status={settings.activeSessionsCount > 5 ? "warning" : "good"}
          description={`${settings.activeSessionsCount} device${settings.activeSessionsCount !== 1 ? 's' : ''} connected`}
        />

        {settings.passwordExpiresAt && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Password expires on {new Date(settings.passwordExpiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
