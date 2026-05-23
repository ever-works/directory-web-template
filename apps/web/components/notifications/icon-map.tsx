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

import { metaFor, type NotificationCategory, type NotificationPriority, type NotificationType } from '@/lib/notifications';

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

/**
 * Border accent color applied to the left edge of unread rows.
 * Mirrors the admin notification dropdown convention.
 */
const PRIORITY_BORDER: Record<NotificationPriority, string> = {
	critical: 'border-red-500',
	high: 'border-orange-500',
	medium: 'border-blue-500',
	low: 'border-neutral-300 dark:border-neutral-600'
};

/**
 * Inline lucide icon color tied to the category. Matches the admin
 * mapping (item=blue, moderation=orange, billing=red, etc.).
 */
const CATEGORY_ICON_COLOR: Record<NotificationCategory, string> = {
	social: 'text-emerald-500',
	item: 'text-blue-500',
	moderation: 'text-orange-500',
	billing: 'text-red-500',
	account: 'text-violet-500',
	system: 'text-neutral-500'
};

export function priorityBorderClass(priority: NotificationPriority): string {
	return PRIORITY_BORDER[priority] ?? PRIORITY_BORDER.medium;
}

export function categoryIconColorClass(category: NotificationCategory): string {
	return CATEGORY_ICON_COLOR[category] ?? CATEGORY_ICON_COLOR.system;
}

interface NotificationIconProps {
	type: NotificationType | string;
	category: NotificationCategory;
	className?: string;
}

export function NotificationIcon({ type, category, className }: NotificationIconProps) {
	const Icon = getIcon(type);
	return (
		<Icon
			className={`h-5 w-5 ${categoryIconColorClass(category)}${className ? ` ${className}` : ''}`}
			aria-hidden="true"
		/>
	);
}
