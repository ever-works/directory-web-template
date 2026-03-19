"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Modal,
  ModalContent,
  ModalHeader
} from "@heroui/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Star,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
  Package
} from "lucide-react";
import { UniversalPagination } from "@/components/universal-pagination";
import Image from "next/image";
import { useAdminFeaturedItems, FeaturedItem } from "@/hooks/use-admin-featured-items";
import { useFeaturedItemForm } from "@/hooks/use-featured-item-form";
import { useTranslations } from "next-intl";

export default function AdminFeaturedItemsPage() {
  const t = useTranslations('admin.ADMIN_FEATURED_ITEMS_PAGE');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use custom hooks
  const {
    featuredItems,
    allItems,
    filteredItems,
    isLoading,
    currentPage,
    totalPages,
    totalItems,
    searchTerm,
    showActiveOnly,
    createFeaturedItem,
    updateFeaturedItem,
    deleteFeaturedItem,
    updateOrder,
    setSearchTerm,
    setShowActiveOnly,
    setCurrentPage,
  } = useAdminFeaturedItems();

  const {
    formData,
    isEditMode,
    isSubmitting: isFormSubmitting,
    handleInputChange,
    handleItemSelect,
    handleSubmit,
    openCreateModal,
    openEditModal,
    closeModal,
  } = useFeaturedItemForm({
    allItems,
    onSubmit: async (data) => {
      if (isEditMode) {
        const itemToUpdate = featuredItems.find(item => item.itemSlug === data.itemSlug);
        if (itemToUpdate) {
          return await updateFeaturedItem(itemToUpdate.id, data);
        }
        return false;
      } else {
        return await createFeaturedItem(data);
      }
    },
    onCancel: () => {
      closeModal();
      setIsModalOpen(false);
    },
  });

  // Handler functions
  const handleAddFeatured = () => {
    openCreateModal();
    setIsModalOpen(true);
  };

  const handleEditFeatured = (item: FeaturedItem) => {
    openEditModal(item);
    setIsModalOpen(true);
  };

  const handleRemoveFeatured = async (id: string) => {
    if (!confirm(t('REMOVE_CONFIRMATION'))) {
      return;
    }
    await deleteFeaturedItem(id);
  };

  const handleUpdateOrder = async (id: string, newOrder: number) => {
    await updateOrder(id, newOrder);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('TITLE')}</h1>
          <p className="text-muted-foreground">
            {t('SUBTITLE')}
          </p>
        </div>
        <Button onClick={handleAddFeatured} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('ADD_FEATURED_ITEM')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('TOTAL_FEATURED_STAT')}</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('ACTIVE_STAT')}</p>
                <p className="text-2xl font-bold">
                  {featuredItems.filter(item => item.isActive).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('INACTIVE_STAT')}</p>
                <p className="text-2xl font-bold">
                  {featuredItems.filter(item => !item.isActive).length}
                </p>
              </div>
              <EyeOff className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('AVAILABLE_ITEMS_STAT')}</p>
                <p className="text-2xl font-bold">{allItems.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('SEARCH_PLACEHOLDER')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <Label htmlFor="active-only">{t('ACTIVE_ONLY')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Items List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('FEATURED_ITEMS_TITLE')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('NO_FEATURED_ITEMS_FOUND')}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateOrder(item.id, item.featuredOrder - 1)}
                        disabled={item.featuredOrder <= 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateOrder(item.id, item.featuredOrder + 1)}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {item.itemIconUrl && (
                      <Image
                        src={item.itemIconUrl}
                        alt={item.itemName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    
                    <div>
                      <h3 className="font-semibold">{item.itemName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.itemSlug} • {t('ORDER_LABEL')} {item.featuredOrder}
                      </p>
                      {item.featuredUntil && (
                        <p className="text-xs text-muted-foreground">
                          {t('FEATURED_UNTIL_LABEL')} {new Date(item.featuredUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? t('ACTIVE') : t('INACTIVE')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditFeatured(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFeatured(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
            <UniversalPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <h2 className="text-xl font-semibold">
              {isEditMode ? t('EDIT_FEATURED_ITEM') : t('ADD_FEATURED_ITEM_TITLE')}
            </h2>
          </ModalHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemSlug">{t('SELECT_ITEM_LABEL')}</Label>
                <Select 
                  selectedKeys={formData.itemSlug ? [formData.itemSlug] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    if (selectedKey) {
                      handleItemSelect(selectedKey);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {formData.itemSlug ? allItems.find(item => item.slug === formData.itemSlug)?.name : t('CHOOSE_ITEM_PLACEHOLDER')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allItems.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="featuredOrder">{t('DISPLAY_ORDER_LABEL')}</Label>
                <Input
                  id="featuredOrder"
                  type="number"
                  value={formData.featuredOrder}
                  onChange={(e) => handleInputChange('featuredOrder', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemName">{t('ITEM_NAME_LABEL')}</Label>
                <Input
                  id="itemName"
                  value={formData.itemName}
                  onChange={(e) => handleInputChange('itemName', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="itemCategory">{t('CATEGORY_LABEL')}</Label>
                <Input
                  id="itemCategory"
                  value={formData.itemCategory}
                  onChange={(e) => handleInputChange('itemCategory', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="itemIconUrl">{t('ICON_URL_LABEL')}</Label>
              <Input
                id="itemIconUrl"
                value={formData.itemIconUrl}
                onChange={(e) => handleInputChange('itemIconUrl', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="itemDescription">{t('DESCRIPTION_LABEL')}</Label>
              <Textarea
                id="itemDescription"
                value={formData.itemDescription}
                onChange={(e) => handleInputChange('itemDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="featuredUntil">{t('FEATURED_UNTIL_OPTIONAL')}</Label>
                <Input
                  id="featuredUntil"
                  type="datetime-local"
                  value={formData.featuredUntil}
                  onChange={(e) => handleInputChange('featuredUntil', e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">{t('ACTIVE_LABEL')}</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                {t('CANCEL')}
              </Button>
              <Button type="submit" disabled={isFormSubmitting}>
                {isFormSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditMode ? t('UPDATE') : t('ADD')} {t('FEATURED_ITEM')}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
