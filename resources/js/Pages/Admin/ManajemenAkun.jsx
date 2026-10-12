import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import {
    FiSearch,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiEdit2,
    FiEye,
    FiPlus,
    FiFilter,
    FiCheck,
    FiUsers,
    FiUserX,
    FiUserCheck,
    FiClock,
    FiRefreshCw,
} from "react-icons/fi";
import { GrPowerShutdown } from "react-icons/gr";
import posbankumIcon from "../../assets/icon.png";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import DeleteConfirmModal from "../../Components/ui/DeleteConfirmModal";
import ReminderModal from "../../Components/ui/ReminderModal";
import {
    RowsSelect,
    SortTh,
    rangeLabel,
    useSort,
    useViewMode,
} from "../../Components/ViewToggle";
import { getPaginationItems } from "../../utils/pagination";
import { sortItems, waktu } from "../../utils/sort";
import "../../../css/Admin/manajemenAkun.css";

const EMPTY_LIST = [];
const PENDAFTAR_URL = "/admin/manajemen-akun/pendaftar";
const KOLOM_PENDAFTAR = [
    { key: "nama", label: "Nama Pendaftar" },
    { key: "email", label: "Email" },
    { label: "No. Telepon" },
    { key: "domisili", label: "Domisili" },
    { key: "waktu", label: "Tanggal Daftar" },
];

function getFirstError(
    errors,
    fallback = "Terjadi kesalahan. Periksa kembali data yang diisi.",
) {
    if (!errors) return fallback;

    if (typeof errors === "string") return errors;

    const firstValue = Object.values(errors)[0];
    if (Array.isArray(firstValue)) return firstValue[0] || fallback;
    if (typeof firstValue === "string") return firstValue;

    return fallback;
}

function stripPosbankumPrefix(name) {
    const raw = String(name || "").trim();
    return raw.replace(/^posbankum\s+/i, "").trim();
}

function formatPosbankumName(name) {
    const cleanName = stripPosbankumPrefix(name);
    return cleanName ? `Posbankum ${cleanName}` : "-";
}

function cleanText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function sanitizePhoneInput(value) {
    return String(value ?? "")
        .replace(/\D/g, "")
        .slice(0, 15);
}

function formatPhoneDisplay(value) {
    const raw = String(value ?? "").trim();
    if (!raw || raw === "-") return "-";

    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("62") && digits.length > 2) {
        return `+62 ${digits.slice(2)}`;
    }

    return raw;
}

function isValidOptionalPhone(value) {
    const phone = sanitizePhoneInput(value);

    if (!phone) return true;

    return /^\d{8,15}$/.test(phone);
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

// Nama wilayah di Sheet pendaftaran dan di database berformat sama; yang
// dibedakan hanya huruf besar/kecil, spasi, dan tanda baca.
function samakanNama(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function cariWilayah(options, nama, cocok = () => true) {
    const target = samakanNama(nama);
    if (!target) return "";

    const found = options.find(
        (item) => cocok(item) && samakanNama(item.label) === target,
    );

    return found ? String(found.value) : "";
}

function opsiNama(daftar) {
    return [...new Set(daftar.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "id"))
        .map((nama) => ({ value: nama, label: nama }));
}

const NILAI_URUT_PENDAFTAR = {
    nama: (item) => item.nama,
    email: (item) => item.email,
    domisili: (item) =>
        [item.kabupaten, item.kecamatan, item.kelurahan]
            .filter(Boolean)
            .join(" "),
    waktu: (item) => waktu(item.waktu),
};

const NILAI_URUT_AKUN = {
    nama: (row) => row.nama_lengkap,
    email: (row) => (row.email === "-" ? "" : row.email),
    posbankum: (row) => stripPosbankumPrefix(row.posbankum_nama),
    status: (row) => row.status,
};

function pick(row, keys, fallback = "") {
    for (const key of keys) {
        const value = row?.[key];
        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}

function normalizeAccountStatus(value) {
    if (typeof value === "boolean") return value ? "aktif" : "nonaktif";
    if (typeof value === "number") return value === 0 ? "nonaktif" : "aktif";

    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();

    if (
        [
            "0",
            "false",
            "nonaktif",
            "non-aktif",
            "inactive",
            "disabled",
        ].includes(normalized)
    ) {
        return "nonaktif";
    }

    return "aktif";
}

function normalizeRow(row, index = 0) {
    const rawName = pick(
        row,
        ["nama_lengkap", "nama_paralegal", "name", "nama", "nama_user"],
        `Paralegal ${index + 1}`,
    );

    const posbankumName = cleanText(
        pick(
            row,
            ["posbankum_nama", "nama_posbankum", "posbankumName", "posbankum"],
            "",
        ),
    );

    const kabupatenNama = cleanText(
        pick(
            row,
            ["kabupaten_nama", "nama_kabupaten", "kabupaten", "kota"],
            "",
        ),
    );
    const kecamatanNama = cleanText(
        pick(row, ["kecamatan_nama", "nama_kecamatan", "kecamatan"], ""),
    );
    const kelurahanNama = cleanText(
        pick(
            row,
            ["kelurahan_nama", "nama_kelurahan", "kelurahan", "desa"],
            "",
        ),
    );
    const lokasi = cleanText(pick(row, ["lokasi", "alamat", "address"], ""));

    const idPosbankum = cleanText(
        pick(
            row,
            ["id_posbankum", "posbankum_id", "id_pos", "posbankumId"],
            "",
        ),
    );

    return {
        ...row,
        id_user: pick(
            row,
            ["id_user", "user_id", "id_paralegal", "id", "id_posbankum"],
            `local-${index}`,
        ),
        id_posbankum: idPosbankum || `local-posbankum-${index}`,
        nama_lengkap: cleanText(rawName, `Paralegal ${index + 1}`),
        posbankum_nama:
            posbankumName ||
            cleanText(pick(row, ["nama_posbankum"], "")) ||
            cleanText(pick(row, ["nama"], "")),
        id_kabupaten: cleanText(
            pick(row, ["id_kabupaten", "kabupaten_id"], kabupatenNama),
        ),
        id_kecamatan: cleanText(
            pick(row, ["id_kecamatan", "kecamatan_id"], kecamatanNama),
        ),
        id_kelurahan: cleanText(
            pick(row, ["id_kelurahan", "kelurahan_id"], kelurahanNama),
        ),
        kabupaten_nama: kabupatenNama,
        kecamatan_nama: kecamatanNama,
        kelurahan_nama: kelurahanNama,
        lokasi,
        email: cleanText(
            pick(row, ["email", "email_akun", "email_user"], "-"),
            "-",
        ),
        nomor_telepon: cleanText(
            pick(
                row,
                ["nomor_telepon", "nomor_tlp", "no_hp", "telepon", "phone"],
                "-",
            ),
            "-",
        ),
        status: normalizeAccountStatus(
            pick(
                row,
                ["status", "status_akun", "is_active", "active"],
                "aktif",
            ),
        ),
    };
}

function uniqueOptions(rows, valueKey, labelKey) {
    const map = new Map();

    rows.forEach((row) => {
        const label = cleanText(row[labelKey]);
        const value = cleanText(row[valueKey], label);

        if (!label || label === "-") return;
        if (!map.has(String(value))) {
            map.set(String(value), { value, label });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label)),
    );
}

function toOptionRows(rows, valueKeys, labelKeys, extraMapper = null) {
    const map = new Map();

    (rows || []).forEach((row) => {
        const value = cleanText(pick(row, valueKeys, ""));
        const label = cleanText(pick(row, labelKeys, ""));

        if (!value || !label || label === "-") return;
        if (map.has(String(value))) return;

        const base = { value, label };
        map.set(
            String(value),
            extraMapper ? { ...base, ...extraMapper(row) } : base,
        );
    });

    return Array.from(map.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label)),
    );
}

function formatLocation(row) {
    const kelurahan = cleanText(row?.kelurahan_nama);
    const kecamatan = cleanText(row?.kecamatan_nama);
    const kabupaten = cleanText(row?.kabupaten_nama);

    if (kelurahan && kecamatan && kabupaten) {
        return `${kelurahan}, ${kecamatan}, ${kabupaten}`;
    }
    if (kecamatan && kabupaten) return `${kecamatan}, ${kabupaten}`;
    if (kelurahan) return kelurahan;
    if (kecamatan) return kecamatan;
    if (kabupaten) return kabupaten;

    return cleanText(row?.lokasi, "-");
}

function displayValue(value) {
    return cleanText(value, "-");
}

const HISTORY_MONTHS_ID = [
    "JANUARI",
    "FEBRUARI",
    "MARET",
    "APRIL",
    "MEI",
    "JUNI",
    "JULI",
    "AGUSTUS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DESEMBER",
];

function formatAccountHistoryDate(value) {
    const raw = String(value ?? "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return "-";

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) return "-";

    return `${day} ${HISTORY_MONTHS_ID[month - 1]} ${year}`;
}

function buildAccountHistory(row) {
    if (!row) return [];

    const events = [];
    const joinedAt = row.created_at || row.assigned_at;
    const posbankumName = row.posbankum_nama
        ? formatPosbankumName(row.posbankum_nama)
        : "Posbankum";

    if (joinedAt) {
        events.push({
            key: "joined",
            date: formatAccountHistoryDate(joinedAt),
            title: "Paralegal pertama kali bergabung",
            description: `Akun dibuat dan terdaftar pada ${posbankumName}.`,
        });
    }

    if (row.status_changed_at) {
        events.push({
            key: "status",
            date: formatAccountHistoryDate(row.status_changed_at),
            title:
                normalizeAccountStatus(row.status) === "aktif"
                    ? "Akun diaktifkan"
                    : "Akun dinonaktifkan",
            description: "",
        });
    }

    return events;
}

function KpDropdown({
    value,
    onChange,
    placeholder,
    options,
    disabled = false,
    withIcon = true,
    className = "",
    searchable = true,
    searchPlaceholder = "Cari...",
}) {
    const [open, setOpen] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");
    const wrapRef = useRef(null);

    const safeOptions = useMemo(() => options || [], [options]);

    const isEmptyValue = value === "" || value === null || value === undefined;
    const selectedLabel = !isEmptyValue
        ? safeOptions.find((item) => String(item.value) === String(value))
              ?.label || ""
        : "";

    const filteredOptions = useMemo(() => {
        const search = menuSearch.trim().toLowerCase();
        if (!search) return safeOptions;

        return safeOptions.filter((item) =>
            String(item?.label ?? "")
                .toLowerCase()
                .includes(search),
        );
    }, [safeOptions, menuSearch]);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    useEffect(() => {
        if (!open) setMenuSearch("");
    }, [open]);

    useEffect(() => {
        const onPointerDown = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };

        const onKeyDown = (e) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    return (
        <div
            className={`kpDropdown ${className} ${disabled ? "is-disabled" : ""} ${
                open ? "is-open" : ""
            }`}
            ref={wrapRef}
        >
            <button
                type="button"
                className="kpDropdownBtn"
                onClick={() => !disabled && setOpen((prev) => !prev)}
                disabled={disabled}
                aria-expanded={open}
            >
                {withIcon ? <FiFilter className="kpDropdownIcon" /> : null}
                <span
                    className={`kpDropdownText ${
                        selectedLabel ? "" : "is-placeholder"
                    }`}
                >
                    {selectedLabel || placeholder}
                </span>
                <FiChevronDown
                    className={`kpDropdownChevron ${open ? "is-open" : ""}`}
                />
            </button>

            {open && !disabled ? (
                <div className="kpDropdownMenu" role="listbox">
                    {searchable ? (
                        <div className="kpDropdownSearchBox">
                            <FiSearch className="kpDropdownSearchIcon" />
                            <input
                                className="kpDropdownSearchInput"
                                name={`dropdown_search_${String(
                                    placeholder || "pilihan",
                                )
                                    .replace(/\s+/g, "_")
                                    .toLowerCase()}`}
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                autoFocus
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                            {menuSearch ? (
                                <button
                                    type="button"
                                    className="kpDropdownSearchClear"
                                    onClick={() => setMenuSearch("")}
                                    aria-label="Bersihkan pencarian dropdown"
                                >
                                    <FiX />
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="kpDropdownList">
                        {filteredOptions.length ? (
                            filteredOptions.map((opt) => {
                                const isActive =
                                    String(opt.value) === String(value);

                                return (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        className={`kpDropdownItem ${
                                            isActive ? "is-active" : ""
                                        }`}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                        {isActive ? (
                                            <FiCheck className="kpDropdownCheck" />
                                        ) : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="kpDropdownEmpty">
                                {menuSearch
                                    ? "Data tidak ditemukan"
                                    : "Data belum tersedia"}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function ManajemenAkun({
    rows = EMPTY_LIST,
    paralegalRows = EMPTY_LIST,
    posbankumRows = EMPTY_LIST,
    kabupatenRows = EMPTY_LIST,
    kecamatanRows = EMPTY_LIST,
    kelurahanRows = EMPTY_LIST,
    posbankumMasterRows = EMPTY_LIST,
}) {
    const normalizedSourceRows = useMemo(() => {
        const sourceRows = paralegalRows.length ? paralegalRows : rows;

        return sourceRows.map((row, index) => normalizeRow(row, index));
    }, [rows, paralegalRows]);

    const masterKabupatenOpts = useMemo(
        () =>
            toOptionRows(
                kabupatenRows,
                ["id_kabupaten", "value", "id"],
                ["nama", "label", "kabupaten_nama", "name"],
            ),
        [kabupatenRows],
    );

    const masterKecamatanOpts = useMemo(
        () =>
            toOptionRows(
                kecamatanRows,
                ["id_kecamatan", "value", "id"],
                ["nama", "label", "kecamatan_nama", "name"],
                (row) => ({
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ),
        [kecamatanRows],
    );

    const masterKelurahanOpts = useMemo(
        () =>
            toOptionRows(
                kelurahanRows,
                ["id_kelurahan", "value", "id"],
                ["nama", "label", "kelurahan_nama", "name"],
                (row) => ({
                    id_kecamatan: cleanText(
                        pick(row, ["id_kecamatan", "kecamatan_id"], ""),
                    ),
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ),
        [kelurahanRows],
    );

    const masterPosbankumOpts = useMemo(
        () =>
            toOptionRows(
                posbankumMasterRows.length
                    ? posbankumMasterRows
                    : posbankumRows,
                ["id_posbankum", "posbankum_id", "value", "id"],
                ["nama", "label", "posbankum_nama", "name"],
                (row) => ({
                    id_kelurahan: cleanText(
                        pick(row, ["id_kelurahan", "kelurahan_id"], ""),
                    ),
                    id_kecamatan: cleanText(
                        pick(row, ["id_kecamatan", "kecamatan_id"], ""),
                    ),
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ).map((item) => ({
                ...item,
                label: formatPosbankumName(item.label),
            })),
        [posbankumMasterRows, posbankumRows],
    );

    const [localRows, setLocalRows] = useState(normalizedSourceRows);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");

    const [kabupatenId, setKabupatenId] = useState("");
    const [kecamatanId, setKecamatanId] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [page, setPage] = useState(1);
    const [err, setErr] = useState("");

    const [pageMode, setPageMode] = useState("list");
    const [mode, setMode] = useState("add");
    const [editingId, setEditingId] = useState(null);
    const [detailTarget, setDetailTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [statusError, setStatusError] = useState("");
    const [statusSuccessMessage, setStatusSuccessMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [rejectMessage, setRejectMessage] = useState("");

    const [tab, setTab] = useState("akun");
    const [pendaftar, setPendaftar] = useState(EMPTY_LIST);
    const [pendaftarInfo, setPendaftarInfo] = useState({
        memuat: true,
        pesan: "",
    });
    const [pagePendaftar, setPagePendaftar] = useState(1);
    const [pKabupaten, setPKabupaten] = useState("");
    const [pKecamatan, setPKecamatan] = useState("");
    const [urutPendaftar, ubahUrutPendaftar] = useSort(
        { key: "waktu", arah: "desc" },
        () => setPagePendaftar(1),
    );
    const [urutAkun, ubahUrutAkun] = useSort(null, () => setPage(1));
    const [, , akunPageSize, setAkunPageSize] = useViewMode("manajemen-akun");
    const [, , pendaftarPageSize, setPendaftarPageSize] = useViewMode(
        "manajemen-akun-pendaftar",
    );
    const [pendaftarAktif, setPendaftarAktif] = useState(null);
    const [tolakTarget, setTolakTarget] = useState(null);
    const [menolak, setMenolak] = useState(false);

    const [fNama, setFNama] = useState("");
    const [fEmail, setFEmail] = useState("");
    const [fTelepon, setFTelepon] = useState("");
    const [fKabupatenId, setFKabupatenId] = useState("");
    const [fKecamatanId, setFKecamatanId] = useState("");
    const [fKelurahanId, setFKelurahanId] = useState("");
    const [fPosbankumId, setFPosbankumId] = useState("");

    useEffect(() => {
        setLocalRows(normalizedSourceRows);
    }, [normalizedSourceRows]);

    const muatPendaftar = async () => {
        setPendaftarInfo({ memuat: true, pesan: "" });

        let json = null;

        try {
            const res = await fetch(PENDAFTAR_URL, {
                headers: { Accept: "application/json" },
            });
            json = await res.json();
        } catch {
            json = null;
        }

        if (json?.status && Array.isArray(json.data)) {
            setPendaftar(json.data);
            setPendaftarInfo({ memuat: false, pesan: "" });
            return;
        }

        setPendaftar(EMPTY_LIST);
        setPendaftarInfo({
            memuat: false,
            pesan: json?.message || "Gagal memuat pendaftar baru.",
        });
    };

    useEffect(() => {
        muatPendaftar();
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => window.clearTimeout(t);
    }, [q]);

    const kabupatenOpts = useMemo(() => {
        if (masterKabupatenOpts.length) return masterKabupatenOpts;
        return uniqueOptions(localRows, "id_kabupaten", "kabupaten_nama");
    }, [masterKabupatenOpts, localRows]);

    const kecamatanOpts = useMemo(() => {
        if (masterKecamatanOpts.length) {
            return masterKecamatanOpts.filter(
                (item) =>
                    !kabupatenId ||
                    String(item.id_kabupaten) === String(kabupatenId),
            );
        }

        const baseRows = kabupatenId
            ? localRows.filter(
                  (row) => String(row.id_kabupaten) === String(kabupatenId),
              )
            : localRows;

        return uniqueOptions(baseRows, "id_kecamatan", "kecamatan_nama");
    }, [masterKecamatanOpts, localRows, kabupatenId]);

    const fKecamatanOpts = useMemo(() => {
        if (masterKecamatanOpts.length) {
            return masterKecamatanOpts.filter(
                (item) =>
                    !fKabupatenId ||
                    String(item.id_kabupaten) === String(fKabupatenId),
            );
        }

        const baseRows = fKabupatenId
            ? localRows.filter(
                  (row) => String(row.id_kabupaten) === String(fKabupatenId),
              )
            : localRows;

        return uniqueOptions(baseRows, "id_kecamatan", "kecamatan_nama");
    }, [masterKecamatanOpts, localRows, fKabupatenId]);

    const fKelurahanOpts = useMemo(() => {
        if (masterKelurahanOpts.length) {
            return masterKelurahanOpts.filter((item) => {
                if (
                    fKabupatenId &&
                    item.id_kabupaten &&
                    String(item.id_kabupaten) !== String(fKabupatenId)
                ) {
                    return false;
                }

                if (
                    fKecamatanId &&
                    String(item.id_kecamatan) !== String(fKecamatanId)
                ) {
                    return false;
                }

                return true;
            });
        }

        const baseRows = localRows.filter((row) => {
            if (
                fKabupatenId &&
                String(row.id_kabupaten) !== String(fKabupatenId)
            ) {
                return false;
            }
            if (
                fKecamatanId &&
                String(row.id_kecamatan) !== String(fKecamatanId)
            ) {
                return false;
            }
            return true;
        });

        return uniqueOptions(baseRows, "id_kelurahan", "kelurahan_nama");
    }, [masterKelurahanOpts, localRows, fKabupatenId, fKecamatanId]);

    const fPosbankumOpts = useMemo(() => {
        if (masterPosbankumOpts.length) {
            return masterPosbankumOpts.filter((item) => {
                if (
                    fKabupatenId &&
                    item.id_kabupaten &&
                    String(item.id_kabupaten) !== String(fKabupatenId)
                ) {
                    return false;
                }

                if (
                    fKecamatanId &&
                    item.id_kecamatan &&
                    String(item.id_kecamatan) !== String(fKecamatanId)
                ) {
                    return false;
                }

                if (
                    fKelurahanId &&
                    item.id_kelurahan &&
                    String(item.id_kelurahan) !== String(fKelurahanId)
                ) {
                    return false;
                }

                return true;
            });
        }

        const map = new Map();

        localRows.forEach((row) => {
            if (
                fKabupatenId &&
                String(row.id_kabupaten) !== String(fKabupatenId)
            ) {
                return;
            }
            if (
                fKecamatanId &&
                String(row.id_kecamatan) !== String(fKecamatanId)
            ) {
                return;
            }
            if (
                fKelurahanId &&
                String(row.id_kelurahan) !== String(fKelurahanId)
            ) {
                return;
            }

            const value = cleanText(row.id_posbankum);
            const label = cleanText(row.posbankum_nama);

            if (!value || !label || label === "-") return;
            if (!map.has(String(value))) {
                map.set(String(value), {
                    value,
                    label: formatPosbankumName(label),
                });
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            String(a.label).localeCompare(String(b.label)),
        );
    }, [
        masterPosbankumOpts,
        localRows,
        fKabupatenId,
        fKecamatanId,
        fKelurahanId,
    ]);

    useEffect(() => {
        setKecamatanId("");
    }, [kabupatenId]);

    const selectedKelurahanOption = useMemo(
        () =>
            fKelurahanOpts.find(
                (item) => String(item.value) === String(fKelurahanId),
            ),
        [fKelurahanOpts, fKelurahanId],
    );

    const autoPosbankumOption = useMemo(() => {
        if (!fKelurahanId) return null;

        return (
            fPosbankumOpts.find(
                (item) => String(item.id_kelurahan) === String(fKelurahanId),
            ) ||
            fPosbankumOpts[0] ||
            null
        );
    }, [fPosbankumOpts, fKelurahanId]);

    const autoPosbankumLabel = useMemo(() => {
        if (autoPosbankumOption?.label) return autoPosbankumOption.label;
        if (selectedKelurahanOption?.label) {
            return formatPosbankumName(selectedKelurahanOption.label);
        }

        return "";
    }, [autoPosbankumOption, selectedKelurahanOption]);

    useEffect(() => {
        if (!fKelurahanId) {
            if (fPosbankumId) setFPosbankumId("");
            return;
        }

        const nextPosbankumId = autoPosbankumOption?.value || "";

        if (String(fPosbankumId || "") !== String(nextPosbankumId || "")) {
            setFPosbankumId(nextPosbankumId);
        }
    }, [autoPosbankumOption, fKelurahanId, fPosbankumId]);

    const filteredRows = useMemo(() => {
        const search = debouncedQ.toLowerCase();

        return localRows.filter((row) => {
            if (
                kabupatenId &&
                String(row.id_kabupaten) !== String(kabupatenId)
            ) {
                return false;
            }
            if (
                kecamatanId &&
                String(row.id_kecamatan) !== String(kecamatanId)
            ) {
                return false;
            }
            if (statusFilter && row.status !== statusFilter) {
                return false;
            }

            if (!search) return true;

            return [
                row.nama_lengkap,
                row.email,
                row.nomor_telepon,
                row.posbankum_nama,
                row.kabupaten_nama,
                row.kecamatan_nama,
                row.kelurahan_nama,
                row.lokasi,
                row.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [localRows, kabupatenId, kecamatanId, statusFilter, debouncedQ]);

    useEffect(() => {
        setPage(1);
        setPagePendaftar(1);
    }, [
        kabupatenId,
        kecamatanId,
        statusFilter,
        debouncedQ,
        pKabupaten,
        pKecamatan,
    ]);

    useEffect(() => {
        setPKecamatan("");
    }, [pKabupaten]);

    // Pendaftar hanya membawa nama wilayah (dari Sheet), jadi filternya
    // memakai nama, bukan ID seperti tab akun.
    const pKabupatenOpts = useMemo(
        () => opsiNama(pendaftar.map((item) => item.kabupaten)),
        [pendaftar],
    );

    const pKecamatanOpts = useMemo(
        () =>
            opsiNama(
                pendaftar
                    .filter((item) => item.kabupaten === pKabupaten)
                    .map((item) => item.kecamatan),
            ),
        [pendaftar, pKabupaten],
    );

    const filteredPendaftar = useMemo(() => {
        const search = debouncedQ.toLowerCase();

        const rows = pendaftar.filter((item) => {
            if (pKabupaten && item.kabupaten !== pKabupaten) return false;
            if (pKecamatan && item.kecamatan !== pKecamatan) return false;
            if (!search) return true;

            return [
                item.nama,
                item.email,
                item.telp,
                item.no_registrasi,
                item.kelurahan,
                item.kecamatan,
                item.kabupaten,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });

        return sortItems(rows, urutPendaftar, NILAI_URUT_PENDAFTAR);
    }, [pendaftar, debouncedQ, pKabupaten, pKecamatan, urutPendaftar]);

    const totalPagesPendaftar = Math.max(
        1,
        Math.ceil(filteredPendaftar.length / pendaftarPageSize),
    );
    const safePagePendaftar = Math.min(pagePendaftar, totalPagesPendaftar);
    const pagePendaftarRows = filteredPendaftar.slice(
        (safePagePendaftar - 1) * pendaftarPageSize,
        safePagePendaftar * pendaftarPageSize,
    );

    const accountStats = useMemo(() => {
        const active = filteredRows.filter(
            (row) => row.status === "aktif",
        ).length;
        const inactive = filteredRows.length - active;

        return {
            total: filteredRows.length,
            active,
            inactive,
        };
    }, [filteredRows]);

    const total = filteredRows.length;
    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(total / akunPageSize)),
        [total, akunPageSize],
    );

    const safePage = Math.min(page, totalPages);
    const sortedRows = useMemo(
        () => sortItems(filteredRows, urutAkun, NILAI_URUT_AKUN),
        [filteredRows, urutAkun],
    );
    const pageRows = sortedRows.slice(
        (safePage - 1) * akunPageSize,
        safePage * akunPageSize,
    );

    const resetForm = () => {
        setFNama("");
        setFEmail("");
        setFTelepon("");
        setFKabupatenId("");
        setFKecamatanId("");
        setFKelurahanId("");
        setFPosbankumId("");
        setPendaftarAktif(null);
    };

    const showError = (message) => {
        setErr(message);
        setRejectMessage(message);
    };

    const refreshRows = () => {
        router.reload({
            only: [
                "accountRows",
                "rows",
                "paralegalRows",
                "posbankumMasterRows",
                "posbankumRows",
            ],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const openTambah = () => {
        setErr("");
        setRejectMessage("");
        setMode("add");
        setEditingId(null);
        setDetailTarget(null);
        resetForm();
        setPageMode("add");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openSetujui = (item) => {
        const idKabupaten = cariWilayah(masterKabupatenOpts, item.kabupaten);
        const idKecamatan = idKabupaten
            ? cariWilayah(
                  masterKecamatanOpts,
                  item.kecamatan,
                  (opt) => String(opt.id_kabupaten) === idKabupaten,
              )
            : "";
        const idKelurahan = idKecamatan
            ? cariWilayah(
                  masterKelurahanOpts,
                  item.kelurahan,
                  (opt) => String(opt.id_kecamatan) === idKecamatan,
              )
            : "";

        setErr("");
        setRejectMessage("");
        setMode("add");
        setEditingId(null);
        setDetailTarget(null);

        setFNama(item.nama ?? "");
        setFEmail(item.email ?? "");
        setFTelepon(sanitizePhoneInput(item.telp));
        setFKabupatenId(idKabupaten);
        setFKecamatanId(idKecamatan);
        setFKelurahanId(idKelurahan);
        setFPosbankumId("");
        setPendaftarAktif(item);

        setPageMode("add");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const confirmTolak = () => {
        if (!tolakTarget || menolak) return;

        const noRegistrasi = tolakTarget.no_registrasi;

        router.post(
            `${PENDAFTAR_URL}/${encodeURIComponent(noRegistrasi)}/tolak`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setMenolak(true),
                onSuccess: () => {
                    setPendaftar((prev) =>
                        prev.filter(
                            (item) => item.no_registrasi !== noRegistrasi,
                        ),
                    );
                    setSuccessMessage("Pendaftar ditolak.");
                },
                onError: (errors) => showError(getFirstError(errors)),
                onFinish: () => {
                    setMenolak(false);
                    setTolakTarget(null);
                },
            },
        );
    };

    const openDetail = (row) => {
        setErr("");
        setRejectMessage("");
        setDetailTarget(row);
        setPageMode("detail");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openEdit = (row) => {
        setErr("");
        setRejectMessage("");
        setMode("edit");
        setEditingId(row.id_user);
        setDetailTarget(null);

        setFNama(row.nama_lengkap ?? "");
        setFEmail(row.email === "-" ? "" : (row.email ?? ""));
        setFTelepon(row.nomor_telepon === "-" ? "" : (row.nomor_telepon ?? ""));
        setFKabupatenId(row.id_kabupaten ?? "");
        setFKecamatanId(row.id_kecamatan ?? "");
        setFKelurahanId(row.id_kelurahan ?? "");
        setFPosbankumId(row.id_posbankum ?? "");

        setPageMode("edit");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const backToList = () => {
        if (saving) return;
        setErr("");
        setRejectMessage("");
        resetForm();
        setEditingId(null);
        setDetailTarget(null);
        setPageMode("list");
    };

    const handleKabupatenFormChange = (value) => {
        setFKabupatenId(value);
        setFKecamatanId("");
        setFKelurahanId("");
        setFPosbankumId("");
    };

    const handleKecamatanFormChange = (value) => {
        setFKecamatanId(value);
        setFKelurahanId("");
        setFPosbankumId("");
    };

    const handleKelurahanFormChange = (value) => {
        setFKelurahanId(value);

        const nextPosbankum = fPosbankumOpts.find(
            (item) => String(item.id_kelurahan) === String(value),
        );
        setFPosbankumId(nextPosbankum?.value || "");
    };

    const onSimpan = () => {
        if (saving) return;
        setErr("");
        setRejectMessage("");

        const namaParalegal = fNama.trim();
        const emailParalegal = fEmail.trim();
        const nomorTelepon = sanitizePhoneInput(fTelepon);

        if (!namaParalegal) return showError("Nama paralegal wajib diisi.");
        if (namaParalegal.length < 3) {
            return showError("Nama paralegal minimal 3 karakter.");
        }
        if (!emailParalegal) return showError("Email wajib diisi.");
        if (!isValidEmail(emailParalegal)) {
            return showError("Format email tidak valid.");
        }
        if (!isValidOptionalPhone(nomorTelepon)) {
            return showError(
                "Nomor telepon hanya boleh berisi angka, minimal 8 digit dan maksimal 15 digit.",
            );
        }
        if (!fKabupatenId) return showError("Kabupaten wajib dipilih.");
        if (!fKecamatanId) return showError("Kecamatan wajib dipilih.");
        if (!fKelurahanId) return showError("Kelurahan wajib dipilih.");

        const payload = {
            nama_lengkap: namaParalegal,
            email: emailParalegal,
            nomor_telepon: nomorTelepon || "",
            id_kabupaten: fKabupatenId,
            id_kecamatan: fKecamatanId,
            id_kelurahan: fKelurahanId,
            id_posbankum: fPosbankumId,
        };

        const noRegistrasi =
            mode === "add" ? pendaftarAktif?.no_registrasi : null;

        if (noRegistrasi) payload.no_registrasi = noRegistrasi;

        const url =
            mode === "add"
                ? "/admin/manajemen-akun/paralegal"
                : `/admin/manajemen-akun/paralegal/${editingId}`;

        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onSuccess: () => {
                setSuccessMessage(
                    mode === "add"
                        ? "Data paralegal berhasil disimpan."
                        : "Data paralegal berhasil diperbarui.",
                );
                setErr("");
                if (noRegistrasi) {
                    setPendaftar((prev) =>
                        prev.filter(
                            (item) => item.no_registrasi !== noRegistrasi,
                        ),
                    );
                }
                resetForm();
                setEditingId(null);
                setDetailTarget(null);
                setPageMode("list");
                refreshRows();
            },
            onError: (errors) => {
                const message = getFirstError(errors);
                showError(message);
            },
            onFinish: () => setSaving(false),
        };

        if (mode === "add") {
            router.post(url, payload, options);
        } else {
            router.put(url, payload, options);
        }
    };

    const onHapus = (row) => {
        setErr("");
        setRejectMessage("");
        setDeleteTarget(row);
    };

    const confirmHapus = () => {
        if (!deleteTarget || deleting) return;

        setErr("");
        setRejectMessage("");

        router.delete(
            `/admin/manajemen-akun/paralegal/${deleteTarget.id_user}`,
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setDeleting(true),
                onSuccess: () => {
                    setSuccessMessage("Akun paralegal berhasil dihapus.");
                    setLocalRows((prev) =>
                        prev.filter(
                            (row) =>
                                String(row.id_user) !==
                                String(deleteTarget.id_user),
                        ),
                    );
                    setDeleteTarget(null);
                    refreshRows();
                },
                onError: (errors) => {
                    const message = getFirstError(
                        errors,
                        "Gagal menghapus akun paralegal.",
                    );
                    showError(message);
                },
                onFinish: () => setDeleting(false),
            },
        );
    };

    const openStatusConfirm = (row) => {
        if (!row?.id_user || statusUpdating) return;

        setStatusError("");
        setRejectMessage("");
        setStatusTarget({
            row,
            nextStatus: row.status === "aktif" ? "nonaktif" : "aktif",
        });
    };

    const closeStatusConfirm = () => {
        if (statusUpdating) return;
        setStatusTarget(null);
        setStatusError("");
    };

    const confirmStatusChange = () => {
        const target = statusTarget?.row;
        const nextStatus = statusTarget?.nextStatus;

        if (
            !target?.id_user ||
            !["aktif", "nonaktif"].includes(nextStatus) ||
            statusUpdating
        ) {
            return;
        }

        setStatusUpdating(true);
        setStatusError("");
        setRejectMessage("");

        router.patch(
            `/admin/manajemen-akun/paralegal/${target.id_user}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setLocalRows((prev) =>
                        prev.map((row) =>
                            String(row.id_user) === String(target.id_user)
                                ? { ...row, status: nextStatus }
                                : row,
                        ),
                    );
                    setStatusTarget(null);
                    setStatusError("");
                    setStatusSuccessMessage(
                        nextStatus === "aktif"
                            ? "Paralegal berhasil diaktifkan!"
                            : "Paralegal berhasil dinonaktifkan!",
                    );
                },
                onError: (errors) => {
                    const message = getFirstError(
                        errors,
                        nextStatus === "aktif"
                            ? "Gagal mengaktifkan akun paralegal."
                            : "Gagal menonaktifkan akun paralegal.",
                    );
                    setStatusError(message);
                    setRejectMessage(message);
                },
                onFinish: () => setStatusUpdating(false),
            },
        );
    };

    const formTitle =
        mode !== "add"
            ? "Edit Paralegal"
            : pendaftarAktif
              ? "Setujui Pendaftar"
              : "Tambah Paralegal";
    const formCrumb = formTitle;

    const renderBreadcrumb = (current) => (
        <div className="kpBreadcrumb" aria-label="Breadcrumb">
            <button
                type="button"
                onClick={backToList}
                className="kpBreadcrumbLink"
            >
                Manajemen Akun
            </button>
            <span className="kpBreadcrumbDivider">›</span>
            <span className="kpBreadcrumbCurrent">{current}</span>
        </div>
    );

    const renderPageTitle = ({ current, title, action }) => (
        <div className="kpPageTop">
            <div className="kpPageTitleSide">
                {renderBreadcrumb(current)}
                <h1 className="kpPageTitle">{title}</h1>
                <span className="kpTitleUnderline" />
            </div>
            {action ? <div className="kpPageActions">{action}</div> : null}
        </div>
    );

    const renderFormPage = () => (
        <div className="kpFormPage">
            {renderPageTitle({
                current: formCrumb,
                title: formTitle,
                action: (
                    <>
                        <button
                            className="kpPageBtnGhost"
                            type="button"
                            onClick={backToList}
                            disabled={saving}
                        >
                            Batal
                        </button>
                        <button
                            className="kpPageBtnPrimary kpSaveBtn"
                            type="button"
                            onClick={onSimpan}
                            disabled={saving}
                        >
                            {saving
                                ? "Menyimpan..."
                                : mode === "edit"
                                  ? "Simpan Perubahan"
                                  : "Simpan"}
                        </button>
                    </>
                ),
            })}

            <div className="kpFormCard">
                <div className="kpFormPageHead">
                    <h2 className="kpFormPageTitle">Informasi Paralegal</h2>
                </div>

                <div className="kpFormPageBody">
                    {pendaftarAktif && mode === "add" ? (
                        <p className="kpPendaftarNote">
                            Data dari pendaftaran{" "}
                            <strong>{pendaftarAktif.no_registrasi}</strong>.
                            Domisili di formulir:{" "}
                            {[
                                pendaftarAktif.kelurahan,
                                pendaftarAktif.kecamatan,
                                pendaftarAktif.kabupaten,
                            ]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            .
                            {fKelurahanId
                                ? " Periksa kembali sebelum menyimpan."
                                : " Wilayah belum cocok otomatis, pilih secara manual."}
                        </p>
                    ) : null}

                    <div className="kpGrid2 kpGridFormRow">
                        <div className="kpFormGroup">
                            <label className="kpLabel" htmlFor="nama-paralegal">
                                Nama Paralegal
                            </label>
                            <input
                                id="nama-paralegal"
                                name="paralegal_nama_lengkap_input"
                                className="kpInput"
                                placeholder="Masukkan nama paralegal"
                                value={fNama}
                                onChange={(e) => setFNama(e.target.value)}
                                maxLength={255}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label
                                className="kpLabel"
                                htmlFor="email-paralegal"
                            >
                                Email
                            </label>
                            <input
                                id="email-paralegal"
                                name="paralegal_email_input"
                                type="email"
                                className="kpInput"
                                placeholder="contoh@gmail.com"
                                value={fEmail}
                                onChange={(e) => setFEmail(e.target.value)}
                                maxLength={255}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <div className="kpGrid2 kpGridFormRow">
                        <div className="kpFormGroup">
                            <label
                                className="kpLabel"
                                htmlFor="telepon-paralegal"
                            >
                                Nomor Telepon (Opsional)
                            </label>
                            <input
                                id="telepon-paralegal"
                                name="paralegal_nomor_telepon_input"
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={15}
                                className="kpInput"
                                placeholder="Masukkan nomor telepon"
                                value={fTelepon}
                                onChange={(e) =>
                                    setFTelepon(
                                        sanitizePhoneInput(e.target.value),
                                    )
                                }
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label className="kpLabel">Kabupaten</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKabupatenId}
                                onChange={handleKabupatenFormChange}
                                placeholder="Pilih Kabupaten"
                                withIcon={false}
                                options={kabupatenOpts}
                            />
                        </div>
                    </div>

                    <div className="kpGrid2 kpGridFormRow">
                        <div className="kpFormGroup">
                            <label className="kpLabel">Kecamatan</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKecamatanId}
                                onChange={handleKecamatanFormChange}
                                placeholder="Pilih Kecamatan"
                                disabled={!fKabupatenId}
                                withIcon={false}
                                options={fKecamatanOpts}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label className="kpLabel">Kelurahan</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKelurahanId}
                                onChange={handleKelurahanFormChange}
                                placeholder="Pilih Kelurahan"
                                disabled={
                                    !fKecamatanId || !fKelurahanOpts.length
                                }
                                withIcon={false}
                                options={fKelurahanOpts}
                            />
                        </div>
                    </div>

                    <div className="kpFormGroup kpFormGroupFull">
                        <label className="kpLabel">Posbankum</label>
                        <input
                            className="kpInput kpInputReadonly"
                            name="posbankum_display_readonly_input"
                            value={autoPosbankumLabel}
                            placeholder="Mengikuti Kelurahan"
                            readOnly
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDetailPage = () => {
        if (!detailTarget) return null;

        const detailStatus = normalizeAccountStatus(detailTarget.status);
        const accountHistory = buildAccountHistory(detailTarget);

        return (
            <div className="kpDetailPage">
                {renderPageTitle({
                    current: "Detail Paralegal",
                    title: "Detail Paralegal",
                    action: (
                        <button
                            className="kpPageBtnPrimary kpDetailBackBtn"
                            type="button"
                            onClick={backToList}
                        >
                            Kembali ke Daftar
                        </button>
                    ),
                })}

                <div className="kpDetailInfoGrid">
                    <article className="kpDetailInfoCard">
                        <div className="kpDetailInfoHead">
                            <h2>Informasi Paralegal</h2>
                        </div>

                        <div className="kpDetailInfoBody">
                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">
                                    NAMA LENGKAP
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {displayValue(detailTarget.nama_lengkap)}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">EMAIL</span>
                                <strong className="kpDetailInfoValue">
                                    {displayValue(detailTarget.email)}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">
                                    NOMOR TELEPON
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {formatPhoneDisplay(
                                        detailTarget.nomor_telepon,
                                    )}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow is-last">
                                <span className="kpDetailInfoLabel">
                                    STATUS AKUN
                                </span>
                                <div className="kpDetailStatusWrap">
                                    <span
                                        className={`kpStatusBadge ${
                                            detailStatus === "aktif"
                                                ? "is-active"
                                                : "is-inactive"
                                        }`}
                                    >
                                        <span
                                            className="kpStatusDot"
                                            aria-hidden="true"
                                        />
                                        {detailStatus === "aktif"
                                            ? "Aktif"
                                            : "Nonaktif"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="kpDetailInfoCard">
                        <div className="kpDetailInfoHead">
                            <h2>Informasi Posbankum</h2>
                        </div>

                        <div className="kpDetailInfoBody">
                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">
                                    NAMA POSBANKUM
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {detailTarget.posbankum_nama
                                        ? formatPosbankumName(
                                              detailTarget.posbankum_nama,
                                          )
                                        : "-"}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">
                                    KELURAHAN/DESA
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {displayValue(detailTarget.kelurahan_nama)}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow">
                                <span className="kpDetailInfoLabel">
                                    KECAMATAN
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {displayValue(detailTarget.kecamatan_nama)}
                                </strong>
                            </div>

                            <div className="kpDetailInfoRow is-last">
                                <span className="kpDetailInfoLabel">
                                    KABUPATEN/KOTA
                                </span>
                                <strong className="kpDetailInfoValue">
                                    {displayValue(detailTarget.kabupaten_nama)}
                                </strong>
                            </div>
                        </div>
                    </article>
                </div>

                <article className="kpAccountHistoryCard">
                    <div className="kpAccountHistoryHead">
                        <FiClock aria-hidden="true" />
                        <h2>Riwayat Akun</h2>
                    </div>

                    <div className="kpAccountHistoryBody">
                        {accountHistory.length ? (
                            <div className="kpAccountTimeline">
                                {accountHistory.map((item) => (
                                    <div
                                        className="kpAccountTimelineItem"
                                        key={item.key}
                                    >
                                        <span
                                            className="kpAccountTimelineDot"
                                            aria-hidden="true"
                                        />
                                        <span className="kpAccountTimelineDate">
                                            {item.date}
                                        </span>
                                        <strong className="kpAccountTimelineTitle">
                                            {item.title}
                                        </strong>
                                        {item.description ? (
                                            <p className="kpAccountTimelineDescription">
                                                {item.description}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="kpAccountHistoryEmpty">
                                Riwayat akun belum tersedia.
                            </p>
                        )}
                    </div>
                </article>
            </div>
        );
    };

    const renderPager = (aktif, jumlah, ubah) =>
        jumlah > 1 ? (
            <div className="kpPager">
                <button
                    className="kpNavBtn"
                    type="button"
                    onClick={() => ubah(Math.max(1, aktif - 1))}
                    disabled={aktif <= 1}
                    aria-label="Halaman sebelumnya"
                >
                    <FiChevronLeft />
                </button>

                {getPaginationItems(aktif, jumlah).map((item, index) =>
                    item === "ellipsis" ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="kpPageBtn kpPageEllipsis"
                            aria-hidden="true"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            className={`kpPageBtn ${
                                aktif === item ? "is-active" : ""
                            }`}
                            type="button"
                            onClick={() => ubah(item)}
                            aria-current={aktif === item ? "page" : undefined}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    className="kpNavBtn"
                    type="button"
                    onClick={() => ubah(Math.min(jumlah, aktif + 1))}
                    disabled={aktif >= jumlah}
                    aria-label="Halaman berikutnya"
                >
                    <FiChevronRight />
                </button>
            </div>
        ) : null;

    const renderListPage = () => (
        <>
            <div
                className="kpAccountStats"
                aria-label="Ringkasan akun paralegal"
            >
                <article className="kpAccountStatCard is-total">
                    <div className="kpAccountStatIcon" aria-hidden="true">
                        <FiUsers />
                    </div>
                    <div className="kpAccountStatContent">
                        <span>Total Paralegal</span>
                        <strong>{accountStats.total}</strong>
                        <small>Seluruh akun paralegal terdaftar</small>
                    </div>
                </article>

                <article className="kpAccountStatCard is-inactive">
                    <div className="kpAccountStatIcon" aria-hidden="true">
                        <FiUserX />
                    </div>
                    <div className="kpAccountStatContent">
                        <span>Nonaktif</span>
                        <strong>{accountStats.inactive}</strong>
                        <small>Akun yang sedang tidak aktif</small>
                    </div>
                </article>

                <article className="kpAccountStatCard is-active">
                    <div className="kpAccountStatIcon" aria-hidden="true">
                        <FiUserCheck />
                    </div>
                    <div className="kpAccountStatContent">
                        <span>Aktif</span>
                        <strong>{accountStats.active}</strong>
                        <small>Akun yang dapat mengakses sistem</small>
                    </div>
                </article>
            </div>

            <div className="kpPanel">
                <div className="kpToolbar kpToolbarInline">
                    <div className="kpSearch">
                        <FiSearch className="kpSearchIco" />
                        <input
                            className="kpSearchInput"
                            name="manajemen_akun_search_input"
                            placeholder="Pencarian..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                        {q ? (
                            <button
                                className="kpClear"
                                type="button"
                                onClick={() => setQ("")}
                                aria-label="Bersihkan pencarian"
                            >
                                <FiX />
                            </button>
                        ) : null}
                    </div>

                    <div className="kpFilters kpFiltersInline">
                        <KpDropdown
                            className="kpFilterDropdown"
                            value={kabupatenId}
                            onChange={setKabupatenId}
                            placeholder="Pilih Kabupaten"
                            options={[
                                { value: "", label: "Semua" },
                                ...kabupatenOpts,
                            ]}
                        />

                        <KpDropdown
                            className="kpFilterDropdown"
                            value={kecamatanId}
                            onChange={setKecamatanId}
                            placeholder="Pilih Kecamatan"
                            disabled={!kabupatenId}
                            options={[
                                { value: "", label: "Semua" },
                                ...kecamatanOpts,
                            ]}
                        />

                        <KpDropdown
                            className="kpFilterDropdown kpStatusFilterDropdown"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="Semua Status"
                            searchable={false}
                            options={[
                                { value: "", label: "Semua Status" },
                                { value: "aktif", label: "Aktif" },
                                { value: "nonaktif", label: "Nonaktif" },
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="vt-bar">
                <div className="vt-count">
                    Menampilkan{" "}
                    <strong>{rangeLabel(safePage, akunPageSize, total)}</strong>{" "}
                    dari <strong>{total}</strong> akun
                </div>
                <div className="vt-controls">
                    <RowsSelect
                        value={akunPageSize}
                        onChange={(n) => {
                            setAkunPageSize(n);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="kpTableCard">
                <table className="kpTable">
                    <thead>
                        <tr>
                            {[
                                ["nama", "Nama Paralegal"],
                                ["email", "Email"],
                                [null, "No. Telepon"],
                                ["posbankum", "Posbankum"],
                                ["status", "Status"],
                            ].map(([key, label]) => (
                                <SortTh
                                    key={label}
                                    k={key}
                                    urut={urutAkun}
                                    onSort={ubahUrutAkun}
                                >
                                    {label}
                                </SortTh>
                            ))}
                            <th className="kpActionHead">Aksi</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pageRows.length ? (
                            pageRows.map((r) => (
                                <tr key={r.id_user}>
                                    <td data-label="Nama Paralegal">
                                        <span className="kpNameCell">
                                            {r.nama_lengkap}
                                        </span>
                                    </td>
                                    <td data-label="Email">
                                        <span className="kpTextCell">
                                            {r.email ?? "-"}
                                        </span>
                                    </td>
                                    <td data-label="No. Telepon">
                                        <span className="kpTextCell">
                                            {formatPhoneDisplay(
                                                r.nomor_telepon,
                                            )}
                                        </span>
                                    </td>
                                    <td data-label="Posbankum">
                                        <span className="kpTextCell">
                                            {r.posbankum_nama
                                                ? formatPosbankumName(
                                                      r.posbankum_nama,
                                                  )
                                                : "-"}
                                        </span>
                                    </td>
                                    <td data-label="Status">
                                        <span
                                            className={`kpStatusBadge ${
                                                r.status === "aktif"
                                                    ? "is-active"
                                                    : "is-inactive"
                                            }`}
                                        >
                                            <span
                                                className="kpStatusDot"
                                                aria-hidden="true"
                                            />
                                            {r.status === "aktif"
                                                ? "Aktif"
                                                : "Nonaktif"}
                                        </span>
                                    </td>
                                    <td data-label="Aksi">
                                        <div className="kpActions">
                                            <button
                                                className="kpIcoBtn is-view"
                                                type="button"
                                                onClick={() => openDetail(r)}
                                                aria-label="Detail"
                                                title="Detail"
                                            >
                                                <FiEye />
                                            </button>
                                            <button
                                                className="kpIcoBtn is-edit"
                                                type="button"
                                                onClick={() => openEdit(r)}
                                                aria-label="Edit"
                                                title="Edit"
                                            >
                                                <FiEdit2 />
                                            </button>

                                            <button
                                                className={`kpIcoBtn is-status ${
                                                    r.status === "aktif"
                                                        ? "is-disable"
                                                        : "is-enable"
                                                }`}
                                                type="button"
                                                onClick={() =>
                                                    openStatusConfirm(r)
                                                }
                                                disabled={statusUpdating}
                                                aria-label={
                                                    r.status === "aktif"
                                                        ? "Nonaktifkan akun"
                                                        : "Aktifkan akun"
                                                }
                                                title={
                                                    r.status === "aktif"
                                                        ? "Nonaktifkan akun"
                                                        : "Aktifkan akun"
                                                }
                                            >
                                                <GrPowerShutdown />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="kpEmptyCell">
                                    <div className="kpEmptyState">
                                        <div
                                            className="kpEmptyIcon"
                                            aria-hidden="true"
                                        >
                                            <img src={posbankumIcon} alt="" />
                                        </div>
                                        <h2>Tidak Ada Akun Ditemukan</h2>
                                        <p>
                                            Tidak ada akun paralegal yang sesuai
                                            dengan pencarian atau filter yang
                                            dipilih.
                                        </p>
                                        <button
                                            className="kpEmptyBtn"
                                            type="button"
                                            onClick={() => {
                                                setQ("");
                                                setKabupatenId("");
                                                setKecamatanId("");
                                                setStatusFilter("");
                                                setPage(1);
                                            }}
                                        >
                                            Reset Filter
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {renderPager(safePage, totalPages, setPage)}
            </div>
        </>
    );

    const renderTabs = () => (
        <div className="kpTabs" role="tablist" aria-label="Jenis data akun">
            <button
                className={`kpTab ${tab === "akun" ? "is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={tab === "akun"}
                onClick={() => setTab("akun")}
            >
                Akun Paralegal
            </button>
            <button
                className={`kpTab ${tab === "pendaftar" ? "is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={tab === "pendaftar"}
                onClick={() => setTab("pendaftar")}
            >
                Pendaftar Baru
                {pendaftar.length ? (
                    <span className="kpTabCount">{pendaftar.length}</span>
                ) : null}
            </button>
        </div>
    );

    const renderPendaftarPage = () => (
        <>
            <div className="kpPanel">
                <div className="kpToolbar kpToolbarInline">
                    <div className="kpSearch">
                        <FiSearch className="kpSearchIco" />
                        <input
                            className="kpSearchInput"
                            name="pendaftar_search_input"
                            placeholder="Cari pendaftar..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                        {q ? (
                            <button
                                className="kpClear"
                                type="button"
                                onClick={() => setQ("")}
                                aria-label="Bersihkan pencarian"
                            >
                                <FiX />
                            </button>
                        ) : null}
                    </div>

                    <div className="kpFilters kpFiltersInline">
                        <KpDropdown
                            className="kpFilterDropdown"
                            value={pKabupaten}
                            onChange={setPKabupaten}
                            placeholder="Pilih Kabupaten"
                            options={[
                                { value: "", label: "Semua" },
                                ...pKabupatenOpts,
                            ]}
                        />

                        <KpDropdown
                            className="kpFilterDropdown"
                            value={pKecamatan}
                            onChange={setPKecamatan}
                            placeholder="Pilih Kecamatan"
                            disabled={!pKabupaten}
                            options={[
                                { value: "", label: "Semua" },
                                ...pKecamatanOpts,
                            ]}
                        />
                    </div>
                </div>

                <p className="kpPendaftarHint">
                    Pendaftar dari formulir pendaftaran paralegal yang belum
                    memiliki akun. Menyetujui akan membuat akun paralegal.
                </p>
            </div>

            {pendaftarInfo.pesan ? (
                <div className="kpError" role="alert">
                    {pendaftarInfo.pesan}
                </div>
            ) : null}

            <div className="vt-bar">
                <div className="vt-count">
                    Menampilkan{" "}
                    <strong>
                        {rangeLabel(
                            safePagePendaftar,
                            pendaftarPageSize,
                            filteredPendaftar.length,
                        )}
                    </strong>{" "}
                    dari <strong>{filteredPendaftar.length}</strong> pendaftar
                </div>
                <div className="vt-controls">
                    <RowsSelect
                        value={pendaftarPageSize}
                        onChange={(n) => {
                            setPendaftarPageSize(n);
                            setPagePendaftar(1);
                        }}
                    />
                    <button
                        className="kpPageBtnGhost kpPendaftarReload"
                        type="button"
                        aria-label="Muat ulang daftar pendaftar"
                        onClick={muatPendaftar}
                        disabled={pendaftarInfo.memuat}
                    >
                        <FiRefreshCw aria-hidden="true" />
                        <span>
                            {pendaftarInfo.memuat ? "Memuat..." : "Muat ulang"}
                        </span>
                    </button>
                </div>
            </div>

            <div className="kpTableCard">
                <table className="kpTable kpPendaftarTable">
                    <thead>
                        <tr>
                            {KOLOM_PENDAFTAR.map(({ key, label }) => (
                                <SortTh
                                    key={label}
                                    k={key}
                                    urut={urutPendaftar}
                                    onSort={ubahUrutPendaftar}
                                >
                                    {label}
                                </SortTh>
                            ))}
                            <th className="kpActionHead">Aksi</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pagePendaftarRows.length ? (
                            pagePendaftarRows.map((item) => (
                                <tr key={item.no_registrasi}>
                                    <td data-label="Nama Pendaftar">
                                        <span className="kpNameCell">
                                            {item.nama || "-"}
                                        </span>
                                        <span className="kpPendaftarSub">
                                            {item.no_registrasi}
                                        </span>
                                        {item.akun_warga ? (
                                            <span className="kpPendaftarFlag">
                                                Email sudah terdaftar sebagai
                                                warga
                                            </span>
                                        ) : null}
                                        {item.telepon_dipakai ? (
                                            <span className="kpPendaftarFlag">
                                                No. HP sama dengan akun{" "}
                                                {item.telepon_dipakai}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td data-label="Email">
                                        <span className="kpTextCell">
                                            {item.email || "-"}
                                        </span>
                                    </td>
                                    <td data-label="No. Telepon">
                                        <span className="kpTextCell">
                                            {formatPhoneDisplay(item.telp)}
                                        </span>
                                    </td>
                                    <td data-label="Domisili">
                                        <span className="kpTextCell">
                                            {[
                                                item.kelurahan,
                                                item.kecamatan,
                                                item.kabupaten,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || "-"}
                                        </span>
                                    </td>
                                    <td data-label="Tanggal Daftar">
                                        <span className="kpTextCell">
                                            {formatAccountHistoryDate(
                                                item.waktu,
                                            )}
                                        </span>
                                    </td>
                                    <td data-label="Aksi">
                                        <div className="kpActions">
                                            <button
                                                className="kpMiniBtn is-ok"
                                                type="button"
                                                onClick={() =>
                                                    openSetujui(item)
                                                }
                                                disabled={item.akun_warga}
                                                title={
                                                    item.akun_warga
                                                        ? "Email ini sudah dipakai akun warga"
                                                        : undefined
                                                }
                                            >
                                                Setujui
                                            </button>
                                            <button
                                                className="kpMiniBtn is-danger"
                                                type="button"
                                                onClick={() =>
                                                    setTolakTarget(item)
                                                }
                                            >
                                                Tolak
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="kpEmptyCell">
                                    <div className="kpEmptyState">
                                        <div
                                            className="kpEmptyIcon"
                                            aria-hidden="true"
                                        >
                                            <img src={posbankumIcon} alt="" />
                                        </div>
                                        <h2>
                                            {pendaftarInfo.memuat
                                                ? "Memuat Pendaftar..."
                                                : "Tidak Ada Pendaftar Baru"}
                                        </h2>
                                        <p>
                                            {pendaftarInfo.memuat
                                                ? "Mengambil data dari formulir pendaftaran."
                                                : q
                                                  ? "Tidak ada pendaftar yang sesuai dengan pencarian."
                                                  : "Semua pendaftar sudah diproses."}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {renderPager(
                    safePagePendaftar,
                    totalPagesPendaftar,
                    setPagePendaftar,
                )}
            </div>
        </>
    );

    return (
        <section className="ad-pagePad">
            <div className="kpShell">
                {pageMode === "list" ? (
                    <div className="ad-pageHeader kpListHead">
                        <div className="ad-pageTitleWrap">
                            <h1 className="ad-wireTitle">Manajemen Akun</h1>
                        </div>

                        <button
                            className="kpAddTop"
                            type="button"
                            onClick={openTambah}
                        >
                            <FiPlus />
                            <span>Tambah Paralegal</span>
                        </button>
                    </div>
                ) : null}

                {err ? <div className="kpError">{err}</div> : null}

                {pageMode === "list" ? renderTabs() : null}
                {pageMode === "list" && tab === "akun"
                    ? renderListPage()
                    : null}
                {pageMode === "list" && tab === "pendaftar"
                    ? renderPendaftarPage()
                    : null}
                {pageMode === "add" || pageMode === "edit"
                    ? renderFormPage()
                    : null}
                {pageMode === "detail" ? renderDetailPage() : null}

                <DeleteConfirmModal
                    open={Boolean(deleteTarget)}
                    title="Hapus Paralegal?"
                    subtitle="Data yang dihapus tidak dapat dikembalikan"
                    description={
                        deleteTarget
                            ? `Anda yakin ingin menghapus ${deleteTarget.nama_lengkap}?`
                            : ""
                    }
                    confirmLabel={deleting ? "Menghapus..." : "Hapus"}
                    cancelLabel="Batal"
                    loading={deleting}
                    onCancel={() => !deleting && setDeleteTarget(null)}
                    onConfirm={confirmHapus}
                />

                <DeleteConfirmModal
                    open={Boolean(tolakTarget)}
                    title="Tolak Pendaftar?"
                    subtitle="Status di formulir pendaftaran akan diubah"
                    description={
                        tolakTarget
                            ? `Pendaftaran ${tolakTarget.nama} (${tolakTarget.no_registrasi}) akan ditandai Ditolak dan hilang dari daftar ini.`
                            : ""
                    }
                    confirmLabel={menolak ? "Menolak..." : "Tolak"}
                    cancelLabel="Batal"
                    loading={menolak}
                    onCancel={() => !menolak && setTolakTarget(null)}
                    onConfirm={confirmTolak}
                />

                <ReminderModal
                    open={statusTarget?.nextStatus === "aktif"}
                    variant="account-status"
                    title="Aktifkan Kembali Akun Paralegal?"
                    subtitle=""
                    description={
                        <>
                            <span>
                                Akun Paralegal akan kembali aktif dan dapat
                                digunakan untuk mengakses Sistem Posbankum.
                            </span>
                            {statusError ? (
                                <span className="kpStatusModalError">
                                    {statusError}
                                </span>
                            ) : null}
                        </>
                    }
                    cancelLabel="Batal"
                    confirmLabel="Aktifkan"
                    loading={statusUpdating}
                    onClose={closeStatusConfirm}
                    onConfirm={confirmStatusChange}
                />

                <DeleteConfirmModal
                    open={statusTarget?.nextStatus === "nonaktif"}
                    variant="account-status"
                    title="Nonaktifkan Akun Paralegal?"
                    subtitle=""
                    description={
                        <>
                            <span>
                                Akun Paralegal tidak dapat digunakan untuk
                                mengakses Sistem Posbankum selama berstatus
                                nonaktif. Data dan riwayat akun tetap tersimpan
                                dan akun dapat diaktifkan kembali.
                            </span>
                            {statusError ? (
                                <span className="kpStatusModalError">
                                    {statusError}
                                </span>
                            ) : null}
                        </>
                    }
                    cancelLabel="Batal"
                    confirmLabel="Nonaktifkan"
                    loading={statusUpdating}
                    onCancel={closeStatusConfirm}
                    onConfirm={confirmStatusChange}
                />

                <SuccessToast
                    message={successMessage}
                    onClose={() => setSuccessMessage("")}
                />

                <SuccessToast
                    message={statusSuccessMessage}
                    variant="news-status"
                    onClose={() => setStatusSuccessMessage("")}
                />

                <RejectToast
                    message={rejectMessage}
                    onClose={() => setRejectMessage("")}
                />
            </div>
        </section>
    );
}
