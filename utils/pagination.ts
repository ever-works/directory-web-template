// utils/pagination.ts

/**
 * Clamps a page number to a valid range and scrolls to top.
 * @param newPage The requested page number
 * @param total Total number of pages
 * @param setPage State setter for the page
 */
export function clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void) {
  const numPage = Number(newPage);
  const clampedPage = Math.max(1, Math.min(isNaN(numPage) ? 1 : numPage, total));
  setPage(clampedPage);
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
