import { useState, useCallback, useEffect } from 'react';
import { Button, Input, Chip, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Select, SelectItem } from '@/components/ui/select';
import { Search, Filter, Calendar, Building2, MapPin, Briefcase, Mail, Hash, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AdvancedSearchFilters {
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  sortBy?: string;
  sortOrder?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  emailDomain?: string;
  companySearch?: string;
  locationSearch?: string;
  industrySearch?: string;
  minSubmissions?: number;
  maxSubmissions?: number;
  hasAvatar?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

interface AdvancedSearchPanelProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onClearFilters: () => void;
}

export function AdvancedSearchPanel({ filters, onFiltersChange, onClearFilters }: AdvancedSearchPanelProps) {
  const t = useTranslations('admin.ADVANCED_SEARCH_PANEL');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  // Sync local state with parent filters when they change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof AdvancedSearchFilters, value: AdvancedSearchFilters[keyof AdvancedSearchFilters]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
    onClose();
  }, [localFilters, onFiltersChange, onClose]);

  const handleResetFilters = useCallback(() => {
    setLocalFilters({});
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== false
  );

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && value !== false
  ).length;

  return (
    <>
      {/* Advanced Search Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          startContent={<Filter className="w-4 h-4" />}
          onPress={onOpen}
        >
{t('ADVANCED_SEARCH')}
        </Button>
        
        {hasActiveFilters && (
          <Chip
            variant="flat"
            color="primary"
            startContent={<Search className="w-3 h-3" />}
            onClose={onClearFilters}
          >
{t('FILTERS_ACTIVE', { count: activeFilterCount, plural: activeFilterCount !== 1 ? 's' : '' })}
          </Chip>
        )}
      </div>

      {/* Advanced Search Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside" onOpenChange={(open) => !open && onClose()}>
        <ModalContent>
          <ModalHeader>{t('ADVANCED_SEARCH_FILTERS')}</ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Basic Search */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {t('BASIC_SEARCH')}
                </h4>
                <Input
                  label={t('GLOBAL_SEARCH')}
                  placeholder={t('GLOBAL_SEARCH_PLACEHOLDER')}
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  startContent={<Search className="w-4 h-4 text-gray-400" />}
                />
              </div>

              {/* Status & Plan Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label={t('STATUS')}
                  placeholder={t('ALL_STATUSES')}
                  selectedKeys={localFilters.status ? [localFilters.status] : []}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('status', k ?? '');
                  }}
                >
                  <SelectItem value="active">{t('STATUS_OPTIONS.ACTIVE')}</SelectItem>
                  <SelectItem value="inactive">{t('STATUS_OPTIONS.INACTIVE')}</SelectItem>
                  <SelectItem value="suspended">{t('STATUS_OPTIONS.SUSPENDED')}</SelectItem>
                  <SelectItem value="trial">{t('STATUS_OPTIONS.TRIAL')}</SelectItem>
                </Select>

                <Select
                  label={t('PLAN')}
                  placeholder={t('ALL_PLANS')}
                  selectedKeys={localFilters.plan ? [localFilters.plan] : []}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('plan', k ?? '');
                  }}
                >
                  <SelectItem value="free">{t('PLAN_OPTIONS.FREE')}</SelectItem>
                  <SelectItem value="standard">{t('PLAN_OPTIONS.STANDARD')}</SelectItem>
                  <SelectItem value="premium">{t('PLAN_OPTIONS.PREMIUM')}</SelectItem>
                </Select>

                <Select
                  label={t('ACCOUNT_TYPE')}
                  placeholder={t('ALL_TYPES')}
                  selectedKeys={localFilters.accountType ? [localFilters.accountType] : []}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('accountType', k ?? '');
                  }}
                >
                  <SelectItem value="individual">{t('ACCOUNT_TYPE_OPTIONS.INDIVIDUAL')}</SelectItem>
                  <SelectItem value="business">{t('ACCOUNT_TYPE_OPTIONS.BUSINESS')}</SelectItem>
                  <SelectItem value="enterprise">{t('ACCOUNT_TYPE_OPTIONS.ENTERPRISE')}</SelectItem>
                </Select>
              </div>

              {/* Provider & Sorting */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label={t('PROVIDER')}
                  placeholder={t('ALL_PROVIDERS')}
                  selectedKeys={localFilters.provider ? [localFilters.provider] : []}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('provider', k ?? '');
                  }}
                >
                  <SelectItem value="credentials">{t('PROVIDER_OPTIONS.CREDENTIALS')}</SelectItem>
                  <SelectItem value="google">{t('PROVIDER_OPTIONS.GOOGLE')}</SelectItem>
                  <SelectItem value="github">{t('PROVIDER_OPTIONS.GITHUB')}</SelectItem>
                  <SelectItem value="facebook">{t('PROVIDER_OPTIONS.FACEBOOK')}</SelectItem>
                  <SelectItem value="twitter">{t('PROVIDER_OPTIONS.TWITTER')}</SelectItem>
                  <SelectItem value="linkedin">{t('PROVIDER_OPTIONS.LINKEDIN')}</SelectItem>
                </Select>

                <Select
                  label={t('SORT_BY')}
                  selectedKeys={[localFilters.sortBy || 'createdAt']}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('sortBy', k ?? 'createdAt');
                  }}
                >
                  <SelectItem value="createdAt">{t('SORT_BY_OPTIONS.CREATED_AT')}</SelectItem>
                  <SelectItem value="updatedAt">{t('SORT_BY_OPTIONS.UPDATED_AT')}</SelectItem>
                  <SelectItem value="name">{t('SORT_BY_OPTIONS.NAME')}</SelectItem>
                  <SelectItem value="email">{t('SORT_BY_OPTIONS.EMAIL')}</SelectItem>
                  <SelectItem value="company">{t('SORT_BY_OPTIONS.COMPANY')}</SelectItem>
                  <SelectItem value="totalSubmissions">{t('SORT_BY_OPTIONS.TOTAL_SUBMISSIONS')}</SelectItem>
                </Select>

                <Select
                  label={t('SORT_ORDER')}
                  selectedKeys={[localFilters.sortOrder || 'desc']}
                  onSelectionChange={(keys) => {
                    const k = keys[0];
                    handleFilterChange('sortOrder', k ?? 'desc');
                  }}
                >
                  <SelectItem value="desc">{t('SORT_ORDER_OPTIONS.DESCENDING')}</SelectItem>
                  <SelectItem value="asc">{t('SORT_ORDER_OPTIONS.ASCENDING')}</SelectItem>
                </Select>
              </div>

              {/* Date Range Filters */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('DATE_FILTERS')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('CREATED_AFTER')}
                    type="date"
                    value={localFilters.createdAfter || ''}
                    onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
                  />
                  <Input
                    label={t('CREATED_BEFORE')}
                    type="date"
                    value={localFilters.createdBefore || ''}
                    onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
                  />
                  <Input
                    label={t('UPDATED_AFTER')}
                    type="date"
                    value={localFilters.updatedAfter || ''}
                    onChange={(e) => handleFilterChange('updatedAfter', e.target.value)}
                  />
                  <Input
                    label={t('UPDATED_BEFORE')}
                    type="date"
                    value={localFilters.updatedBefore || ''}
                    onChange={(e) => handleFilterChange('updatedBefore', e.target.value)}
                  />
                </div>
              </div>

              {/* Field-Specific Searches */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {t('FIELD_SPECIFIC_SEARCH')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('EMAIL_DOMAIN')}
                    placeholder={t('EMAIL_DOMAIN_PLACEHOLDER')}
                    value={localFilters.emailDomain || ''}
                    onChange={(e) => handleFilterChange('emailDomain', e.target.value)}
                    startContent={<Mail className="w-4 h-4 text-gray-400" />}
                  />
                  <Input
                    label={t('COMPANY')}
                    placeholder={t('COMPANY_PLACEHOLDER')}
                    value={localFilters.companySearch || ''}
                    onChange={(e) => handleFilterChange('companySearch', e.target.value)}
                    startContent={<Building2 className="w-4 h-4 text-gray-400" />}
                  />
                  <Input
                    label={t('LOCATION')}
                    placeholder={t('LOCATION_PLACEHOLDER')}
                    value={localFilters.locationSearch || ''}
                    onChange={(e) => handleFilterChange('locationSearch', e.target.value)}
                    startContent={<MapPin className="w-4 h-4 text-gray-400" />}
                  />
                  <Input
                    label={t('INDUSTRY')}
                    placeholder={t('INDUSTRY_PLACEHOLDER')}
                    value={localFilters.industrySearch || ''}
                    onChange={(e) => handleFilterChange('industrySearch', e.target.value)}
                    startContent={<Briefcase className="w-4 h-4 text-gray-400" />}
                  />
                </div>
              </div>

              {/* Numeric Filters */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('NUMERIC_FILTERS')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('MIN_SUBMISSIONS')}
                    type="number"
                    placeholder="0"
                    value={localFilters.minSubmissions != null ? String(localFilters.minSubmissions) : ''}
                    onChange={(e) => handleFilterChange('minSubmissions', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                  <Input
                    label={t('MAX_SUBMISSIONS')}
                    type="number"
                    placeholder="100"
                    value={localFilters.maxSubmissions != null ? String(localFilters.maxSubmissions) : ''}
                    onChange={(e) => handleFilterChange('maxSubmissions', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  />
                </div>
              </div>

              {/* Boolean Filters */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
{t('PROFILE_FEATURES')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Select
label={t('HAS_AVATAR')}
                    selectedKeys={
                      typeof localFilters.hasAvatar === 'boolean'
                        ? [String(localFilters.hasAvatar)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const k = keys[0];
                      handleFilterChange('hasAvatar', k === 'true' ? true : k === 'false' ? false : undefined);
                    }}
                  >
                    <SelectItem value="">{t('ANY')}</SelectItem>
                    <SelectItem value="true">{t('YES')}</SelectItem>
                    <SelectItem value="false">{t('NO')}</SelectItem>
                  </Select>

                  <Select
                    label={t('HAS_WEBSITE')}
                    selectedKeys={
                      typeof localFilters.hasWebsite === 'boolean'
                        ? [String(localFilters.hasWebsite)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const k = keys[0];
                      handleFilterChange('hasWebsite', k === 'true' ? true : k === 'false' ? false : undefined);
                    }}
                  >
                    <SelectItem value="">{t('ANY')}</SelectItem>
                    <SelectItem value="true">{t('YES')}</SelectItem>
                    <SelectItem value="false">{t('NO')}</SelectItem>
                  </Select>

                  <Select
                    label={t('HAS_PHONE')}
                    selectedKeys={
                      typeof localFilters.hasPhone === 'boolean'
                        ? [String(localFilters.hasPhone)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const k = keys[0];
                      handleFilterChange('hasPhone', k === 'true' ? true : k === 'false' ? false : undefined);
                    }}
                  >
                    <SelectItem value="">{t('ANY')}</SelectItem>
                    <SelectItem value="true">{t('YES')}</SelectItem>
                    <SelectItem value="false">{t('NO')}</SelectItem>
                  </Select>

                  <Select
                    label={t('EMAIL_VERIFIED')}
                    selectedKeys={
                      typeof localFilters.emailVerified === 'boolean'
                        ? [String(localFilters.emailVerified)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const k = keys[0];
                      handleFilterChange('emailVerified', k === 'true' ? true : k === 'false' ? false : undefined);
                    }}
                  >
                    <SelectItem value="">{t('ANY')}</SelectItem>
                    <SelectItem value="true">{t('YES')}</SelectItem>
                    <SelectItem value="false">{t('NO')}</SelectItem>
                  </Select>

                  <Select
                    label={t('TWO_FA_ENABLED')}
                    selectedKeys={
                      typeof localFilters.twoFactorEnabled === 'boolean'
                        ? [String(localFilters.twoFactorEnabled)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const k = keys[0];
                      handleFilterChange('twoFactorEnabled', k === 'true' ? true : k === 'false' ? false : undefined);
                    }}
                  >
                    <SelectItem value="">{t('ANY')}</SelectItem>
                    <SelectItem value="true">{t('YES')}</SelectItem>
                    <SelectItem value="false">{t('NO')}</SelectItem>
                  </Select>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleResetFilters}>
              {t('RESET')}
            </Button>
            <Button variant="flat" onPress={onClose}>
              {t('CANCEL')}
            </Button>
            <Button color="primary" onPress={handleApplyFilters}>
              {t('APPLY_FILTERS')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
