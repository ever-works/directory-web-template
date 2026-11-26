/**
 * The ids a bulk approve or reject on /admin/items acts on: the ticked rows on screen that are
 * waiting for review.
 *
 * The confirm dialog counts only these rows for approve and reject, so the request must carry the
 * same ids. Sending every ticked row also rejected approved listings (taking them offline and
 * emailing each submitter) or approved drafts and items rejected before, while the dialog said
 * "1 item". Bulk delete still acts on every ticked row.
 *
 * Returns each id once, in list order; ticked ids that are not in `items` are ignored.
 */
export function pendingSelectedIds(
	items: ReadonlyArray<{ id: string; status?: string }>,
	selectedIds: ReadonlySet<string>
): string[] {
	const ids = new Set<string>();
	for (const item of items) {
		if (item.status === 'pending' && selectedIds.has(item.id)) ids.add(item.id);
	}
	return [...ids];
}
