const DASHBOARD_CARD_TARGETS = {
    "cases-summary": {
        page: "Semua Kasus",
        type: null,
    },
    "activities-summary": {
        page: "Kelola Kegiatan",
        type: null,
    },
    "case-detail": {
        page: "Semua Kasus",
        type: "kasus",
    },
    "activity-detail": {
        page: "Kelola Kegiatan",
        type: "kegiatan",
    },
};

export function getDashboardCardTarget(kind, id = null) {
    const target = DASHBOARD_CARD_TARGETS[kind];

    if (!target) return null;

    return {
        page: target.page,
        type: target.type,
        id: target.type ? id : null,
    };
}
