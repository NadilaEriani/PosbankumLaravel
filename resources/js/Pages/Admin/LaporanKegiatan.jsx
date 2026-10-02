import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiSearch,
    FiX,
    FiCalendar,
    FiMapPin,
    FiEye,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiChevronUp,
    FiClock,
    FiFileText,
    FiThumbsUp,
    FiThumbsDown,
    FiMessageSquare,
    FiFilter,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import { getPaginationItems } from "../../utils/pagination";
import ViewToggle, { rangeLabel, useViewMode } from "../../Components/ViewToggle";
import "../../../css/Admin/laporanKegiatan.css";

const PAGE_SIZE = 6;

const TABS = [
    { key: "all", label: "Semua" },
    { key: "pending", label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
];

const TIME_FILTER_OPTIONS = [
    { value: "all", label: "Semua Waktu" },
    { value: "today", label: "Hari Ini" },
    { value: "7d", label: "7 Hari Terakhir" },
    { value: "month", label: "Bulan Ini" },
    { value: "last_month", label: "Bulan Lalu" },
    { value: "range", label: "Rentang Tanggal" },
];

const DEFAULT_ADMIN_NAME = "Admin Kemenkum Riau";

const REPORT_TIME_FILTER_STYLES = `
.rk-filterTopRow {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
}

.rk-filterTopRow .rk-searchBox {
    flex: 1 1 auto;
    min-width: 0;
}

.rk-timeFilter {
    position: relative;
    flex: 0 0 220px;
    min-width: 0;
}

.rk-timeFilterTrigger {
    width: 100%;
    height: 39px;
    border: 0;
    border-radius: 15px;
    background: #f2f4f7;
    color: #475467;
    padding: 0 14px;
    display: grid;
    grid-template-columns: 17px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    font-family: "Outfit", sans-serif;
    box-shadow: none;
}

.rk-timeFilter.is-open .rk-timeFilterTrigger {
    box-shadow:
        0 4px 6px -4px rgba(0, 0, 0, 0.1),
        0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.rk-timeFilterIcon,
.rk-timeFilterChevron {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
}

.rk-timeFilterChevron {
    justify-self: end;
}

.rk-timeFilterText {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    color: #475467;
    font-family: "Outfit", sans-serif;
    font-size: 13px;
    line-height: 1;
    font-weight: 700;
}

.rk-timeFilterMenu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 90;
    width: 270px;
    max-width: calc(100vw - 32px);
    padding: 6px;
    border: 1px solid #e8e8ee;
    border-radius: 14px;
    background: #ffffff;
    box-shadow:
        0 2px 4px -2px rgba(0, 0, 0, 0.1),
        0 10px 22px rgba(15, 23, 42, 0.12);
}

.rk-timeFilterItem {
    width: 100%;
    min-height: 40px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #475569;
    padding: 0 12px;
    display: flex;
    align-items: center;
    text-align: left;
    font-family: "Outfit", sans-serif;
    font-size: 13px;
    line-height: 1.2;
    font-weight: 600;
    cursor: pointer;
    box-shadow: none;
}

.rk-timeFilterItem.is-selected {
    background: #f1f5f9;
    color: #343a73;
    font-weight: 700;
}

.rk-timeFilterItem:not(.is-selected):hover,
.rk-timeFilterItem:not(.is-selected):focus-visible {
    background: #f4f4f6;
}

.rk-timeFilterTrigger:focus-visible,
.rk-timeFilterItem:focus-visible {
    outline: 0;
}

.rk-timeFilterRange {
    margin-top: 6px;
    padding: 12px;
    border-top: 1px solid #edf0f4;
    background: #fbfcfe;
    border-radius: 0 0 10px 10px;
}

.rk-timeFilterRangeTitle {
    margin: 0 0 10px;
    color: #343a73;
    font-size: 12px;
    font-weight: 800;
}

.rk-timeFilterRangeGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.rk-timeFilterDateField {
    min-width: 0;
}

.rk-timeFilterDateField span {
    display: block;
    margin-bottom: 5px;
    color: #667085;
    font-size: 10px;
    font-weight: 700;
}

.rk-timeFilterDateField input {
    width: 100%;
    min-width: 0;
    height: 38px;
    border: 1px solid #dfe3ea;
    border-radius: 10px;
    background: #ffffff;
    color: #344054;
    padding: 0 8px;
    outline: none;
    font-family: "Outfit", sans-serif;
    font-size: 12px;
}

.rk-timeFilterDateField input:focus {
    border-color: #aab4c4;
    box-shadow: 0 0 0 3px rgba(52, 58, 115, 0.08);
}

.rk-timeFilterRangeError {
    margin-top: 8px;
    color: #b42318;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 600;
}

.rk-timeFilterRangeActions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}

.rk-timeFilterCancel,
.rk-timeFilterApply {
    min-height: 36px;
    border: 0;
    border-radius: 10px;
    padding: 0 12px;
    font-family: "Outfit", sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}

.rk-timeFilterCancel {
    background: #eef0f4;
    color: #475467;
}

.rk-timeFilterApply {
    background: #343a73;
    color: #ffffff;
}

.rk-filterDivider {
    width: 100%;
    height: 1px;
    margin: 15px 0 13px;
    background: #edf0f4;
}

.rk-filterPanel .rk-tabs {
    margin-top: 0;
}

.rk-wrap .rk-timeFilterTrigger:not(:disabled):hover,
.rk-wrap .rk-timeFilterTrigger:not(:disabled):focus-visible,
.rk-wrap .rk-timeFilterItem:not(:disabled):hover,
.rk-wrap .rk-timeFilterItem:not(:disabled):focus-visible,
.rk-wrap .rk-timeFilterCancel:not(:disabled):hover,
.rk-wrap .rk-timeFilterApply:not(:disabled):hover {
    transform: none;
    filter: none;
}

@media (max-width: 768px) {
    .rk-filterTopRow {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .rk-filterTopRow .rk-searchBox,
    .rk-timeFilter {
        width: 100%;
    }

    .rk-timeFilter {
        flex-basis: auto;
    }

    .rk-timeFilterTrigger {
        height: 46px;
        border-radius: 14px;
    }

    .rk-timeFilterMenu {
        left: 0;
        right: auto;
        width: min(100%, 320px);
    }

    .rk-filterDivider {
        margin: 13px 0 11px;
    }
}

@media (max-width: 430px) {
    .rk-timeFilterMenu {
        width: 100%;
        max-width: 100%;
    }

    .rk-timeFilterRangeGrid {
        grid-template-columns: 1fr;
    }

    .rk-timeFilterRangeActions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rk-timeFilterCancel,
    .rk-timeFilterApply {
        width: 100%;
    }
}
`;

const norm = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

function firstValue(source, keys, fallback = null) {
    for (const key of keys) {
        const value = source?.[key];
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

function normalizePosbankum(value) {
    if (!value || typeof value !== "object") {
        return {
            nama: "",
            nama_paralegal: "",
            kelurahan: { nama: "" },
            kecamatan: { nama: "" },
            kabupaten: { nama: "" },
        };
    }

    return {
        ...value,
        nama: firstValue(value, ["nama", "name", "posbankum_nama"], ""),
        nama_paralegal: firstValue(
            value,
            ["nama_paralegal", "paralegal_nama", "pelapor"],
            "",
        ),
        kelurahan: {
            ...(value.kelurahan || {}),
            nama: firstValue(
                value.kelurahan || {},
                ["nama", "name"],
                firstValue(value, ["kelurahan_nama"], ""),
            ),
        },
        kecamatan: {
            ...(value.kecamatan || {}),
            nama: firstValue(
                value.kecamatan || {},
                ["nama", "name"],
                firstValue(value, ["kecamatan_nama"], ""),
            ),
        },
        kabupaten: {
            ...(value.kabupaten || {}),
            nama: firstValue(
                value.kabupaten || {},
                ["nama", "name"],
                firstValue(value, ["kabupaten_nama"], ""),
            ),
        },
    };
}

function normalizeRow(row, index = 0) {
    const posbankum = normalizePosbankum(
        row?.posbankum || {
            nama: firstValue(row, ["posbankum_nama", "posbankumName"], ""),
            nama_paralegal: firstValue(row, ["nama_paralegal", "pelapor"], ""),
            kelurahan_nama: firstValue(row, ["kelurahan_nama"], ""),
            kecamatan_nama: firstValue(row, ["kecamatan_nama"], ""),
            kabupaten_nama: firstValue(row, ["kabupaten_nama"], ""),
        },
    );

    const idKegiatan = firstValue(row, ["id_kegiatan", "id"], index + 1);
    const judul = firstValue(
        row,
        ["judul", "nama_kegiatan", "title", "tema"],
        `Kegiatan #${index + 1}`,
    );
    const deskripsi = firstValue(
        row,
        ["deskripsi", "description", "uraian", "catatan_kegiatan"],
        "Belum ada deskripsi kegiatan.",
    );
    const tglUpload = firstValue(
        row,
        ["tgl_upload", "created_at", "updated_at", "date"],
        null,
    );
    const tglMulai = firstValue(
        row,
        ["tgl_mulai", "tanggal_kegiatan", "tanggal", "date"],
        tglUpload,
    );
    const lokasi = firstValue(
        row,
        ["lokasi", "location", "alamat", "tempat"],
        "-",
    );

    return {
        ...row,
        id_kegiatan: idKegiatan,
        id_posbankum: firstValue(row, ["id_posbankum", "posbankum_id"], null),
        judul,
        deskripsi,
        catatan: firstValue(
            row,
            ["catatan", "catatan_admin", "alasan_penolakan"],
            "",
        ),
        hasil_kegiatan: firstValue(
            row,
            ["hasil_kegiatan", "hasil", "output", "result"],
            "-",
        ),
        status: firstValue(row, ["status"], "Menunggu"),
        tgl_upload: tglUpload,
        tgl_mulai: tglMulai,
        tgl_selesai: firstValue(row, ["tgl_selesai", "tanggal_selesai"], null),
        tgl_verifikasi: firstValue(
            row,
            ["tgl_verifikasi", "verified_at", "tanggal_verifikasi"],
            null,
        ),
        id_user_verifikator: firstValue(
            row,
            ["id_user_verifikator", "verified_by", "verifikator_id"],
            null,
        ),
        admin_penanggung_jawab: firstValue(
            row,
            [
                "admin_penanggung_jawab",
                "admin_verifikator",
                "nama_verifikator",
                "verifikator_nama",
            ],
            "",
        ),
        thumbnail_path: firstValue(
            row,
            ["thumbnail_path", "foto", "gambar", "dokumentasi", "image_path"],
            "",
        ),
        thumbnail_url: firstValue(
            row,
            ["thumbnail_url", "image_url", "foto_url"],
            "",
        ),
        lokasi,
        anggota_terlibat: firstValue(row, ["anggota_terlibat"], ""),
        kategori: firstValue(row, ["kategori", "jenis_kegiatan"], ""),
        posbankum,
        posbankumName: firstValue(
            row,
            ["posbankumName", "posbankum_nama"],
            posbankum.nama,
        ),
        pelapor: firstValue(
            row,
            ["pelapor", "nama_pelapor", "created_by_name"],
            posbankum.nama_paralegal,
        ),
    };
}

function sortRowsByEventDate(rows) {
    const timestamp = (row) => {
        const value = row?.tgl_mulai || row?.tgl_upload;
        const time = value ? new Date(value).getTime() : 0;

        return Number.isNaN(time) ? 0 : time;
    };

    return [...rows].sort((first, second) => {
        return timestamp(second) - timestamp(first);
    });
}

function uiStatusKey(statusDb) {
    const status = norm(statusDb);

    if (
        [
            "diterima",
            "disetujui",
            "setuju",
            "approve",
            "approved",
            "valid",
            "selesai",
        ].includes(status)
    ) {
        return "approved";
    }

    if (["ditolak", "tolak", "reject", "rejected"].includes(status)) {
        return "rejected";
    }

    return "pending";
}

function uiStatusLabel(statusDb) {
    const key = uiStatusKey(statusDb);
    if (key === "approved") return "Disetujui";
    if (key === "rejected") return "Ditolak";
    return "Menunggu";
}

function uiStatusIcon(statusDb, className = "rk-statusIcon") {
    const key = uiStatusKey(statusDb);
    if (key === "approved") return <BsCheck2Circle className={className} />;
    if (key === "rejected") {
        return <AiOutlineCloseCircle className={className} />;
    }
    return <FiClock className={className} />;
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/* TIME_FILTER_HELPERS_START */
function startOfLocalDay(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0,
    );
}

function endOfLocalDay(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
    );
}

function parseLocalDateInput(value, useEndOfDay = false) {
    const text = String(value ?? "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    const date = useEndOfDay
        ? new Date(year, month, day, 23, 59, 59, 999)
        : new Date(year, month, day, 0, 0, 0, 0);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function eventDateValue(value) {
    const raw =
        value && typeof value === "object"
            ? value?.tgl_mulai || value?.tgl_upload
            : value;

    if (!raw) return null;

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isDateInsideTimeFilter(
    value,
    filter,
    dateRange = {},
    now = new Date(),
) {
    if (filter === "all") return true;

    const date = eventDateValue(value);
    if (!date) return false;

    const todayStart = startOfLocalDay(now);
    const todayEnd = endOfLocalDay(now);

    if (filter === "today") {
        return date >= todayStart && date <= todayEnd;
    }

    if (filter === "7d") {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 6);
        return date >= start && date <= todayEnd;
    }

    if (filter === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
        );
        return date >= start && date <= end;
    }

    if (filter === "last_month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999,
        );
        return date >= start && date <= end;
    }

    if (filter === "range") {
        const start = parseLocalDateInput(dateRange?.start, false);
        const end = parseLocalDateInput(dateRange?.end, true);

        if (!start || !end || start > end) return false;

        return date >= start && date <= end;
    }

    return true;
}
/* TIME_FILTER_HELPERS_END */

function formatRangeDate(value) {
    const date = parseLocalDateInput(value);
    if (!date) return "";

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
    }).format(date);
}

function safeText(value, fallback = "-") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function isRejected(status) {
    return uiStatusKey(status) === "rejected";
}

function assetUrl(path) {
    const value = String(path ?? "").trim();
    if (!value) return null;

    if (/^(data:|blob:)/i.test(value)) return value;
    if (value.startsWith("/file-preview")) return value;
    if (/^https?:\/\//i.test(value) && !/\/storage\//i.test(value)) {
        return value;
    }

    const clean = value
        .replace(/^https?:\/\/[^/]+\/storage\//i, "")
        .replace(/^https?:\/\/[^/]+\//i, "")
        .replace(/[?#].*$/, "")
        .replace(/^public\//i, "")
        .replace(/^storage\//i, "")
        .replace(/^app\/public\//i, "")
        .replace(/^\/+/, "");

    if (!clean || clean.includes("..")) return null;

    return `/file-preview?path=${encodeURIComponent(clean)}`;
}

function kegiatanStatusUrl(idKegiatan) {
    return `/admin/laporan-kegiatan/${encodeURIComponent(idKegiatan)}/status`;
}

function kegiatanDetailUrl(idKegiatan) {
    return `/admin/laporan-kegiatan/detail/${encodeURIComponent(idKegiatan)}`;
}

function errorMessageFromPayload(errors, fallback) {
    if (!errors || typeof errors !== "object") return fallback;

    const messages = Object.values(errors).flat().filter(Boolean).join(" ");

    return messages || fallback;
}

function readDetailIdFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const menuIndex = parts.findIndex((part) => part === "laporan-kegiatan");

    if (menuIndex === -1) return null;

    const mode = parts[menuIndex + 1];
    const id = parts[menuIndex + 2];

    if (mode === "detail" && id) {
        try {
            return decodeURIComponent(id);
        } catch {
            return id;
        }
    }

    return null;
}

function selectedPosNameForRow(item) {
    const name = safeText(
        item?.posbankum?.nama || item?.posbankumName || item?.posbankum_nama,
    );
    if (name === "-") return name;
    return /^posbankum\b/i.test(name) ? name : `Posbankum ${name}`;
}

function selectedRegionText(item) {
    const kecamatan = safeText(item?.posbankum?.kecamatan?.nama, "");
    const kabupaten = safeText(item?.posbankum?.kabupaten?.nama, "");

    return [kecamatan, kabupaten].filter(Boolean).join(", ");
}

function parseFirstPersonName(value) {
    if (value === undefined || value === null) return "";

    if (Array.isArray(value)) {
        for (const item of value) {
            if (typeof item === "string" && item.trim()) return item.trim();
            if (item && typeof item === "object") {
                const name = firstValue(
                    item,
                    ["nama", "name", "nama_lengkap"],
                    "",
                );
                if (String(name).trim()) return String(name).trim();
            }
        }

        return "";
    }

    if (typeof value === "object") {
        const name = firstValue(value, ["nama", "name", "nama_lengkap"], "");
        return String(name ?? "").trim();
    }

    const raw = String(value ?? "").trim();
    if (!raw) return "";

    try {
        const parsed = JSON.parse(raw);
        const fromJson = parseFirstPersonName(parsed);
        if (fromJson) return fromJson;
    } catch {
        // Abaikan jika bukan JSON valid.
    }

    return raw
        .replace(/^\[+|\]+$/g, "")
        .replace(/^['\"]+|['\"]+$/g, "")
        .trim();
}

function detailPelaporText(item) {
    const posName = selectedPosNameForRow(item);
    const posNamePlain = safeText(
        item?.posbankum?.nama || item?.posbankumName || item?.posbankum_nama,
        "",
    );

    const candidates = [
        item?.pelapor,
        item?.nama_pelapor,
        item?.created_by_name,
        item?.posbankum?.nama_paralegal,
        parseFirstPersonName(item?.anggota_terlibat),
    ];

    const reporter = candidates
        .map((value) => String(value ?? "").trim())
        .find(
            (value) =>
                value &&
                value !== "-" &&
                norm(value) !== norm(posName) &&
                norm(value) !== norm(posNamePlain),
        );

    const reporterName =
        reporter || parseFirstPersonName(item?.anggota_terlibat) || "-";

    if (!posName || posName === "-") {
        return reporterName;
    }

    if (reporterName === "-") {
        return posName;
    }

    return `${reporterName} (${posName})`;
}

function shortStatusDateText(status, value) {
    const key = uiStatusKey(status);
    const date = formatDate(value);

    if (key === "approved") return `Disetujui ${date}`;
    if (key === "rejected") return `Ditolak ${date}`;
    return `Diajukan ${date}`;
}

export default function LaporanKegiatan({ rows = [] }) {
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [tab, setTab] = useState("all");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode, tableRows, setTableRows] =
        useViewMode("laporan-kegiatan");
    const pageSize = viewMode === "tabel" ? tableRows : PAGE_SIZE;

    const [timeFilter, setTimeFilter] = useState("all");
    const [timeFilterOpen, setTimeFilterOpen] = useState(false);
    const [showRangeInputs, setShowRangeInputs] = useState(false);
    const [rangeDraft, setRangeDraft] = useState({
        start: "",
        end: "",
    });
    const [appliedRange, setAppliedRange] = useState({
        start: "",
        end: "",
    });
    const [rangeError, setRangeError] = useState("");
    const timeFilterRef = useRef(null);

    const [err, setErr] = useState("");
    const [saving, setSaving] = useState(false);
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectNote, setRejectNote] = useState("");
    const [statusOverrides, setStatusOverrides] = useState({});

    const [successToast, setSuccessToast] = useState({
        title: "",
        message: "",
    });
    const [rejectToast, setRejectToast] = useState("");

    const detailId = readDetailIdFromPath();
    const isDetailPage = Boolean(detailId);

    const normalizedRows = useMemo(
        () =>
            sortRowsByEventDate(
                (Array.isArray(rows) ? rows : []).map(normalizeRow),
            ),
        [rows],
    );

    const displayRows = useMemo(
        () =>
            normalizedRows.map((row) => ({
                ...row,
                ...(statusOverrides[row.id_kegiatan] || {}),
            })),
        [normalizedRows, statusOverrides],
    );

    const detailItem = useMemo(() => {
        if (!detailId) return null;
        return (
            displayRows.find(
                (row) => String(row.id_kegiatan) === String(detailId),
            ) || null
        );
    }, [displayRows, detailId]);

    const selectedTimeFilter = useMemo(
        () =>
            TIME_FILTER_OPTIONS.find(
                (option) => option.value === timeFilter,
            ) || TIME_FILTER_OPTIONS[0],
        [timeFilter],
    );

    const selectedTimeFilterLabel = useMemo(() => {
        if (
            timeFilter === "range" &&
            appliedRange.start &&
            appliedRange.end
        ) {
            const start = formatRangeDate(appliedRange.start);
            const end = formatRangeDate(appliedRange.end);

            if (start && end) {
                return `${start} - ${end}`;
            }
        }

        return selectedTimeFilter.label;
    }, [timeFilter, appliedRange, selectedTimeFilter]);

    const getThumbUrl = (item) => {
        if (!item) return null;
        return assetUrl(item.thumbnail_url || item.thumbnail_path);
    };

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        setPage(1);
    }, [
        tab,
        debouncedQ,
        timeFilter,
        appliedRange.start,
        appliedRange.end,
    ]);

    useEffect(() => {
        setRejectMode(false);
        setRejectNote("");
        setErr("");
    }, [detailId]);

    useEffect(() => {
        if (!timeFilterOpen) return undefined;

        const handlePointerDown = (event) => {
            if (
                timeFilterRef.current &&
                !timeFilterRef.current.contains(event.target)
            ) {
                setTimeFilterOpen(false);
                setRangeError("");
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setTimeFilterOpen(false);
                setRangeError("");
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [timeFilterOpen]);

    const timeFilteredRows = useMemo(
        () =>
            displayRows.filter((row) =>
                isDateInsideTimeFilter(row, timeFilter, appliedRange),
            ),
        [displayRows, timeFilter, appliedRange],
    );

    const searchedTimeRows = useMemo(() => {
        const search = norm(debouncedQ);
        if (!search) return timeFilteredRows;

        return timeFilteredRows.filter((row) => {
            const haystack = [
                row?.judul,
                row?.deskripsi,
                row?.lokasi,
                row?.kategori,
                row?.pelapor,
                row?.anggota_terlibat,
                row?.posbankum?.nama,
                row?.posbankum?.kecamatan?.nama,
                row?.posbankum?.kabupaten?.nama,
            ]
                .map((item) => norm(item))
                .join(" ");

            return haystack.includes(search);
        });
    }, [timeFilteredRows, debouncedQ]);

    const statsRows = searchedTimeRows;

    const stats = useMemo(() => {
        const base = {
            total: statsRows.length,
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        for (const row of statsRows) {
            const key = uiStatusKey(row?.status);
            if (key === "approved") base.approved += 1;
            else if (key === "rejected") base.rejected += 1;
            else base.pending += 1;
        }

        return base;
    }, [statsRows]);

    const filteredRows = useMemo(() => {
        if (tab === "all") return searchedTimeRows;
        return searchedTimeRows.filter(
            (row) => uiStatusKey(row?.status) === tab,
        );
    }, [searchedTimeRows, tab]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const pageClamped = Math.min(Math.max(page, 1), totalPages);

    const pageItems = useMemo(() => {
        const start = (pageClamped - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, pageClamped, pageSize]);

    const chooseTimeFilter = (value) => {
        if (value === "range") {
            setShowRangeInputs(true);
            setRangeError("");

            if (timeFilter === "range") {
                setRangeDraft(appliedRange);
            }

            return;
        }

        setTimeFilter(value);
        setShowRangeInputs(false);
        setRangeError("");
        setTimeFilterOpen(false);
    };

    const applyDateRange = () => {
        const start = parseLocalDateInput(rangeDraft.start, false);
        const end = parseLocalDateInput(rangeDraft.end, true);

        if (!start || !end) {
            setRangeError("Pilih tanggal awal dan tanggal akhir.");
            return;
        }

        if (start > end) {
            setRangeError(
                "Tanggal awal tidak boleh lebih besar dari tanggal akhir.",
            );
            return;
        }

        setAppliedRange({
            start: rangeDraft.start,
            end: rangeDraft.end,
        });
        setTimeFilter("range");
        setRangeError("");
        setShowRangeInputs(false);
        setTimeFilterOpen(false);
    };

    const cancelDateRange = () => {
        setRangeDraft(appliedRange);
        setRangeError("");
        setShowRangeInputs(false);
    };

    const resetFilters = () => {
        setQ("");
        setDebouncedQ("");
        setTab("all");
        setTimeFilter("all");
        setTimeFilterOpen(false);
        setShowRangeInputs(false);
        setRangeDraft({
            start: "",
            end: "",
        });
        setAppliedRange({
            start: "",
            end: "",
        });
        setRangeError("");
        setPage(1);
    };

    const finishAction = () => {
        setSaving(false);
    };

    const applyLocalStatus = (idKegiatan, payload) => {
        setStatusOverrides((prev) => ({
            ...prev,
            [idKegiatan]: {
                ...(prev[idKegiatan] || {}),
                ...payload,
            },
        }));
    };

    const approve = (item = detailItem) => {
        if (!item?.id_kegiatan) return;

        const verificationAt = new Date().toISOString();

        setSaving(true);
        setErr("");

        router.patch(
            kegiatanStatusUrl(item.id_kegiatan),
            { status: "Diterima" },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    applyLocalStatus(item.id_kegiatan, {
                        status: "Diterima",
                        catatan: "",
                        tgl_verifikasi: item.tgl_verifikasi || verificationAt,
                        admin_penanggung_jawab:
                            item.admin_penanggung_jawab || DEFAULT_ADMIN_NAME,
                    });
                    setRejectMode(false);
                    setRejectNote("");
                    setSuccessToast({
                        title: "Laporan Kegiatan Disetujui!",
                        message: "Laporan kegiatan telah berhasil disetujui",
                    });
                },
                onError: (errors) => {
                    setErr(
                        errorMessageFromPayload(
                            errors,
                            "Gagal menyetujui laporan kegiatan.",
                        ),
                    );
                },
                onFinish: finishAction,
            },
        );
    };

    const reject = (item = detailItem) => {
        if (!item?.id_kegiatan) return;

        const note = rejectNote.trim();
        if (!note) {
            setErr("Catatan penolakan wajib diisi.");
            return;
        }

        const verificationAt = new Date().toISOString();

        setSaving(true);
        setErr("");

        router.patch(
            kegiatanStatusUrl(item.id_kegiatan),
            { status: "Ditolak", catatan: note },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    applyLocalStatus(item.id_kegiatan, {
                        status: "Ditolak",
                        catatan: note,
                        tgl_verifikasi: item.tgl_verifikasi || verificationAt,
                        admin_penanggung_jawab:
                            item.admin_penanggung_jawab || DEFAULT_ADMIN_NAME,
                    });
                    setRejectMode(false);
                    setRejectNote("");
                    setRejectToast("Kegiatan Berhasil Ditolak");
                },
                onError: (errors) => {
                    setErr(
                        errorMessageFromPayload(
                            errors,
                            "Gagal menolak laporan kegiatan.",
                        ),
                    );
                },
                onFinish: finishAction,
            },
        );
    };

    const renderStatusPill = (status, extraClass = "") => {
        const key = uiStatusKey(status);

        return (
            <span className={`rk-statusPill is-${key} ${extraClass}`.trim()}>
                {uiStatusIcon(status)}
                {uiStatusLabel(status)}
            </span>
        );
    };

    const renderToasts = () => (
        <>
            <SuccessToast
                title={successToast.title}
                message={successToast.message}
                onClose={() => setSuccessToast({ title: "", message: "" })}
            />
            <RejectToast
                message={rejectToast}
                onClose={() => setRejectToast("")}
            />
        </>
    );

    if (isDetailPage) {
        return (
            <section className="ad-pagePad rk-detailPad">
                <div className="rk-wrap">
                    {renderToasts()}

                    {!detailItem ? (
                        <div className="rk-detailPage">
                            <div className="rk-detailTopbar">
                                <div className="rk-headingBlock">
                                    <h1>Detail Kegiatan</h1>
                                    <span />
                                </div>
                                <button
                                    className="rk-backBtn"
                                    type="button"
                                    onClick={() =>
                                        router.visit("/admin/laporan-kegiatan")
                                    }
                                >
                                    Kembali ke Daftar
                                </button>
                            </div>

                            <div className="rk-emptyCard">
                                <div className="rk-emptyIcon">
                                    <FiFileText />
                                </div>
                                <h2>Laporan Tidak Ditemukan</h2>
                                <p>
                                    Data laporan kegiatan yang diminta tidak
                                    tersedia.
                                </p>
                                <button
                                    className="rk-emptyBtn"
                                    type="button"
                                    onClick={() =>
                                        router.visit("/admin/laporan-kegiatan")
                                    }
                                >
                                    Kembali ke Daftar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <DetailPage
                            item={detailItem}
                            err={err}
                            saving={saving}
                            rejectMode={rejectMode}
                            rejectNote={rejectNote}
                            setRejectNote={setRejectNote}
                            setRejectMode={setRejectMode}
                            setErr={setErr}
                            approve={approve}
                            reject={reject}
                            renderStatusPill={renderStatusPill}
                            getThumbUrl={getThumbUrl}
                        />
                    )}
                </div>
            </section>
        );
    }

    return (
        <section className="ad-pagePad">
            <style>{REPORT_TIME_FILTER_STYLES}</style>

            <div className="rk-wrap">
                {renderToasts()}

                <div className="ad-pageHeader">
                    <div className="ad-pageTitleWrap">
                        <h1 className="ad-wireTitle">
                            Laporan Kegiatan Posbankum
                        </h1>
                    </div>
                </div>

                <div className="rk-statGrid">
                    <div className="rk-statCard is-total">
                        <div className="rk-statIconBox" aria-hidden="true">
                            <FiFileText />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Total Laporan</div>
                            <div className="rk-statValue">{stats.total}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-pending">
                        <div className="rk-statIconBox" aria-hidden="true">
                            <FiClock />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Menunggu</div>
                            <div className="rk-statValue">{stats.pending}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-approved">
                        <div className="rk-statIconBox" aria-hidden="true">
                            <BsCheck2Circle />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Disetujui</div>
                            <div className="rk-statValue">{stats.approved}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-rejected">
                        <div className="rk-statIconBox" aria-hidden="true">
                            <AiOutlineCloseCircle />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Ditolak</div>
                            <div className="rk-statValue">{stats.rejected}</div>
                        </div>
                    </div>
                </div>

                <div className="rk-filterPanel">
                    <div className="rk-filterTopRow">
                        <label
                            className="rk-searchBox"
                            aria-label="Cari laporan kegiatan"
                        >
                            <FiSearch className="rk-searchIcon" />
                            <input
                                value={q}
                                onChange={(event) => setQ(event.target.value)}
                                placeholder="Cari kegiatan, posbankum, atau lokasi..."
                            />
                            {q ? (
                                <button
                                    className="rk-searchClear"
                                    type="button"
                                    onClick={() => setQ("")}
                                    aria-label="Hapus pencarian"
                                >
                                    <FiX />
                                </button>
                            ) : null}
                        </label>

                        <div
                            ref={timeFilterRef}
                            className={`rk-timeFilter ${
                                timeFilterOpen ? "is-open" : ""
                            }`}
                        >
                            <button
                                className="rk-timeFilterTrigger"
                                type="button"
                                onClick={() => {
                                    const nextOpen = !timeFilterOpen;
                                    setTimeFilterOpen(nextOpen);

                                    if (nextOpen && timeFilter === "range") {
                                        setRangeDraft(appliedRange);
                                        setShowRangeInputs(true);
                                    }

                                    setRangeError("");
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={timeFilterOpen}
                                aria-label="Filter waktu laporan kegiatan"
                            >
                                <FiFilter className="rk-timeFilterIcon" />
                                <span className="rk-timeFilterText">
                                    {selectedTimeFilterLabel}
                                </span>
                                {timeFilterOpen ? (
                                    <FiChevronUp className="rk-timeFilterChevron" />
                                ) : (
                                    <FiChevronDown className="rk-timeFilterChevron" />
                                )}
                            </button>

                            {timeFilterOpen ? (
                                <div
                                    className="rk-timeFilterMenu"
                                    role="listbox"
                                    aria-label="Pilihan waktu laporan kegiatan"
                                >
                                    {TIME_FILTER_OPTIONS.map((option) => {
                                        const isSelected =
                                            option.value === timeFilter;

                                        return (
                                            <button
                                                key={option.value}
                                                className={`rk-timeFilterItem ${
                                                    isSelected
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() =>
                                                    chooseTimeFilter(
                                                        option.value,
                                                    )
                                                }
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}

                                    {showRangeInputs ? (
                                        <div className="rk-timeFilterRange">
                                            <div className="rk-timeFilterRangeTitle">
                                                Pilih Rentang Tanggal
                                            </div>

                                            <div className="rk-timeFilterRangeGrid">
                                                <label className="rk-timeFilterDateField">
                                                    <span>Dari</span>
                                                    <input
                                                        type="date"
                                                        value={
                                                            rangeDraft.start
                                                        }
                                                        onChange={(event) => {
                                                            setRangeDraft(
                                                                (current) => ({
                                                                    ...current,
                                                                    start: event
                                                                        .target
                                                                        .value,
                                                                }),
                                                            );
                                                            setRangeError("");
                                                        }}
                                                    />
                                                </label>

                                                <label className="rk-timeFilterDateField">
                                                    <span>Sampai</span>
                                                    <input
                                                        type="date"
                                                        value={rangeDraft.end}
                                                        onChange={(event) => {
                                                            setRangeDraft(
                                                                (current) => ({
                                                                    ...current,
                                                                    end: event
                                                                        .target
                                                                        .value,
                                                                }),
                                                            );
                                                            setRangeError("");
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            {rangeError ? (
                                                <div className="rk-timeFilterRangeError">
                                                    {rangeError}
                                                </div>
                                            ) : null}

                                            <div className="rk-timeFilterRangeActions">
                                                <button
                                                    className="rk-timeFilterCancel"
                                                    type="button"
                                                    onClick={cancelDateRange}
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    className="rk-timeFilterApply"
                                                    type="button"
                                                    onClick={applyDateRange}
                                                >
                                                    Terapkan
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="rk-filterDivider" />

                    <div
                        className="rk-tabs"
                        role="tablist"
                        aria-label="Filter status laporan"
                    >
                        {TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`rk-tab ${
                                    tab === item.key ? "is-active" : ""
                                }`}
                                onClick={() => setTab(item.key)}
                            >
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {err ? <div className="rk-errorBox">{err}</div> : null}

                {filteredRows.length === 0 ? (
                    <div className="rk-emptyCard">
                        <div className="rk-emptyIcon">
                            <FiFileText />
                        </div>
                        <h2>Tidak Ada Data Ditemukan</h2>
                        <p>
                            Tidak ada laporan kegiatan yang sesuai dengan filter
                            yang dipilih
                        </p>
                        <button
                            className="rk-emptyBtn"
                            type="button"
                            onClick={resetFilters}
                        >
                            Reset Filter
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="vt-bar">
                            <div className="vt-count">
                                Menampilkan <strong>{rangeLabel(pageClamped, pageSize, filteredRows.length)}</strong>{" "}
                                dari <strong>{filteredRows.length}</strong>{" "}
                                laporan kegiatan
                            </div>
                            <ViewToggle
                                value={viewMode}
                                rows={tableRows}
                                onRowsChange={(n) => {
                                    setTableRows(n);
                                    setPage(1);
                                }}
                                onChange={(mode) => {
                                    setViewMode(mode);
                                    setPage(1);
                                }}
                            />
                        </div>

                        {viewMode === "tabel" ? (
                            <div className="vt-tableCard">
                                <table
                                    className="vt-table"
                                    style={{ "--vt-min": "820px" }}
                                >
                                    <thead>
                                        <tr>
                                            <th className="vt-sticky">
                                                Judul Kegiatan
                                            </th>
                                            <th>Posbankum</th>
                                            <th>Tanggal</th>
                                            <th>Status</th>
                                            <th className="vt-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((item) => (
                                            <tr key={item.id_kegiatan}>
                                                <td className="vt-sticky">
                                                    <span className="vt-title">
                                                        {safeText(item.judul)}
                                                    </span>
                                                    {isRejected(item.status) &&
                                                    item.catatan ? (
                                                        <span className="vt-sub is-danger">
                                                            Alasan:{" "}
                                                            {item.catatan}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td>
                                                    {selectedPosNameForRow(
                                                        item,
                                                    )}
                                                </td>
                                                <td className="vt-nowrap">
                                                    {formatDate(
                                                        item.tgl_mulai ||
                                                            item.tgl_upload,
                                                    )}
                                                </td>
                                                <td>
                                                    {renderStatusPill(
                                                        item.status,
                                                    )}
                                                </td>
                                                <td className="vt-center">
                                                    <button
                                                        className="vt-iconBtn"
                                                        type="button"
                                                        onClick={() =>
                                                            router.visit(
                                                                kegiatanDetailUrl(
                                                                    item.id_kegiatan,
                                                                ),
                                                            )
                                                        }
                                                        aria-label={`Lihat detail ${safeText(item.judul)}`}
                                                        title="Lihat detail"
                                                    >
                                                        <FiEye />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rk-cardGrid">
                                {pageItems.map((item) => {
                                    const thumbUrl = getThumbUrl(item);
                                    const rejected = isRejected(item.status);
    
                                    return (
                                        <article
                                            className="rk-activityCard"
                                            key={item.id_kegiatan}
                                        >
                                            <div
                                                className="rk-cardImage"
                                                style={
                                                    thumbUrl
                                                        ? {
                                                              backgroundImage: `url(${thumbUrl})`,
                                                          }
                                                        : undefined
                                                }
                                            >
                                                {renderStatusPill(
                                                    item.status,
                                                    "rk-cardStatus",
                                                )}
                                            </div>
    
                                            <div className="rk-cardBody">
                                                <h2 className="rk-cardTitle">
                                                    {safeText(item.judul)}
                                                </h2>
    
                                                <div className="rk-cardMeta">
                                                    <FiMapPin />
                                                    <span>
                                                        {selectedPosNameForRow(
                                                            item,
                                                        )}
                                                    </span>
                                                </div>
    
                                                <div className="rk-cardMeta">
                                                    <FiCalendar />
                                                    <span>
                                                        {formatDate(
                                                            item.tgl_mulai ||
                                                                item.tgl_upload,
                                                        )}
                                                    </span>
                                                </div>
    
                                                {rejected && item.catatan ? (
                                                    <div className="rk-reasonBox">
                                                        <div className="rk-reasonTitle">
                                                            <AiOutlineCloseCircle />
                                                            <span>
                                                                Alasan Penolakan:
                                                            </span>
                                                        </div>
                                                        <p>{item.catatan}</p>
                                                    </div>
                                                ) : null}
    
                                                <button
                                                    className="rk-detailBtn"
                                                    type="button"
                                                    onClick={() =>
                                                        router.visit(
                                                            kegiatanDetailUrl(
                                                                item.id_kegiatan,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <FiEye />
                                                    <span>Lihat Detail</span>
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {totalPages > 1 ? (
                            <div
                                className="rk-pagination"
                                aria-label="Paginasi laporan kegiatan"
                            >
                                <button
                                    className="rk-pageNav"
                                    type="button"
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.max(1, value - 1),
                                        )
                                    }
                                    disabled={pageClamped <= 1}
                                    aria-label="Halaman sebelumnya"
                                >
                                    <FiChevronLeft />
                                </button>

                                {getPaginationItems(pageClamped, totalPages).map(
                                    (item, index) =>
                                        item === "ellipsis" ? (
                                            <span
                                                key={`ellipsis-${index}`}
                                                className="rk-pageBtn rk-pageEllipsis"
                                                aria-hidden="true"
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                className={`rk-pageBtn ${
                                                    pageClamped === item
                                                        ? "is-active"
                                                        : ""
                                                }`}
                                                type="button"
                                                onClick={() => setPage(item)}
                                                aria-current={
                                                    pageClamped === item
                                                        ? "page"
                                                        : undefined
                                                }
                                            >
                                                {item}
                                            </button>
                                        ),
                                )}

                                <button
                                    className="rk-pageNav"
                                    type="button"
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.min(totalPages, value + 1),
                                        )
                                    }
                                    disabled={pageClamped >= totalPages}
                                    aria-label="Halaman berikutnya"
                                >
                                    <FiChevronRight />
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </section>
    );
}

function DetailPage({
    item,
    err,
    saving,
    rejectMode,
    rejectNote,
    setRejectNote,
    setRejectMode,
    setErr,
    approve,
    reject,
    renderStatusPill,
    getThumbUrl,
}) {
    const statusKey = uiStatusKey(item?.status);
    const thumbUrl = getThumbUrl(item);
    const posName = selectedPosNameForRow(item);
    const region = selectedRegionText(item);
    const pelapor = detailPelaporText(item);
    const verificationDate = item?.tgl_verifikasi || item?.updated_at || null;
    const verificationAdmin = safeText(
        item?.admin_penanggung_jawab,
        DEFAULT_ADMIN_NAME,
    );
    const showVerification =
        statusKey === "approved" || statusKey === "rejected";

    const openRejectPanel = () => {
        setRejectNote(statusKey === "rejected" ? item?.catatan || "" : "");
        setRejectMode(true);
        setErr("");
    };

    return (
        <div className="rk-detailPage">
            <div className="rk-breadcrumb" aria-label="Breadcrumb">
                <button
                    type="button"
                    onClick={() => router.visit("/admin/laporan-kegiatan")}
                >
                    Riwayat Pengajuan Kegiatan
                </button>
                <FiChevronRight aria-hidden="true" />
                <span>Detail Kegiatan</span>
            </div>

            <div className="rk-detailTopbar">
                <div className="rk-headingBlock">
                    <h1>Detail Kegiatan</h1>
                    <span />
                </div>

                <button
                    className="rk-backBtn"
                    type="button"
                    onClick={() => router.visit("/admin/laporan-kegiatan")}
                >
                    Kembali ke Daftar
                </button>
            </div>

            {err ? <div className="rk-errorBox">{err}</div> : null}

            <article className={`rk-detailCard is-${statusKey}`}>
                <div
                    className="rk-detailBanner"
                    style={
                        thumbUrl
                            ? {
                                  backgroundImage: `url(${thumbUrl})`,
                              }
                            : undefined
                    }
                    aria-label="Foto kegiatan"
                />

                <div className="rk-detailBody">
                    <div className="rk-detailMetaLine">
                        {renderStatusPill(item.status, "rk-detailStatusPill")}
                        <span>
                            {shortStatusDateText("Menunggu", item.tgl_upload)}
                        </span>
                    </div>

                    <h2 className="rk-detailTitleText">
                        {safeText(item.judul)}
                    </h2>
                    <p className="rk-detailSubtitle">
                        {posName}
                        {region ? ` • ${region}` : ""}
                    </p>

                    <div className="rk-detailFactGrid">
                        <div className="rk-detailFact">
                            <span>Nama Pelapor</span>
                            <strong>{pelapor}</strong>
                        </div>
                        <div className="rk-detailFact">
                            <span>Tanggal Pelaksanaan</span>
                            <strong>{formatDate(item.tgl_mulai)}</strong>
                        </div>
                        <div className="rk-detailFact">
                            <span>Lokasi</span>
                            <strong>{safeText(item.lokasi)}</strong>
                        </div>
                    </div>

                    <section className="rk-textSection">
                        <h3>Deskripsi</h3>
                        <p>{safeText(item.deskripsi)}</p>
                    </section>

                    <section className="rk-textSection">
                        <h3>Hasil Kegiatan</h3>
                        <p>{safeText(item.hasil_kegiatan)}</p>
                    </section>

                    {statusKey === "pending" && !rejectMode ? (
                        <>
                            <div className="rk-actionDivider" />
                            <div className="rk-detailActionsInline">
                                <button
                                    className="rk-outlineDangerBtn"
                                    type="button"
                                    onClick={openRejectPanel}
                                    disabled={saving}
                                >
                                    <FiThumbsDown />
                                    Tolak Laporan
                                </button>
                                <button
                                    className="rk-solidApproveBtn"
                                    type="button"
                                    onClick={() => approve(item)}
                                    disabled={saving}
                                >
                                    <FiThumbsUp />
                                    Setujui Laporan
                                </button>
                            </div>
                        </>
                    ) : null}

                    {statusKey === "pending" && rejectMode ? (
                        <div className="rk-rejectInlinePanel">
                            <div className="rk-rejectInlineHead">
                                <div
                                    className="rk-rejectInlineIcon"
                                    aria-hidden="true"
                                >
                                    <FiMessageSquare />
                                </div>
                                <div>
                                    <h3>Tolak Laporan Kegiatan</h3>
                                    <p>
                                        Berikan catatan untuk perbaikan laporan
                                    </p>
                                </div>
                            </div>

                            <label
                                className="rk-rejectInlineLabel"
                                htmlFor="rkRejectNote"
                            >
                                Catatan Penolakan <span>*</span>
                            </label>
                            <textarea
                                id="rkRejectNote"
                                className="rk-rejectInlineTextarea"
                                value={rejectNote}
                                onChange={(event) =>
                                    setRejectNote(event.target.value)
                                }
                                placeholder="Jelaskan alasan penolakan dan apa yang perlu diperbaiki oleh paralegal..."
                            />

                            <div className="rk-rejectInlineActions">
                                <button
                                    className="rk-cancelInlineBtn"
                                    type="button"
                                    onClick={() => {
                                        if (saving) return;
                                        setRejectMode(false);
                                        setRejectNote("");
                                        setErr("");
                                    }}
                                    disabled={saving}
                                >
                                    Batal
                                </button>
                                <button
                                    className="rk-submitRejectBtn"
                                    type="button"
                                    onClick={() => reject(item)}
                                    disabled={saving}
                                >
                                    <FiThumbsDown />
                                    Tolak Laporan
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {showVerification ? (
                        <div className="rk-verificationBox">
                            <h3>Informasi Verifikasi</h3>
                            <div className="rk-verificationGrid">
                                <div>
                                    <span>Tanggal Keputusan</span>
                                    <strong>
                                        {formatDate(verificationDate)}
                                    </strong>
                                </div>
                                <div>
                                    <span>Admin Penanggung Jawab</span>
                                    <strong>{verificationAdmin}</strong>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {statusKey === "rejected" ? (
                        <div className="rk-rejectionNoteBox">
                            <div className="rk-rejectionNoteHead">
                                <div
                                    className="rk-rejectionNoteIcon"
                                    aria-hidden="true"
                                >
                                    <FiMessageSquare />
                                </div>
                                <div>
                                    <h3>Catatan Penolakan dari Admin</h3>
                                    <p>
                                        Harap perhatikan catatan berikut untuk
                                        perbaikan laporan
                                    </p>
                                </div>
                            </div>
                            <div className="rk-rejectionNoteText">
                                {safeText(item.catatan)}
                            </div>
                        </div>
                    ) : null}
                </div>
            </article>
        </div>
    );
}
