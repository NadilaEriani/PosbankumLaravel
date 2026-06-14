import { router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    FiSearch,
    FiX,
    FiCalendar,
    FiMapPin,
    FiEye,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiFileText,
    FiThumbsUp,
    FiThumbsDown,
    FiMessageSquare,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import "../../../css/Admin/laporanKegiatan.css";

const PAGE_SIZE = 6;

const TABS = [
    { key: "all", label: "Semua" },
    { key: "pending", label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
];

const DEFAULT_ADMIN_NAME = "Admin Kemenkum Riau";

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
        () => (Array.isArray(rows) ? rows : []).map(normalizeRow),
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
    }, [tab, debouncedQ]);

    useEffect(() => {
        setRejectMode(false);
        setRejectNote("");
        setErr("");
    }, [detailId]);

    const stats = useMemo(() => {
        const base = {
            total: displayRows.length,
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        for (const row of displayRows) {
            const key = uiStatusKey(row?.status);
            if (key === "approved") base.approved += 1;
            else if (key === "rejected") base.rejected += 1;
            else base.pending += 1;
        }

        return base;
    }, [displayRows]);

    const searchedRows = useMemo(() => {
        const search = norm(debouncedQ);
        if (!search) return displayRows;

        return displayRows.filter((row) => {
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
    }, [displayRows, debouncedQ]);

    const tabCounts = useMemo(() => {
        const counts = {
            all: searchedRows.length,
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        for (const row of searchedRows) {
            const key = uiStatusKey(row?.status);
            counts[key] += 1;
        }

        return counts;
    }, [searchedRows]);

    const filteredRows = useMemo(() => {
        if (tab === "all") return searchedRows;
        return searchedRows.filter((row) => uiStatusKey(row?.status) === tab);
    }, [searchedRows, tab]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const pageClamped = Math.min(Math.max(page, 1), totalPages);

    const pageItems = useMemo(() => {
        const start = (pageClamped - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, pageClamped]);

    const resetFilters = () => {
        setQ("");
        setDebouncedQ("");
        setTab("all");
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
                        className="rk-tabs"
                        role="tablist"
                        aria-label="Filter status laporan"
                    >
                        {TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`rk-tab ${tab === item.key ? "is-active" : ""}`}
                                onClick={() => setTab(item.key)}
                            >
                                <span>{item.label}</span>
                                <span className="rk-tabCount">
                                    {tabCounts[item.key] || 0}
                                </span>
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

                                {Array.from(
                                    { length: totalPages },
                                    (_, index) => index + 1,
                                ).map((pageNumber) => (
                                    <button
                                        key={pageNumber}
                                        className={`rk-pageBtn ${pageClamped === pageNumber ? "is-active" : ""}`}
                                        type="button"
                                        onClick={() => setPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </button>
                                ))}

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
