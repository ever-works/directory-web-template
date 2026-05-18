'use client';

import {
	AlertOctagon,
	AlertTriangle,
	AtSign,
	BadgeCheck,
	Bell,
	CheckCircle2,
	Clock,
	CornerDownRight,
	Flag,
	Globe,
	Heart,
	Inbox,
	KeyRound,
	LogIn,
	Megaphone,
	MessageSquare,
	RefreshCw,
	ShieldAlert,
	Sparkles,
	Star,
	UserPlus,
	XCircle,
	type LucideIcon
} from 'lucide-react';

import { metaFor, type NotificationPriority, type NotificationType } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
	AlertOctagon,
	AlertTriangle,
	AtSign,
	BadgeCheck,
	Bell,
	CheckCircle2,
	Clock,
	CornerDownRight,
	Flag,
	Globe,
	Heart,
	Inbox,
	KeyRound,
	LogIn,
	Megaphone,
	MessageSquare,
	RefreshCw,
	ShieldAlert,
	Sparkles,
	Star,
	UserPlus,
	XCircle
};

export function getIcon(type: NotificationType | string): LucideIcon {
	const meta = metaFor(type);
	if (!meta) return Bell;
	return ICONS[meta.icon] ?? Bell;
}

const PRIORITY_RING: Record<NotificationPriority, string> = {
	low: 'bg-muted text-muted-foreground',
	medium: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
	high: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
	critical: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
};

export function priorityChipClass(priority: NotificationPriority): string {
	return PRIORITY_RING[priority] ?? PRIORITY_RING.medium;
}

interface NotificationIconProps {
	type: NotificationType | string;
	priority: NotificationPriority;
	className?: string;
}

export function NotificationIcon({ type, priority, className }: NotificationIconProps) {
	const Icon = getIcon(type);
	return (
		<div
			className={cn(
				'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
				priorityChipClass(priority),
				className
			)}
		>
			<Icon className="h-4 w-4" aria-hidden="true" />
		</div>
	);
}
