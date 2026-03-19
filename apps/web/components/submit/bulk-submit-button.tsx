"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ClientImportModal } from "./client-import-modal";

const buttonClass = cn(
	"inline-flex items-center gap-2 px-4 py-2",
	"bg-gray-100 dark:bg-white/[0.05]",
	"hover:bg-gray-200 dark:hover:bg-white/[0.08]",
	"text-gray-600 dark:text-gray-400",
	"hover:text-gray-900 dark:hover:text-gray-100",
	"rounded-lg transition-all duration-300 font-medium"
);

export function BulkSubmitButton() {
	const t = useTranslations("client.submissions");
	const [isImportOpen, setIsImportOpen] = useState(false);

	return (
		<>
			<button
				className={buttonClass}
				onClick={() => setIsImportOpen(true)}
			>
				<Upload className="w-4 h-4" />
				{t("BULK_IMPORT")}
			</button>

			<ClientImportModal
				isOpen={isImportOpen}
				onClose={() => setIsImportOpen(false)}
			/>
		</>
	);
}
