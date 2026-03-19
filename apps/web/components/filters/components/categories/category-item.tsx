import React, { useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@heroui/react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { CategoryItemProps } from '../../types';
import { truncateText, isTextTruncated as checkTextTruncated, formatDisplayName } from '../../utils/text-utils';
import { useContainerWidth } from '@/components/ui/container';

export const CategoryItem = memo(function CategoryItem({
  category,
  isActive,
  href,
  isAllCategories = false,
  totalItems,
  mode = 'navigation',
  onToggle
}: CategoryItemProps) {
  const t = useTranslations('listing');
  const isFluid = useContainerWidth() === 'fluid';
  const formattedName = formatDisplayName(category.name);
  const displayName = isFluid ? truncateText(formattedName, 35) : truncateText(formattedName);
  const textIsTruncated = isFluid ? checkTextTruncated(formattedName, 35) : checkTextTruncated(formattedName);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (textIsTruncated && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
      setHovered(true);
    }
  };
  const hideTooltip = () => setHovered(false);

  const handleClick = (e: React.MouseEvent) => {
    if (mode === 'filter') {
      e.preventDefault();
      onToggle?.(category.id);
    }
  };

  const itemClasses = cn(
    'flex items-center justify-between w-full h-9 px-3 rounded-lg mb-1 cursor-pointer',
    'text-xs font-medium text-left transition-colors duration-150 outline-none',
    'focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20',
    isActive
      ? 'bg-[#0a0a0a] text-white hover:bg-black/85 dark:bg-white/1 dark:text-white dark:hover:bg-white/[0.15]'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
  );

  const countClasses = cn(
    'text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 transition-colors duration-150',
    isActive
      ? 'bg-white/20 text-white dark:bg-white/[0.15]'
      : 'bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400'
  );

  const ariaLabel = isAllCategories
    ? t('ALL_CATEGORIES')
    : `${formattedName}, ${category.count ?? 0} ${t('items', { count: category.count ?? 0, defaultValue: 'items' })}`;

  const tooltip =
    hovered && textIsTruncated && typeof document !== 'undefined'
      ? createPortal(
        <div
          className={cn(
            'fixed z-[9999] px-2.5 py-1.5 rounded-lg shadow-lg text-xs font-medium border pointer-events-none',
            isActive
              ? 'bg-[#0a0a0a]/20 text-white border-black/10 dark:bg-neutral-800 dark:text-white dark:border-white/1'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
          )}
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
        >
          {formattedName}
        </div>,
        document.body
      )
      : null;

  const innerContent = (
    <>
      <span className="truncate pr-2">{isAllCategories ? t('ALL_CATEGORIES') : displayName}</span>
      <span className={countClasses} aria-hidden="true">
        {isAllCategories ? totalItems : category.count}
      </span>
    </>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {mode === 'filter' ? (
        <button
          type="button"
          className={itemClasses}
          onClick={handleClick}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          aria-label={ariaLabel}
          aria-pressed={isActive}
        >
          {innerContent}
        </button>
      ) : (
        <Link
          href={href}
          className={itemClasses}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          aria-label={ariaLabel}
          aria-current={isActive ? 'page' : undefined}
        >
          {innerContent}
        </Link>
      )}
      {tooltip}
    </div>
  );
});
