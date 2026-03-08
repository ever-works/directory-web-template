export const PER_PAGE = 12;

export function totalPages(size: number, perPage: number = PER_PAGE) {
    return Math.ceil(size / perPage);
}

export function paginateMeta(rawPage: number | string = 1, perPage: number = PER_PAGE) {
    const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
    const start = (page - 1) * perPage;

    return {
        page,
        start,
    }
}
