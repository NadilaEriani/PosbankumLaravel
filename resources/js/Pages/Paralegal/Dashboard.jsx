import { Head, router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { ImStack } from "react-icons/im";
import { CiCalendar } from "react-icons/ci";
import {
    FiHome,
    FiFileText,
    FiLogOut,
    FiBell,
    FiCheckCircle,
    FiUsers,
    FiChevronRight,
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

function normalizeNotificationRow(item, index = 0) {
    const id = item?.id_notifikasi ?? item?.id ?? `notif-${index}`;

    return {
        ...item,
        id_notifikasi: id,
        judul: item?.judul ?? item?.title ?? "Notifikasi",
        pesan: item?.pesan ?? item?.message ?? "Ada notifikasi baru.",
        kategori: normalizeNotificationCategory(item?.kategori ?? item?.type),
        prioritas: normalizeNotificationPriority(
            item?.prioritas ?? item?.priority,
        ),
        is_read: Boolean(item?.is_read ?? item?.read_at),
        created_at: item?.created_at ?? new Date().toISOString(),
    };
}

function getNotificationTypeLabel(value) {
    return startCase(normalizeNotificationCategory(value));
}

function getNotificationPriorityLabel(value) {
    return startCase(normalizeNotificationPriority(value));
}

function notificationIcon(category) {
    const key = normalizeNotificationCategory(category);

    if (key === "pengaduan") return <FiAlertCircle />;
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
    const [loggingOut, setLoggingOut] = useState(false);

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
    const [notifRows, setNotifRows] = useState(() =>
        (notifications || []).map(normalizeNotificationRow),
    );

    useEffect(() => {
        setNotifRows((notifications || []).map(normalizeNotificationRow));
        setNotifSelectedId(null);
    }, [notifications]);

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

    const pageTitle = active === "Beranda" ? headerTitle : active;
    const pageSub =
        active === "Beranda"
            ? headerSub
            : active === "Profil"
              ? "Informasi akun dan Posbankum terhubung"
              : "Kelola data Posbankum secara bertahap";

    const handleLogout = () => {
        if (loggingOut) return;
        setLoggingOut(true);
        router.post("/logout", {}, { onFinish: () => setLoggingOut(false) });
    };

    const handleSelectNotification = (item) => {
        if (!item?.id_notifikasi) return;
        setNotifSelectedId(item.id_notifikasi);

        if (!item.is_read) {
            updateNotificationRead(item.id_notifikasi, true);
        }
    };

    const updateNotificationRead = (id, nextRead) => {
        if (!id || notifBusy) return;
        setNotifRows((prev) =>
            prev.map((item) =>
                item.id_notifikasi === id
                    ? {
                          ...item,
                          is_read: nextRead,
                          read_at: nextRead ? new Date().toISOString() : null,
                      }
                    : item,
            ),
        );
    };

    const markAllNotificationsAsRead = () => {
        if (notifBusy || !hasUnreadNotifications) return;
        setNotifRows((prev) =>
            prev.map((item) => ({
                ...item,
                is_read: true,
                read_at: item.read_at || new Date().toISOString(),
            })),
        );
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
                <div className="pb2StatCard">
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
                </div>

                <div className="pb2StatCard">
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
                </div>

                <div className="pb2StatCard">
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
                </div>
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
                    onClick={() => setActive("Semua Kasus")}
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
                        onClick={() => setActive("Kelola Kegiatan")}
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
            {renderPageHeading("Semua Kasus")}
            <SemuaKasus
                cases={semuaKasusRows?.length ? semuaKasusRows : kasusTerbaru}
                profile={auth?.user || {}}
                currentPosbankum={currentPosbankum || posbankum}
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
            {renderPageHeading("Kelola Kegiatan")}
            <KelolaKegiatan
                kegiatanRows={kegiatanRows}
                paralegalOptions={paralegalOptions}
                currentPosbankum={currentPosbankum || posbankum}
                flash={flash}
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
                onBack={() => setActive("Beranda")}
            />
        </section>
    );

    const renderActivePage = () => {
        if (active === "Beranda") return renderBeranda();
        if (active === "Semua Kasus") return renderSemuaKasus();
        if (active === "Kelola Posbankum") return renderKelolaPosbankum();
        if (active === "Kelola Kegiatan") return renderKelolaKegiatan();
        if (active === "Laporan Pelayanan") return renderLaporanPelayanan();
        if (active === "Profil") return renderParalegalProfile();

        return (
            <div className="pb2Soon">
                Halaman <b>{active}</b> belum dibuat
            </div>
        );
    };

    return (
        <div className="pb2Root">
            <Head title="Dashboard Posbankum" />

            <aside className="pb2Side">
                <button
                    className="pb2Brand pb2BrandButton"
                    type="button"
                    onClick={() => setActive("Profil")}
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

                <div className="pb2BrandDivider" aria-hidden="true" />

                <nav className="pb2Nav">
                    {menu.map((item) => (
                        <button
                            key={item.label}
                            className={`pb2NavItem ${active === item.label ? "is-active" : ""}`}
                            type="button"
                            onClick={() => setActive(item.label)}
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
                            onClick={() => setNotifOpen(true)}
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

                {notifOpen ? (
                    <div
                        className="pb2NotifOverlay"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Notifikasi"
                        onClick={(e) => {
                            if (e.target === e.currentTarget)
                                setNotifOpen(false);
                        }}
                    >
                        <div
                            className={`pb2NotifModal ${selectedNotification ? "has-detail" : ""}`}
                        >
                            <div className="pb2NotifHead">
                                <div className="pb2NotifHeadLeft">
                                    <div className="pb2NotifHeadIcon">
                                        <FiBell />
                                    </div>
                                    <div>
                                        <div className="pb2NotifTitle">
                                            Notifikasi
                                        </div>
                                        <div className="pb2NotifSub">
                                            {notifSummaryText}
                                        </div>
                                    </div>
                                </div>

                                <div className="pb2NotifHeadActions">
                                    {hasUnreadNotifications ? (
                                        <button
                                            className="pb2NotifGhostBtn is-top"
                                            type="button"
                                            onClick={markAllNotificationsAsRead}
                                            disabled={notifBusy}
                                        >
                                            <FiCheckCircle /> Tandai Semua
                                            Dibaca
                                        </button>
                                    ) : null}

                                    <button
                                        className="pb2NotifCloseTop"
                                        type="button"
                                        onClick={() => setNotifOpen(false)}
                                        aria-label="Tutup notifikasi"
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            </div>

                            <div className="pb2NotifToolbar">
                                <div className="pb2NotifToolbarGroup">
                                    <span className="pb2NotifFilterLabel">
                                        <FiFilter /> Filter:
                                    </span>
                                    <div className="pb2NotifChips">
                                        {[
                                            { key: "semua", label: "Semua" },
                                            {
                                                key: "belum",
                                                label: "Belum Dibaca",
                                            },
                                            {
                                                key: "sudah",
                                                label: "Sudah Dibaca",
                                            },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                className={`pb2NotifChip ${notifReadFilter === item.key ? "is-active" : ""}`}
                                                onClick={() =>
                                                    setNotifReadFilter(item.key)
                                                }
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="pb2NotifToolbarDivider"
                                    aria-hidden="true"
                                />

                                <div className="pb2NotifToolbarGroup right">
                                    <div className="pb2NotifChips">
                                        {[
                                            { key: "semua", label: "Semua" },
                                            {
                                                key: "pengaduan",
                                                label: "Pengaduan",
                                            },
                                            {
                                                key: "kegiatan",
                                                label: "Kegiatan",
                                            },
                                            {
                                                key: "dokumen",
                                                label: "Dokumen",
                                            },
                                            { key: "sistem", label: "Sistem" },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                className={`pb2NotifChip ${notifTypeFilter === item.key ? "is-active" : ""}`}
                                                onClick={() =>
                                                    setNotifTypeFilter(item.key)
                                                }
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className="pb2NotifDangerSoft"
                                        type="button"
                                        onClick={deleteAllNotifications}
                                        disabled={
                                            notifBusy || !notifRows.length
                                        }
                                    >
                                        <FiTrash2 /> Hapus Semua
                                    </button>
                                </div>
                            </div>

                            <div className="pb2NotifBody">
                                <div className="pb2NotifListWrap">
                                    {filteredNotifications.length ? (
                                        <div className="pb2NotifList">
                                            {filteredNotifications.map(
                                                (item) => {
                                                    const isSelected =
                                                        selectedNotification?.id_notifikasi ===
                                                        item.id_notifikasi;
                                                    return (
                                                        <div
                                                            key={
                                                                item.id_notifikasi
                                                            }
                                                            className={`pb2NotifCard ${!item.is_read ? "is-unread" : ""} ${isSelected ? "is-selected" : ""}`}
                                                            onClick={() =>
                                                                handleSelectNotification(
                                                                    item,
                                                                )
                                                            }
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                        "Enter" ||
                                                                    e.key ===
                                                                        " "
                                                                ) {
                                                                    e.preventDefault();
                                                                    handleSelectNotification(
                                                                        item,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <div
                                                                className={`pb2NotifTypeIcon ${item.kategori}`}
                                                            >
                                                                {notificationIcon(
                                                                    item.kategori,
                                                                )}
                                                            </div>

                                                            <div className="pb2NotifCardBody">
                                                                <div className="pb2NotifCardTop">
                                                                    <div className="pb2NotifCardTitle">
                                                                        {
                                                                            item.judul
                                                                        }
                                                                    </div>
                                                                    <span
                                                                        className={`pb2NotifPriority ${item.prioritas}`}
                                                                    >
                                                                        {getNotificationPriorityLabel(
                                                                            item.prioritas,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="pb2NotifCardMessage">
                                                                    {item.pesan}
                                                                </div>

                                                                <div className="pb2NotifMetaRow">
                                                                    <span className="pb2NotifMetaTime">
                                                                        <FiClock />{" "}
                                                                        {formatNotificationRelative(
                                                                            item.created_at,
                                                                        )}
                                                                    </span>
                                                                    <span className="pb2NotifMetaType">
                                                                        {getNotificationTypeLabel(
                                                                            item.kategori,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="pb2NotifCardActions">
                                                                <button
                                                                    className="pb2NotifRoundAction"
                                                                    type="button"
                                                                    title={
                                                                        item.is_read
                                                                            ? "Tandai belum dibaca"
                                                                            : "Tandai sudah dibaca"
                                                                    }
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        updateNotificationRead(
                                                                            item.id_notifikasi,
                                                                            !item.is_read,
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        notifBusy
                                                                    }
                                                                >
                                                                    {item.is_read ? (
                                                                        <FiEyeOff />
                                                                    ) : (
                                                                        <FiEye />
                                                                    )}
                                                                </button>

                                                                {!selectedNotification ? (
                                                                    <button
                                                                        className="pb2NotifRoundAction danger"
                                                                        type="button"
                                                                        title="Hapus notifikasi"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            deleteNotification(
                                                                                item.id_notifikasi,
                                                                            );
                                                                        }}
                                                                        disabled={
                                                                            notifBusy
                                                                        }
                                                                    >
                                                                        <FiTrash2 />
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    ) : (
                                        <div className="pb2NotifEmptyWrap">
                                            <div className="pb2NotifEmptyIcon">
                                                <FiBellOff />
                                            </div>
                                            <div className="pb2NotifEmptyTitle">
                                                Tidak Ada Notifikasi
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedNotification ? (
                                    <aside className="pb2NotifDetail">
                                        <div className="pb2NotifDetailHead">
                                            <div className="pb2NotifDetailTitle">
                                                Detail Notifikasi
                                            </div>
                                            <button
                                                className="pb2NotifCloseSide"
                                                type="button"
                                                onClick={() =>
                                                    setNotifSelectedId(null)
                                                }
                                                aria-label="Tutup detail"
                                            >
                                                <FiX />
                                            </button>
                                        </div>

                                        <div className="pb2NotifDetailHero">
                                            <div
                                                className={`pb2NotifTypeIcon ${selectedNotification.kategori}`}
                                            >
                                                {notificationIcon(
                                                    selectedNotification.kategori,
                                                )}
                                            </div>

                                            <div className="pb2NotifDetailHeroBody">
                                                <div className="pb2NotifDetailHeroTitle">
                                                    {selectedNotification.judul}
                                                </div>
                                                <div className="pb2NotifDetailHeroBadges">
                                                    <span
                                                        className={`pb2NotifPriority ${selectedNotification.prioritas}`}
                                                    >
                                                        {getNotificationPriorityLabel(
                                                            selectedNotification.prioritas,
                                                        )}
                                                    </span>
                                                    <span className="pb2NotifMetaType">
                                                        {getNotificationTypeLabel(
                                                            selectedNotification.kategori,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pb2NotifDetailMessage">
                                            {selectedNotification.pesan}
                                        </div>

                                        <div className="pb2NotifDetailInfo time">
                                            <div className="pb2NotifDetailInfoTitle">
                                                <FiClock /> Waktu
                                            </div>
                                            <div className="pb2NotifDetailInfoText">
                                                {formatNotificationDateTime(
                                                    selectedNotification.created_at,
                                                )}
                                            </div>
                                            <div className="pb2NotifDetailInfoHint">
                                                {formatNotificationRelative(
                                                    selectedNotification.created_at,
                                                )}
                                            </div>
                                        </div>

                                        <div className="pb2NotifDetailInfo read">
                                            <div className="pb2NotifDetailInfoTitle is-read">
                                                <FiCheckCircle />{" "}
                                                {selectedNotification.is_read
                                                    ? "Sudah Dibaca"
                                                    : "Belum Dibaca"}
                                            </div>
                                        </div>

                                        <div className="pb2NotifDetailBtns">
                                            <button
                                                className="pb2NotifPrimaryBtn warning"
                                                type="button"
                                                onClick={() =>
                                                    updateNotificationRead(
                                                        selectedNotification.id_notifikasi,
                                                        !selectedNotification.is_read,
                                                    )
                                                }
                                                disabled={notifBusy}
                                            >
                                                {selectedNotification.is_read ? (
                                                    <FiEyeOff />
                                                ) : (
                                                    <FiEye />
                                                )}{" "}
                                                {selectedNotification.is_read
                                                    ? "Tandai Belum Dibaca"
                                                    : "Tandai Dibaca"}
                                            </button>

                                            <button
                                                className="pb2NotifPrimaryBtn danger"
                                                type="button"
                                                onClick={() =>
                                                    deleteNotification(
                                                        selectedNotification.id_notifikasi,
                                                    )
                                                }
                                                disabled={notifBusy}
                                            >
                                                <FiTrash2 /> Hapus Notifikasi
                                            </button>
                                        </div>
                                    </aside>
                                ) : null}
                            </div>

                            <div className="pb2NotifFooter">
                                <div className="pb2NotifFooterText">
                                    Menampilkan {filteredNotifications.length}{" "}
                                    dari {notifRows.length} notifikasi
                                </div>
                                <button
                                    className="pb2NotifFooterBtn"
                                    type="button"
                                    onClick={() => setNotifOpen(false)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

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
