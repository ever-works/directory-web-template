import { DocumentShell } from '@/components/layout/document-shell';
import UnauthorizedContent from '@/components/errors/unauthorized-content';
import { DEFAULT_LOCALE } from '@/lib/constants';

/**
 * Lives outside `[locale]`, and the root layout only passes children through
 * (Spec 061), so this page renders the document shell itself.
 */
export default function UnauthorizedPage() {
	return (
		<DocumentShell locale={DEFAULT_LOCALE}>
			<UnauthorizedContent />
		</DocumentShell>
	);
}
