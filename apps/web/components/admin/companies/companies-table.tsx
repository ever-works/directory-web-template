import type { ReactNode } from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Building2, Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import type { Company } from '@/types/company';

interface CompaniesTableProps {
	companies: Company[];
	isLoading?: boolean;
	deletingCompanyId: string | null;
	onEdit: (company: Company) => void;
	onDelete: (companyId: string) => void;
	onCreateFirst: () => void;
	hasActiveFilters: boolean;
	/** Optional filters component to render in the table header */
	filters?: ReactNode;
}

const TABLE_CARD_WRAPPER = 'border border-gray-100 bg-white dark:border-neutral-800/80 dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm';
const TABLE_ROW_HOVER =
	'px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-neutral-800/40 transition-all duration-150 border-b border-gray-100/60 dark:border-neutral-800/60 last:border-0';

/**
 * Companies Table Component
 * Displays companies in a table format with actions
 */
export function CompaniesTable(props: CompaniesTableProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<Card className={TABLE_CARD_WRAPPER}>
			<CardBody className="p-0">
				{/* Table Header */}
				<div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800/80 bg-gray-50/40 dark:bg-neutral-950">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
							{t('COMPANIES_TITLE')}
						</h3>
						{props.filters}
					</div>
				</div>

				{/* Table Body */}
				{props.companies.length === 0 ? (
					<EmptyState hasActiveFilters={props.hasActiveFilters} onCreateFirst={props.onCreateFirst} />
				) : (
					<div className="flex flex-col">
						{props.companies.map((company) => (
							<CompanyRow
								key={company.id}
								company={company}
								isDeleting={props.deletingCompanyId === company.id}
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
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3">
			<div className="w-12 h-12 rounded-xl bg-gray-100/60 dark:bg-neutral-800 flex items-center justify-center ring-1 ring-gray-200/60 dark:ring-neutral-700/60">
				<Building2 className="w-6 h-6 text-gray-400 dark:text-neutral-500" />
			</div>
			<p className="text-sm font-semibold text-gray-900 dark:text-white">{t('NO_COMPANIES_FOUND')}</p>
			<p className="text-xs text-gray-500 dark:text-gray-500">{t('NO_COMPANIES_DESCRIPTION')}</p>
			{!hasActiveFilters && (
				<Button color="primary" onPress={onCreateFirst} size="sm" className="mt-1">
					{t('ADD_FIRST_COMPANY')}
				</Button>
			)}
		</div>
	);
}

interface CompanyRowProps {
	company: Company;
	isDeleting: boolean;
	onEdit: (company: Company) => void;
	onDelete: (companyId: string) => void;
}

function CompanyRow({ company, isDeleting, onEdit, onDelete }: CompanyRowProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	const formatDate = (dateString: string) => {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true });
		} catch {
			return dateString;
		}
	};

	return (
		<div className={TABLE_ROW_HOVER}>
			<div className="flex items-center justify-between">
				{/* Company Info */}
				<div className="flex items-center space-x-4 flex-1 min-w-0">
					<div className="w-10 h-10 bg-gray-100/70 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-gray-600 dark:text-neutral-300 font-semibold text-sm shrink-0 ring-1 ring-gray-200/50 dark:ring-neutral-700/50">
						{company.name.charAt(0).toUpperCase()}
					</div>
					<div className="flex-1 min-w-0">
						<h4 className="font-semibold text-gray-900 dark:text-white truncate">{company.name}</h4>
						<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
							{company.domain && <span className="truncate">{company.domain}</span>}
							{company.domain && company.website && <span className="text-gray-300 dark:text-neutral-600">·</span>}
							{company.website && (
								<a
									href={company.website}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-theme-primary transition-colors truncate"
								>
									{company.website}
								</a>
							)}
						</div>
						{company.slug && <p className="text-xs text-gray-400 dark:text-neutral-600 mt-0.5">/{company.slug}</p>}
					</div>
				</div>

				{/* Status, Date & Actions */}
				<div className="flex items-center space-x-4 shrink-0">
					<span
						className={
							company.status === 'active'
								? 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-500/25'
								: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400 ring-1 ring-inset ring-gray-300/50 dark:ring-neutral-700'
						}
					>
						{company.status.charAt(0).toUpperCase() + company.status.slice(1)}
					</span>
					<div className="text-xs text-gray-400 dark:text-neutral-500 min-w-30 tabular-nums">
						{formatDate(company.createdAt)}
					</div>
					<div className="flex items-center space-x-1">
						<Button
							size="sm"
							color="primary"
							variant="light"
							onPress={() => onEdit(company)}
							startContent={<Edit className="w-4 h-4" />}
						>
							{t('EDIT')}
						</Button>
						<Button
							size="sm"
							color="danger"
							variant="light"
							onPress={() => onDelete(company.id)}
							isLoading={isDeleting}
							isDisabled={isDeleting}
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
