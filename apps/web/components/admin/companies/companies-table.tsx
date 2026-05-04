import type { ReactNode } from 'react';
import { Building2, Edit, Trash2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
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

const SPINNER = (
	<svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

export function CompaniesTable(props: CompaniesTableProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
			{/* Table header */}
			<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						{t('COMPANIES_TITLE')}
					</h3>
					{props.filters}
				</div>
			</div>

			{/* Body */}
			{props.companies.length === 0 ? (
				<EmptyState hasActiveFilters={props.hasActiveFilters} onCreateFirst={props.onCreateFirst} />
			) : (
				<div className="divide-y divide-gray-50 dark:divide-white/4">
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
		</div>
	);
}

interface EmptyStateProps {
	hasActiveFilters: boolean;
	onCreateFirst: () => void;
}

function EmptyState({ hasActiveFilters, onCreateFirst }: EmptyStateProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
			<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
				<Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
			</div>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
				{t('NO_COMPANIES_FOUND')}
			</h3>
			<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
				{t('NO_COMPANIES_DESCRIPTION')}
			</p>
			{!hasActiveFilters && (
				<button
					type="button"
					onClick={onCreateFirst}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
				>
					<Plus className="w-4 h-4" />
					{t('ADD_FIRST_COMPANY')}
				</button>
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
		<div className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150">
			{/* Company info */}
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm shrink-0 ring-2 ring-white dark:ring-gray-900/80">
					{company.name.charAt(0).toUpperCase()}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
						{company.name}
					</p>
					<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
						{company.domain && <span className="truncate">{company.domain}</span>}
						{company.domain && company.website && <span className="text-gray-300 dark:text-white/20">·</span>}
						{company.website && (
							<a
								href={company.website}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
							>
								{company.website}
							</a>
						)}
					</div>
					{company.slug && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">/{company.slug}</p>}
				</div>
			</div>

			{/* Status, date & actions */}
			<div className="flex items-center gap-3 shrink-0">
				<span
					className={cn(
						'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset capitalize',
						company.status === 'active'
							? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
							: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
					)}
				>
					<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
					{company.status}
				</span>

				<span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 tabular-nums">
					{formatDate(company.createdAt)}
				</span>

				<div className="flex items-center gap-0.5">
					<button
						type="button"
						onClick={() => onEdit(company)}
						aria-label={t('EDIT')}
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-white/8 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
					>
						<Edit className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						disabled={isDeleting}
						onClick={() => !isDeleting && onDelete(company.id)}
						aria-label={isDeleting ? t('DELETING') : t('DELETE')}
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
					>
						{isDeleting ? SPINNER : <Trash2 className="w-3.5 h-3.5" />}
					</button>
				</div>
			</div>
		</div>
	);
}
