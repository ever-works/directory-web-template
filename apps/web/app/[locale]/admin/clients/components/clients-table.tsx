import { Button } from '@heroui/react';
import { Building2, Eye, Edit, Trash2, ChevronRight, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { KeyboardEvent, ReactNode } from 'react';
import type { ClientProfileWithAuth } from '@/lib/db/queries';

interface ClientsTableProps {
	clients: ClientProfileWithAuth[];
	totalCount: number;
	isLoading?: boolean;
	navigatingClientId: string | null;
	deletingClientId: string | null;
	onView: (clientId: string) => void;
	onEdit: (client: ClientProfileWithAuth) => void;
	onDelete: (clientId: string) => void;
	onCreateFirst: () => void;
	hasActiveFilters: boolean;
	filterBar?: ReactNode;
	activeFilters?: ReactNode;
}

const COLUMN_HEADERS = [
	{ key: 'chevron', label: '', className: 'w-8' },
	{ key: 'client', label: 'CLIENT', className: 'flex-1 min-w-[200px]' },
	{ key: 'status', label: 'STATUS', className: 'w-24 text-center' },
	{ key: 'plan', label: 'PLAN', className: 'w-24 text-center' },
	{ key: 'type', label: 'TYPE', className: 'w-28 text-center' },
	{ key: 'actions', label: '', className: 'w-28' },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
	const config: Record<string, string> = {
		active: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
		inactive: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8',
		suspended: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
		trial: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
	};
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset capitalize',
				config[status] ?? config.inactive
			)}
		>
			<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
			{status}
		</span>
	);
}

function PlanBadge({ plan }: { plan: string }) {
	const config: Record<string, string> = {
		free: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8',
		standard: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
		premium: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20',
	};
	return (
		<span
			className={cn(
				'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset capitalize',
				config[plan] ?? config.free
			)}
		>
			{plan}
		</span>
	);
}

function AccountTypeBadge({ type }: { type: string }) {
	const config: Record<string, string> = {
		individual: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20',
		business: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20',
		enterprise: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20',
	};
	return (
		<span
			className={cn(
				'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset capitalize',
				config[type] ?? config.individual
			)}
		>
			{type}
		</span>
	);
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function ClientsTable(props: ClientsTableProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">

			{/* Table header */}
			<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div className="flex items-center gap-2.5">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							{t('CLIENTS_TITLE')}
						</h3>
						{props.totalCount > 0 && (
							<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 tabular-nums ring-1 ring-inset ring-gray-200 dark:ring-white/10">
								{props.totalCount.toLocaleString()}
							</span>
						)}
					</div>
					<div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
						{props.filterBar}
					</div>
				</div>
				{props.activeFilters && (
					<div className="mt-3">{props.activeFilters}</div>
				)}
			</div>

			{/* Column headers */}
			<div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-gray-50/30 dark:bg-white/1 border-b border-gray-100 dark:border-white/5">
				{COLUMN_HEADERS.map((col) => (
					<div key={col.key} className={col.className}>
						{col.label && (
							<span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
								{col.label}
							</span>
						)}
					</div>
				))}
			</div>

			{/* Body */}
			{props.clients.length === 0 ? (
				<EmptyState
					hasActiveFilters={props.hasActiveFilters}
					onCreateFirst={props.onCreateFirst}
				/>
			) : (
				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{props.clients.map((client) => (
						<ClientRow
							key={client.id}
							client={client}
							isNavigating={props.navigatingClientId === client.id}
							isDeleting={props.deletingClientId === client.id}
							onView={props.onView}
							onEdit={props.onEdit}
							onDelete={props.onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
	hasActiveFilters,
	onCreateFirst,
}: {
	hasActiveFilters: boolean;
	onCreateFirst: () => void;
}) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
			<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
				<Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
			</div>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
				{t('NO_CLIENTS_FOUND')}
			</h3>
			<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
				{hasActiveFilters ? t('NO_CLIENTS_FILTER_DESCRIPTION') : t('NO_CLIENTS_DESCRIPTION')}
			</p>
			{!hasActiveFilters && (
				<button
					type="button"
					onClick={onCreateFirst}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
				>
					<UserPlus className="w-4 h-4" />
					{t('ADD_FIRST_CLIENT')}
				</button>
			)}
		</div>
	);
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface ClientRowProps {
	client: ClientProfileWithAuth;
	isNavigating: boolean;
	isDeleting: boolean;
	onView: (clientId: string) => void;
	onEdit: (client: ClientProfileWithAuth) => void;
	onDelete: (clientId: string) => void;
}

const AVATAR_COLORS = [
	'bg-linear-to-br from-blue-500 to-indigo-600',
	'bg-linear-to-br from-emerald-500 to-teal-600',
	'bg-linear-to-br from-orange-500 to-red-500',
	'bg-linear-to-br from-pink-500 to-rose-600',
	'bg-linear-to-br from-violet-500 to-purple-600',
];

const SPINNER = (
	<svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

function ClientRow({ client, isNavigating, isDeleting, onView, onEdit, onDelete }: ClientRowProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (isNavigating) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onView(client.id);
		}
	};

	const initials = (client.displayName || client.name || 'U').charAt(0).toUpperCase();
	const avatarColor = AVATAR_COLORS[client.id.charCodeAt(0) % AVATAR_COLORS.length];

	return (
		<div
			className={cn(
				'group relative flex items-center gap-4 px-5 py-3.5 transition-colors duration-150',
				'hover:bg-gray-50/80 dark:hover:bg-white/2.5',
				isNavigating && 'opacity-50'
			)}
		>
			{/* Navigating spinner overlay */}
			{isNavigating && (
				<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			{/* Chevron — desktop only */}
			<div className="hidden md:flex w-8 shrink-0 items-center justify-center">
				<ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200" />
			</div>

			{/* Client info — flex column so mobile badges sit in normal flow */}
			<div className="flex-1 min-w-0">
				<button
					type="button"
					aria-disabled={isNavigating}
					aria-busy={isNavigating}
					className={cn(
						'flex items-center gap-3 w-full text-left rounded-lg px-1 py-0.5 -mx-1 transition-colors duration-150',
						isNavigating ? 'cursor-wait' : 'cursor-pointer'
					)}
					onClick={() => !isNavigating && onView(client.id)}
					onKeyDown={handleKeyDown}
				>
					{/* Avatar */}
					<div
						className={cn(
							'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white dark:ring-gray-900/80',
							avatarColor
						)}
					>
						{client.avatar ? (
							<img
								src={client.avatar}
								alt={initials}
								className="w-full h-full rounded-full object-cover"
							/>
						) : (
							initials
						)}
					</div>

					{/* Text */}
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate leading-tight">
							{client.displayName || client.name || t('UNNAMED_CLIENT')}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
							{client.email || (client.username ? `@${client.username}` : '—')}
						</p>
						{(client.company || client.jobTitle) && (
							<p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
								{[client.jobTitle, client.company].filter(Boolean).join(' · ')}
							</p>
						)}
					</div>
				</button>

				{/* Mobile badges — in normal document flow, no absolute positioning */}
				<div className="flex md:hidden items-center gap-1.5 mt-2 ml-12 flex-wrap">
					<StatusBadge status={client.status || 'active'} />
					<PlanBadge plan={client.plan || 'free'} />
				</div>
			</div>

			{/* Status — desktop only */}
			<div className="hidden md:flex w-24 justify-center">
				<StatusBadge status={client.status || 'active'} />
			</div>

			{/* Plan — desktop only */}
			<div className="hidden md:flex w-24 justify-center">
				<PlanBadge plan={client.plan || 'free'} />
			</div>

			{/* Account type — desktop only */}
			<div className="hidden md:flex w-28 justify-center">
				<AccountTypeBadge type={client.accountType || 'individual'} />
			</div>

			{/* Actions */}
			<div className="flex items-center gap-0.5 w-28 justify-end shrink-0">
				<button
					type="button"
					disabled={isNavigating}
					onClick={() => !isNavigating && onView(client.id)}
					aria-label={t('VIEW')}
					className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
				>
					<Eye className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					disabled={isNavigating}
					onClick={() => !isNavigating && onEdit(client)}
					aria-label={t('EDIT')}
					className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-white/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
				>
					<Edit className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					disabled={isDeleting || isNavigating}
					onClick={() => !isDeleting && !isNavigating && onDelete(client.id)}
					aria-label={t('DELETE')}
					className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
				>
					{isDeleting ? SPINNER : <Trash2 className="w-3.5 h-3.5" />}
				</button>
			</div>
		</div>
	);
}
