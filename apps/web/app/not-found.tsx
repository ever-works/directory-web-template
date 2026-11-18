import { DocumentShell } from '@/components/layout/document-shell';
import NotFoundContent from '@/components/errors/not-found-content';
import { DEFAULT_LOCALE } from '@/lib/constants';

/**
 * Global 404. The root layout only passes children through (Spec 061), so a
 * page that does not render inside `[locale]/layout.tsx` renders the document
 * shell itself.
 */
export default function NotFound() {
	return (
		<DocumentShell locale={DEFAULT_LOCALE}>
			<NotFoundContent />
		</DocumentShell>
	);
}
