import { useState } from "react";
import { FiArrowDown, FiArrowUp, FiGrid, FiList } from "react-icons/fi";
import "../../css/viewToggle.css";

export const TABLE_ROW_OPTIONS = [10, 25, 50];

function baca(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function tulis(key, value) {
    try {
        window.localStorage.setItem(key, String(value));
    } catch {
        // storage diblokir: pilihan hanya berlaku sampai reload
    }
}

// Pilihan tampilan list (kartu/tabel) dan jumlah baris tabel, diingat per halaman di browser ini.
export function useViewMode(halaman) {
    const modeKey = `sibapak-view-${halaman}`;
    const rowsKey = `sibapak-rows-${halaman}`;

    const [mode, setMode] = useState(() =>
        baca(modeKey) === "tabel" ? "tabel" : "kartu",
    );
    const [rows, setRows] = useState(() => {
        const saved = Number(baca(rowsKey));
        return TABLE_ROW_OPTIONS.includes(saved) ? saved : TABLE_ROW_OPTIONS[0];
    });

    const simpanMode = (next) => {
        setMode(next);
        tulis(modeKey, next);
    };

    const simpanRows = (next) => {
        setRows(next);
        tulis(rowsKey, next);
    };

    return [mode, simpanMode, rows, simpanRows];
}

// "1–10" untuk teks "Menampilkan 1–10 dari 253".
export function rangeLabel(page, pageSize, total) {
    if (!total) return "0";
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return `${from}–${to}`;
}

// Urutan tabel lewat judul kolom: klik kolom baru = naik, klik lagi = balik arah.
// Dipakai bersama sortItems() di utils/sort.js.
export function useSort(awal = null, onChange) {
    const [urut, setUrut] = useState(awal);

    const ubah = (key) => {
        setUrut((prev) => ({
            key,
            arah: prev?.key === key && prev.arah === "asc" ? "desc" : "asc",
        }));
        onChange?.();
    };

    return [urut, ubah, setUrut];
}

// Judul kolom tabel. Dengan `k` kolom bisa diurutkan; tanpa `k` menjadi <th> biasa.
export function SortTh({ k, urut, onSort, className, children }) {
    if (!k) return <th className={className}>{children}</th>;

    const aktif = urut?.key === k;
    const turun = aktif && urut.arah === "desc";

    return (
        <th
            className={className}
            aria-sort={aktif ? (turun ? "descending" : "ascending") : undefined}
        >
            <button
                type="button"
                className={`vt-sortBtn ${aktif ? "is-active" : ""}`}
                onClick={() => onSort(k)}
                title="Urutkan kolom ini"
            >
                {children}
                {turun ? (
                    <FiArrowDown aria-hidden="true" />
                ) : (
                    <FiArrowUp aria-hidden="true" />
                )}
            </button>
        </th>
    );
}

const OPSI = [
    { value: "kartu", label: "Kartu", Icon: FiGrid },
    { value: "tabel", label: "Tabel", Icon: FiList },
];

// Pilihan jumlah baris per halaman. Dipakai juga oleh halaman yang hanya punya tabel.
export function RowsSelect({ value, onChange }) {
    return (
        <label className="vt-rows">
            <span className="vt-rowsLabel">Baris</span>
            <select
                className="vt-rowsSelect"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                aria-label="Jumlah baris per halaman"
            >
                {TABLE_ROW_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default function ViewToggle({
    value,
    onChange,
    rows,
    onRowsChange,
    className = "",
}) {
    return (
        <div className={`vt-controls ${className}`.trim()}>
            {value === "tabel" && onRowsChange ? (
                <RowsSelect value={rows} onChange={onRowsChange} />
            ) : null}

            <div className="vt-toggle" role="group" aria-label="Pilih tampilan">
                {OPSI.map(({ value: v, label, Icon }) => (
                    <button
                        key={v}
                        type="button"
                        className={`vt-toggleBtn ${value === v ? "is-active" : ""}`}
                        aria-pressed={value === v}
                        aria-label={`Tampilan ${label.toLowerCase()}`}
                        title={`Tampilan ${label.toLowerCase()}`}
                        onClick={() => value !== v && onChange(v)}
                    >
                        <Icon aria-hidden="true" />
                        <span className="vt-toggleLabel">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
