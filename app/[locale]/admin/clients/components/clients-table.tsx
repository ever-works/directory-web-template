import { Card, CardBody, Chip, Button } from '@heroui/react';
import { Building2, Eye, Edit, Trash2 } from 'lucide-react';
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

const TABLE_CARD_WRAPPER = 'border-0 shadow-lg';
const TABLE_ROW_HOVER = 'px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors';
const ROW_LOADING_OVERLAY =
	'absolute inset-0 bg-white/60 dark:bg-gray-900/60 flex items-center justify-center z-10 pointer-events-none';
const ROW_LOADING_SPINNER = 'w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full animate-spin';

/**
 * Clients Table Component
 * Displays clients in a table format with actions
 * Following SRP: Only responsible for displaying the table
 */
export function ClientsTable(props: ClientsTableProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<Card className={TABLE_CARD_WRAPPER}>
			<CardBody className="p-0">
				{/* Table Header */}
				<div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('CLIENTS_TITLE')}</h3>
						<div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
							{props.filterBar}
							<span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
								{props.totalCount} {t('CLIENTS_TOTAL_COUNT')}
							</span>
						</div>
					</div>
					{/* Active Filters Section */}
					{props.activeFilters && (
						<div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
							{props.activeFilters}
						</div>
					)}
				</div>

				{/* Table Body */}
				{props.clients.length === 0 ? (
					<EmptyState
						hasActiveFilters={props.hasActiveFilters}
						onCreateFirst={props.onCreateFirst}
					/>
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
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
		<div className="px-6 py-12 text-center">
			<Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('NO_CLIENTS_FOUND')}</h3>
			<p className="text-gray-500 dark:text-gray-400 mb-4">
				{hasActiveFilters ? t('NO_CLIENTS_FILTER_DESCRIPTION') : t('NO_CLIENTS_DESCRIPTION')}
			</p>
			{!hasActiveFilters && (
				<Button color="primary" onPress={onCreateFirst}>
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

	return (
		<div className={`${TABLE_ROW_HOVER} relative`}>
			{isNavigating && (
				<div className={ROW_LOADING_OVERLAY}>
					<div className={ROW_LOADING_SPINNER}></div>
				</div>
			)}
			<div className="flex items-center justify-between">
				{/* Client Info */}
				<div className="flex items-center space-x-4 flex-1 min-w-0">
					<div className="flex items-center space-x-2 shrink-0">
						<div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
						<span className="text-sm text-gray-500 dark:text-gray-400">#{client.id.slice(0, 8)}</span>
					</div>
					<button
						type="button"
						aria-disabled={isNavigating}
						aria-busy={isNavigating}
						className={`text-left flex items-center space-x-3 rounded-lg p-2 -m-2 transition-colors flex-1 min-w-0 ${
							isNavigating
								? 'cursor-wait opacity-60'
								: 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
						}`}
						onClick={() => !isNavigating && onView(client.id)}
						onKeyDown={handleKeyDown}
						title={isNavigating ? 'Loading...' : 'Click to view client details'}
					>
						<div className="w-10 h-10 bg-linear-to-br from-theme-primary to-theme-accent rounded-full flex items-center justify-center text-white font-semibold text-sm">
							{(client.displayName || client.name || 'U').charAt(0).toUpperCase()}
						</div>
						<div className="flex-1 min-w-0 pr-4">
							<h4 className="font-medium text-gray-900 dark:text-white hover:text-theme-primary transition-colors">
								{client.displayName || client.name || t('UNNAMED_CLIENT')}
							</h4>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{client.username ? `@${client.username}` : ''} {client.username && client.email ? '•' : ''}{' '}
								{client.email || ''}
							</p>
							{client.jobTitle && <p className="text-xs text-gray-400 dark:text-gray-500">{client.jobTitle}</p>}
							{client.company && <p className="text-xs text-gray-400 dark:text-gray-500">{client.company}</p>}
						</div>
					</button>
				</div>

				{/* Client Badges & Actions */}
				<div className="flex items-center space-x-3 shrink-0">
					<div className="flex items-center space-x-1">
						<Chip color={getStatusColor(client.status || 'active')} variant="flat" size="sm">
							{(client.status || 'active').charAt(0).toUpperCase() + (client.status || 'active').slice(1)}
						</Chip>
						<Chip color={getPlanColor(client.plan || 'free')} variant="flat" size="sm">
							{(client.plan || 'free').charAt(0).toUpperCase() + (client.plan || 'free').slice(1)}
						</Chip>
						<Chip color={getAccountTypeColor(client.accountType || 'individual')} variant="flat" size="sm">
							{(client.accountType || 'individual').charAt(0).toUpperCase() +
								(client.accountType || 'individual').slice(1)}
						</Chip>
					</div>
					<div className="flex items-center space-x-1">
						<Button
							size="sm"
							color="default"
							variant="light"
							isDisabled={isNavigating}
							onPress={() => onView(client.id)}
							startContent={<Eye className="w-4 h-4" />}
						>
							{t('VIEW')}
						</Button>
						<Button
							size="sm"
							color="primary"
							variant="light"
							isDisabled={isNavigating}
							onPress={() => onEdit(client)}
							startContent={<Edit className="w-4 h-4" />}
						>
							{t('EDIT')}
						</Button>
						<Button
							size="sm"
							color="danger"
							variant="light"
							onPress={() => onDelete(client.id)}
							isLoading={isDeleting}
							isDisabled={isDeleting || isNavigating}
							startContent={isDeleting ? null : <Trash2 className="w-4 h-4" />}
						>
							{isDeleting ? t('DELETING') : t('DELETE')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
