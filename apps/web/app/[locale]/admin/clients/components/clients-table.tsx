import { Card, CardBody, Chip, Button, Avatar } from '@heroui/react';
import { Building2, Eye, Edit, Trash2, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactNode } from 'react';
import type { ClientProfileWithAuth } from '@/lib/db/queries';
import { getStatusColor, getPlanColor, getAccountTypeColor } from '../utils/client-helpers';

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
	/** Filter bar to render in the header */
	filterBar?: ReactNode;
	/** Active filters section to render below header */
	activeFilters?: ReactNode;
}

// Table column headers configuration
const TABLE_COLUMNS = [
	{ key: 'expand', label: '', width: 'w-10' },
	{ key: 'client', label: 'CLIENT', width: 'flex-1 min-w-[200px]' },
	{ key: 'status', label: 'STATUS', width: 'w-24' },
	{ key: 'plan', label: 'PLAN', width: 'w-24' },
	{ key: 'type', label: 'TYPE', width: 'w-28' },
	{ key: 'actions', label: '', width: 'w-32' }
];

/**
 * Clients Table Component
 * Modern table design with column headers and clean rows
 */
export function ClientsTable(props: ClientsTableProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<Card className="border border-gray-100 dark:border-white/5 shadow-sm bg-white dark:bg-white/[0.03] overflow-hidden rounded-2xl">
			<CardBody className="p-0">
				{/* Table Header with Filters */}
				<div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015]">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('CLIENTS_TITLE')}</h3>
						<div className="flex items-center gap-3 flex-wrap flex-1 justify-end">{props.filterBar}</div>
					</div>
					{/* Active Filters Section */}
					{props.activeFilters && <div className="mt-3">{props.activeFilters}</div>}
				</div>

				{/* Column Headers */}
				<div className="hidden md:flex items-center gap-4 px-6 py-2.5 bg-gray-50/30 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/5">
					{TABLE_COLUMNS.map((col) => (
						<div key={col.key} className={col.width}>
							<span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
								{col.label}
							</span>
						</div>
					))}
				</div>

				{/* Table Body */}
				{props.clients.length === 0 ? (
					<EmptyState hasActiveFilters={props.hasActiveFilters} onCreateFirst={props.onCreateFirst} />
				) : (
					<div className="divide-y divide-gray-100/50 dark:divide-white/[0.03]">
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
			</CardBody>
		</Card>
	);
}

interface EmptyStateProps {
	hasActiveFilters: boolean;
	onCreateFirst: () => void;
}

function EmptyState({ hasActiveFilters, onCreateFirst }: EmptyStateProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<div className="px-6 py-16 text-center">
			<div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100/60 dark:bg-white/5 flex items-center justify-center ring-1 ring-gray-200/60 dark:ring-white/5">
				<Building2 className="w-7 h-7 text-gray-400 dark:text-gray-500" />
			</div>
			<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">{t('NO_CLIENTS_FOUND')}</h3>
			<p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
				{hasActiveFilters ? t('NO_CLIENTS_FILTER_DESCRIPTION') : t('NO_CLIENTS_DESCRIPTION')}
			</p>
			{!hasActiveFilters && (
				<Button
					color="primary"
					onPress={onCreateFirst}
					className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl"
				>
					{t('ADD_FIRST_CLIENT')}
				</Button>
			)}
		</div>
	);
}

interface ClientRowProps {
	client: ClientProfileWithAuth;
	isNavigating: boolean;
	isDeleting: boolean;
	onView: (clientId: string) => void;
	onEdit: (client: ClientProfileWithAuth) => void;
	onDelete: (clientId: string) => void;
}

function ClientRow({ client, isNavigating, isDeleting, onView, onEdit, onDelete }: ClientRowProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (isNavigating) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onView(client.id);
		}
	};

	// Generate avatar initials
	const getInitials = () => {
		const name = client.displayName || client.name || 'U';
		return name.charAt(0).toUpperCase();
	};

	// Generate consistent avatar color based on client id
	const getAvatarColor = () => {
		const colors = [
			'bg-gradient-to-br from-blue-500 to-purple-600',
			'bg-gradient-to-br from-emerald-500 to-teal-600',
			'bg-gradient-to-br from-orange-500 to-red-600',
			'bg-gradient-to-br from-pink-500 to-rose-600',
			'bg-gradient-to-br from-violet-500 to-indigo-600'
		];
		const index = client.id.charCodeAt(0) % colors.length;
		return colors[index];
	};

	return (
		<div
			className={`group relative px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.025] transition-all duration-150 ${
				isNavigating ? 'opacity-60' : ''
			}`}
		>
			{/* Loading overlay */}
			{isNavigating && (
				<div className="absolute inset-0 bg-white/60 dark:bg-[#0a0a0a]/60 flex items-center justify-center z-10 pointer-events-none">
					<div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			<div className="flex items-center gap-4">
				{/* Chevron indicator */}
				<div className="hidden md:flex w-10 items-center justify-center">
					<ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200" />
				</div>

				{/* Client Info with Avatar */}
				<button
					type="button"
					aria-disabled={isNavigating}
					aria-busy={isNavigating}
					className={`flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg p-1 -m-1 transition-all duration-150 ${
						isNavigating ? 'cursor-wait' : 'cursor-pointer hover:bg-gray-50/60 dark:hover:bg-white/[0.03]'
					}`}
					onClick={() => !isNavigating && onView(client.id)}
					onKeyDown={handleKeyDown}
					title={isNavigating ? 'Loading...' : 'Click to view client details'}
				>
					{/* Avatar */}
					<div
						className={`w-10 h-10 rounded-full ${getAvatarColor()} ring-2 ring-white dark:ring-gray-800 shadow-md flex items-center justify-center text-white font-semibold text-sm shrink-0`}
					>
						{client.avatar ? (
							<Avatar src={client.avatar} size="sm" className="w-full h-full" isBordered={false} />
						) : (
							getInitials()
						)}
					</div>

					{/* Client Details */}
					<div className="flex-1 min-w-0">
						<h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
							{client.displayName || client.name || t('UNNAMED_CLIENT')}
						</h4>
						<p className="text-sm text-gray-500 dark:text-gray-400 truncate">
							{client.email || (client.username ? `@${client.username}` : '')}
						</p>
						{(client.company || client.jobTitle) && (
							<p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
								{[client.jobTitle, client.company].filter(Boolean).join(' • ')}
							</p>
						)}
					</div>
				</button>

				{/* Status Badge */}
				<div className="hidden md:flex w-24 justify-center">
					<Chip
						color={getStatusColor(client.status || 'active')}
						variant="flat"
						size="sm"
						className="capitalize"
					>
						{client.status || 'active'}
					</Chip>
				</div>

				{/* Plan Badge */}
				<div className="hidden md:flex w-24 justify-center">
					<Chip color={getPlanColor(client.plan || 'free')} variant="flat" size="sm" className="capitalize">
						{client.plan || 'free'}
					</Chip>
				</div>

				{/* Type Badge */}
				<div className="hidden md:flex w-28 justify-center">
					<Chip
						color={getAccountTypeColor(client.accountType || 'individual')}
						variant="dot"
						size="sm"
						className="capitalize"
					>
						{client.accountType || 'individual'}
					</Chip>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1 w-32 justify-end">
					<Button
						size="sm"
						color="default"
						variant="light"
						isIconOnly
						isDisabled={isNavigating}
						onPress={() => onView(client.id)}
						className="text-gray-500 hover:text-blue-600"
					>
						<Eye className="w-4 h-4" />
					</Button>
					<Button
						size="sm"
						color="default"
						variant="light"
						isIconOnly
						isDisabled={isNavigating}
						onPress={() => onEdit(client)}
						className="text-gray-500 hover:text-blue-600"
					>
						<Edit className="w-4 h-4" />
					</Button>
					<Button
						size="sm"
						color="danger"
						variant="light"
						isIconOnly
						onPress={() => onDelete(client.id)}
						isLoading={isDeleting}
						isDisabled={isDeleting || isNavigating}
						className="text-gray-500 hover:text-red-600"
					>
						{!isDeleting && <Trash2 className="w-4 h-4" />}
					</Button>
				</div>
			</div>

			{/* Mobile badges row */}
			<div className="flex md:hidden items-center gap-2 mt-3 ml-14">
				<Chip color={getStatusColor(client.status || 'active')} variant="flat" size="sm" className="capitalize">
					{client.status || 'active'}
				</Chip>
				<Chip color={getPlanColor(client.plan || 'free')} variant="flat" size="sm" className="capitalize">
					{client.plan || 'free'}
				</Chip>
			</div>
		</div>
	);
}
