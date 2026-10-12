// Jalankan: node --test resources/js/utils/sort.test.js
import assert from "node:assert/strict";
import { test } from "node:test";
import { sortItems, waktu } from "./sort.js";

const rows = [
    { id: 1, nama: "budi", tgl: "2026-10-02 08:00:00", bobot: 2 },
    { id: 2, nama: "Andi", tgl: "2026-09-10 08:00:00", bobot: 10 },
    { id: 3, nama: "-", tgl: "", bobot: null },
    { id: 4, nama: "Citra", tgl: "bukan tanggal", bobot: 1 },
];

const nilai = {
    nama: (item) => item.nama,
    tgl: (item) => waktu(item.tgl),
    bobot: (item) => item.bobot,
};

const ids = (key, arah) =>
    sortItems(rows, { key, arah }, nilai).map((item) => item.id);

test("teks: tanpa beda huruf besar/kecil, kosong selalu di bawah", () => {
    assert.deepEqual(ids("nama", "asc"), [2, 1, 4, 3]);
    assert.deepEqual(ids("nama", "desc"), [4, 1, 2, 3]);
});

test("tanggal: menurut waktu, yang tidak valid di bawah", () => {
    assert.deepEqual(ids("tgl", "asc"), [2, 1, 3, 4]);
    assert.deepEqual(ids("tgl", "desc"), [1, 2, 3, 4]);
});

test("angka: menurut nilai, bukan teks", () => {
    assert.deepEqual(ids("bobot", "asc"), [4, 1, 2, 3]);
    assert.deepEqual(ids("bobot", "desc"), [2, 1, 4, 3]);
});

test("tanpa urut atau kolom tak dikenal: urutan asal, list tidak diubah", () => {
    assert.equal(sortItems(rows, null, nilai), rows);
    assert.equal(sortItems(rows, { key: "lain", arah: "asc" }, nilai), rows);
    assert.deepEqual(
        rows.map((item) => item.id),
        [1, 2, 3, 4],
    );
});
