  'use client';
  import { useState, useCallback } from 'react';
import { Button, Card, CardBody, Chip, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@heroui/react';
import { Filter, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

  export interface SavedFilter {
    id: string;
    name: string;
    description?: string;
    filters: {
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
    };
    createdAt: Date;
    lastUsed?: Date;
  }

  interface SavedFiltersProps {
    currentFilters: SavedFilter['filters'];
    onApplyFilter: (filters: SavedFilter['filters']) => void;
    onSaveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => void;
    onDeleteFilter: (id: string) => void;
    savedFilters: SavedFilter[];
  }

  export function SavedFilters({ 
    currentFilters, 
    onApplyFilter, 
    onSaveFilter, 
    onDeleteFilter, 
    savedFilters 
  }: SavedFiltersProps) {
    const t = useTranslations('admin.SAVED_FILTERS');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [filterName, setFilterName] = useState('');
    const [filterDescription, setFilterDescription] = useState('');

    const handleSaveFilter = useCallback(() => {
      if (!filterName.trim()) {
        toast.error(t('ERRORS.NAME_REQUIRED'));
        return;
      }

      const newFilter: Omit<SavedFilter, 'id' | 'createdAt'> = {
        name: filterName.trim(),
        description: filterDescription.trim() || undefined,
        filters: { ...currentFilters },
        lastUsed: new Date()
      };

      onSaveFilter(newFilter);
      setFilterName('');
      setFilterDescription('');
      onClose();
      toast.success(t('SUCCESS.FILTER_SAVED'));
    }, [filterName, filterDescription, currentFilters, onSaveFilter, onClose, t]);

    const handleApplyFilter = useCallback((filter: SavedFilter) => {
      onApplyFilter(filter.filters);
      toast.success(t('SUCCESS.FILTER_APPLIED', { name: filter.name }));
    }, [onApplyFilter, t]);

    const handleDeleteFilter = useCallback((id: string, name: string) => {
      if (confirm(t('CONFIRM_DELETE', { name }))) {
        onDeleteFilter(id);
        toast.success(t('SUCCESS.FILTER_DELETED'));
      }
    }, [onDeleteFilter, t]);

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onOpen}
          >
            {t('SAVE_CURRENT_FILTERS')}
          </Button>
          
          {savedFilters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('SAVED')}</span>
              {savedFilters.slice(0, 3).map((filter) => (
                <Chip
                  key={filter.id}
                  variant="flat"
                  color="secondary"
                  startContent={<Filter className="w-3 h-3" />}
                  onClick={() => handleApplyFilter(filter)}
                  className="cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  {filter.name}
                </Chip>
              ))}
              {savedFilters.length > 3 && (
                <Chip variant="flat" color="default">
                  {t('MORE', { count: savedFilters.length - 3 })}
                </Chip>
              )}
            </div>
          )}
        </div>

        {/* Save Filter Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader>{t('SAVE_FILTER_PRESET')}</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label={t('FILTER_NAME')}
                  placeholder={t('FILTER_NAME_PLACEHOLDER')}
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  required
                />
                <Input
                  label={t('DESCRIPTION_OPTIONAL')}
                  placeholder={t('DESCRIPTION_PLACEHOLDER')}
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                />
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('CURRENT_FILTERS')}</p>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {Object.entries(currentFilters).map(([key, value]) => {
                      if (value !== undefined && value !== '' && value !== false) {
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                    {Object.entries(currentFilters).every(([, value]) => value === undefined || value === '' || value === false) && (
                      <span className="text-gray-500">{t('NO_ACTIVE_FILTERS')}</span>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                {t('CANCEL')}
              </Button>
              <Button color="primary" onPress={handleSaveFilter}>
                {t('SAVE_FILTER')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Saved Filters List */}
        {savedFilters.length > 0 && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardBody className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('SAVED_FILTER_PRESETS')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">{filter.name}</h5>
                        {filter.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{filter.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        onPress={() => handleDeleteFilter(filter.id, filter.name)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {filter.filters.status && <Chip size="sm" variant="flat" color="primary">{filter.filters.status}</Chip>}
                        {filter.filters.plan && <Chip size="sm" variant="flat" color="secondary">{filter.filters.plan}</Chip>}
                        {filter.filters.provider && <Chip size="sm" variant="flat" color="success">{filter.filters.provider}</Chip>}
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => handleApplyFilter(filter)}
                      >
                        {t('APPLY')}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {t('CREATED')} {new Date(filter.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {filter.lastUsed && ` • ${t('LAST_USED')} ${new Date(filter.lastUsed).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </>
    );
  }
