import type { ReactNode } from 'react';
import { Card, CardBody, Chip, Button } from '@heroui/react';
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

const TABLE_CARD_WRAPPER = 'border-0 shadow-lg';
const TABLE_ROW_HOVER = 'px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors';

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
				<div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('COMPANIES_TITLE')}</h3>
						{props.filters}
					</div>
				</div>

				{/* Table Body */}
				{props.companies.length === 0 ? (
					<EmptyState hasActiveFilters={props.hasActiveFilters} onCreateFirst={props.onCreateFirst} />
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
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
		<div className="px-6 py-12 text-center">
			<Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('NO_COMPANIES_FOUND')}</h3>
			<p className="text-gray-500 dark:text-gray-400 mb-4">{t('NO_COMPANIES_DESCRIPTION')}</p>
			{!hasActiveFilters && (
				<Button color="primary" onPress={onCreateFirst}>
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

	const getStatusColor = (status: string): 'success' | 'default' => {
		return status === 'active' ? 'success' : 'default';
	};

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
					<div className="w-10 h-10 bg-linear-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
						{company.name.charAt(0).toUpperCase()}
					</div>
					<div className="flex-1 min-w-0">
						<h4 className="font-medium text-gray-900 dark:text-white">{company.name}</h4>
						<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
							{company.domain && <span>{company.domain}</span>}
							{company.domain && company.website && <span>•</span>}
							{company.website && (
								<a
									href={company.website}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-theme-primary transition-colors"
								>
									{company.website}
								</a>
							)}
						</div>
						{company.slug && <p className="text-xs text-gray-400 dark:text-gray-500">/{company.slug}</p>}
					</div>
				</div>

				{/* Status, Date & Actions */}
				<div className="flex items-center space-x-4 shrink-0">
					<Chip color={getStatusColor(company.status)} variant="flat" size="sm">
						{company.status.charAt(0).toUpperCase() + company.status.slice(1)}
					</Chip>
					<div className="text-sm text-gray-500 dark:text-gray-400 min-w-[120px]">
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
