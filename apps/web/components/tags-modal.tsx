"use client";

import { Tag } from "@/lib/content";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@heroui/react";
import { Sparkles } from "lucide-react";
import { TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type TagsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  tags: Tag[];
  onRemoveTag: (tagId: string) => void;
};

export function TagsModal({
  isOpen,
  onClose,
  selectedTags,
  tags,
  onRemoveTag,
}: TagsModalProps) {
  const t = useTranslations("tagsModal");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      classNames={{
        backdrop: "bg-black/50",
        base: "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
        header: "border-b border-gray-200 dark:border-gray-700",
        body: "py-4",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">
            {t("SELECTED_TAGS")} ({selectedTags.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("CLICK_TO_REMOVE")}
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
            {selectedTags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <span
                  key={tagId}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-600/20 border border-blue-300 dark:border-blue-500 text-blue-700 dark:text-blue-400 rounded-lg transition-colors duration-300 hover:bg-blue-200 dark:hover:bg-blue-600/30 cursor-pointer"
                  onClick={() => onRemoveTag(tagId)}
                >
                  {tag.name}
                  <button className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors duration-300 font-bold">
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>

          {selectedTags.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                  <TagIcon className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-linear-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-3">
                {t("NO_TAGS_SELECTED")}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-500 max-w-sm">
                {t("SELECT_TAGS_TO_SEE")}
              </p>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button color="primary" onPress={onClose} className="px-6">
              {t("CLOSE")}
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
