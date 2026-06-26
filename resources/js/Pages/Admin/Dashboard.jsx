import { Head, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    FiHome,
    FiFileText,
    FiUsers,
    FiCheckCircle,
    FiClock,
    FiLogOut,
    FiTrendingUp,
    FiCalendar,
    FiDownload,
    FiChevronDown,
    FiChevronLeft,
    FiChevronRight,
    FiSearch,
    FiX,
    FiMapPin,
    FiExternalLink,
    FiPhone,
} from "react-icons/fi";
import { TbFileCheck } from "react-icons/tb";
import { BsCheck2Circle } from "react-icons/bs";
import { HiOutlineNewspaper } from "react-icons/hi2";

import "../../../css/Admin/adminDashboard.css";

import DataPosbankum from "./DataPosbankum";
import ManajemenAkun from "./ManajemenAkun";
import VerifikasiDataPosbankum from "./VerifikasiDataPosbankum";
import LaporanKegiatan from "./LaporanKegiatan";
import KelolaBerita from "./KelolaBerita";
import AdminProfile from "./AdminProfile";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";

import posbankumIcon from "../../assets/icon.png";
import logo from "../../assets/logo.png";

const MENU_PATH_MAP = {
    Beranda: "/admin",
    "Kelola Berita": "/admin/kelola-berita",
    "Data Posbankum": "/admin/data-posbankum",
    "Verifikasi Data Posbankum": "/admin/verifikasi-data-posbankum",
    "Laporan Kegiatan": "/admin/laporan-kegiatan",
    "Manajemen Akun": "/admin/manajemen-akun",
};

function getActiveMenuFromPath(pathname = "") {
    const path = String(pathname || "").toLowerCase();

    if (path.startsWith("/admin/aktivitas-terbaru")) {
        return "Aktivitas Terbaru";
    }

    if (path.startsWith("/admin/kelola-berita")) {
        return "Kelola Berita";
    }

    if (path.startsWith("/admin/data-posbankum")) {
        return "Data Posbankum";
    }

    if (path.startsWith("/admin/verifikasi-data-posbankum")) {
        return "Verifikasi Data Posbankum";
    }

    if (path.startsWith("/admin/laporan-kegiatan")) {
        return "Laporan Kegiatan";
    }

    if (path.startsWith("/admin/manajemen-akun")) {
        return "Manajemen Akun";
    }

    if (path.startsWith("/admin/profile")) {
        return "Profil Admin";
    }

    return "Beranda";
}

function formatDateID(value) {
    if (!value) return "-";

    try {
        const date = parseActivityDate(value);

        if (!date) return "-";

        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(date);
    } catch {
        return "-";
    }
}

function parseActivityDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = String(value).trim().replace(" ", "T");
    const date = new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatActivityDateTime(value) {
    const date = parseActivityDate(value);

    if (!date) return "-";

    return `${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date)}, ${new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    })
        .format(date)
        .replace(".", ":")} WIB`;
}

const ACTIVITY_FILTERS = [
    { key: "today", label: "Hari Ini" },
    { key: "7", label: "7 Hari" },
    { key: "30", label: "30 Hari" },
];

function pickActivityIcon(type) {
    const value = String(type || "").toLowerCase();

    if (value.includes("paralegal")) return <FiUsers />;
    if (value.includes("pengaduan")) return <TbFileCheck />;
    if (value.includes("dokumen")) return <TbFileCheck />;
    if (value.includes("kegiatan")) return <FiCalendar />;
    if (value.includes("berita")) return <HiOutlineNewspaper />;

    return <BsCheck2Circle />;
}

function pickTone(type) {
    const value = String(type || "").toLowerCase();

    if (value.includes("paralegal")) return "orange";
    if (value.includes("pengaduan")) return "blue";
    if (value.includes("dokumen")) return "blue";
    if (value.includes("kegiatan")) return "blue";
    if (value.includes("berita")) return "orange";

    return "blue";
}

function cleanContactText(value) {
    const text = String(value ?? "").trim();

    if (!text || text === "-" || text.toLowerCase() === "null") {
        return "";
    }

    return text;
}

function firstContactValue(...values) {
    for (const value of values) {
        const text = cleanContactText(value);

        if (text) {
            return text;
        }
    }

    return "";
}

function normalizePosbankumLookup(value) {
    return String(value ?? "")
        .trim()
        .replace(/^posbankum\s+/i, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function contactDateSortValue(value) {
    const text = cleanContactText(value);

    if (!text) {
        return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return Number.MAX_SAFE_INTEGER;
    }

    return date.getTime();
}

export default function AdminDashboard() {
    const { props, url } = usePage();

    const flashSuccess = props.flash?.success || "";
    const flashError = props.flash?.error || "";
    const pageErrors = props.errors || {};

    const firstErrorMessage = useMemo(() => {
        const values = Object.values(pageErrors).flat().filter(Boolean);

        return values[0] || "";
    }, [pageErrors]);

    const user = props.auth?.user || {};
    const stats = props.stats || {};
    const topActive = props.topActive || [];
    const activities = props.activities || [];
    const detailRows = props.detailRows || [];
    const beritaRows = props.beritaRows || [];
    const accountRows = props.accountRows || [];
    const verificationRows = props.verificationRows || [];
    const laporanRows = props.laporanRows || [];
    const kabupatenRows = props.kabupatenRows || [];
    const kecamatanRows = props.kecamatanRows || [];
    const kelurahanRows = props.kelurahanRows || [];
    const posbankumMasterRows = props.posbankumMasterRows || [];

    const [active, setActive] = useState(() =>
        getActiveMenuFromPath(window.location.pathname),
    );
    const [loggingOut, setLoggingOut] = useState(false);
    const [rangeOpen, setRangeOpen] = useState(false);
    const [rangeDays, setRangeDays] = useState(30);
    const [detailSearch, setDetailSearch] = useState("");
    const [detailPage, setDetailPage] = useState(1);
    const detailPageSize = 6;
    const [selectedPosDetail, setSelectedPosDetail] = useState(null);
    const [activityRange, setActivityRange] = useState("today");
    const [activityPage, setActivityPage] = useState(0);
    const activityPageSize = 10;
    const [actionToast, setActionToast] = useState(null);

    useEffect(() => {
        if (flashSuccess) {
            setActionToast({
                type: "success",
                message: flashSuccess,
            });
            return;
        }

        if (flashError) {
            setActionToast({
                type: "error",
                message: flashError,
            });
            return;
        }

        if (firstErrorMessage) {
            setActionToast({
                type: "error",
                message: firstErrorMessage,
            });
        }
    }, [flashSuccess, flashError, firstErrorMessage]);

    useEffect(() => {
        if (!actionToast) return undefined;

        const timer = window.setTimeout(() => {
            setActionToast(null);
        }, 3500);

        return () => window.clearTimeout(timer);
    }, [actionToast]);

    useEffect(() => {
        const currentPath =
            typeof window !== "undefined" ? window.location.pathname : "";
        setActive(getActiveMenuFromPath(currentPath));
    }, [url]);

    useEffect(() => {
        const handlePopState = () => {
            setActive(getActiveMenuFromPath(window.location.pathname));
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const menu = useMemo(
        () => [
            { label: "Beranda", icon: <FiHome /> },
            { label: "Kelola Berita", icon: <FiFileText /> },
            { label: "Data Posbankum", icon: <FiUsers /> },
            { label: "Verifikasi Data Posbankum", icon: <FiCheckCircle /> },
            { label: "Laporan Kegiatan", icon: <FiClock /> },
            {
                label: "Manajemen Akun",
                icon: (
                    <span
                        className="ad-navMaskIcon"
                        style={{ "--mask-url": `url(${posbankumIcon})` }}
                        aria-hidden="true"
                    />
                ),
            },
        ],
        [],
    );

    const statDefs = useMemo(
        () => [
            {
                key: "totalPosbankum",
                title: "Total Posbankum",
                icon: (
                    <img
                        src={posbankumIcon}
                        alt=""
                        className="ad-cardAssetIcon"
                        aria-hidden="true"
                    />
                ),
                tone: "blue",
                hint: "Data Posbankum terdaftar",
            },
            {
                key: "waitingVerification",
                title: "Menunggu Verifikasi",
                icon: <FiClock />,
                tone: "orange",
                hint: "Data perlu diperiksa",
            },
            {
                key: "monthKegiatan",
                title: "Kegiatan Bulan Ini",
                icon: <FiTrendingUp />,
                tone: "green",
                hint: "Kegiatan tercatat",
            },
        ],
        [],
    );

    const filteredDetailRows = useMemo(() => {
        const q = detailSearch.trim().toLowerCase();

        if (!q) return detailRows;

        return detailRows.filter((row) =>
            [row.name, row.address, row.email, row.phone, row.status]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [detailRows, detailSearch]);

    const detailPageCount = Math.max(
        1,
        Math.ceil(filteredDetailRows.length / detailPageSize),
    );
    const detailPageSafe = Math.min(detailPage, detailPageCount);
    const detailPageRows = filteredDetailRows.slice(
        (detailPageSafe - 1) * detailPageSize,
        detailPageSafe * detailPageSize,
    );

    useEffect(() => {
        setDetailPage(1);
    }, [detailSearch]);

    const filteredActivities = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        return activities.filter((item) => {
            const date = parseActivityDate(item.at);

            if (!date) return false;

            if (activityRange === "today") {
                return date >= todayStart && date < tomorrowStart;
            }

            const days = Number(activityRange) || 30;
            const startDate = new Date(todayStart);
            startDate.setDate(startDate.getDate() - (days - 1));

            return date >= startDate && date < tomorrowStart;
        });
    }, [activities, activityRange]);

    useEffect(() => {
        setActivityPage(0);
    }, [activityRange]);

    const activityPageCount = Math.max(
        1,
        Math.ceil(filteredActivities.length / activityPageSize),
    );
    const activityPageSafe = Math.min(activityPage, activityPageCount - 1);

    useEffect(() => {
        if (activityPage > activityPageCount - 1) {
            setActivityPage(Math.max(0, activityPageCount - 1));
        }
    }, [activityPage, activityPageCount]);

    const activityGroups = useMemo(() => {
        if (filteredActivities.length === 0) {
            return [[]];
        }

        const groups = [];

        for (let i = 0; i < filteredActivities.length; i += activityPageSize) {
            groups.push(filteredActivities.slice(i, i + activityPageSize));
        }

        return groups;
    }, [filteredActivities, activityPageSize]);

    const activityStartNumber =
        filteredActivities.length === 0
            ? 0
            : activityPageSafe * activityPageSize + 1;
    const activityEndNumber = Math.min(
        filteredActivities.length,
        (activityPageSafe + 1) * activityPageSize,
    );

    const activityPagerSlots = useMemo(() => {
        const currentPageNumber = activityPageSafe + 1;
        const slots = [];

        if (currentPageNumber > 1) {
            slots.push({ key: "prev-page", page: currentPageNumber - 1 });
        } else {
            slots.push({ key: "prev-empty", page: null, isEmpty: true });
        }

        slots.push({
            key: "current-page",
            page: currentPageNumber,
            isActive: true,
        });

        if (currentPageNumber < activityPageCount) {
            slots.push({ key: "next-page", page: currentPageNumber + 1 });
        }

        return slots;
    }, [activityPageSafe, activityPageCount]);

    const activeActivityFilterLabel =
        ACTIVITY_FILTERS.find((item) => item.key === activityRange)?.label ||
        "Hari Ini";

    const selectedModalDetail = useMemo(() => {
        if (!selectedPosDetail) {
            return null;
        }

        const selectedId = firstContactValue(
            selectedPosDetail.id,
            selectedPosDetail.id_posbankum,
            selectedPosDetail.posbankum_id,
        );
        const selectedName = normalizePosbankumLookup(
            firstContactValue(
                selectedPosDetail.name,
                selectedPosDetail.nama,
                selectedPosDetail.posbankum_nama,
            ),
        );

        const isSamePosbankum = (row) => {
            const rowId = firstContactValue(
                row?.id,
                row?.id_posbankum,
                row?.posbankum_id,
            );

            if (selectedId && rowId && String(rowId) === String(selectedId)) {
                return true;
            }

            const rowName = normalizePosbankumLookup(
                firstContactValue(
                    row?.name,
                    row?.nama,
                    row?.posbankum_nama,
                    row?.nama_posbankum,
                    row?.posbankum,
                ),
            );

            return Boolean(selectedName && rowName && selectedName === rowName);
        };

        const detailMatch = detailRows.find(isSamePosbankum) || {};
        const firstParalegal =
            [...accountRows]
                .filter(isSamePosbankum)
                .sort(
                    (a, b) =>
                        contactDateSortValue(
                            firstContactValue(
                                a?.assigned_at,
                                a?.relasi_created_at,
                                a?.created_at,
                            ),
                        ) -
                        contactDateSortValue(
                            firstContactValue(
                                b?.assigned_at,
                                b?.relasi_created_at,
                                b?.created_at,
                            ),
                        ),
                )[0] || {};

        const phone = firstContactValue(
            selectedPosDetail.paralegalPhone,
            detailMatch.paralegalPhone,
            firstParalegal.nomor_telepon,
            firstParalegal.nomor_tlp,
            firstParalegal.no_hp,
            firstParalegal.phone,
            firstParalegal.telepon,
            selectedPosDetail.phone,
            detailMatch.phone,
            selectedPosDetail.nomor_tlp,
            detailMatch.nomor_tlp,
            selectedPosDetail.nomor_telepon,
            detailMatch.nomor_telepon,
        );

        const email = firstContactValue(
            selectedPosDetail.paralegalEmail,
            detailMatch.paralegalEmail,
            firstParalegal.email,
            firstParalegal.email_kantor,
            firstParalegal.email_akun,
            selectedPosDetail.email,
            detailMatch.email,
            selectedPosDetail.email_akun,
            detailMatch.email_akun,
            selectedPosDetail.email_posbankum,
            detailMatch.email_posbankum,
        );

        return {
            ...detailMatch,
            ...selectedPosDetail,
            name:
                firstContactValue(
                    selectedPosDetail.name,
                    detailMatch.name,
                    selectedPosDetail.nama,
                    detailMatch.nama,
                    selectedPosDetail.posbankum_nama,
                    detailMatch.posbankum_nama,
                ) || "-",
            address:
                firstContactValue(
                    selectedPosDetail.address,
                    detailMatch.address,
                    selectedPosDetail.alamat,
                    detailMatch.alamat,
                    selectedPosDetail.lokasi,
                    detailMatch.lokasi,
                ) || "Alamat belum tersedia",
            phone: phone || "-",
            email: email || "-",
            latitude: firstContactValue(
                selectedPosDetail.latitude,
                detailMatch.latitude,
                selectedPosDetail.lat,
                detailMatch.lat,
            ),
            longitude: firstContactValue(
                selectedPosDetail.longitude,
                detailMatch.longitude,
                selectedPosDetail.lng,
                detailMatch.lng,
                selectedPosDetail.long,
                detailMatch.long,
            ),
        };
    }, [accountRows, detailRows, selectedPosDetail]);

    const handleExport = () => {
        const rows = filteredDetailRows.map((row) => ({
            Posbankum: row.name || "-",
            Total:
                (row.activityCount || 0) +
                (row.caseCount || 0) +
                (row.documentCount || row.dokumen || 0),
            Kegiatan: row.activityCount || 0,
            Kasus: row.caseCount || 0,
            Dokumen: row.documentCount || row.dokumen || 0,
            Status: row.status || "Aktif",
        }));

        const headers = [
            "Posbankum",
            "Total",
            "Kegiatan",
            "Kasus",
            "Dokumen",
            "Status",
        ];
        const csv = [
            headers.join(","),
            ...rows.map((row) =>
                headers
                    .map(
                        (header) =>
                            `"${String(row[header] ?? "").replace(/"/g, '""')}"`,
                    )
                    .join(","),
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `posbankum-paling-aktif-${rangeDays}hari.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLogout = () => {
        if (loggingOut) return;

        setLoggingOut(true);

        router.post("/logout", undefined, {
            onFinish: () => setLoggingOut(false),
        });
    };

    const handleChangeMenu = (label) => {
        setSelectedPosDetail(null);
        setRangeOpen(false);
        setActive(label);

        const targetPath = MENU_PATH_MAP[label] || "/admin";

        if (window.location.pathname !== targetPath) {
            window.history.pushState({}, "", targetPath);
        }
    };

    const handleOpenProfile = () => {
        setSelectedPosDetail(null);
        setRangeOpen(false);
        setActive("Profil Admin");

        if (window.location.pathname !== "/admin/profile") {
            window.history.pushState({}, "", "/admin/profile");
        }
    };

    const handleCloseProfile = () => {
        setSelectedPosDetail(null);
        setRangeOpen(false);
        setActive("Beranda");

        if (window.location.pathname !== "/admin") {
            window.history.pushState({}, "", "/admin");
        }
    };

    const handleOpenActivityPage = () => {
        setSelectedPosDetail(null);
        setRangeOpen(false);
        setActive("Aktivitas Terbaru");

        if (window.location.pathname !== "/admin/aktivitas-terbaru") {
            window.history.pushState({}, "", "/admin/aktivitas-terbaru");
        }
    };

    const handleOpenActivityDetail = (item) => {
        if (!item?.targetPath) return;

        router.visit(item.targetPath, { preserveScroll: true });
    };

    const pageTitle = active === "Beranda" ? "Dashboard Admin" : active;

    const renderBeranda = () => (
        <section className="ad-grid">
            <div className="ad-wireTitle">Dashboard</div>

            <div className="ad-cards">
                {statDefs.map((item) => (
                    <div className={`ad-card tone-${item.tone}`} key={item.key}>
                        <div className="ad-cardIcon">{item.icon}</div>

                        <div className="ad-cardBody">
                            <div className="ad-cardTitle">{item.title}</div>
                            <div className="ad-cardValue">
                                {stats[item.key] ?? 0}
                            </div>
                            <div className="ad-cardHint">Update real-time</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="ad-panels">
                <section className="ad-panel ad-panelChart">
                    <div className="ad-panelHead">
                        <div>
                            <div className="ad-panelTitle">
                                Posbankum Paling Aktif
                            </div>
                            <div className="ad-panelSub">
                                Total Kegiatan &amp; Kasus Diselesaikan
                            </div>
                        </div>

                        <div className="ad-headActions">
                            <div className="ad-dd">
                                <button
                                    type="button"
                                    className={`ad-filterBtn ${
                                        rangeOpen ? "is-open" : ""
                                    }`}
                                    onClick={() => setRangeOpen((v) => !v)}
                                >
                                    <FiCalendar />
                                    <span>{rangeDays} Hari</span>
                                    <FiChevronDown />
                                </button>

                                {rangeOpen ? (
                                    <div className="ad-ddMenu">
                                        {[7, 30, 90].map((days) => (
                                            <button
                                                key={days}
                                                type="button"
                                                className={`ad-ddItem ${
                                                    rangeDays === days
                                                        ? "is-active"
                                                        : ""
                                                }`}
                                                onClick={() => {
                                                    setRangeDays(days);
                                                    setRangeOpen(false);
                                                }}
                                            >
                                                {days} Hari
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                className="ad-exportBtn"
                                type="button"
                                onClick={handleExport}
                            >
                                <FiDownload /> Export
                            </button>
                        </div>
                    </div>

                    {topActive.length > 0 ? (
                        <div className="ad-activeBars">
                            {topActive.map((item, index) => (
                                <button
                                    type="button"
                                    className="ad-activeItem"
                                    key={item.id || item.name || index}
                                    onClick={() => setSelectedPosDetail(item)}
                                >
                                    <div className="ad-activeTop">
                                        {(item.caseCount || 0) +
                                            (item.activityCount || 0)}
                                    </div>

                                    <div className="ad-barArea">
                                        <div
                                            className="ad-pillBar"
                                            style={{
                                                height: `${
                                                    item.percent || 18
                                                }%`,
                                            }}
                                        />
                                    </div>

                                    <div className="ad-activeName">
                                        {item.name}
                                    </div>

                                    <div className="ad-activeGrowth">
                                        <span className="is-up">
                                            +{item.growth || 0}%
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="ad-emptyState">
                            <TbFileCheck />
                            <strong>Belum ada data aktivitas</strong>
                            <p>Data akan tampil setelah database terisi.</p>
                        </div>
                    )}
                </section>

                <section className="ad-panel ad-panelActivity">
                    <div className="ad-panelHead ad-panelHeadActivity">
                        <div>
                            <div className="ad-panelTitle">
                                Aktivitas Terbaru
                            </div>
                        </div>

                        <button
                            type="button"
                            className="ad-linkBtn"
                            onClick={handleOpenActivityPage}
                        >
                            Lihat semua
                        </button>
                    </div>

                    <div className="ad-activityList">
                        {activities.slice(0, 4).map((item, index) => (
                            <div
                                className="ad-activityItem"
                                key={`${item.type}-${index}`}
                            >
                                <div
                                    className={`ad-activityIconWrap tone-${pickTone(
                                        item.type,
                                    )}`}
                                >
                                    {pickActivityIcon(item.type)}
                                </div>

                                <div className="ad-activityText">
                                    <div className="ad-activityTitle">
                                        {item.title}
                                    </div>
                                    <div className="ad-activityDesc">
                                        {item.description}
                                    </div>
                                    <div className="ad-activityTime">
                                        {formatDateID(item.at)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {activities.length === 0 ? (
                            <div className="ad-emptyMini">
                                Belum ada aktivitas terbaru.
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>

            <section className="ad-detailPanel ad-panel">
                <div className="ad-detailHead">
                    <div>
                        <div className="ad-panelTitle">
                            Detail Kegiatan Posbankum
                        </div>
                        <div className="ad-panelSub">
                            Breakdown per jenis kegiatan
                        </div>
                    </div>

                    <div className="ad-searchWrap">
                        <FiSearch className="ad-searchIcon" />
                        <input
                            type="text"
                            className="ad-searchInput"
                            placeholder="Cari Posbankum..."
                            value={detailSearch}
                            onChange={(event) =>
                                setDetailSearch(event.target.value)
                            }
                        />
                    </div>
                </div>

                <div className="ad-tableWrap">
                    <table className="ad-table">
                        <colgroup>
                            <col className="ad-colPosbankum" />
                            <col className="ad-colTotal" />
                            <col className="ad-colKegiatan" />
                            <col className="ad-colKasus" />
                            <col className="ad-colDokumen" />
                            <col className="ad-colStatus" />
                        </colgroup>

                        <thead>
                            <tr>
                                <th align="left">POSBANKUM</th>
                                <th className="is-center">TOTAL KEGIATAN</th>
                                <th className="is-center">KEGIATAN</th>
                                <th className="is-center">KASUS</th>
                                <th className="is-center">DOKUMEN</th>
                                <th className="is-center">STATUS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {detailPageRows.map((row) => {
                                const dokumen =
                                    row.documentCount || row.dokumen || 0;
                                const kegiatan = row.activityCount || 0;
                                const kasus = row.caseCount || 0;
                                const total = kegiatan + kasus + dokumen;

                                return (
                                    <tr
                                        key={row.id || row.name}
                                        className="ad-tableRowClickable"
                                        onClick={() =>
                                            setSelectedPosDetail(row)
                                        }
                                    >
                                        <td>
                                            <div className="ad-posCell">
                                                <span className="ad-posName">
                                                    {row.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="is-center">
                                            <span className="ad-totalNum">
                                                {total}
                                            </span>
                                        </td>
                                        <td className="is-center">
                                            {kegiatan}
                                        </td>
                                        <td className="is-center">{kasus}</td>
                                        <td className="is-center">{dokumen}</td>
                                        <td className="is-center">
                                            <span className="ad-pillGreen">
                                                {row.status || "Aktif"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredDetailRows.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="ad-emptyMini">
                                            Data Posbankum belum tersedia.
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="ad-pager">
                    <button
                        className="ad-pagerBtn"
                        type="button"
                        onClick={() =>
                            setDetailPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={detailPageSafe <= 1}
                    >
                        Sebelumnya
                    </button>

                    <div className="ad-pagerInfo">
                        Halaman {detailPageSafe} dari {detailPageCount}
                    </div>

                    <button
                        className="ad-pagerBtn"
                        type="button"
                        onClick={() =>
                            setDetailPage((prev) =>
                                Math.min(detailPageCount, prev + 1),
                            )
                        }
                        disabled={detailPageSafe >= detailPageCount}
                    >
                        Selanjutnya
                    </button>
                </div>
            </section>
        </section>
    );

    const renderAktivitasTerbaru = () => (
        <section className="ad-pagePad ad-activityPage">
            <div className="ad-activityBreadcrumb" aria-label="Breadcrumb">
                <button
                    type="button"
                    onClick={() => handleChangeMenu("Beranda")}
                >
                    Beranda
                </button>
                <FiChevronRight aria-hidden="true" />
                <span>Aktivitas Terbaru</span>
            </div>

            <div className="ad-activityPageHead">
                <div className="ad-activityPageTitleWrap">
                    <div className="ad-wireTitle ad-activityPageTitle">
                        Aktivitas Terbaru
                    </div>
                </div>

                <button
                    type="button"
                    className="ad-activityBackBtn"
                    onClick={() => handleChangeMenu("Beranda")}
                >
                    Kembali ke Beranda
                </button>
            </div>

            <div
                className="ad-activityTabs"
                role="tablist"
                aria-label="Filter aktivitas"
            >
                {ACTIVITY_FILTERS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={`ad-activityTab ${
                            activityRange === item.key ? "is-active" : ""
                        }`}
                        onClick={() => setActivityRange(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="ad-activityPageList" aria-live="polite">
                <div
                    className="ad-activityPageTrack"
                    style={{
                        transform: `translateX(-${activityPageSafe * 100}%)`,
                    }}
                >
                    {activityGroups.map((group, pageIndex) => (
                        <div
                            className="ad-activityPagePane"
                            key={`activity-group-${pageIndex}`}
                            aria-hidden={pageIndex !== activityPageSafe}
                        >
                            {group.map((item, index) => (
                                <button
                                    type="button"
                                    className={`ad-activityPageItem ${
                                        item.targetPath ? "is-clickable" : ""
                                    }`}
                                    key={`${item.type}-${item.at}-${
                                        pageIndex * activityPageSize + index
                                    }`}
                                    onClick={() =>
                                        handleOpenActivityDetail(item)
                                    }
                                    disabled={!item.targetPath}
                                >
                                    <span
                                        className={`ad-activityPageIcon tone-${pickTone(
                                            item.type,
                                        )}`}
                                        aria-hidden="true"
                                    >
                                        {pickActivityIcon(item.type)}
                                    </span>

                                    <span className="ad-activityPageBody">
                                        <span className="ad-activityPageItemTitle">
                                            {item.title}
                                        </span>
                                        <span className="ad-activityPageItemDesc">
                                            {item.description}
                                        </span>
                                        <span className="ad-activityPageMeta">
                                            <span className="ad-activityPageChip">
                                                <FiClock aria-hidden="true" />
                                                {formatActivityDateTime(
                                                    item.at,
                                                )}
                                            </span>
                                            <span className="ad-activityPageChip">
                                                <FiMapPin aria-hidden="true" />
                                                {item.posbankum || "Posbankum"}
                                            </span>
                                        </span>
                                    </span>

                                    <FiChevronRight
                                        className="ad-activityPageArrow"
                                        aria-hidden="true"
                                    />
                                </button>
                            ))}

                            {group.length === 0 ? (
                                <div className="ad-activityPageEmpty">
                                    Belum ada aktivitas untuk filter{" "}
                                    {activeActivityFilterLabel}.
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            {filteredActivities.length > activityPageSize ? (
                <div
                    className="ad-activityPager"
                    aria-label="Navigasi daftar aktivitas"
                >
                    <button
                        type="button"
                        className="ad-activityPagerIconBtn"
                        onClick={() =>
                            setActivityPage((prev) => Math.max(0, prev - 1))
                        }
                        disabled={activityPageSafe <= 0}
                        aria-label="10 aktivitas sebelumnya"
                    >
                        <FiChevronLeft aria-hidden="true" />
                    </button>

                    <div
                        className="ad-activityPagerNumbers"
                        aria-label="Halaman aktivitas"
                    >
                        {activityPagerSlots.map((slot) =>
                            slot.isEmpty ? (
                                <span
                                    key={slot.key}
                                    className="ad-activityPagerNumber is-empty"
                                    aria-hidden="true"
                                />
                            ) : (
                                <button
                                    key={slot.key}
                                    type="button"
                                    className={`ad-activityPagerNumber ${
                                        slot.isActive ? "is-active" : ""
                                    }`}
                                    onClick={() =>
                                        setActivityPage(slot.page - 1)
                                    }
                                    disabled={slot.isActive}
                                    aria-current={
                                        slot.isActive ? "page" : undefined
                                    }
                                    aria-label={`Halaman ${slot.page}`}
                                >
                                    {slot.page}
                                </button>
                            ),
                        )}
                    </div>

                    <button
                        type="button"
                        className="ad-activityPagerIconBtn"
                        onClick={() =>
                            setActivityPage((prev) =>
                                Math.min(activityPageCount - 1, prev + 1),
                            )
                        }
                        disabled={activityPageSafe >= activityPageCount - 1}
                        aria-label="10 aktivitas berikutnya"
                    >
                        <FiChevronRight aria-hidden="true" />
                    </button>
                </div>
            ) : null}

            <div className="ad-activityPageSummary">
                Menampilkan <strong>{activityStartNumber}</strong>-
                <strong>{activityEndNumber}</strong> dari{" "}
                <strong>{filteredActivities.length}</strong> aktivitas terbaru
                untuk filter <strong>{activeActivityFilterLabel}</strong>.
            </div>
        </section>
    );

    const renderContent = () => {
        if (active === "Profil Admin") {
            return <AdminProfile user={user} onBack={handleCloseProfile} />;
        }

        if (active === "Aktivitas Terbaru") {
            return renderAktivitasTerbaru();
        }

        if (active === "Kelola Berita") {
            return (
                <KelolaBerita
                    rows={beritaRows}
                    currentUserId={user.id_user || user.id || ""}
                    currentUserName={user.nama_lengkap || user.name || "Admin"}
                    currentUserRole={user.role || ""}
                />
            );
        }

        if (active === "Data Posbankum") {
            return (
                <DataPosbankum
                    rows={verificationRows}
                    kabupatenRows={kabupatenRows}
                    kecamatanRows={kecamatanRows}
                />
            );
        }

        if (active === "Verifikasi Data Posbankum") {
            return (
                <VerifikasiDataPosbankum
                    rows={verificationRows}
                    kabupatenRows={kabupatenRows}
                    kecamatanRows={kecamatanRows}
                />
            );
        }

        if (active === "Laporan Kegiatan") {
            return <LaporanKegiatan rows={laporanRows} />;
        }

        if (active === "Manajemen Akun") {
            return (
                <ManajemenAkun
                    rows={accountRows}
                    paralegalRows={accountRows}
                    posbankumRows={detailRows}
                    kabupatenRows={kabupatenRows}
                    kecamatanRows={kecamatanRows}
                    kelurahanRows={kelurahanRows}
                    posbankumMasterRows={posbankumMasterRows}
                />
            );
        }

        return renderBeranda();
    };

    return (
        <div className="ad">
            <Head title={pageTitle} />

            {actionToast?.type === "success" ? (
                <SuccessToast
                    message={actionToast.message}
                    onClose={() => setActionToast(null)}
                />
            ) : null}

            {actionToast?.type === "error" ? (
                <RejectToast
                    message={actionToast.message}
                    onClose={() => setActionToast(null)}
                />
            ) : null}

            <aside className="ad-side">
                <button
                    className="ad-brand ad-brandButton"
                    type="button"
                    onClick={handleOpenProfile}
                >
                    <div className="ad-brandLogoWrap">
                        <img
                            src={logo}
                            alt="Logo SIBAPAK"
                            className="ad-brandLogo"
                        />
                    </div>
                    <div className="ad-brandText">
                        <div className="ad-brandName">SIBAPAK</div>
                        <div className="ad-brandSub">
                            Posbankum Kemenkum Riau
                        </div>
                    </div>
                </button>

                <div className="ad-brandDivider" aria-hidden="true" />

                <nav className="ad-nav">
                    {menu.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`ad-navItem ${
                                active === item.label ||
                                (active === "Aktivitas Terbaru" &&
                                    item.label === "Beranda")
                                    ? "is-active"
                                    : ""
                            }`}
                            onClick={() => handleChangeMenu(item.label)}
                        >
                            <span className="ad-navIcon">{item.icon}</span>
                            <span className="ad-navLabel">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="ad-main">
                <header className="ad-top ad-topWire is-berita">
                    <div className="ad-topLeft">
                        <div className="ad-pageIntro">
                            <div className="ad-pageIntroTitle">
                                Dashboard Operator Kanwil
                            </div>
                            <div className="ad-pageIntroSub">
                                Kementerian Hukum Wilayah Riau
                            </div>
                        </div>
                    </div>

                    <div className="ad-topRight">
                        <button
                            type="button"
                            className="ad-topLogoutBtn"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            aria-disabled={loggingOut}
                        >
                            <FiLogOut />
                            <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
                        </button>
                    </div>
                </header>

                {renderContent()}

                <footer className="ad-footer">
                    <div className="ad-footerText">
                        © 2026 Kementerian Hukum Riau. All rights reserved.
                    </div>

                    <div className="ad-footerText">
                        Dikembangkan oleh Politeknik Caltex Riau
                    </div>
                </footer>
            </main>

            {selectedPosDetail && selectedModalDetail ? (
                <div className="ad-modalOverlay">
                    <div
                        className="ad-modalBackdrop"
                        onClick={() => setSelectedPosDetail(null)}
                    />
                    <div
                        className="ad-detailModalCard"
                        onWheel={(event) => event.stopPropagation()}
                        onTouchMove={(event) => event.stopPropagation()}
                    >
                        <div className="ad-detailModalHead">
                            <div className="ad-detailModalHeadText">
                                <div className="ad-detailModalTitle">
                                    {selectedModalDetail.name}
                                </div>
                                <div className="ad-detailModalSub">
                                    Detail Posbankum
                                </div>
                            </div>

                            <button
                                type="button"
                                className="ad-detailModalCloseBtn"
                                onClick={() => setSelectedPosDetail(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="ad-detailModalBody">
                            <div className="ad-detailStatGrid">
                                <div className="ad-detailStatCard tone-blue">
                                    <FiUsers className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedModalDetail.paralegalCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Paralegal
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-green">
                                    <FiCalendar className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedModalDetail.activityCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Kegiatan
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-orange">
                                    <TbFileCheck className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedModalDetail.caseCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Kasus
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-blueAlt">
                                    <BsCheck2Circle className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedModalDetail.status || "Aktif"}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Status
                                    </div>
                                </div>
                            </div>

                            <div className="ad-detailInfoCard">
                                <div className="ad-detailInfoTitle">
                                    Informasi Kontak
                                </div>

                                <div className="ad-detailInfoList">
                                    <div className="ad-detailInfoItem">
                                        <FiMapPin className="ad-detailInfoIcon is-blue" />
                                        <div>
                                            <div className="ad-detailInfoLabel">
                                                Alamat
                                            </div>
                                            <div className="ad-detailInfoValue">
                                                {selectedModalDetail.address ||
                                                    "-"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ad-detailInfoItem">
                                        <FiPhone className="ad-detailInfoIcon is-green" />
                                        <div>
                                            <div className="ad-detailInfoLabel">
                                                Telepon
                                            </div>
                                            <div className="ad-detailInfoValue">
                                                {selectedModalDetail.phone || "-"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ad-detailInfoItem">
                                        <FiFileText className="ad-detailInfoIcon is-orange" />
                                        <div>
                                            <div className="ad-detailInfoLabel">
                                                Email
                                            </div>
                                            <div className="ad-detailInfoValue">
                                                {selectedModalDetail.email || "-"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="ad-detailActionRow">
                                    <button
                                        type="button"
                                        className="ad-detailActionBtn is-green"
                                        onClick={() =>
                                            window.open(
                                                `https://wa.me/${String(
                                                    selectedModalDetail.phone ||
                                                        "",
                                                ).replace(/\D/g, "")}`,
                                                "_blank",
                                            )
                                        }
                                    >
                                        <FiPhone />
                                        Hubungi
                                    </button>

                                    <button
                                        type="button"
                                        className="ad-detailActionBtn is-navy"
                                        onClick={() =>
                                            window.open(
                                                selectedModalDetail.latitude &&
                                                    selectedModalDetail.longitude
                                                    ? `https://www.google.com/maps/search/?api=1&query=${selectedModalDetail.latitude},${selectedModalDetail.longitude}`
                                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                          selectedModalDetail.address ||
                                                              selectedModalDetail.name ||
                                                              "",
                                                      )}`,
                                                "_blank",
                                            )
                                        }
                                    >
                                        <FiExternalLink />
                                        Buka Maps
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
