import assert from "node:assert/strict";
import test from "node:test";

async function loadNavigation() {
    try {
        return await import("../../resources/js/utils/dashboardNavigation.js");
    } catch (error) {
        assert.fail(
            `Helper navigasi card dashboard belum tersedia: ${error.message}`,
        );
    }
}

test("card kasus membuka detail kasus yang dipilih", async () => {
    const { getDashboardCardTarget } = await loadNavigation();

    assert.deepEqual(getDashboardCardTarget("case-detail", "PG-12"), {
        page: "Semua Kasus",
        type: "kasus",
        id: "PG-12",
    });
});

test("card kegiatan membuka detail kegiatan yang dipilih", async () => {
    const { getDashboardCardTarget } = await loadNavigation();

    assert.deepEqual(getDashboardCardTarget("activity-detail", 7), {
        page: "Kelola Kegiatan",
        type: "kegiatan",
        id: 7,
    });
});

test("card ringkasan membuka halaman daftar yang sesuai", async () => {
    const { getDashboardCardTarget } = await loadNavigation();

    assert.deepEqual(getDashboardCardTarget("cases-summary"), {
        page: "Semua Kasus",
        type: null,
        id: null,
    });
    assert.deepEqual(getDashboardCardTarget("activities-summary"), {
        page: "Kelola Kegiatan",
        type: null,
        id: null,
    });
});

test("target yang tidak dikenal tidak menjalankan navigasi", async () => {
    const { getDashboardCardTarget } = await loadNavigation();

    assert.equal(getDashboardCardTarget("unknown", 1), null);
});
