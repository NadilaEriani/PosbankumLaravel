export function getPaginationItems(currentPage, totalPages) {
    const total = Math.max(1, Number(totalPages) || 1);
    const current = Math.min(Math.max(1, Number(currentPage) || 1), total);

    if (total <= 7) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
        return [1, 2, 3, 4, "ellipsis", total];
    }

    if (current >= total - 3) {
        return [
            1,
            "ellipsis",
            total - 3,
            total - 2,
            total - 1,
            total,
        ];
    }

    return [
        1,
        "ellipsis",
        current - 1,
        current,
        current + 1,
        "ellipsis",
        total,
    ];
}
