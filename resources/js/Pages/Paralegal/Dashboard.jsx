import { Head, router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { ImStack } from "react-icons/im";
import { CiCalendar } from "react-icons/ci";
import { TbMessageReport } from "react-icons/tb";
import {
    FiHome,
    FiFileText,
    FiLogOut,
    FiBell,
    FiCheckCircle,
    FiUsers,
    FiChevronRight,
    FiChevronLeft,
    FiMapPin,
    FiCalendar,
    FiClock,
    FiX,
    FiTrash2,
    FiEye,
    FiEyeOff,
    FiFilter,
    FiAlertCircle,
    FiBellOff,
    FiMail,
    FiPhone,
} from "react-icons/fi";

import logo from "../../assets/logo.png";
import posbankumIcon from "../../assets/icon.png";
import "../../../css/Paralegal/paralegalDashboard.css";
import LaporanPelayanan from "./LaporanPelayanan";
import KelolaKegiatan from "./KelolaKegiatan";
import SemuaKasus from "./SemuaKasus";
import KelolaPosbankum from "./KelolaPosbankum";
import ParalegalProfile from "./ParalegalProfile";

function startCase(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function fmtDateID(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatNotificationRelative(value) {
    if (!value) return "Baru saja";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Baru saja";

    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Baru saja";
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatNotificationDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const tanggal = date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const waktu = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return `${tanggal} Pukul ${waktu} WIB`;
}

function formatNotificationCardDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const tanggal = date
        .toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        .replace(/\./g, "");

    const waktu = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return `${tanggal}, ${waktu} WIB`;
}

function clampText(value, limit = 150) {
    const text = String(value || "").trim();
    if (!text) return "Belum ada deskripsi.";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
}

function cleanHeaderAddress(value) {
    return String(value || "")
        .replace(/\s*,\s*/g, ", ")
        .replace(/\s+/g, " ")
        .replace(/,\s*$/g, "")
        .trim();
}

function getCookieValue(name) {
    if (typeof document === "undefined") return "";

    const match = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${name}=`));

    if (!match) return "";

    try {
        return decodeURIComponent(match.slice(name.length + 1));
    } catch (error) {
        return match.slice(name.length + 1);
    }
}

function csrfRequestHeaders() {
    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    };

    if (typeof document === "undefined") return headers;

    const metaToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");

    if (metaToken) {
        headers["X-CSRF-TOKEN"] = metaToken;
        return headers;
    }

    const xsrfToken = getCookieValue("XSRF-TOKEN");
    if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    return headers;
}

async function persistNotificationReadStatus(id, nextRead) {
    const response = await fetch(
        `/paralegal/notifikasi/${encodeURIComponent(id)}/read`,
        {
            method: "PATCH",
            credentials: "same-origin",
            headers: csrfRequestHeaders(),
            body: JSON.stringify({ is_read: nextRead ? 1 : 0 }),
        },
    );

    if (!response.ok) {
        throw new Error(
            `Gagal menyimpan status baca notifikasi: ${response.status}`,
        );
    }

    return response.json().catch(() => ({}));
}

async function persistAllNotificationsRead() {
    const response = await fetch("/paralegal/notifikasi/read-all", {
        method: "PATCH",
        credentials: "same-origin",
        headers: csrfRequestHeaders(),
        body: JSON.stringify({ is_read: 1 }),
    });

    if (!response.ok) {
        throw new Error(
            `Gagal menyimpan semua notifikasi terbaca: ${response.status}`,
        );
    }

    return response.json().catch(() => ({}));
}

function normalizeStatus(value) {
    const raw = String(value || "").trim();
    const lower = raw.toLowerCase();

    if (
        ["selesai", "done", "completed", "diterima", "approved"].includes(lower)
    ) {
        return "Selesai";
    }

    if (lower.includes("tolak") || lower.includes("reject")) {
        return "Ditolak";
    }

    if (raw) return startCase(raw);
    return "Dalam Proses";
}

function isDoneStatus(value) {
    return normalizeStatus(value) === "Selesai";
}

function normalizeCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Kasus";

    const lower = raw.toLowerCase();
    if (lower.includes("waris")) return "Hukum Waris";
    if (
        lower.includes("keluarga") ||
        lower.includes("cerai") ||
        lower.includes("hak asuh")
    )
        return "Hukum Keluarga";
    if (lower.includes("tanah") || lower.includes("pertanahan"))
        return "Pertanahan";
    if (
        lower.includes("pidana") ||
        lower.includes("pencurian") ||
        lower.includes("penganiayaan")
    )
        return "Hukum Pidana";
    if (lower.includes("kerja") || lower.includes("phk"))
        return "Ketenagakerjaan";

    return raw;
}

function normalizeCaseRow(item, index = 0) {
    const id =
        item?.id ?? item?.id_pengaduan ?? item?.id_kasus ?? `kasus-${index}`;
    const title =
        item?.judul ??
        item?.title ??
        item?.judul_pengaduan ??
        item?.judul_laporan ??
        item?.jenis_masalah ??
        item?.kategori_masalah ??
        "Kasus";
    const category = normalizeCategory(
        item?.kategori ??
            item?.category ??
            item?.jenis_masalah ??
            item?.kategori_masalah ??
            title,
    );
    const description =
        item?.deskripsi ??
        item?.description ??
        item?.kronologi ??
        item?.isi_pengaduan ??
        item?.catatan_admin ??
        "Belum ada deskripsi.";
    const status = normalizeStatus(item?.status);

    return {
        id,
        title,
        judul: title,
        kategori: category,
        description,
        deskripsi: description,
        posbankum:
            item?.posbankum ?? item?.location ?? item?.lokasi ?? "Posbankum",
        date:
            item?.date ??
            item?.created_at ??
            item?.tgl_lapor ??
            item?.tanggal ??
            null,
        status,
        selesai: item?.selesai ?? isDoneStatus(status),
    };
}

function normalizeActivityRow(item, index = 0) {
    const id = item?.id ?? item?.id_kegiatan ?? `kegiatan-${index}`;
    const title =
        item?.judul ??
        item?.title ??
        item?.nama_kegiatan ??
        "Kegiatan Posbankum";
    const description =
        item?.deskripsi ??
        item?.description ??
        item?.catatan ??
        item?.keterangan ??
        "Belum ada deskripsi.";
    const status = normalizeStatus(item?.status);

    return {
        id,
        title,
        judul: title,
        description,
        deskripsi: description,
        tanggal:
            item?.tanggal ??
            item?.date ??
            item?.tgl_mulai ??
            item?.tgl_upload ??
            item?.created_at ??
            null,
        lokasi: item?.lokasi ?? item?.location ?? "",
        peserta: item?.peserta ?? item?.jumlah_peserta ?? "",
        status,
        selesai: item?.selesai ?? isDoneStatus(status),
    };
}

function normalizeNotificationCategory(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (["pengaduan", "kegiatan", "dokumen", "sistem"].includes(raw))
        return raw;
    return "sistem";
}

function normalizeNotificationPriority(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (["tinggi", "sedang", "rendah"].includes(raw)) return raw;
    return "sedang";
}

function normalizeNotificationRead(item) {
    const raw = item?.is_read;

    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw === 1;

    if (typeof raw === "string") {
        const value = raw.trim().toLowerCase();
        if (["1", "true", "sudah", "read"].includes(value)) return true;
        if (["0", "false", "belum", "unread", ""].includes(value)) return false;
    }

    return Boolean(item?.read_at);
}

function normalizeNotificationRow(item, index = 0) {
    const id = item?.id_notifikasi ?? item?.id ?? `notif-${index}`;
    const refTable =
        item?.ref_table ?? item?.reference_table ?? item?.table ?? "";
    const refId =
        item?.ref_id ??
        item?.reference_id ??
        item?.id_ref ??
        item?.id_kegiatan ??
        item?.id_pengaduan ??
        item?.id_data ??
        item?.id_posbankum ??
        null;

    return {
        ...item,
        id_notifikasi: id,
        judul: item?.judul ?? item?.title ?? "Notifikasi",
        pesan: item?.pesan ?? item?.message ?? "Ada notifikasi baru.",
        kategori: normalizeNotificationCategory(item?.kategori ?? item?.type),
        prioritas: normalizeNotificationPriority(
            item?.prioritas ?? item?.priority,
        ),
        ref_table: refTable,
        ref_id: refId,
        is_read: normalizeNotificationRead(item),
        created_at: item?.created_at ?? new Date().toISOString(),
    };
}

function getNotificationTarget(item) {
    const category = normalizeNotificationCategory(
        item?.kategori ?? item?.type,
    );
    const refTable = String(item?.ref_table || "").toLowerCase();
    const text =
        `${refTable} ${item?.judul || ""} ${item?.pesan || ""}`.toLowerCase();
    const id = item?.ref_id ?? null;

    if (category === "kegiatan" || text.includes("kegiatan")) {
        return { page: "Kelola Kegiatan", type: "kegiatan", id };
    }

    if (
        category === "pengaduan" ||
        text.includes("pengaduan") ||
        text.includes("kasus")
    ) {
        return { page: "Semua Kasus", type: "kasus", id };
    }

    if (
        text.includes("tagging") ||
        text.includes("taging") ||
        refTable === "tagging_area" ||
        refTable === "taging_area" ||
        (category === "dokumen" && refTable === "posbankum")
    ) {
        return {
            page: "Kelola Posbankum",
            type: "tagging_area",
            id: "__tagging_area__",
        };
    }

    if (
        category === "dokumen" ||
        text.includes("dokumen") ||
        text.includes("data_posbankum") ||
        text.includes("data posbankum") ||
        text.includes("posbankum")
    ) {
        return { page: "Kelola Posbankum", type: "dokumen", id };
    }

    return { page: "Beranda", type: "beranda", id: null };
}

function getNotificationTypeLabel(value) {
    return startCase(normalizeNotificationCategory(value));
}

function getNotificationPriorityLabel(value) {
    return startCase(normalizeNotificationPriority(value));
}

function notificationIcon(category) {
    const key = normalizeNotificationCategory(category);

    if (key === "pengaduan") return <TbMessageReport />;
    if (key === "kegiatan") return <CiCalendar />;
    if (key === "dokumen") return <FiFileText />;
    return <FiBell />;
}

function ConfirmModal({
    open,
    title,
    description,
    confirmLabel,
    onCancel,
    onConfirm,
    loading = false,
}) {
    if (!open) return null;

    return (
        <div className="pb2ConfirmOverlay" role="dialog" aria-modal="true">
            <div className="pb2ConfirmCard">
                <div className="pb2ConfirmIcon">
                    <FiAlertCircle />
                </div>
                <div className="pb2ConfirmTitle">{title}</div>
                <div className="pb2ConfirmText">{description}</div>
                <div className="pb2ConfirmActions">
                    <button
                        className="pb2ConfirmCancel"
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        className="pb2ConfirmDanger"
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Memproses..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyBox({ children }) {
    return <div className="pb2Empty">{children}</div>;
}

export default function PosbankumDashboard({
    auth = {},
    posbankum = {},
    stats = {},
    kasusTerbaru = [],
    kegiatanTerbaru = [],
    kegiatanRows = [],
    semuaKasusRows = [],
    posbankumDocuments = [],
    posbankumLocation = {},
    notifications = [],
    laporanPelayananRows = [],
    paralegalOptions = [],
    currentPosbankum = {},
    paralegalProfile = {},
    flash = {},
}) {
    const [active, setActive] = useState("Beranda");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [pageTarget, setPageTarget] = useState({
        type: null,
        id: null,
        tick: 0,
    });

    const [notifOpen, setNotifOpen] = useState(false);
    const [notifBusy, setNotifBusy] = useState(false);
    const [notifReadFilter, setNotifReadFilter] = useState("semua");
    const [notifTypeFilter, setNotifTypeFilter] = useState("semua");
    const [notifSelectedId, setNotifSelectedId] = useState(null);
    const [notifDeleteState, setNotifDeleteState] = useState({
        open: false,
        mode: "single",
        id: null,
    });
    const [notifPage, setNotifPage] = useState(1);
    const [notifRows, setNotifRows] = useState(() =>
        (notifications || []).map(normalizeNotificationRow),
    );

    useEffect(() => {
        setNotifRows((notifications || []).map(normalizeNotificationRow));
        setNotifSelectedId(null);
        setNotifPage(1);
    }, [notifications]);

    useEffect(() => {
        const refreshLatestCases = () => {
            if (document.visibilityState !== "visible") return;

            router.reload({
                only: ["kasusTerbaru"],
                preserveState: true,
                preserveScroll: true,
            });
        };

        const intervalId = window.setInterval(refreshLatestCases, 10000);
        document.addEventListener("visibilitychange", refreshLatestCases);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener(
                "visibilitychange",
                refreshLatestCases,
            );
        };
    }, []);

    useEffect(() => {
        const handleViewportChange = () => {
            if (window.innerWidth > 860) {
                setMobileMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const menu = useMemo(
        () => [
            { label: "Beranda", icon: <FiHome /> },
            { label: "Semua Kasus", icon: <ImStack /> },
            {
                label: "Kelola Posbankum",
                icon: (
                    <span
                        className="ad-navMaskIcon"
                        style={{ "--mask-url": `url(${posbankumIcon})` }}
                        aria-hidden="true"
                    />
                ),
            },
            {
                label: "Kelola Kegiatan",
                icon: <CiCalendar style={{ fontSize: 20, strokeWidth: 1 }} />,
            },
            { label: "Laporan Pelayanan", icon: <FiFileText /> },
        ],
        [],
    );

    const caseRows = useMemo(
        () => (kasusTerbaru || []).map(normalizeCaseRow),
        [kasusTerbaru],
    );

    const activityRows = useMemo(
        () => (kegiatanTerbaru || []).map(normalizeActivityRow),
        [kegiatanTerbaru],
    );

    const notifCount = useMemo(
        () => notifRows.filter((item) => !item.is_read).length,
        [notifRows],
    );

    const hasUnreadNotifications = useMemo(
        () => notifRows.some((item) => !item.is_read),
        [notifRows],
    );

    const notifSummaryText = useMemo(() => {
        if (!notifRows.length) return "Belum ada notifikasi";
        if (!notifCount) return "Semua notifikasi sudah dibaca";
        return `${notifCount} notifikasi belum dibaca`;
    }, [notifRows.length, notifCount]);

    const filteredNotifications = useMemo(() => {
        return notifRows.filter((item) => {
            const matchRead =
                notifReadFilter === "semua"
                    ? true
                    : notifReadFilter === "belum"
                      ? !item.is_read
                      : item.is_read;

            const matchType =
                notifTypeFilter === "semua"
                    ? true
                    : item.kategori === notifTypeFilter;

            return matchRead && matchType;
        });
    }, [notifRows, notifReadFilter, notifTypeFilter]);

    const NOTIF_PER_PAGE = 10;

    const notifTotalPages = useMemo(() => {
        return Math.max(1, Math.ceil(notifRows.length / NOTIF_PER_PAGE));
    }, [notifRows.length]);

    const visibleNotifRows = useMemo(() => {
        const safePage = Math.min(Math.max(notifPage, 1), notifTotalPages);
        const startIndex = (safePage - 1) * NOTIF_PER_PAGE;
        return notifRows.slice(startIndex, startIndex + NOTIF_PER_PAGE);
    }, [notifRows, notifPage, notifTotalPages]);

    const notifPageNumbers = useMemo(() => {
        if (notifTotalPages <= 1) return [1];

        if (notifPage <= 1) {
            return [null, 1, 2];
        }

        if (notifPage >= notifTotalPages) {
            return [notifTotalPages - 1, notifTotalPages];
        }

        return [notifPage - 1, notifPage, notifPage + 1];
    }, [notifPage, notifTotalPages]);

    useEffect(() => {
        if (notifPage > notifTotalPages) {
            setNotifPage(notifTotalPages);
        }
    }, [notifPage, notifTotalPages]);

    const selectedNotification = useMemo(() => {
        if (!notifSelectedId) return null;
        return (
            notifRows.find((item) => item.id_notifikasi === notifSelectedId) ||
            null
        );
    }, [notifRows, notifSelectedId]);

    const headerTitle = useMemo(() => {
        const name = String(posbankum?.nama || posbankum?.name || "").trim();
        return name ? `Posbankum ${name}` : "Posbankum";
    }, [posbankum?.nama, posbankum?.name]);

    const headerSub = useMemo(() => {
        return cleanHeaderAddress(
            posbankum?.alamat ||
                posbankum?.address ||
                auth?.user?.email ||
                "Dashboard Posbankum",
        );
    }, [posbankum?.alamat, posbankum?.address, auth?.user?.email]);

    // Navbar/topbar harus tetap menampilkan identitas Posbankum seperti halaman Beranda,
    // meskipun menu konten yang dibuka berbeda.
    const pageTitle = headerTitle;
    const pageSub = headerSub;

    const openMenu = (label) => {
        setPageTarget({ type: null, id: null, tick: 0 });
        setNotifSelectedId(null);
        setMobileMenuOpen(false);

        if (label === "Notifikasi") {
            setNotifPage(1);
        }

        setActive(label);
    };

    const handleLogout = () => {
        if (loggingOut) return;
        setMobileMenuOpen(false);
        setLoggingOut(true);
        router.post("/logout", {}, { onFinish: () => setLoggingOut(false) });
    };

    const handleSelectNotification = async (item) => {
        if (!item?.id_notifikasi) return;

        if (!item.is_read) {
            await updateNotificationRead(item.id_notifikasi, true);
        }

        const target = getNotificationTarget(item);
        setNotifSelectedId(null);
        setNotifOpen(false);
        setActive(target.page);
        setPageTarget((prev) => ({
            type: target.type,
            id: target.id,
            tick: prev.tick + 1,
        }));
    };

    const updateNotificationRead = async (id, nextRead) => {
        if (!id || notifBusy) return;

        const previousItem = notifRows.find(
            (item) => String(item.id_notifikasi) === String(id),
        );

        if (!previousItem || previousItem.is_read === nextRead) return;

        const nextReadAt = nextRead ? new Date().toISOString() : null;

        setNotifRows((prev) =>
            prev.map((item) =>
                String(item.id_notifikasi) === String(id)
                    ? {
                          ...item,
                          is_read: nextRead,
                          read_at: nextReadAt,
                      }
                    : item,
            ),
        );

        try {
            await persistNotificationReadStatus(id, nextRead);
        } catch (error) {
            console.error(error);
            setNotifRows((prev) =>
                prev.map((item) =>
                    String(item.id_notifikasi) === String(id)
                        ? {
                              ...item,
                              is_read: previousItem.is_read,
                              read_at: previousItem.read_at || null,
                          }
                        : item,
                ),
            );
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (notifBusy || !hasUnreadNotifications) return;

        const previousRows = notifRows;
        const now = new Date().toISOString();

        setNotifRows((prev) =>
            prev.map((item) => ({
                ...item,
                is_read: true,
                read_at: item.read_at || now,
            })),
        );

        try {
            await persistAllNotificationsRead();
        } catch (error) {
            console.error(error);
            setNotifRows(previousRows);
        }
    };

    const deleteNotification = (id) => {
        if (!id || notifBusy) return;
        setNotifDeleteState({ open: true, mode: "single", id });
    };

    const deleteAllNotifications = () => {
        if (notifBusy || !notifRows.length) return;
        setNotifDeleteState({ open: true, mode: "all", id: null });
    };

    const confirmDeleteNotification = () => {
        setNotifBusy(true);

        if (notifDeleteState.mode === "all") {
            setNotifRows([]);
            setNotifSelectedId(null);
            setNotifDeleteState({ open: false, mode: "single", id: null });
            setNotifBusy(false);
            return;
        }

        const id = notifDeleteState.id;
        setNotifRows((prev) =>
            prev.filter((item) => item.id_notifikasi !== id),
        );
        setNotifSelectedId((selected) => (selected === id ? null : selected));
        setNotifDeleteState({ open: false, mode: "single", id: null });
        setNotifBusy(false);
    };

    const renderBeranda = () => (
        <section className="pb2Content">
            <div className="pb2Stats">
                <button
                    type="button"
                    className="pb2StatCard"
                    onClick={() => openMenu("Semua Kasus")}
                    aria-label="Buka Semua Kasus"
                >
                    <div className="pb2StatIcon blue">
                        <FiFileText />
                    </div>
                    <div className="pb2StatBody">
                        <div className="pb2StatLabel">Kasus Ditangani</div>
                        <div className="pb2StatValue">
                            {stats?.casesThisMonth ?? 0}
                        </div>
                        <div className="pb2StatHint">Bulan ini</div>
                    </div>
                </button>

                <button
                    type="button"
                    className="pb2StatCard"
                    onClick={() => openMenu("Kelola Kegiatan")}
                    aria-label="Buka Kelola Kegiatan"
                >
                    <div className="pb2StatIcon green">
                        <FiCheckCircle />
                    </div>
                    <div className="pb2StatBody">
                        <div className="pb2StatLabel">Kegiatan Selesai</div>
                        <div className="pb2StatValue">
                            {stats?.completedActivities ?? 0}
                        </div>
                        <div className="pb2StatHint">Total kegiatan</div>
                    </div>
                </button>

                <button
                    type="button"
                    className="pb2StatCard"
                    onClick={() => openMenu("Kelola Posbankum")}
                    aria-label="Buka Kelola Posbankum"
                >
                    <div className="pb2StatIcon orange">
                        <FiUsers />
                    </div>
                    <div className="pb2StatBody">
                        <div className="pb2StatLabel">Paralegal Aktif</div>
                        <div className="pb2StatValue">
                            {stats?.activeParalegal ?? 0}
                        </div>
                        <div className="pb2StatHint">Terdaftar</div>
                    </div>
                </button>
            </div>

            <div className="pb2Panel">
                <div className="pb2PanelHead">
                    <div>
                        <div className="pb2PanelTitle">
                            Kasus Terbaru dari Seluruh Posbankum Riau
                        </div>
                        <div className="pb2PanelSub">
                            Sharing kasus untuk pembelajaran bersama
                        </div>
                    </div>
                </div>

                <div className="pb2CaseGrid">
                    {caseRows.length ? (
                        caseRows.slice(0, 4).map((item) => (
                            <div className="pb2CaseCard" key={item.id}>
                                <div
                                    className={`pb2CaseIcon ${item.selesai ? "green" : "orange"}`}
                                >
                                    <FiFileText />
                                </div>

                                <div className="pb2CaseBody">
                                    <div className="pb2CaseTitle">
                                        {item.judul}
                                    </div>
                                    <div className="pb2CaseDesc">
                                        {clampText(item.deskripsi, 160)}
                                    </div>

                                    <div className="pb2CasePills">
                                        <span className="pb2Pill softBlue">
                                            {item.kategori}
                                        </span>
                                        <span className="pb2Pill softBlue">
                                            {item.posbankum}
                                        </span>
                                        <span
                                            className={`pb2Pill ${item.selesai ? "softGreen" : "softOrange"}`}
                                        >
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyBox>Belum ada kasus.</EmptyBox>
                    )}
                </div>

                <button
                    className="pb2Link"
                    type="button"
                    onClick={() => openMenu("Semua Kasus")}
                >
                    Lihat semua kasus <FiChevronRight />
                </button>
            </div>

            <div className="pb2Panel">
                <div className="pb2PanelHead row">
                    <div>
                        <div className="pb2PanelTitle">Kegiatan Terbaru</div>
                        <div className="pb2PanelSub">
                            Aktivitas Posbankum bulan ini
                        </div>
                    </div>

                    <button
                        className="pb2LinkBtn"
                        type="button"
                        onClick={() => openMenu("Kelola Kegiatan")}
                    >
                        Kelola kegiatan
                    </button>
                </div>

                <div className="pb2KegiatanList">
                    {activityRows.length ? (
                        activityRows.slice(0, 4).map((item) => (
                            <div className="pb2KegiatanItem" key={item.id}>
                                <div className="pb2KegiatanIcon">
                                    <FiCheckCircle />
                                </div>

                                <div className="pb2KegiatanBody">
                                    <div className="pb2KegiatanTitle">
                                        {item.judul}
                                    </div>
                                    <div className="pb2KegiatanMeta">
                                        {item.tanggal ? (
                                            <span className="pb2MetaChip">
                                                <FiCalendar />{" "}
                                                {fmtDateID(item.tanggal)}
                                            </span>
                                        ) : null}

                                        {item.lokasi ? (
                                            <span className="pb2MetaChip">
                                                <FiMapPin /> {item.lokasi}
                                            </span>
                                        ) : null}

                                        {item.peserta ? (
                                            <span className="pb2MetaChip">
                                                <FiUsers /> {item.peserta}{" "}
                                                peserta
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <span
                                    className={`pb2Status ${item.selesai ? "ok" : "prog"}`}
                                >
                                    {item.status}
                                </span>
                            </div>
                        ))
                    ) : (
                        <EmptyBox>Belum ada kegiatan.</EmptyBox>
                    )}
                </div>
            </div>
        </section>
    );

    const renderSemuaKasus = () => (
        <section className="pb2Content pb2ContentWithHeading">
            <SemuaKasus
                cases={semuaKasusRows?.length ? semuaKasusRows : kasusTerbaru}
                profile={auth?.user || {}}
                currentPosbankum={currentPosbankum || posbankum}
                flash={flash}
                openDetailId={
                    pageTarget.type === "kasus" ? pageTarget.id : null
                }
                openDetailTick={
                    pageTarget.type === "kasus" ? pageTarget.tick : 0
                }
            />
        </section>
    );

    const renderKelolaPosbankum = () => (
        <section className="pb2Content pb2ContentWithHeading">
            <KelolaPosbankum
                profile={auth?.user || {}}
                currentPosbankum={currentPosbankum || posbankum}
                documents={posbankumDocuments}
                location={posbankumLocation}
                flash={flash}
                openDetailId={
                    ["dokumen", "tagging_area"].includes(pageTarget.type)
                        ? pageTarget.id
                        : null
                }
                openDetailTick={
                    ["dokumen", "tagging_area"].includes(pageTarget.type)
                        ? pageTarget.tick
                        : 0
                }
            />
        </section>
    );

    const renderPageHeading = (title) => (
        <div className="pb2PageHeading">
            <h1 className="pb2PageHeadingTitle">{title}</h1>
            <div className="pb2PageHeadingLine" />
        </div>
    );

    const renderKelolaKegiatan = () => (
        <section className="pb2Content pb2ContentWithHeading">
            <KelolaKegiatan
                kegiatanRows={kegiatanRows}
                paralegalOptions={paralegalOptions}
                currentPosbankum={currentPosbankum || posbankum}
                profile={auth?.user || {}}
                flash={flash}
                openDetailId={
                    pageTarget.type === "kegiatan" ? pageTarget.id : null
                }
                openDetailTick={
                    pageTarget.type === "kegiatan" ? pageTarget.tick : 0
                }
            />
        </section>
    );

    const renderLaporanPelayanan = () => (
        <section className="pb2Content pb2ContentWithHeading">
            {renderPageHeading("Laporan Pelayanan")}
            <LaporanPelayanan
                profile={auth?.user || {}}
                reports={laporanPelayananRows}
                paralegalOptions={paralegalOptions}
                currentPosbankum={currentPosbankum || posbankum}
                flash={flash}
            />
        </section>
    );

    const renderParalegalProfile = () => (
        <section className="pb2Content pb2ContentWithHeading">
            <ParalegalProfile
                profile={paralegalProfile}
                onBack={() => openMenu("Beranda")}
            />
        </section>
    );

    const renderNotifikasi = () => (
        <section className="pb2Content pb2NotifPageContent">
            <div className="pb2NotifPageTop">
                <div className="pb2NotifBreadcrumb" aria-label="Breadcrumb">
                    <button type="button" onClick={() => openMenu("Beranda")}>
                        Beranda
                    </button>
                    <FiChevronRight />
                    <span>Notifikasi</span>
                </div>

                <button
                    className="pb2NotifBackBtn"
                    type="button"
                    onClick={() => openMenu("Beranda")}
                >
                    Kembali
                </button>
            </div>

            <div className="pb2NotifPageHeading">
                <h1>Notifikasi</h1>
                <div className="pb2NotifPageLine" />
            </div>

            <div className="pb2NotifPageList" aria-live="polite">
                {notifRows.length ? (
                    visibleNotifRows.map((item) => (
                        <button
                            key={item.id_notifikasi}
                            type="button"
                            className={`pb2NotifPageCard ${!item.is_read ? "is-unread" : "is-read"}`}
                            onClick={() => handleSelectNotification(item)}
                        >
                            <span
                                className={`pb2NotifPageIcon ${item.kategori}`}
                                aria-hidden="true"
                            >
                                {notificationIcon(item.kategori)}
                            </span>

                            <span className="pb2NotifPageBody">
                                <span className="pb2NotifPageTitle">
                                    {item.judul}
                                </span>
                                <span className="pb2NotifPageMessage">
                                    {item.pesan}
                                </span>
                                <span className="pb2NotifPageDate">
                                    <FiClock />
                                    {formatNotificationCardDateTime(
                                        item.created_at,
                                    )}
                                </span>
                            </span>

                            <FiChevronRight
                                className="pb2NotifPageArrow"
                                aria-hidden="true"
                            />
                        </button>
                    ))
                ) : (
                    <div className="pb2NotifPageEmpty">
                        Belum ada notifikasi.
                    </div>
                )}
            </div>

            {notifRows.length ? (
                <div
                    className="pb2NotifPagination"
                    aria-label="Navigasi halaman notifikasi"
                >
                    {notifTotalPages > 1 ? (
                        <button
                            type="button"
                            className="pb2NotifPageNav"
                            onClick={() =>
                                setNotifPage((page) => Math.max(1, page - 1))
                            }
                            disabled={notifPage <= 1}
                            aria-label="Halaman sebelumnya"
                        >
                            <FiChevronLeft />
                        </button>
                    ) : null}

                    <div className="pb2NotifPageNumbers">
                        {notifPageNumbers.map((pageNumber, index) =>
                            pageNumber ? (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={`pb2NotifPageNumber ${
                                        pageNumber === notifPage
                                            ? "is-active"
                                            : ""
                                    }`}
                                    onClick={() => setNotifPage(pageNumber)}
                                    aria-current={
                                        pageNumber === notifPage
                                            ? "page"
                                            : undefined
                                    }
                                >
                                    {pageNumber}
                                </button>
                            ) : (
                                <span
                                    key={`empty-${index}`}
                                    className="pb2NotifPageNumber is-empty"
                                    aria-hidden="true"
                                />
                            ),
                        )}
                    </div>

                    {notifTotalPages > 1 ? (
                        <button
                            type="button"
                            className="pb2NotifPageNav"
                            onClick={() =>
                                setNotifPage((page) =>
                                    Math.min(notifTotalPages, page + 1),
                                )
                            }
                            disabled={notifPage >= notifTotalPages}
                            aria-label="Halaman berikutnya"
                        >
                            <FiChevronRight />
                        </button>
                    ) : null}
                </div>
            ) : null}
        </section>
    );

    const renderActivePage = () => {
        if (active === "Beranda") return renderBeranda();
        if (active === "Semua Kasus") return renderSemuaKasus();
        if (active === "Kelola Posbankum") return renderKelolaPosbankum();
        if (active === "Kelola Kegiatan") return renderKelolaKegiatan();
        if (active === "Laporan Pelayanan") return renderLaporanPelayanan();
        if (active === "Profil") return renderParalegalProfile();
        if (active === "Notifikasi") return renderNotifikasi();

        return (
            <div className="pb2Soon">
                Halaman <b>{active}</b> belum dibuat
            </div>
        );
    };

    return (
        <div className="pb2Root">
            <Head
                title={
                    active === "Notifikasi"
                        ? "Notifikasi"
                        : "Dashboard Posbankum"
                }
            />

            <aside
                className={`pb2Side ${
                    mobileMenuOpen ? "is-mobile-menu-open" : ""
                }`}
            >
                <button
                    className="pb2Brand pb2BrandButton"
                    type="button"
                    onClick={() => openMenu("Profil")}
                    aria-label="Buka profil paralegal"
                >
                    <div className="pb2BrandLogoWrap">
                        <img
                            src={logo}
                            alt="Logo SIBAPAK"
                            className="pb2BrandLogo"
                        />
                    </div>
                    <div className="pb2BrandText">
                        <div className="pb2BrandName">SIBAPAK</div>
                        <div className="pb2BrandSub">
                            Posbankum Kemenkum Riau
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    className="pb2MobileMenuButton"
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    aria-label={
                        mobileMenuOpen
                            ? "Tutup menu navigasi"
                            : "Buka menu navigasi"
                    }
                    aria-expanded={mobileMenuOpen}
                    aria-controls="paralegal-mobile-navigation"
                >
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                </button>

                <div className="pb2BrandDivider" aria-hidden="true" />

                <nav
                    id="paralegal-mobile-navigation"
                    className={`pb2Nav ${
                        mobileMenuOpen ? "is-mobile-open" : ""
                    }`}
                >
                    {menu.map((item) => (
                        <button
                            key={item.label}
                            className={`pb2NavItem ${active === item.label ? "is-active" : ""}`}
                            type="button"
                            onClick={() => openMenu(item.label)}
                        >
                            <span className="pb2NavIcon">{item.icon}</span>
                            <span className="pb2NavLabel">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="pb2Main">
                <header className="pb2Top">
                    <div className="pb2TopLeft">
                        <div className="pb2TopTitle">{pageTitle}</div>
                        <div className="pb2TopSub">{pageSub}</div>
                    </div>

                    <div className="pb2TopRight">
                        <button
                            className="pb2Bell"
                            type="button"
                            title="Notifikasi"
                            onClick={() => openMenu("Notifikasi")}
                        >
                            <FiBell />
                            {notifCount > 0 ? (
                                <span className="pb2BellBadge">
                                    {notifCount}
                                </span>
                            ) : null}
                        </button>

                        <button
                            className="pb2TopLogoutBtn"
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            title={loggingOut ? "Sedang logout..." : "Keluar"}
                        >
                            <FiLogOut />
                            {loggingOut ? "Keluar..." : "Keluar"}
                        </button>
                    </div>
                </header>

                {renderActivePage()}

                <footer className="pb2Footer">
                    <div className="pb2FooterText">
                        © 2026 Kementerian Hukum Riau. All rights reserved.
                    </div>
                    <div className="pb2FooterText">
                        Dikembangkan oleh Politeknik Caltex Riau
                    </div>
                </footer>

                <ConfirmModal
                    open={notifDeleteState.open}
                    title={
                        notifDeleteState.mode === "all"
                            ? "Hapus Semua Notifikasi?"
                            : "Hapus Notifikasi?"
                    }
                    description={
                        notifDeleteState.mode === "all"
                            ? "Apakah Anda yakin ingin menghapus semua notifikasi dari tampilan ini?"
                            : "Apakah Anda yakin ingin menghapus notifikasi ini dari tampilan?"
                    }
                    confirmLabel={
                        notifDeleteState.mode === "all"
                            ? "Ya, Hapus Semua"
                            : "Ya, Hapus"
                    }
                    loading={notifBusy}
                    onCancel={() => {
                        if (!notifBusy)
                            setNotifDeleteState({
                                open: false,
                                mode: "single",
                                id: null,
                            });
                    }}
                    onConfirm={confirmDeleteNotification}
                />
            </main>
        </div>
    );
}
