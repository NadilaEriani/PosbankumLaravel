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
    FiUsers,
    FiThumbsUp,
    FiThumbsDown,
    FiMessageSquare,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import "../../../css/laporanKegiatan.css";

const PAGE_SIZE = 6;

const TABS = [
    { key: "all", label: "Semua" },
    { key: "pending", label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
];

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
        ["deskripsi", "description", "uraian", "catatan"],
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
    const jumlahPeserta = firstValue(
        row,
        ["jumlah_peserta", "participants", "peserta", "jml_peserta"],
        0,
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
        jumlah_peserta: jumlahPeserta,
        anggota_terlibat: firstValue(row, ["anggota_terlibat"], ""),
        kategori: firstValue(row, ["kategori", "jenis_kegiatan"], ""),
        posbankum,
        posbankumName: firstValue(
            row,
            ["posbankumName", "posbankum_nama"],
            posbankum.nama,
        ),
    };
}

function uiStatusKey(statusDb) {
    const status = norm(statusDb);

    if (
        [
            "diterima",
            "disetujui",
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
    if (key === "rejected")
        return <AiOutlineCloseCircle className={className} />;
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

    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
        return value;
    }

    const clean = value.replace(/^public\//, "").replace(/^\/+/, "");
    if (clean.startsWith("storage/")) return `/${clean}`;

    return `/storage/${clean}`;
}

function kegiatanStatusUrl(idKegiatan) {
    return `/admin/laporan-kegiatan/${encodeURIComponent(idKegiatan)}/status`;
}

function errorMessageFromPayload(errors, fallback) {
    if (!errors || typeof errors !== "object") return fallback;

    const messages = Object.values(errors).flat().filter(Boolean).join(" ");

    return messages || fallback;
}

export default function LaporanKegiatan({ rows = [] }) {
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [tab, setTab] = useState("all");
    const [page, setPage] = useState(1);

    const [err, setErr] = useState("");
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectNote, setRejectNote] = useState("");

    const [successToast, setSuccessToast] = useState({
        title: "",
        message: "",
    });
    const [rejectToast, setRejectToast] = useState("");

    const normalizedRows = useMemo(
        () => (Array.isArray(rows) ? rows : []).map(normalizeRow),
        [rows],
    );

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
        if (!detailOpen && !rejectOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                if (rejectOpen) closeRejectModal();
                else closeDetailModal();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailOpen, rejectOpen, saving]);

    const stats = useMemo(() => {
        const base = {
            total: normalizedRows.length,
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        for (const row of normalizedRows) {
            const key = uiStatusKey(row?.status);
            if (key === "approved") base.approved += 1;
            else if (key === "rejected") base.rejected += 1;
            else base.pending += 1;
        }

        return base;
    }, [normalizedRows]);

    const searchedRows = useMemo(() => {
        const search = norm(debouncedQ);
        if (!search) return normalizedRows;

        return normalizedRows.filter((row) => {
            const haystack = [
                row?.judul,
                row?.deskripsi,
                row?.lokasi,
                row?.kategori,
                row?.posbankum?.nama,
                row?.posbankum?.kecamatan?.nama,
                row?.posbankum?.kabupaten?.nama,
            ]
                .map((item) => norm(item))
                .join(" ");

            return haystack.includes(search);
        });
    }, [normalizedRows, debouncedQ]);

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

    const openDetailModal = (item) => {
        setSelected(item);
        setDetailOpen(true);
        setRejectOpen(false);
        setRejectNote("");
        setErr("");
    };

    const closeDetailModal = () => {
        if (saving) return;
        setDetailOpen(false);
        setRejectOpen(false);
        setRejectNote("");
        setSelected(null);
    };

    const openRejectModal = () => {
        setRejectNote(
            isRejected(selected?.status) ? selected?.catatan || "" : "",
        );
        setRejectOpen(true);
        setErr("");
    };

    const closeRejectModal = () => {
        if (saving) return;
        setRejectOpen(false);
        setRejectNote("");
    };

    const resetFilters = () => {
        setQ("");
        setDebouncedQ("");
        setTab("all");
        setPage(1);
    };

    const finishAction = () => {
        setSaving(false);
    };

    const approve = () => {
        if (!selected?.id_kegiatan) return;

        setSaving(true);
        setErr("");

        router.patch(
            kegiatanStatusUrl(selected.id_kegiatan),
            { status: "Diterima" },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setDetailOpen(false);
                    setRejectOpen(false);
                    setRejectNote("");
                    setSelected(null);
                    setSuccessToast({
                        title: "Laporan Kegiatan Disetujui!",
                        message: "Laporan kegiatan telah berhasil di setujui",
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

    const reject = () => {
        if (!selected?.id_kegiatan) return;

        const note = rejectNote.trim();
        if (!note) {
            setErr("Catatan penolakan wajib diisi.");
            return;
        }

        setSaving(true);
        setErr("");

        router.patch(
            kegiatanStatusUrl(selected.id_kegiatan),
            { status: "Ditolak", catatan: note },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setDetailOpen(false);
                    setRejectOpen(false);
                    setRejectNote("");
                    setSelected(null);
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

    const selectedThumb = selected ? getThumbUrl(selected) : null;
    const selectedStatusKey = uiStatusKey(selected?.status);
    const selectedPosName = selectedPosNameForRow(selected);
    const selectedPelapor = safeText(
        selected?.posbankum?.nama_paralegal ||
            selected?.pelapor ||
            selected?.posbankum?.nama,
    );
    const selectedLokasi = safeText(selected?.lokasi);
    const selectedPeserta = Number(selected?.jumlah_peserta);
    const selectedPesertaText = Number.isFinite(selectedPeserta)
        ? `${selectedPeserta} Orang`
        : "-";
    const selectedDokumentasi =
        selected?.thumbnail_path || selected?.thumbnail_url
            ? "1 Foto"
            : "0 Foto";

    return (
        <section className="ad-pagePad">
            <div className="rk-wrap">
                <SuccessToast
                    title={successToast.title}
                    message={successToast.message}
                    onClose={() => setSuccessToast({ title: "", message: "" })}
                />
                <RejectToast
                    message={rejectToast}
                    onClose={() => setRejectToast("")}
                />

                <div className="ad-pageHeader">
                    <div className="ad-pageTitleWrap">
                        <h1 className="ad-wireTitle">
                            Laporan Kegiatan Posbankum
                        </h1>
                    </div>
                </div>

                <div className="rk-statGrid">
                    <div className="rk-statCard is-total">
                        <div className="rk-statIcon" aria-hidden="true">
                            <FiFileText />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Total Laporan</div>
                            <div className="rk-statValue">{stats.total}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-pending">
                        <div className="rk-statIcon" aria-hidden="true">
                            <FiClock />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Menunggu</div>
                            <div className="rk-statValue">{stats.pending}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-approved">
                        <div className="rk-statIcon" aria-hidden="true">
                            <BsCheck2Circle />
                        </div>
                        <div className="rk-statBody">
                            <div className="rk-statLabel">Disetujui</div>
                            <div className="rk-statValue">{stats.approved}</div>
                        </div>
                    </div>

                    <div className="rk-statCard is-rejected">
                        <div className="rk-statIcon" aria-hidden="true">
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
                                const peserta = Number(item.jumlah_peserta);
                                const pesertaText = Number.isFinite(peserta)
                                    ? `${peserta} Peserta`
                                    : "0 Peserta";
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

                                            <div className="rk-cardMeta">
                                                <FiUsers />
                                                <span>{pesertaText}</span>
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
                                                    openDetailModal(item)
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

                {detailOpen && selected ? (
                    <div
                        className="rk-modalOverlay"
                        onMouseDown={closeDetailModal}
                    >
                        <section
                            className="rk-detailModal"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Detail laporan kegiatan"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div
                                className="rk-detailHero"
                                style={
                                    selectedThumb
                                        ? {
                                              backgroundImage: `url(${selectedThumb})`,
                                          }
                                        : undefined
                                }
                            >
                                <div className="rk-detailHeroShade" />

                                {renderStatusPill(
                                    selected.status,
                                    "rk-detailStatus",
                                )}

                                <button
                                    className="rk-detailClose"
                                    type="button"
                                    onClick={closeDetailModal}
                                    disabled={saving}
                                    aria-label="Tutup detail"
                                >
                                    <FiX />
                                </button>

                                <div className="rk-detailHeroText">
                                    <h2>{safeText(selected.judul)}</h2>
                                    <div className="rk-detailHeroMeta">
                                        <span>
                                            <FiMapPin />
                                            {selectedPosName}
                                        </span>
                                        <span>
                                            <FiCalendar />
                                            {formatDate(
                                                selected.tgl_mulai ||
                                                    selected.tgl_upload,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rk-detailContent">
                                <div className="rk-detailInfoGrid">
                                    <div className="rk-infoBox">
                                        <span>Tanggal Pelaksanaan</span>
                                        <strong>
                                            {formatDate(selected.tgl_mulai)}
                                        </strong>
                                    </div>

                                    <div className="rk-infoBox">
                                        <span>Tanggal Laporan</span>
                                        <strong>
                                            {formatDate(selected.tgl_upload)}
                                        </strong>
                                    </div>

                                    <div className="rk-infoBox">
                                        <span>Lokasi Kegiatan</span>
                                        <strong>{selectedLokasi}</strong>
                                    </div>

                                    <div className="rk-infoBox">
                                        <span>Jumlah Peserta</span>
                                        <strong>{selectedPesertaText}</strong>
                                    </div>

                                    <div className="rk-infoBox">
                                        <span>Pelapor</span>
                                        <strong>{selectedPelapor}</strong>
                                    </div>

                                    <div className="rk-infoBox">
                                        <span>Dokumentasi</span>
                                        <strong>{selectedDokumentasi}</strong>
                                    </div>
                                </div>

                                <div className="rk-detailSection">
                                    <h3>Deskripsi Kegiatan</h3>
                                    <p>{safeText(selected.deskripsi)}</p>
                                </div>

                                {selectedStatusKey === "rejected" ? (
                                    <div className="rk-detailSection rk-detailSectionReject">
                                        <h3>Catatan Penolakan</h3>
                                        <p>{safeText(selected.catatan)}</p>
                                    </div>
                                ) : (
                                    <div className="rk-detailSection rk-detailSectionResult">
                                        <h3>Hasil Kegiatan</h3>
                                        <p>
                                            {safeText(selected.hasil_kegiatan)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedStatusKey === "pending" ? (
                                <div className="rk-detailActions">
                                    <button
                                        className="rk-actionBtn is-neutral"
                                        type="button"
                                        onClick={closeDetailModal}
                                        disabled={saving}
                                    >
                                        Tutup
                                    </button>

                                    <button
                                        className="rk-actionBtn is-reject"
                                        type="button"
                                        onClick={openRejectModal}
                                        disabled={saving}
                                    >
                                        <FiThumbsDown />
                                        Tolak
                                    </button>

                                    <button
                                        className="rk-actionBtn is-approve"
                                        type="button"
                                        onClick={approve}
                                        disabled={saving}
                                    >
                                        <FiThumbsUp />
                                        Terima
                                    </button>
                                </div>
                            ) : (
                                <div className="rk-detailActions">
                                    <button
                                        className="rk-actionBtn is-neutral"
                                        type="button"
                                        onClick={closeDetailModal}
                                        disabled={saving}
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}

                            {rejectOpen ? (
                                <div
                                    className="rk-rejectOverlay"
                                    onMouseDown={closeRejectModal}
                                >
                                    <section
                                        className="rk-rejectModal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Tolak laporan kegiatan"
                                        onMouseDown={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        <div className="rk-rejectHead">
                                            <div className="rk-rejectHeadIcon">
                                                <FiMessageSquare />
                                            </div>
                                            <div>
                                                <h2>Tolak Laporan Kegiatan</h2>
                                                <p>
                                                    Berikan catatan untuk
                                                    perbaikan laporan
                                                </p>
                                            </div>

                                            <button
                                                className="rk-rejectClose"
                                                type="button"
                                                onClick={closeRejectModal}
                                                disabled={saving}
                                                aria-label="Tutup popup penolakan"
                                            >
                                                <FiX />
                                            </button>
                                        </div>

                                        <div className="rk-rejectBody">
                                            <label
                                                className="rk-rejectLabel"
                                                htmlFor="rkRejectNote"
                                            >
                                                Catatan Penolakan <span>*</span>
                                            </label>
                                            <textarea
                                                id="rkRejectNote"
                                                className="rk-rejectTextarea"
                                                value={rejectNote}
                                                onChange={(event) =>
                                                    setRejectNote(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Jelaskan alasan penolakan dan apa yang perlu diperbaiki oleh paralegal..."
                                            />
                                            <p className="rk-rejectHelp">
                                                Catatan ini akan dikirimkan ke
                                                paralegal untuk perbaikan
                                                laporan kegiatan.
                                            </p>

                                            <div className="rk-rejectActions">
                                                <button
                                                    className="rk-rejectCancel"
                                                    type="button"
                                                    onClick={closeRejectModal}
                                                    disabled={saving}
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    className="rk-rejectSubmit"
                                                    type="button"
                                                    onClick={reject}
                                                    disabled={saving}
                                                >
                                                    Tolak Laporan
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : null}
                        </section>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

function selectedPosNameForRow(item) {
    const name = safeText(
        item?.posbankum?.nama || item?.posbankumName || item?.posbankum_nama,
    );
    if (name === "-") return name;
    return /^posbankum\b/i.test(name) ? name : `Posbankum ${name}`;
}
