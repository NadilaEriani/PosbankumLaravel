import { HiOutlineScale } from "react-icons/hi";
import { AiOutlineBarChart } from "react-icons/ai";
import { useEffect, useMemo, useState } from "react";
import {
    FiCheckCircle,
    FiClock,
    FiDownload,
    FiEye,
    FiMail,
    FiMapPin,
    FiSearch,
    FiUser,
    FiUsers,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiCalendar,
} from "react-icons/fi";
import { BsSliders2, BsTelephone } from "react-icons/bs";
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
        if (text && text.toLowerCase() !== "null" && text !== "-") return text;
    }
    return "-";
}

function formatShortDateID(value) {
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
    if (raw.includes("ketenagakerjaan") || raw.includes("kerja"))
        return "Hukum Ketenagakerjaan";
    if (raw.includes("waris")) return "Hukum Waris";
    if (raw.includes("tanah") || raw.includes("pertanahan"))
        return "Pertanahan";
    return text || "Lainnya";
}

function normalizePrioritas(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (raw === "tinggi" || raw === "high") return "Tinggi";
    if (raw === "rendah" || raw === "low") return "Rendah";
    return "Sedang";
}

function normalizeStatus(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (["selesai", "done", "completed", "complete", "diterima"].includes(raw))
        return "Selesai";
    if (raw === "mediasi" || raw === "mediation") return "Mediasi";
    return "Diproses";
}

function ensurePosbankumPrefix(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return "Posbankum Belum Dipetakan";
    if (text.toLowerCase().startsWith("posbankum")) return text;
    return `Posbankum ${text}`;
}

function getStatusIcon(status) {
    if (status === "Selesai") return <FiCheckCircle />;
    if (status === "Mediasi") return <FiUsers />;
    return <FiClock />;
}

function normalizeCase(row, index = 0) {
    const status = normalizeStatus(row?.status);
    const prioritas = normalizePrioritas(row?.prioritas || row?.priority);
    return {
        id: firstFilled(
            row?.nomor_pengaduan,
            row?.id_pengaduan,
            row?.id_kasus,
            row?.id,
            `KASUS-${index + 1}`,
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
        progress: Number.isFinite(Number(row?.progress))
            ? Math.max(0, Math.min(100, Number(row.progress)))
            : status === "Selesai"
              ? 100
              : status === "Mediasi"
                ? 60
                : 25,
        posbankum: ensurePosbankumPrefix(
            row?.posbankum || row?.nama_posbankum || row?.posbankum_nama,
        ),
        kota: firstFilled(
            row?.kota,
            row?.lokasi_kejadian,
            row?.lokasi,
            row?.alamat,
            row?.location,
        ),
        pelapor: firstFilled(row?.pelapor, row?.nama_pelapor),
        paralegal: firstFilled(
            row?.paralegal,
            row?.paralegal_nama,
            row?.nama_paralegal,
            "Paralegal Belum Diisi",
        ),
        paralegalPhone: firstFilled(
            row?.paralegalPhone,
            row?.paralegal_hp,
            row?.nomor_telepon_paralegal,
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
            row?.tanggal_kejadian ||
            row?.tgl_lapor ||
            new Date().toISOString(),
        updateTerakhir:
            row?.updateTerakhir ||
            row?.updated_at ||
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
        "Posbankum",
        "Kota",
        "Pelapor",
        "Paralegal",
        "Tanggal Lapor",
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
                row.posbankum,
                row.kota,
                row.pelapor,
                row.paralegal,
                formatShortDateID(row.tanggalLapor),
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

export default function SemuaKasus({ cases = [] }) {
    const [search, setSearch] = useState("");
    const [selectedCase, setSelectedCase] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showStat, setShowStat] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        kategori: "Semua",
        status: "Semua",
        prioritas: "Semua",
        urutkan: "Terbaru",
    });
    const [draftFilters, setDraftFilters] = useState(filters);

    const rows = useMemo(() => (cases || []).map(normalizeCase), [cases]);

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

    const activeFilterCount = useMemo(
        () =>
            [filters.kategori, filters.status, filters.prioritas].filter(
                (item) => item !== "Semua",
            ).length,
        [filters],
    );

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
            if (filters.urutkan === "Terlama")
                return new Date(a.tanggalLapor) - new Date(b.tanggalLapor);
            if (filters.urutkan === "Prioritas Tertinggi")
                return (
                    getPriorityWeight(b.prioritas) -
                    getPriorityWeight(a.prioritas)
                );
            return new Date(b.tanggalLapor) - new Date(a.tanggalLapor);
        });
        return result;
    }, [filters, rows, search]);

    useEffect(() => setPage(1), [filters, search]);

    const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
    const pagedCases = filteredCases.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
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
    };

    const openDetail = (item) => {
        setSelectedCase(item);
        setShowDetail(true);
    };

    return (
        <div className="skWrap">
            <div className="skHeaderRow">
                <div>
                    <h1 className="skPageTitle">Semua Kasus</h1>
                    <div className="skTitleUnderline" />
                </div>
            </div>

            <div className="skStatsGrid">
                <div className="skStatCard skBlue">
                    <div className="skStatLabel">Total Kasus</div>
                    <div className="skStatValue">{stats.total}</div>
                </div>
                <div className="skStatCard skYellow">
                    <div className="skStatLabel">Diproses</div>
                    <div className="skStatValue">{stats.diproses}</div>
                </div>
                <div className="skStatCard skOrange">
                    <div className="skStatLabel">Mediasi</div>
                    <div className="skStatValue">{stats.mediasi}</div>
                </div>
                <div className="skStatCard skGreen">
                    <div className="skStatLabel">Selesai</div>
                    <div className="skStatValue">{stats.selesai}</div>
                </div>
                <div className="skStatCard skRed">
                    <div className="skStatLabel">Prioritas Tinggi</div>
                    <div className="skStatValue">{stats.tinggi}</div>
                </div>
            </div>

            <div className="skToolbarCard">
                <div className="skToolbarRow">
                    <div className="skSearchBox">
                        <FiSearch />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kasus, pelapor, posbankum..."
                        />
                    </div>
                    <button
                        className="skFilterBtn"
                        type="button"
                        onClick={() => {
                            setDraftFilters(filters);
                            setShowFilter(true);
                        }}
                    >
                        <BsSliders2 /> Filter{" "}
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
                        <FiDownload /> Export
                    </button>
                </div>
                {activeFilterCount ? (
                    <div className="skActiveFilterBar">
                        <div className="skActiveLeft">
                            <span className="skActiveLabel">Filter aktif:</span>
                            <div className="skChipWrap">
                                {filters.kategori !== "Semua" && (
                                    <span className="skActiveChip">
                                        {filters.kategori}
                                    </span>
                                )}
                                {filters.status !== "Semua" && (
                                    <span className="skActiveChip">
                                        {filters.status}
                                    </span>
                                )}
                                {filters.prioritas !== "Semua" && (
                                    <span className="skActiveChip">
                                        {filters.prioritas}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            className="skResetLink"
                            type="button"
                            onClick={resetFilters}
                        >
                            Reset
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="skResultText">
                Menampilkan{" "}
                <span className="skResultNumber">{filteredCases.length}</span>{" "}
                kasus
            </div>

            <div className="skCardGrid">
                {pagedCases.length ? (
                    pagedCases.map((item) => (
                        <article className="skCaseCard" key={item.id}>
                            <div className="skCaseTop">
                                <div className="skCaseTopRow">
                                    <span className="skCaseNumber">
                                        {item.id}
                                    </span>
                                    <span
                                        className={`skPriorityPill skPriority${item.prioritas}`}
                                    >
                                        {item.prioritas}
                                    </span>
                                </div>
                                <div className="skCaseTitle">{item.judul}</div>
                                <div className="skBadgeRow">
                                    <span
                                        className={`skStatusBadge skStatus${item.status}`}
                                    >
                                        {getStatusIcon(item.status)}{" "}
                                        {item.status}
                                    </span>
                                    <span className="skCategoryBadge">
                                        {item.kategori}
                                    </span>
                                </div>
                            </div>
                            <div className="skCaseBody">
                                <div className="skProgressHead">
                                    <span>Progress</span>
                                    <span>{item.progress}%</span>
                                </div>
                                <div className="skProgressTrack">
                                    <div
                                        className="skProgressFill"
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                                <div className="skInfoList">
                                    <div className="skInfoItem">
                                        <FiMapPin /> {item.posbankum}
                                    </div>
                                    <div className="skInfoItem">
                                        <span
                                            className="skMaskIcon"
                                            style={{
                                                "--mask-url": `url(${posbankumIcon})`,
                                            }}
                                        />{" "}
                                        {item.kota}
                                    </div>
                                    <div className="skInfoItem">
                                        <FiUser /> {item.pelapor}
                                    </div>
                                    <div className="skInfoItem">
                                        <FiCalendar />{" "}
                                        {formatShortDateID(item.tanggalLapor)}
                                    </div>
                                </div>
                                <button
                                    className="skDetailBtn"
                                    type="button"
                                    onClick={() => openDetail(item)}
                                >
                                    <FiEye /> Lihat Detail
                                </button>
                            </div>
                        </article>
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

            {filteredCases.length > PAGE_SIZE && (
                <div className="skPagination">
                    <button
                        className="skPageArrow"
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        <FiChevronLeft />
                    </button>
                    <span className="skPageInfo">
                        Halaman {page} dari {totalPages}
                    </span>
                    <button
                        className="skPageArrow"
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                        }
                    >
                        <FiChevronRight />
                    </button>
                </div>
            )}

            {showFilter && (
                <div className="skModalOverlay" role="dialog" aria-modal="true">
                    <div className="skModalCard">
                        <div className="skModalHead">
                            <div className="skModalTitle">Filter Kasus</div>
                            <button
                                className="skModalClose"
                                type="button"
                                onClick={() => setShowFilter(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="skModalBody skFilterGrid">
                            {[
                                ["kategori", CATEGORY_OPTIONS, "Kategori"],
                                ["status", STATUS_OPTIONS, "Status"],
                                ["prioritas", PRIORITY_OPTIONS, "Prioritas"],
                                ["urutkan", SORT_OPTIONS, "Urutkan"],
                            ].map(([key, options, label]) => (
                                <div className="skFilterField" key={key}>
                                    <label>{label}</label>
                                    <select
                                        value={draftFilters[key]}
                                        onChange={(e) =>
                                            setDraftFilters((p) => ({
                                                ...p,
                                                [key]: e.target.value,
                                            }))
                                        }
                                    >
                                        {options.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="skModalActions">
                            <button
                                className="skFooterGhost"
                                type="button"
                                onClick={resetFilters}
                            >
                                Reset
                            </button>
                            <button
                                className="skFooterPrimary"
                                type="button"
                                onClick={applyFilters}
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDetail && selectedCase && (
                <div className="skModalOverlay" role="dialog" aria-modal="true">
                    <div className="skModalCard">
                        <div className="skModalHead">
                            <div className="skModalTitle">Detail Kasus</div>
                            <button
                                className="skModalClose"
                                type="button"
                                onClick={() => setShowDetail(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="skModalBody">
                            <div className="skDetailGrid">
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">
                                        Nomor Kasus
                                    </div>
                                    <div className="skDetailValue">
                                        {selectedCase.id}
                                    </div>
                                </div>
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">Judul</div>
                                    <div className="skDetailValue">
                                        {selectedCase.judul}
                                    </div>
                                </div>
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">Pelapor</div>
                                    <div className="skDetailValue">
                                        <FiUser /> {selectedCase.pelapor}
                                    </div>
                                </div>
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">
                                        Paralegal
                                    </div>
                                    <div className="skDetailValue">
                                        <FiUsers /> {selectedCase.paralegal}
                                    </div>
                                </div>
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">
                                        Telepon Paralegal
                                    </div>
                                    <div className="skDetailValue">
                                        <BsTelephone />{" "}
                                        {selectedCase.paralegalPhone}
                                    </div>
                                </div>
                                <div className="skDetailBlock">
                                    <div className="skDetailLabel">
                                        Email Posbankum
                                    </div>
                                    <div className="skDetailValue">
                                        <FiMail /> {selectedCase.emailPosbankum}
                                    </div>
                                </div>
                            </div>
                            <div className="skDetailDesc">
                                {selectedCase.deskripsi}
                            </div>
                        </div>
                        <div className="skModalActions">
                            <button
                                className="skFooterPrimary"
                                type="button"
                                onClick={() => setShowDetail(false)}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
