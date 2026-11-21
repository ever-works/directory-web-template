import type { Metadata } from 'next';

/**
 * Public member profiles (`/client/profile/<username>`) stay indexable: the
 * `/client` layout marks the rest of the segment (dashboard, settings,
 * submissions) `noindex` (Spec 062). Pass-through otherwise.
 */
export const metadata: Metadata = { robots: { index: true, follow: true } };

export default function ClientProfileLayout({ children }: { children: React.ReactNode }) {
	return children;
}
