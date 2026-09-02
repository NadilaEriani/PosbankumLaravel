import test from "node:test";
import assert from "node:assert/strict";

import {
    getPaginationItems,
    paginateItems,
} from "../../resources/js/utils/pagination.js";

test("menampilkan semua nomor halaman ketika total halaman sedikit", () => {
    assert.deepEqual(getPaginationItems(2, 4), [1, 2, 3, 4]);
});

test("menampilkan empat halaman awal, elipsis, dan halaman terakhir", () => {
    assert.deepEqual(getPaginationItems(1, 10), [1, 2, 3, 4, "ellipsis", 10]);
});

test("menjaga halaman aktif di tengah dengan elipsis di kedua sisi", () => {
    assert.deepEqual(getPaginationItems(5, 10), [
        1,
        "ellipsis",
        4,
        5,
        6,
        "ellipsis",
        10,
    ]);
});

test("menampilkan halaman terakhir tanpa nomor duplikat", () => {
    assert.deepEqual(getPaginationItems(10, 10), [
        1,
        "ellipsis",
        7,
        8,
        9,
        10,
    ]);
});

test("meng-clamp halaman aktif dan total halaman minimum", () => {
    assert.deepEqual(getPaginationItems(99, 3), [1, 2, 3]);
    assert.deepEqual(getPaginationItems(1, 0), [1]);
});

test("membagi data menjadi enam item per halaman", () => {
    const items = Array.from({ length: 13 }, (_, index) => index + 1);
    const result = paginateItems(items, 2, 6);

    assert.equal(result.currentPage, 2);
    assert.equal(result.totalPages, 3);
    assert.deepEqual(result.items, [7, 8, 9, 10, 11, 12]);
});

test("meng-clamp halaman daftar ketika halaman melebihi total", () => {
    const items = Array.from({ length: 13 }, (_, index) => index + 1);
    const result = paginateItems(items, 99, 6);

    assert.equal(result.currentPage, 3);
    assert.equal(result.totalPages, 3);
    assert.deepEqual(result.items, [13]);
});
