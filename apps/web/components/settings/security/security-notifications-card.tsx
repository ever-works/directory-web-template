"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bell, KeyRound, Mail, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	useSecurityNotifications,
	useUpdateSecurityNotifications,
	type SecurityNotificationPrefs,
} from "@/hooks/use-security-settings";

// ─── Types ────────────────────────────────────────────────────────────────────

type SecurityType = keyof SecurityNotificationPrefs;
type Channel = "in_app" | "email";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationsSkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6 animate-pulse">
			<div className="px-6 py-5">
				<Skeleton className="h-3 w-44 bg-neutral-200 dark:bg-white/10" />
				<Skeleton className="h-3 w-60 bg-neutral-200 dark:bg-white/10 mt-1.5" />
			</div>
			{[1, 2].map((i) => (
				<div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Skeleton className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-white/10" />
						<div className="space-y-1.5">
							<Skeleton className="h-3 w-32 bg-neutral-200 dark:bg-white/10" />
							<Skeleton className="h-2.5 w-48 bg-neutral-200 dark:bg-white/10" />
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="w-8 h-4 rounded-full bg-neutral-200 dark:bg-white/10" />
						<Skeleton className="w-8 h-4 rounded-full bg-neutral-200 dark:bg-white/10" />
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
	checked: boolean;
	disabled: boolean;
	onChange: () => void;
	label: string;
}

function Toggle({ checked, disabled, onChange, label }: ToggleProps) {
	return (
		<button
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={onChange}
			className={cn(
				"relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
				checked
					? "bg-emerald-500 dark:bg-emerald-500"
					: "bg-neutral-200 dark:bg-white/15"
			)}
		>
			<span className={cn(
				"inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200",
				checked ? "translate-x-3.5" : "translate-x-0.5"
			)} />
		</button>
	);
}

// ─── Row definition ───────────────────────────────────────────────────────────

interface NotifRowDef {
	type: SecurityType;
	label: string;
	description: string;
	icon: React.ElementType;
	iconColor: string;
	iconBg: string;
}

const ROWS: NotifRowDef[] = [
	{
		type: "security_alert",
		label: "New sign-in alert",
		description: "Notify me when a new device signs into my account",
		icon: MonitorSmartphone,
		iconColor: "text-amber-600 dark:text-amber-400",
		iconBg: "bg-amber-50 dark:bg-amber-900/20 ring-amber-200 dark:ring-amber-800/40",
	},
	{
		type: "password_changed",
		label: "Password changed",
		description: "Notify me when my password is updated",
		icon: KeyRound,
		iconColor: "text-blue-600 dark:text-blue-400",
		iconBg: "bg-blue-50 dark:bg-blue-900/20 ring-blue-200 dark:ring-blue-800/40",
	},
];

const CHANNEL_ICONS: Record<Channel, { icon: React.ElementType; label: string }> = {
	in_app: { icon: Bell, label: "In-app" },
	email: { icon: Mail, label: "Email" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function SecurityNotificationsCard() {
	const { data: prefs, isLoading, error } = useSecurityNotifications();
	const { mutate: update, isPending: updating } = useUpdateSecurityNotifications();

	if (isLoading) return <NotificationsSkeleton />;

	if (error) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
				<p className="text-xs font-semibold text-red-700 dark:text-red-300">Failed to load notification preferences</p>
			</div>
		);
	}

	const handleToggle = (type: SecurityType, channel: Channel) => {
		if (!prefs) return;
		const current = prefs[type][channel];
		update({ [type]: { [channel]: !current } });
	};

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">

			{/* Header */}
			<div className="px-6 py-5">
				<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
					Security Alerts
				</p>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
					Choose how you receive security notifications
				</p>
			</div>

			{/* Notification rows */}
			{ROWS.map((row) => {
				const Icon = row.icon;
				const channels = prefs?.[row.type];

				return (
					<div key={row.type} className="px-6 py-4 flex items-center justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<div className={cn(
								"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1",
								row.iconBg
							)}>
								<Icon className={cn("w-4 h-4", row.iconColor)} />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
									{row.label}
								</p>
								<p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 leading-relaxed">
									{row.description}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4 shrink-0">
							{(["in_app", "email"] as Channel[]).map((ch) => {
								const { icon: CIcon, label } = CHANNEL_ICONS[ch];
								return (
									<div key={ch} className="flex flex-col items-center gap-1.5">
										<div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
											<CIcon className="w-3 h-3" />
											{label}
										</div>
										<Toggle
											checked={channels?.[ch] ?? true}
											disabled={updating || !prefs}
											onChange={() => handleToggle(row.type, ch)}
											label={`${row.label} via ${label}`}
										/>
									</div>
								);
							})}
						</div>
					</div>
				);
			})}
		</div>
	);
}
