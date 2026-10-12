function kosong(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "-" ||
        (typeof value === "number" && Number.isNaN(value))
    );
}

// Nilai tanggal mentah (mis. "2026-09-01 10:00:00") menjadi angka waktu.
// Dipakai agar tanggal tidak diurutkan dari teks tampilannya.
export function waktu(value) {
    if (kosong(value)) return null;

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? null : time;
}

// Urutkan list menurut satu kolom. `urut` = { key, arah: "asc" | "desc" } atau
// null (urutan asal dipertahankan). `nilai` = { key: (item) => nilai kolom }.
// Nilai kosong selalu di bawah; baris bernilai sama mempertahankan urutan asal.
export function sortItems(items, urut, nilai) {
    const ambil = urut ? nilai[urut.key] : null;

    if (!ambil) return items;

    const arah = urut.arah === "desc" ? -1 : 1;

    return [...items].sort((a, b) => {
        const va = ambil(a);
        const vb = ambil(b);

        if (kosong(va) || kosong(vb)) {
            return Number(kosong(va)) - Number(kosong(vb));
        }

        if (typeof va === "number" && typeof vb === "number") {
            return arah * (va - vb);
        }

        return (
            arah *
            String(va).localeCompare(String(vb), "id", {
                numeric: true,
                sensitivity: "base",
            })
        );
    });
}
