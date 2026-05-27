"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Trash2, AlertTriangle, RefreshCw, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	useActiveSessions,
	useRevokeSession,
	useRevokeAllOtherSessions,
} from "@/hooks/use-security-settings";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ActiveSessionsSkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6 animate-pulse">
			<div className="px-6 py-5 flex items-center justify-between">
				<div className="space-y-1.5">
					<Skeleton className="h-3 w-28 bg-neutral-200 dark:bg-white/10" />
					<Skeleton className="h-3 w-44 bg-neutral-200 dark:bg-white/10" />
				</div>
				<Skeleton className="h-7 w-28 rounded-lg bg-neutral-200 dark:bg-white/10" />
			</div>
			{[1, 2].map((i) => (
				<div key={i} className="px-6 py-3.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-white/10" />
						<div className="space-y-1.5">
							<Skeleton className="h-3 w-32 bg-neutral-200 dark:bg-white/10" />
							<Skeleton className="h-2.5 w-24 bg-neutral-200 dark:bg-white/10" />
						</div>
					</div>
					<Skeleton className="h-7 w-16 rounded-lg bg-neutral-200 dark:bg-white/10" />
				</div>
			))}
		</div>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
	const diff = new Date(iso).getTime() - Date.now();
	const days = Math.floor(diff / 86_400_000);
	if (days > 1) return `Expires in ${days} days`;
	if (days === 1) return "Expires tomorrow";
	const hours = Math.floor(diff / 3_600_000);
	if (hours > 0) return `Expires in ${hours}h`;
	return "Expiring soon";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActiveSessionsCard() {
	const { data: sessions, isLoading, error, refetch, isRefetching } = useActiveSessions();
	const { mutate: revokeOne, isPending: revokingToken } = useRevokeSession();
	const { mutate: revokeAll, isPending: revokingAll } = useRevokeAllOtherSessions();
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [confirmAll, setConfirmAll] = useState(false);

	if (isLoading) return <ActiveSessionsSkeleton />;

	if (error) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-red-700 dark:text-red-300">Failed to load sessions</p>
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

	const list = sessions ?? [];
	const otherSessions = list.filter((s) => !s.isCurrent);

	const handleRevoke = (tokenFull: string) => {
		setRevokingId(tokenFull);
		revokeOne(tokenFull, { onSettled: () => setRevokingId(null) });
	};

	const handleRevokeAll = () => {
		if (!confirmAll) { setConfirmAll(true); return; }
		revokeAll(undefined, { onSettled: () => setConfirmAll(false) });
	};

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">

			{/* Header */}
			<div className="px-6 py-5 flex items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
						Active Sessions
					</p>
					<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
						{list.length} device{list.length !== 1 ? "s" : ""} currently signed in
					</p>
				</div>

				{otherSessions.length > 0 && (
					<Button
						variant="outline" size="sm"
						onClick={handleRevokeAll}
						disabled={revokingAll}
						className={cn(
							"h-7 text-xs shrink-0 transition-colors duration-150",
							confirmAll
								? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
								: "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
						)}
					>
						{revokingAll ? (
							<RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
						) : (
							<ShieldOff className="w-3 h-3 mr-1.5" />
						)}
						{confirmAll ? "Confirm sign out" : "Sign out all others"}
					</Button>
				)}
			</div>

			{/* Session rows */}
			{list.length === 0 ? (
				<div className="px-6 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
					No active sessions found.
				</div>
			) : (
				list.map((s) => (
					<div key={s.tokenFull} className="px-6 py-3.5 flex items-center justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<div className={cn(
								"w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
								s.isCurrent
									? "bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40"
									: "bg-neutral-100 dark:bg-white/6 ring-1 ring-neutral-200 dark:ring-white/6"
							)}>
								<Monitor className={cn(
									"w-4 h-4",
									s.isCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500"
								)} />
							</div>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 font-mono">
										···{s.token}
									</p>
									{s.isCurrent && (
										<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50">
											This device
										</span>
									)}
								</div>
								<p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
									{formatExpiry(s.expires)}
								</p>
							</div>
						</div>

						{!s.isCurrent && (
							<Button
								variant="ghost" size="sm"
								onClick={() => handleRevoke(s.tokenFull)}
								disabled={revokingId === s.tokenFull || revokingToken}
								className="h-7 text-xs text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 shrink-0"
							>
								{revokingId === s.tokenFull ? (
									<RefreshCw className="w-3 h-3 animate-spin" />
								) : (
									<Trash2 className="w-3 h-3" />
								)}
								<span className="ml-1.5">Revoke</span>
							</Button>
						)}
					</div>
				))
			)}
		</div>
	);
}
