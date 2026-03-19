"use client";
import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export const ShareButton = ({ url, title }: { url: string; title: string }) => {
    const [isCopying, setIsCopying] = useState(false);
    const [open, setOpen] = useState(false);
    const t = useTranslations("common");

    const handleShare = async (type: string) => {
      try {
        switch (type) {
          case "copy":
            setIsCopying(true);
            await navigator.clipboard.writeText(url);
            await new Promise(resolve => setTimeout(resolve, 500));
            toast.success(t("LINK_COPIED"));
            setIsCopying(false);
            break;
          case "twitter":
            window.open(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                url
              )}&text=${encodeURIComponent(title)}`,
              "_blank"
            );
            break;
          case "facebook":
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                url
              )}`,
              "_blank"
            );
            break;
          case "linkedin":
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                url
              )}`,
              "_blank"
            );
            break;
        }
      } catch (error) {
        toast.error(t("SHARE_ERROR"), {
            description: error instanceof Error ? error.message : "Unknown error",
        });
        setIsCopying(false);
      }
    };

    return (
      <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className={cn(
              "group cursor-pointer inline-flex items-center px-4 py-2",
              "bg-white/90 hover:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.06]",
              "text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm",
              "border border-gray-200 dark:border-white/[0.08] hover:border-purple-300 dark:hover:border-purple-600",
              "shadow-sm hover:shadow-md",
              "transition-colors duration-200"
            )}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            <span className="text-sm font-medium">{t("SHARE")}</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={5}
            align="end"
            className={cn(
              "z-50 min-w-(--radix-dropdown-menu-trigger-width) bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/[0.08] rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200",
            )}
          >
            <div className="p-1">
            <DropdownMenu.Item
              className="relative flex items-center gap-1 px-3 py-2 text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              onSelect={() => handleShare("copy")}
            >
              {isCopying ? (
                <div className="w-4 h-4 mr-2 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              )}
              <span className="font-medium text-sm">{t("COPY_LINK")}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="relative flex items-center gap-1 px-3 py-2 text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              onSelect={() => handleShare("twitter")}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-medium text-sm mt-1">X</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="relative flex items-center gap-1 px-3 py-2 text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              onSelect={() => handleShare("facebook")}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="font-medium text-sm">Facebook</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="relative flex items-center gap-1 px-3 py-2 text-gray-900 dark:text-gray-100 rounded-md cursor-pointer outline-none transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              onSelect={() => handleShare("linkedin")}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="font-medium text-sm">LinkedIn</span>
            </DropdownMenu.Item>
          </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  };
  