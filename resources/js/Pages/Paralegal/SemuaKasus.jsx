import { AiOutlineBarChart } from "react-icons/ai";
import { HiOutlineScale } from "react-icons/hi";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiCalendar,
    FiCheckCircle,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiDownload,
    FiEye,
    FiFileText,
    FiMapPin,
    FiSearch,
    FiUser,
    FiUsers,
    FiX,
} from "react-icons/fi";
import { BsSliders2 } from "react-icons/bs";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import posbankumIcon from "../../assets/icon.png";
import "../../../css/Paralegal/semuaKasus.css";

const PAGE_SIZE = 9;

const CATEGORY_OPTIONS = [
    "Semua",
    "Hukum Pidana",
    "Hukum Perdata",
    "Hukum Keluarga",
    "Hukum Ketenagakerjaan",
    "Hukum Waris",
    "Pertanahan",
];

const STATUS_OPTIONS = ["Semua", "Diproses", "Mediasi", "Selesai"];
const PRIORITY_OPTIONS = ["Semua", "Rendah", "Sedang", "Tinggi"];
const SORT_OPTIONS = ["Terbaru", "Terlama", "Prioritas Tertinggi"];

function firstFilled(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();
        if (text && text.toLowerCase() !== "null" && text !== "-") {
            return text;
        }
    }

    return "-";
}

function numberOr(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return number;
}

function formatShortDateID(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function getPriorityWeight(value) {
    if (value === "Tinggi") return 3;
    if (value === "Sedang") return 2;
    return 1;
}

function normalizeKategori(value) {
    const text = String(value || "").trim();
    const raw = text.toLowerCase();

    if (raw.includes("pidana")) return "Hukum Pidana";
    if (raw.includes("perdata")) return "Hukum Perdata";
    if (raw.includes("keluarga")) return "Hukum Keluarga";
    if (raw.includes("ketenagakerjaan") || raw.includes("kerja")) {
        return "Hukum Ketenagakerjaan";
    }
    if (raw.includes("waris")) return "Hukum Waris";
    if (raw.includes("tanah") || raw.includes("pertanahan")) {
        return "Pertanahan";
    }

    return text || "Lainnya";
}

function normalizePrioritas(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();

    if (["tinggi", "sangat tinggi", "high", "urgent"].includes(raw)) {
        return "Tinggi";
    }
    if (["rendah", "low", "normal"].includes(raw)) return "Rendah";

    return "Sedang";
}

function normalizeStatus(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();

    if (
        ["selesai", "done", "completed", "complete", "diterima"].includes(raw)
    ) {
        return "Selesai";
    }
    if (raw === "mediasi" || raw === "mediation") return "Mediasi";

    return "Diproses";
}

function ensurePosbankumPrefix(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return "Posbankum Belum Dipetakan";
    if (text.toLowerCase().startsWith("posbankum")) return text;
    return `Posbankum ${text}`;
}

function removePosbankumPrefix(value) {
    return String(value || "")
        .trim()
        .replace(/^posbankum\s+/i, "")
        .trim();
}

function clampText(value, limit = 120) {
    const text = String(value || "").trim();
    if (!text) return "Belum ada deskripsi kasus.";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}...`;
}

function getStatusIcon(status) {
    if (status === "Selesai") return <FiCheckCircle />;
    if (status === "Mediasi") return <FiUsers />;
    return <FiClock />;
}

function normalizeCase(row, index = 0) {
    const status = normalizeStatus(row?.status);
    const prioritas = normalizePrioritas(row?.prioritas || row?.priority);
    const progress = Number.isFinite(Number(row?.progress))
        ? Math.max(0, Math.min(100, Number(row.progress)))
        : status === "Selesai"
          ? 100
          : status === "Mediasi"
            ? 60
            : 45;

    const posbankum = ensurePosbankumPrefix(
        row?.posbankum || row?.nama_posbankum || row?.posbankum_nama,
    );

    const wilayah = firstFilled(
        row?.wilayah,
        row?.kabupaten_kota,
        row?.kota,
        row?.kabupaten,
        row?.kecamatan,
        row?.lokasi_kejadian,
        row?.lokasi,
        row?.alamat,
        row?.location,
    );

    return {
        id: firstFilled(
            row?.nomor_pengaduan,
            row?.id_pengaduan,
            row?.id_kasus,
            row?.id,
            `KASUS-${index + 1}`,
        ),
        sourceIds: [
            row?.nomor_pengaduan,
            row?.id_pengaduan,
            row?.id_kasus,
            row?.id,
        ].filter(
            (value) =>
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "",
        ),
        id_pengaduan: firstFilled(
            row?.id_pengaduan,
            row?.id,
            `kasus-${index + 1}`,
        ),
        judul: firstFilled(
            row?.judul,
            row?.judul_pengaduan,
            row?.judul_laporan,
            row?.title,
            row?.jenis_masalah,
            "Tanpa Judul",
        ),
        kategori: normalizeKategori(
            row?.kategori || row?.jenis_masalah || row?.kategori_masalah,
        ),
        status,
        prioritas,
        progress,
        posbankum,
        posbankumPlain: removePosbankumPrefix(posbankum),
        kota: wilayah,
        wilayah,
        provinsi: firstFilled(row?.provinsi, "Riau"),
        pelapor: firstFilled(row?.pelapor, row?.nama_pelapor),
        paralegal: firstFilled(
            row?.paralegal,
            row?.paralegal_nama,
            row?.nama_paralegal,
            row?.nama_paralegal_ditugaskan,
            "Paralegal Belum Diisi",
        ),
        paralegalPhone: firstFilled(
            row?.paralegalPhone,
            row?.paralegal_hp,
            row?.nomor_telepon_paralegal,
            row?.no_hp_paralegal,
            row?.nomor_tlp,
        ),
        emailPosbankum: firstFilled(
            row?.emailPosbankum,
            row?.email_akun,
            row?.email,
        ),
        tanggalLapor:
            row?.tanggalLapor ||
            row?.created_at ||
            row?.tgl_lapor ||
            row?.tanggal_kejadian ||
            new Date().toISOString(),
        updateTerakhir:
            row?.updateTerakhir ||
            row?.updated_at ||
            row?.tgl_selesai ||
            row?.created_at ||
            new Date().toISOString(),
        deskripsi: firstFilled(
            row?.deskripsi,
            row?.description,
            row?.kronologi,
            row?.isi_pengaduan,
            "Belum ada deskripsi kasus.",
        ),
        sumberData: firstFilled(row?.sumberData, row?.sumber_data, "Website"),
    };
}

function exportCsv(rows) {
    const headers = [
        "Nomor Kasus",
        "Judul",
        "Kategori",
        "Status",
        "Prioritas",
        "Progress",
        "Posbankum",
        "Wilayah",
        "Pelapor",
        "Paralegal",
        "Tanggal Lapor",
        "Update Terakhir",
    ];
    const escapeValue = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
        headers.join(","),
        ...rows.map((row) =>
            [
                row.id,
                row.judul,
                row.kategori,
                row.status,
                row.prioritas,
                `${row.progress}%`,
                row.posbankum,
                row.wilayah,
                row.pelapor,
                row.paralegal,
                formatShortDateID(row.tanggalLapor),
                formatShortDateID(row.updateTerakhir),
            ]
                .map(escapeValue)
                .join(","),
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "semua-kasus-posbankum-riau.csv";
    a.click();
    URL.revokeObjectURL(url);
}

function percent(value, total) {
    if (!total) return 0;
    return Math.round((value / total) * 1000) / 10;
}

function StatCard({ label, value, tone }) {
    return (
        <div className={`skStatCard skStat-${tone}`}>
            <div className="skStatLabel">{label}</div>
            <div className="skStatValue">{value}</div>
        </div>
    );
}

function SectionCard({ icon, title, children, className = "" }) {
    return (
        <section className={`skSectionCard ${className}`.trim()}>
            <div className="skSectionHead">
                <div className="skSectionIcon" aria-hidden="true">
                    {icon}
                </div>
                <div>
                    <h3>{title}</h3>
                    <span />
                </div>
            </div>
            {children}
        </section>
    );
}

function FieldItem({ label, value }) {
    return (
        <div className="skFieldItem">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function ProgressBar({ value, className = "" }) {
    const width = Math.max(0, Math.min(100, numberOr(value)));

    return (
        <div className={`skProgressTrack ${className}`.trim()}>
            <div className="skProgressFill" style={{ width: `${width}%` }} />
        </div>
    );
}

export default function SemuaKasus({
    cases = [],
    flash = {},
    openDetailId = null,
    openDetailTick = 0,
}) {
    const [search, setSearch] = useState("");
    const [selectedCase, setSelectedCase] = useState(null);
    const [view, setView] = useState("list");
    const [showFilter, setShowFilter] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        kategori: "Semua",
        status: "Semua",
        prioritas: "Semua",
        urutkan: "Terbaru",
    });
    const [draftFilters, setDraftFilters] = useState(filters);
    const [successToast, setSuccessToast] = useState({
        title: "",
        message: "",
    });
    const [rejectToast, setRejectToast] = useState("");
    const lastAutoDetailRef = useRef(null);

    const rows = useMemo(
        () => (Array.isArray(cases) ? cases : []).map(normalizeCase),
        [cases],
    );

    useEffect(() => {
        /*
         * Halaman Semua Kasus tidak memiliki aksi simpan sendiri.
         * Flash success dari menu lain tidak ditampilkan ulang agar toast
         * sukses Kelola Kegiatan tidak muncul lagi saat user berpindah menu.
         */
        if (flash?.error || flash?.reject) {
            setRejectToast(String(flash.error || flash.reject));
        }
    }, [flash?.error, flash?.reject]);

    const stats = useMemo(() => {
        const total = rows.length;
        const selesai = rows.filter((item) => item.status === "Selesai").length;
        const diproses = rows.filter(
            (item) => item.status === "Diproses",
        ).length;
        const mediasi = rows.filter((item) => item.status === "Mediasi").length;
        const tinggi = rows.filter(
            (item) => item.prioritas === "Tinggi",
        ).length;

        return { total, selesai, diproses, mediasi, tinggi };
    }, [rows]);

    const categoryStats = useMemo(() => {
        const map = new Map();
        rows.forEach((item) => {
            map.set(item.kategori, (map.get(item.kategori) || 0) + 1);
        });

        return Array.from(map.entries())
            .map(([name, count]) => ({
                name,
                count,
                percent: percent(count, rows.length),
            }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [rows]);

    const posbankumStats = useMemo(() => {
        const map = new Map();
        rows.forEach((item) => {
            const name =
                removePosbankumPrefix(item.posbankum) || "Belum Dipetakan";
            map.set(name, (map.get(name) || 0) + 1);
        });

        return Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [rows]);

    const activeFilterCount = useMemo(
        () =>
            [filters.kategori, filters.status, filters.prioritas].filter(
                (item) => item !== "Semua",
            ).length,
        [filters],
    );

    const hasActiveState = Boolean(search.trim()) || activeFilterCount > 0;

    const filteredCases = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        let result = rows.filter((item) => {
            const combined = [
                item.id,
                item.judul,
                item.kategori,
                item.status,
                item.prioritas,
                item.posbankum,
                item.kota,
                item.wilayah,
                item.pelapor,
                item.paralegal,
            ]
                .join(" ")
                .toLowerCase();

            return (
                (!keyword || combined.includes(keyword)) &&
                (filters.kategori === "Semua" ||
                    item.kategori === filters.kategori) &&
                (filters.status === "Semua" ||
                    item.status === filters.status) &&
                (filters.prioritas === "Semua" ||
                    item.prioritas === filters.prioritas)
            );
        });

        result = [...result].sort((a, b) => {
            if (filters.urutkan === "Terlama") {
                return new Date(a.tanggalLapor) - new Date(b.tanggalLapor);
            }

            if (filters.urutkan === "Prioritas Tertinggi") {
                return (
                    getPriorityWeight(b.prioritas) -
                    getPriorityWeight(a.prioritas)
                );
            }

            return new Date(b.tanggalLapor) - new Date(a.tanggalLapor);
        });

        return result;
    }, [filters, rows, search]);

    useEffect(() => {
        setPage(1);
    }, [filters, search]);

    const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
    const pageClamped = Math.min(Math.max(page, 1), totalPages);
    const pagedCases = filteredCases.slice(
        (pageClamped - 1) * PAGE_SIZE,
        pageClamped * PAGE_SIZE,
    );

    const applyFilters = () => {
        setFilters(draftFilters);
        setShowFilter(false);
    };

    const resetFilters = () => {
        const next = {
            kategori: "Semua",
            status: "Semua",
            prioritas: "Semua",
            urutkan: "Terbaru",
        };
        setDraftFilters(next);
        setFilters(next);
        setSearch("");
    };

    const removeFilter = (key) => {
        const nextValue = key === "urutkan" ? "Terbaru" : "Semua";
        setFilters((previous) => ({ ...previous, [key]: nextValue }));
        setDraftFilters((previous) => ({ ...previous, [key]: nextValue }));
    };

    const openDetail = (item) => {
        setSelectedCase(item);
        setView("detail");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openStatistics = () => {
        setView("statistik");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const backToList = () => {
        setView("list");
        setSelectedCase(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    useEffect(() => {
        if (!openDetailId) return;

        const key = `${openDetailTick}-${openDetailId}`;
        if (lastAutoDetailRef.current === key) return;

        const found = rows.find((item) =>
            [item.id, item.id_pengaduan, ...(item.sourceIds || [])].some(
                (value) => String(value || "") === String(openDetailId),
            ),
        );

        if (!found) return;

        lastAutoDetailRef.current = key;
        openDetail(found);
    }, [openDetailId, openDetailTick, rows]);

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

    if (view === "detail" && selectedCase) {
        return (
            <div className="skWrap">
                {renderToasts()}
                <CaseDetail item={selectedCase} onBack={backToList} />
            </div>
        );
    }

    if (view === "statistik") {
        return (
            <div className="skWrap">
                {renderToasts()}
                <StatisticsPage
                    stats={stats}
                    categoryStats={categoryStats}
                    posbankumStats={posbankumStats}
                    onBack={backToList}
                />
            </div>
        );
    }

    return (
        <div className="skWrap">
            {renderToasts()}

            <div className="skHeaderRow">
                <div>
                    <h1 className="skPageTitle">Semua Kasus Posbankum Riau</h1>
                    <div className="skTitleUnderline" />
                </div>

                <button
                    className="skStatsBtn"
                    type="button"
                    onClick={openStatistics}
                >
                    <AiOutlineBarChart /> Statistik
                </button>
            </div>

            <div className="skStatsGrid">
                <StatCard label="Total Kasus" value={stats.total} tone="blue" />
                <StatCard
                    label="Diproses"
                    value={stats.diproses}
                    tone="yellow"
                />
                <StatCard label="Mediasi" value={stats.mediasi} tone="navy" />
                <StatCard label="Selesai" value={stats.selesai} tone="green" />
                <StatCard
                    label="Prioritas Tinggi"
                    value={stats.tinggi}
                    tone="red"
                />
            </div>

            <div className="skToolbarCard">
                <div className="skToolbarRow">
                    <label className="skSearchBox" aria-label="Cari kasus">
                        <FiSearch />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari berdasarkan nomor kasus, judul, pelapor, atau paralegal..."
                        />
                    </label>

                    <button
                        className="skFilterBtn"
                        type="button"
                        onClick={() => {
                            setDraftFilters(filters);
                            setShowFilter(true);
                        }}
                    >
                        <BsSliders2 /> Filter & Urutkan
                        {activeFilterCount ? (
                            <span className="skFilterCount">
                                {activeFilterCount}
                            </span>
                        ) : null}
                    </button>

                    <button
                        className="skExportBtn"
                        type="button"
                        onClick={() => exportCsv(filteredCases)}
                    >
                        <FiDownload /> Export CSV
                    </button>
                </div>

                {hasActiveState ? (
                    <div className="skActiveFilterBar">
                        <div className="skActiveLeft">
                            <span className="skActiveLabel">Filter Aktif:</span>
                            <div className="skChipWrap">
                                {search.trim() ? (
                                    <button
                                        className="skActiveChip"
                                        type="button"
                                        onClick={() => setSearch("")}
                                    >
                                        Pencarian: &quot;{search.trim()}&quot;
                                        <FiX />
                                    </button>
                                ) : null}
                                {filters.kategori !== "Semua" && (
                                    <button
                                        className="skActiveChip"
                                        type="button"
                                        onClick={() => removeFilter("kategori")}
                                    >
                                        {filters.kategori}
                                        <FiX />
                                    </button>
                                )}
                                {filters.status !== "Semua" && (
                                    <button
                                        className="skActiveChip"
                                        type="button"
                                        onClick={() => removeFilter("status")}
                                    >
                                        {filters.status}
                                        <FiX />
                                    </button>
                                )}
                                {filters.prioritas !== "Semua" && (
                                    <button
                                        className="skActiveChip"
                                        type="button"
                                        onClick={() =>
                                            removeFilter("prioritas")
                                        }
                                    >
                                        {filters.prioritas}
                                        <FiX />
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            className="skResetLink"
                            type="button"
                            onClick={resetFilters}
                        >
                            Reset Semua
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="skResultText">
                Menampilkan{" "}
                <span className="skResultNumber">{pagedCases.length}</span> dari{" "}
                <span className="skResultNumber">{filteredCases.length}</span>{" "}
                kasus
            </div>

            <div className="skCardGrid">
                {pagedCases.length ? (
                    pagedCases.map((item) => (
                        <CaseCard
                            key={`${item.id}-${item.id_pengaduan}`}
                            item={item}
                            onDetail={openDetail}
                        />
                    ))
                ) : (
                    <div className="skEmptyCard">
                        <div>
                            <HiOutlineScale size={56} />
                            <h2>Belum ada kasus</h2>
                            <p>
                                Data kasus belum tersedia atau tidak sesuai
                                filter.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {filteredCases.length > PAGE_SIZE ? (
                <div className="skPagination" aria-label="Paginasi semua kasus">
                    <button
                        className="skPageArrow"
                        type="button"
                        disabled={pageClamped <= 1}
                        onClick={() =>
                            setPage((value) => Math.max(1, value - 1))
                        }
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
                            type="button"
                            className={`skPageBtn ${pageClamped === pageNumber ? "is-active" : ""}`}
                            onClick={() => setPage(pageNumber)}
                        >
                            {pageNumber}
                        </button>
                    ))}

                    <button
                        className="skPageArrow"
                        type="button"
                        disabled={pageClamped >= totalPages}
                        onClick={() =>
                            setPage((value) => Math.min(totalPages, value + 1))
                        }
                        aria-label="Halaman berikutnya"
                    >
                        <FiChevronRight />
                    </button>
                </div>
            ) : null}

            {showFilter ? (
                <FilterPanel
                    draftFilters={draftFilters}
                    setDraftFilters={setDraftFilters}
                    onClose={() => setShowFilter(false)}
                    onApply={applyFilters}
                    onReset={resetFilters}
                />
            ) : null}
        </div>
    );
}

function CaseCard({ item, onDetail }) {
    return (
        <article className="skCaseCard">
            <div className="skCaseTop">
                <div className="skCaseTopRow">
                    <span className="skCaseNumber">{item.id}</span>
                    <span
                        className={`skPriorityPill skPriority${item.prioritas}`}
                    >
                        {item.prioritas}
                    </span>
                </div>

                <h2 className="skCaseTitle">{item.judul}</h2>

                <div className="skBadgeRow">
                    <span className={`skStatusBadge skStatus${item.status}`}>
                        {getStatusIcon(item.status)} {item.status}
                    </span>
                    <span className="skCategoryBadge">{item.kategori}</span>
                </div>
            </div>

            <div className="skCaseBody">
                <div className="skProgressHead">
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                </div>
                <ProgressBar value={item.progress} />

                <div className="skInfoList">
                    <div className="skInfoItem skInfoItemPosbankum">
                        <span className="skSmallIconBox" aria-hidden="true">
                            <span
                                className="skMaskIcon"
                                style={{
                                    "--mask-url": `url(${posbankumIcon})`,
                                }}
                            />
                        </span>
                        <strong>{item.posbankum}</strong>
                    </div>
                    <div className="skInfoItem">
                        <FiMapPin /> {item.wilayah}
                    </div>
                    <div className="skInfoItem">
                        <FiUser /> Pelapor: {item.pelapor}
                    </div>
                    <div className="skInfoItem">
                        <HiOutlineScale /> Paralegal: {item.paralegal}
                    </div>
                    <div className="skInfoItem">
                        <FiCalendar /> {formatShortDateID(item.tanggalLapor)}
                    </div>
                </div>

                <p className="skCaseDesc">{clampText(item.deskripsi, 118)}</p>

                <button
                    className="skDetailBtn"
                    type="button"
                    onClick={() => onDetail(item)}
                >
                    <FiEye /> Lihat Detail
                </button>
            </div>
        </article>
    );
}

function FilterPanel({
    draftFilters,
    setDraftFilters,
    onClose,
    onApply,
    onReset,
}) {
    const sections = [
        {
            key: "kategori",
            title: "Kategori Kasus",
            options: CATEGORY_OPTIONS,
        },
        {
            key: "status",
            title: "Status Kasus",
            options: STATUS_OPTIONS,
        },
        {
            key: "prioritas",
            title: "Prioritas",
            options: PRIORITY_OPTIONS,
        },
        {
            key: "urutkan",
            title: "Urutkan Berdasarkan",
            options: SORT_OPTIONS,
            isSort: true,
        },
    ];

    const updateDraftFilter = (key, value) => {
        setDraftFilters((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    return (
        <div className="skModalOverlay" role="presentation">
            <div
                className="skFilterCard"
                role="dialog"
                aria-modal="true"
                aria-labelledby="skFilterModalTitle"
            >
                <div className="skModalHead">
                    <div className="skModalTitle" id="skFilterModalTitle">
                        <BsSliders2 aria-hidden="true" />
                        <span>Filter &amp; Urutkan Kasus</span>
                    </div>
                    <button
                        className="skModalClose"
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup filter"
                    >
                        <FiX />
                    </button>
                </div>

                <div className="skModalBody">
                    {sections.map((section) => (
                        <section
                            className="skFilterSection"
                            key={section.key}
                            aria-labelledby={`sk-filter-${section.key}`}
                        >
                            <h3
                                className="skFilterSectionTitle"
                                id={`sk-filter-${section.key}`}
                            >
                                {section.title}
                            </h3>

                            <div
                                className={`skFilterChoiceGrid ${section.isSort ? "is-sort" : ""}`}
                            >
                                {section.options.map((option) => {
                                    const active =
                                        draftFilters[section.key] === option;

                                    return (
                                        <button
                                            key={option}
                                            className={`skFilterChoice ${active ? "is-active" : ""}`}
                                            type="button"
                                            onClick={() =>
                                                updateDraftFilter(
                                                    section.key,
                                                    option,
                                                )
                                            }
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="skModalActions">
                    <button
                        className="skFooterGhost"
                        type="button"
                        onClick={onReset}
                    >
                        Reset Semua
                    </button>
                    <button
                        className="skFooterPrimary"
                        type="button"
                        onClick={onApply}
                    >
                        Terapkan Filter
                    </button>
                </div>
            </div>
        </div>
    );
}

function CaseDetail({ item, onBack }) {
    return (
        <div className="skDetailPage">
            <div className="skBreadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={onBack}>
                    Semua Kasus Riau
                </button>
                <FiChevronRight aria-hidden="true" />
                <span>Detail Kasus</span>
            </div>

            <div className="skDetailTopbar">
                <div>
                    <h1 className="skPageTitle">Detail Kasus</h1>
                    <div className="skTitleUnderline" />
                </div>

                <button className="skBackBtn" type="button" onClick={onBack}>
                    Kembali ke Daftar
                </button>
            </div>

            <article className="skDetailHeroCard">
                <div className="skDetailHeroHead">
                    <div className="skDetailHeroInfo">
                        <div className="skCaseNoText">No. Kasus: {item.id}</div>
                        <h2>{item.judul}</h2>
                        <div className="skBadgeRow is-detail">
                            <span
                                className={`skStatusBadge skStatus${item.status}`}
                            >
                                {getStatusIcon(item.status)} {item.status}
                            </span>
                            <span
                                className={`skPriorityPill skPriority${item.prioritas}`}
                            >
                                Prioritas {item.prioritas}
                            </span>
                            <span className="skCategoryBadge is-detail">
                                <HiOutlineScale /> {item.kategori}
                            </span>
                        </div>
                    </div>

                    <div className="skDetailDateBox">
                        <div>
                            <span>Tanggal Lapor</span>
                            <strong>
                                {formatShortDateID(item.tanggalLapor)}
                            </strong>
                        </div>
                        <div>
                            <span>Update Terakhir</span>
                            <strong>
                                {formatShortDateID(item.updateTerakhir)}
                            </strong>
                        </div>
                        <div>
                            <span>Progress</span>
                            <strong>{item.progress}%</strong>
                        </div>
                    </div>
                </div>

                <div className="skHeroProgressBlock">
                    <div className="skProgressHead is-hero">
                        <span>Progress Penanganan</span>
                        <span>{item.progress}%</span>
                    </div>
                    <ProgressBar value={item.progress} className="is-wide" />
                </div>
            </article>

            <div className="skDetailMainGrid">
                <div className="skDetailLeft">
                    <SectionCard icon={<FiFileText />} title="Ringkasan Kasus">
                        <div className="skSummaryBox">{item.deskripsi}</div>
                    </SectionCard>

                    <SectionCard
                        icon={<FiUser />}
                        title="Data Pelapor dan Penanganan"
                    >
                        <div className="skFieldGrid skFieldGridThree">
                            <FieldItem label="Pelapor" value={item.pelapor} />
                            <FieldItem
                                label="Paralegal"
                                value={item.paralegal}
                            />
                            <FieldItem
                                label="No. HP Paralegal"
                                value={item.paralegalPhone}
                            />
                            <FieldItem label="Kategori" value={item.kategori} />
                            <FieldItem label="Status" value={item.status} />
                            <FieldItem
                                label="Prioritas"
                                value={item.prioritas}
                            />
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={<AiOutlineBarChart />}
                        title="Status Penanganan"
                    >
                        <div className="skFieldGrid skFieldGridThree">
                            <FieldItem
                                label="Tanggal Laporan"
                                value={formatShortDateID(item.tanggalLapor)}
                            />
                            <FieldItem
                                label="Update Terakhir"
                                value={formatShortDateID(item.updateTerakhir)}
                            />
                            <FieldItem
                                label="Persentase Progress"
                                value={`${item.progress}%`}
                            />
                        </div>
                    </SectionCard>
                </div>

                <aside className="skDetailSide">
                    <SectionCard icon={<FiFileText />} title="Posbankum">
                        <div className="skSideList">
                            <FieldItem
                                label="Nama Posbankum"
                                value={item.posbankum}
                            />
                            <FieldItem
                                label="Kabupaten/Kota"
                                value={item.wilayah}
                            />
                        </div>
                    </SectionCard>

                    <SectionCard icon={<FiMapPin />} title="Informasi Wilayah">
                        <div className="skSideList">
                            <FieldItem label="Provinsi" value={item.provinsi} />
                            <FieldItem label="Wilayah" value={item.wilayah} />
                            <FieldItem
                                label="Unit Layanan"
                                value={item.posbankum}
                            />
                        </div>
                    </SectionCard>
                </aside>
            </div>
        </div>
    );
}

function StatisticsPage({ stats, categoryStats, posbankumStats, onBack }) {
    return (
        <div className="skStatisticPage">
            <div className="skBreadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={onBack}>
                    Semua Kasus Riau
                </button>
                <FiChevronRight aria-hidden="true" />
                <span>Statistik</span>
            </div>

            <div className="skDetailTopbar skStatisticTopbar">
                <div>
                    <h1 className="skPageTitle">
                        Statistik Kasus Posbankum Riau
                    </h1>
                    <div className="skTitleUnderline" />
                </div>

                <button className="skBackBtn" type="button" onClick={onBack}>
                    <FiChevronLeft /> Kembali ke Semua Kasus
                </button>
            </div>

            <div className="skStatsGrid skStatsGridStatistic">
                <StatCard label="Total Kasus" value={stats.total} tone="blue" />
                <StatCard
                    label="Diproses"
                    value={stats.diproses}
                    tone="yellow"
                />
                <StatCard label="Mediasi" value={stats.mediasi} tone="navy" />
                <StatCard label="Selesai" value={stats.selesai} tone="green" />
                <StatCard
                    label="Prioritas Tinggi"
                    value={stats.tinggi}
                    tone="red"
                />
            </div>

            <SectionCard
                icon={<AiOutlineBarChart />}
                title="Kasus Berdasarkan Kategori"
                className="skStatisticSection"
            >
                <div className="skBarList">
                    {categoryStats.length ? (
                        categoryStats.map((item) => (
                            <div className="skBarItem" key={item.name}>
                                <div className="skBarMeta">
                                    <strong>{item.name}</strong>
                                    <span>
                                        {item.count} kasus ({item.percent}%)
                                    </span>
                                </div>
                                <ProgressBar value={item.percent} />
                            </div>
                        ))
                    ) : (
                        <div className="skStatEmpty">
                            Belum ada data kategori.
                        </div>
                    )}
                </div>
            </SectionCard>

            <SectionCard
                icon={
                    <span
                        className="skMaskIcon skMaskBlue"
                        style={{
                            "--mask-url": `url(${posbankumIcon})`,
                        }}
                    />
                }
                title="Kasus Berdasarkan Posbankum"
                className="skStatisticSection"
            >
                <div className="skPosStatGrid">
                    {posbankumStats.length ? (
                        posbankumStats.map((item) => (
                            <div className="skPosStatItem" key={item.name}>
                                <div>
                                    <span
                                        className="skMaskIcon"
                                        style={{
                                            "--mask-url": `url(${posbankumIcon})`,
                                        }}
                                    />
                                    <strong>{item.name}</strong>
                                </div>
                                <span>{item.count}</span>
                            </div>
                        ))
                    ) : (
                        <div className="skStatEmpty">
                            Belum ada data posbankum.
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}
