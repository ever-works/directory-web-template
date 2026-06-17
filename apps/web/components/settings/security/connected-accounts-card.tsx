"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Link2Off, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectedAccounts, useDisconnectProvider } from "@/hooks/use-security-settings";

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderMeta {
	label: string;
	icon: React.ReactNode;
	bg: string;
}

function ProviderIcon({ provider }: { provider: string }) {
	switch (provider.toLowerCase()) {
		case "google":
			return (
				<svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
				</svg>
			);
		case "github":
			return (
				<svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-800 dark:text-neutral-100" fill="currentColor">
					<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
				</svg>
			);
		default:
			return <Link2 className="w-4 h-4 text-neutral-400" />;
	}
}

function getProviderLabel(provider: string): string {
	const map: Record<string, string> = {
		google: "Google",
		github: "GitHub",
		discord: "Discord",
		twitter: "Twitter",
		facebook: "Facebook",
		apple: "Apple",
		linkedin: "LinkedIn",
	};
	return map[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function getProviderBg(provider: string): string {
	const map: Record<string, string> = {
		google: "bg-white dark:bg-white/6 ring-neutral-200 dark:ring-white/10",
		github: "bg-neutral-900 dark:bg-white/8 ring-neutral-700 dark:ring-white/10",
		discord: "bg-indigo-50 dark:bg-indigo-900/20 ring-indigo-200 dark:ring-indigo-800/40",
		twitter: "bg-sky-50 dark:bg-sky-900/20 ring-sky-200 dark:ring-sky-800/40",
		default: "bg-neutral-100 dark:bg-white/6 ring-neutral-200 dark:ring-white/6",
	};
	return map[provider.toLowerCase()] ?? map.default;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConnectedAccountsSkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6 animate-pulse">
			<div className="px-6 py-5">
				<Skeleton className="h-3 w-36 bg-neutral-200 dark:bg-white/10" />
				<Skeleton className="h-3 w-52 bg-neutral-200 dark:bg-white/10 mt-1.5" />
			</div>
			{[1, 2].map((i) => (
				<div key={i} className="px-6 py-3.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-white/10" />
						<div className="space-y-1.5">
							<Skeleton className="h-3 w-20 bg-neutral-200 dark:bg-white/10" />
							<Skeleton className="h-2.5 w-32 bg-neutral-200 dark:bg-white/10" />
						</div>
					</div>
					<Skeleton className="h-7 w-24 rounded-lg bg-neutral-200 dark:bg-white/10" />
				</div>
			))}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConnectedAccountsCard() {
	const { data, isLoading, error, refetch, isRefetching } = useConnectedAccounts();
	const { mutate: disconnect, isPending: disconnecting } = useDisconnectProvider();
	const [confirmProvider, setConfirmProvider] = useState<string | null>(null);
	const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

	if (isLoading) return <ConnectedAccountsSkeleton />;

	if (error) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-red-700 dark:text-red-300">Failed to load connected accounts</p>
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

	const accounts = data?.accounts ?? [];

	const handleDisconnect = (provider: string) => {
		if (confirmProvider !== provider) {
			setConfirmProvider(provider);
			return;
		}
		setDisconnectingProvider(provider);
		disconnect(provider, {
			onSettled: () => {
				setDisconnectingProvider(null);
				setConfirmProvider(null);
			},
		});
	};

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">

			{/* Header */}
			<div className="px-6 py-5">
				<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
					Connected Accounts
				</p>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
					OAuth providers linked for sign-in
				</p>
			</div>

			{/* Account rows */}
			{accounts.length === 0 ? (
				<div className="px-6 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
					No OAuth providers connected.
				</div>
			) : (
				accounts.map((account) => {
					const isConfirming = confirmProvider === account.provider;
					const isDisconnecting = disconnectingProvider === account.provider;

					return (
						<div key={account.provider} className="px-6 py-3.5 flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 min-w-0">
								<div className={cn(
									"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1",
									getProviderBg(account.provider)
								)}>
									<ProviderIcon provider={account.provider} />
								</div>
								<div className="min-w-0">
									<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
										{getProviderLabel(account.provider)}
									</p>
									{account.email && (
										<p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
											{account.email}
										</p>
									)}
								</div>
							</div>

							{account.canDisconnect ? (
								<Button
									variant="outline" size="sm"
									onClick={() => handleDisconnect(account.provider)}
									disabled={isDisconnecting || (disconnecting && disconnectingProvider === account.provider)}
									className={cn(
										"h-7 text-xs shrink-0 transition-colors duration-150",
										isConfirming
											? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
											: "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"
									)}
								>
									{isDisconnecting ? (
										<RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
									) : (
										<Link2Off className="w-3 h-3 mr-1.5" />
									)}
									{isConfirming ? "Confirm" : "Disconnect"}
								</Button>
							) : (
								<span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
									Only sign-in method
								</span>
							)}
						</div>
					);
				})
			)}

			{/* No-password notice */}
			{!data?.hasPassword && accounts.length > 0 && (
				<div className="px-6 py-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 rounded-b-xl">
					<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
					<span>You have no password set. Set one in the security settings to be able to disconnect all OAuth providers.</span>
				</div>
			)}
		</div>
	);
}
