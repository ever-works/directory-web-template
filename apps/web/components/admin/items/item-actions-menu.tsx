"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, ExternalLink, Edit, Copy, FileText, CheckCircle, XCircle, Trash2, Loader2, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ItemData } from "@/lib/types/item";

interface ItemActionsMenuProps {
  item: ItemData;
  onViewSource: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onViewHistory: () => void;
  onCreateSurvey: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isProcessing?: boolean;
  isApproving?: boolean;
  isRejecting?: boolean;
  isDeleting?: boolean;
  isDuplicating?: boolean;
}

export function ItemActionsMenu({
  item,
  onViewSource,
  onEdit,
  onDuplicate,
  onViewHistory,
  onCreateSurvey,
  onApprove,
  onReject,
  onDelete,
  isProcessing = false,
  isApproving = false,
  isRejecting = false,
  isDeleting = false,
  isDuplicating = false,
}: ItemActionsMenuProps) {
  const t = useTranslations("admin.ADMIN_ITEMS_PAGE");
  const tSurvey = useTranslations("survey");
  const isPending = item.status === "pending";

  const menuItemClass = cn(
    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none rounded-md mx-1",
    "text-gray-700 dark:text-gray-200",
    "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
    "focus:bg-gray-100 dark:focus:bg-white/[0.06]",
    "transition-colors duration-150"
  );

  const dangerItemClass = cn(
    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none rounded-md mx-1",
    "text-red-600 dark:text-red-400",
    "hover:bg-red-50 dark:hover:bg-red-900/20",
    "focus:bg-red-50 dark:focus:bg-red-900/20",
    "transition-colors duration-150"
  );

  const successItemClass = cn(
    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none rounded-md mx-1",
    "text-green-600 dark:text-green-400",
    "hover:bg-green-50 dark:hover:bg-green-900/20",
    "focus:bg-green-50 dark:focus:bg-green-900/20",
    "transition-colors duration-150"
  );

  const disabledItemClass = cn(
    "flex items-center gap-2 px-3 py-2 text-sm cursor-not-allowed outline-none rounded-md mx-1",
    "text-gray-400 dark:text-gray-500",
    "opacity-40"
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center",
            "w-8 h-8 rounded-lg",
            "text-gray-500 dark:text-gray-400",
            "hover:bg-gray-100 dark:hover:bg-white/[0.06]",
            "hover:text-gray-700 dark:hover:text-gray-200",
            "border border-transparent hover:border-gray-200 dark:hover:border-white/[0.06]",
            "focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-1",
            "transition-all duration-150",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
          disabled={isProcessing}
          aria-label={t("ACTIONS")}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MoreHorizontal className="w-5 h-5" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[176px] bg-white dark:bg-[#121212] rounded-xl shadow-2xl",
            "border border-gray-200 dark:border-white/[0.06]",
            "py-1.5 z-50",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          sideOffset={6}
          align="end"
        >
          {/* View Source */}
          <DropdownMenu.Item
            className={menuItemClass}
            onSelect={onViewSource}
          >
            <ExternalLink className="w-4 h-4" />
            {t("VIEW_SOURCE")}
          </DropdownMenu.Item>

          {/* Edit */}
          <DropdownMenu.Item
            className={isProcessing ? disabledItemClass : menuItemClass}
            onSelect={onEdit}
            disabled={isProcessing}
          >
            <Edit className="w-4 h-4" />
            {t("EDIT")}
          </DropdownMenu.Item>

          {/* Duplicate */}
          <DropdownMenu.Item
            className={isProcessing ? disabledItemClass : menuItemClass}
            onSelect={onDuplicate}
            disabled={isProcessing}
          >
            {isDuplicating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {isDuplicating ? t("DUPLICATING") : t("DUPLICATE")}
          </DropdownMenu.Item>

          {/* View History */}
          <DropdownMenu.Item
            className={menuItemClass}
            onSelect={onViewHistory}
          >
            <History className="w-4 h-4" />
            {t("VIEW_HISTORY")}
          </DropdownMenu.Item>

          {/* Create Survey */}
          <DropdownMenu.Item
            className={isProcessing ? disabledItemClass : menuItemClass}
            onSelect={onCreateSurvey}
            disabled={isProcessing}
          >
            <FileText className="w-4 h-4" />
            {tSurvey("CREATE_SURVEY")}
          </DropdownMenu.Item>

          {/* Separator + Review Actions (only for pending items) */}
          {isPending && (
            <>
              <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-white/[0.08] my-1" />

              {/* Approve */}
              <DropdownMenu.Item
                className={isProcessing ? disabledItemClass : successItemClass}
                onSelect={onApprove}
                disabled={isProcessing}
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isApproving ? t("APPROVING") : t("APPROVE")}
              </DropdownMenu.Item>

              {/* Reject */}
              <DropdownMenu.Item
                className={isProcessing ? disabledItemClass : dangerItemClass}
                onSelect={onReject}
                disabled={isProcessing}
              >
                {isRejecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {isRejecting ? t("REJECTING") : t("REJECT")}
              </DropdownMenu.Item>
            </>
          )}

          {/* Separator + Delete */}
          <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-white/[0.08] my-1" />

          <DropdownMenu.Item
            className={isProcessing ? disabledItemClass : dangerItemClass}
            onSelect={onDelete}
            disabled={isProcessing}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isDeleting ? t("DELETING") : t("DELETE")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
