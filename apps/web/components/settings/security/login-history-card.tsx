"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	LogIn,
	LogOut,
	KeyRound,
	MailCheck,
	AlertTriangle,
	RefreshCw,
	ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoginActivity } from "@/hooks/use-security-settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diff / 60_000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface ActionMeta {
	label: string;
	icon: React.ElementType;
	color: string;
	bg: string;
}

const ACTION_META: Record<string, ActionMeta> = {
	SIGN_IN: {
		label: "Signed in",
		icon: LogIn,
		color: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-200 dark:ring-emerald-800/40",
	},
	SIGN_OUT: {
		label: "Signed out",
		icon: LogOut,
		color: "text-neutral-500 dark:text-neutral-400",
		bg: "bg-neutral-100 dark:bg-white/6 ring-neutral-200 dark:ring-white/6",
	},
	UPDATE_PASSWORD: {
		label: "Password changed",
		icon: KeyRound,
		color: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-50 dark:bg-blue-900/20 ring-blue-200 dark:ring-blue-800/40",
	},
	VERIFY_EMAIL: {
		label: "Email verified",
		icon: MailCheck,
		color: "text-violet-600 dark:text-violet-400",
		bg: "bg-violet-50 dark:bg-violet-900/20 ring-violet-200 dark:ring-violet-800/40",
	},
};

const DEFAULT_META: ActionMeta = {
	label: "Activity",
	icon: AlertTriangle,
	color: "text-neutral-400 dark:text-neutral-500",
	bg: "bg-neutral-100 dark:bg-white/6 ring-neutral-200 dark:ring-white/6",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoginHistorySkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6 animate-pulse">
			<div className="px-6 py-5">
				<Skeleton className="h-3 w-28 bg-neutral-200 dark:bg-white/10" />
				<Skeleton className="h-3 w-44 bg-neutral-200 dark:bg-white/10 mt-1.5" />
			</div>
			{[1, 2, 3].map((i) => (
				<div key={i} className="px-6 py-3.5 flex items-center gap-3">
					<Skeleton className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-white/10 shrink-0" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3 w-28 bg-neutral-200 dark:bg-white/10" />
						<Skeleton className="h-2.5 w-20 bg-neutral-200 dark:bg-white/10" />
					</div>
					<Skeleton className="h-2.5 w-14 bg-neutral-200 dark:bg-white/10" />
				</div>
			))}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export function LoginHistoryCard() {
	const [page, setPage] = useState(1);
	const { data, isLoading, error, refetch, isRefetching } = useLoginActivity(page, PAGE_SIZE);

	if (isLoading) return <LoginHistorySkeleton />;

	if (error) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-red-700 dark:text-red-300">Failed to load activity</p>
					<Button
						variant="outline" size="sm"
						onClick={() => refetch()}
						disabled={isRefetching}
						className="mt-2 h-7 text-xs border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
					>
						<RefreshCw className={cn("w-3 h-3 mr-1.5", isRefetching && "animate-spin")} />
						Retry
					</Button>
				</div>
			</div>
		);
	}

	const activities = data?.activities ?? [];
	const pagination = data?.pagination;
	const hasMore = pagination ? page < pagination.totalPages : false;

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">

			{/* Header */}
			<div className="px-6 py-5 flex items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
						Login History
					</p>
					<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
						Recent sign-ins and security events
					</p>
				</div>
				<button
					onClick={() => { setPage(1); refetch(); }}
					disabled={isRefetching}
					className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/8 disabled:opacity-40 transition-all duration-150"
					aria-label="Refresh activity"
				>
					<RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
				</button>
			</div>

			{/* Activity rows */}
			{activities.length === 0 ? (
				<div className="px-6 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
					No activity recorded yet.
				</div>
			) : (
				activities.map((activity) => {
					const meta = ACTION_META[activity.action] ?? DEFAULT_META;
					const Icon = meta.icon;
					return (
						<div key={activity.id} className="px-6 py-3.5 flex items-center gap-3">
							<div className={cn(
								"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1",
								meta.bg
							)}>
								<Icon className={cn("w-4 h-4", meta.color)} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
									{meta.label}
								</p>
								{activity.ipAddress && (
									<p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-mono">
										{activity.ipAddress}
									</p>
								)}
							</div>
							<time
								className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums"
								dateTime={activity.timestamp}
							>
								{formatRelativeTime(activity.timestamp)}
							</time>
						</div>
					);
				})
			)}

			{/* Load more */}
			{hasMore && (
				<div className="px-6 py-3 flex justify-center">
					<Button
						variant="ghost" size="sm"
						onClick={() => setPage((p) => p + 1)}
						className="h-7 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
					>
						<ChevronDown className="w-3 h-3 mr-1.5" />
						Load more
					</Button>
				</div>
			)}
		</div>
	);
}
