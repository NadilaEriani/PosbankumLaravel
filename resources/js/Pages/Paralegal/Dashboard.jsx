import { Head, router } from "@inertiajs/react";
import { useMemo, useState } from "react";
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
    FiBellOff,
} from "react-icons/fi";

import logo from "../../assets/logo.png";
import "../../../css/paralegalDashboard.css";

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

function clampText(value, limit = 150) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text || "Belum ada deskripsi.";
    return `${text.slice(0, limit)}...`;
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

    return fmtDateID(value);
}

function PlaceholderPage({ title }) {
    return (
        <section className="pb2Content">
            <div className="pb2Panel">
                <div className="pb2PanelHead">
                    <div>
                        <div className="pb2PanelTitle">{title}</div>
                        <div className="pb2PanelSub">
                            Halaman ini sudah disiapkan. Fitur detail akan kita
                            sambungkan bertahap.
                        </div>
                    </div>
                </div>

                <div
                    className="pb2InlineErr"
                    style={{
                        color: "#4b5563",
                        background: "#f8fafc",
                        borderColor: "#e5e7eb",
                    }}
                >
                    Tahap sekarang fokus membuat tampilan dashboard dulu.
                    Setelah ini baru kita buat CRUD per menu.
                </div>
            </div>
        </section>
    );
}

function NotificationModal({ notifications, onClose }) {
    const [readFilter, setReadFilter] = useState("semua");
    const [typeFilter, setTypeFilter] = useState("semua");
    const [selectedId, setSelectedId] = useState(
        notifications?.[0]?.id || null,
    );
    const [showRead, setShowRead] = useState(true);

    const filtered = useMemo(() => {
        return (notifications || []).filter((item) => {
            const matchRead =
                readFilter === "semua"
                    ? true
                    : readFilter === "belum"
                      ? !item.is_read
                      : item.is_read;
            const matchType =
                typeFilter === "semua" ? true : item.kategori === typeFilter;
            return matchRead && matchType;
        });
    }, [notifications, readFilter, typeFilter]);

    const selected = useMemo(
        () =>
            filtered.find((item) => item.id === selectedId) ||
            filtered[0] ||
            null,
        [filtered, selectedId],
    );

    return (
        <div className="pb2NotifOverlay">
            <div className="pb2NotifBackdrop" onClick={onClose} />
            <div className={`pb2NotifModal ${selected ? "has-detail" : ""}`}>
                <div className="pb2NotifHead">
                    <div>
                        <div className="pb2NotifTitle">Notifikasi</div>
                        <div className="pb2NotifSub">
                            Informasi terbaru untuk akun Posbankum Anda
                        </div>
                    </div>
                    <button
                        className="pb2NotifClose"
                        type="button"
                        onClick={onClose}
                    >
                        <FiX />
                    </button>
                </div>

                <div className="pb2NotifToolbar">
                    <button
                        className={`pb2NotifFilterBtn ${readFilter === "semua" ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setReadFilter("semua")}
                    >
                        Semua
                    </button>
                    <button
                        className={`pb2NotifFilterBtn ${readFilter === "belum" ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setReadFilter("belum")}
                    >
                        Belum Dibaca
                    </button>
                    <button
                        className={`pb2NotifFilterBtn ${readFilter === "dibaca" ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setReadFilter("dibaca")}
                    >
                        Dibaca
                    </button>
                    <span className="pb2NotifToolbarDivider" />
                    <button
                        className={`pb2NotifFilterBtn ${typeFilter === "semua" ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setTypeFilter("semua")}
                    >
                        Semua Tipe
                    </button>
                    <button
                        className={`pb2NotifFilterBtn ${typeFilter === "pengaduan" ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setTypeFilter("pengaduan")}
                    >
                        Pengaduan
                    </button>
                    <button
                        className={`pb2NotifGhostBtn ${showRead ? "" : "is-active"}`}
                        type="button"
                        onClick={() => setShowRead((value) => !value)}
                    >
                        {showRead ? <FiEye /> : <FiEyeOff />} Detail
                    </button>
                </div>

                <div className="pb2NotifBody">
                    <div className="pb2NotifList">
                        {filtered.length ? (
                            filtered.map((item) => (
                                <button
                                    className={`pb2NotifCard ${selected?.id === item.id ? "is-active" : ""} ${item.is_read ? "is-read" : ""}`}
                                    type="button"
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                >
                                    <span className="pb2NotifIcon">
                                        <FiBell />
                                    </span>
                                    <span className="pb2NotifCardText">
                                        <strong>{item.title}</strong>
                                        <small>
                                            {formatNotificationRelative(
                                                item.created_at,
                                            )}
                                        </small>
                                    </span>
                                    {!item.is_read ? (
                                        <span className="pb2NotifDot" />
                                    ) : null}
                                </button>
                            ))
                        ) : (
                            <div className="pb2NotifEmptyWrap">
                                <div>
                                    <div className="pb2NotifEmptyIcon">
                                        <FiBellOff />
                                    </div>
                                    <div className="pb2NotifEmptyTitle">
                                        Belum ada notifikasi
                                    </div>
                                    <div className="pb2NotifEmptyText">
                                        Notifikasi akan muncul setelah ada
                                        aktivitas baru.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {showRead && selected ? (
                        <div className="pb2NotifDetail">
                            <div className="pb2NotifDetailHead">
                                <span className="pb2NotifDetailIcon">
                                    <FiBell />
                                </span>
                                <div>
                                    <div className="pb2NotifDetailTitle">
                                        {selected.title}
                                    </div>
                                    <div className="pb2NotifDetailDate">
                                        {fmtDateID(selected.created_at)}
                                    </div>
                                </div>
                            </div>
                            <div className="pb2NotifDetailText">
                                {selected.message}
                            </div>
                            <div className="pb2NotifDetailActions">
                                <button
                                    className="pb2NotifPrimaryBtn"
                                    type="button"
                                >
                                    <FiCheckCircle /> Tandai Dibaca
                                </button>
                                <button
                                    className="pb2NotifDangerSoft"
                                    type="button"
                                >
                                    <FiTrash2 /> Hapus
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="pb2NotifFooter">
                    <div className="pb2NotifFooterText">
                        {filtered.length} notifikasi ditampilkan
                    </div>
                    <button
                        className="pb2NotifFooterBtn"
                        type="button"
                        onClick={onClose}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PosbankumDashboard({
    auth = {},
    posbankum = {},
    stats = {},
    kasusTerbaru = [],
    kegiatanTerbaru = [],
    notifications = [],
}) {
    const [active, setActive] = useState("Beranda");
    const [notifOpen, setNotifOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const menu = useMemo(
        () => [
            { label: "Beranda", icon: <FiHome /> },
            { label: "Semua Kasus", icon: <ImStack /> },
            { label: "Kelola Posbankum", icon: <FiUsers /> },
            {
                label: "Kelola Kegiatan",
                icon: <CiCalendar style={{ fontSize: 20, strokeWidth: 1 }} />,
            },
            { label: "Laporan Pelayanan", icon: <FiFileText /> },
        ],
        [],
    );

    const notifCount = useMemo(
        () => (notifications || []).filter((item) => !item.is_read).length,
        [notifications],
    );

    const headerTitle = useMemo(() => {
        const name = String(posbankum?.nama || "").trim();
        return name ? `Posbankum ${name}` : "Posbankum";
    }, [posbankum?.nama]);

    const headerSub = useMemo(
        () =>
            String(posbankum?.alamat || "")
                .replace(/\s*,\s*/g, ", ")
                .trim(),
        [posbankum?.alamat],
    );

    const handleLogout = () => {
        if (loggingOut) return;
        setLoggingOut(true);
        router.post("/logout", {}, { onFinish: () => setLoggingOut(false) });
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
                            Kasus Terbaru dari Posbankum
                        </div>
                        <div className="pb2PanelSub">
                            Data pengaduan terbaru dari database Laravel
                        </div>
                    </div>
                </div>

                <div className="pb2CaseGrid">
                    {(kasusTerbaru || []).length ? (
                        kasusTerbaru.map((item) => (
                            <div className="pb2CaseCard" key={item.id}>
                                <div
                                    className={`pb2CaseIcon ${item.status === "Selesai" ? "green" : "orange"}`}
                                >
                                    <FiFileText />
                                </div>
                                <div className="pb2CaseBody">
                                    <div className="pb2CaseTitle">
                                        {item.title}
                                    </div>
                                    <div className="pb2CaseDesc">
                                        {clampText(item.description, 160)}
                                    </div>
                                    <div className="pb2CaseMeta">
                                        <span>
                                            <FiMapPin />{" "}
                                            {item.location || "Posbankum"}
                                        </span>
                                        <span>
                                            <FiCalendar />{" "}
                                            {fmtDateID(item.date)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="pb2EmptyState">
                            Belum ada kasus terbaru.
                        </div>
                    )}
                </div>
            </div>

            <div className="pb2Panel">
                <div className="pb2PanelHead row">
                    <div>
                        <div className="pb2PanelTitle">Kegiatan Terbaru</div>
                        <div className="pb2PanelSub">
                            Aktivitas Posbankum yang baru dibuat
                        </div>
                    </div>
                </div>

                <div className="pb2ActivityList">
                    {(kegiatanTerbaru || []).length ? (
                        kegiatanTerbaru.map((item) => (
                            <div className="pb2ActivityItem" key={item.id}>
                                <div className="pb2ActivityIcon">
                                    <FiClock />
                                </div>
                                <div className="pb2ActivityBody">
                                    <div className="pb2ActivityTitle">
                                        {item.title}
                                    </div>
                                    <div className="pb2ActivityDesc">
                                        {clampText(item.description, 130)}
                                    </div>
                                    <div className="pb2ActivityMeta">
                                        {fmtDateID(item.date)} ·{" "}
                                        {item.status || "Diproses"}
                                    </div>
                                </div>
                                <FiChevronRight />
                            </div>
                        ))
                    ) : (
                        <div className="pb2EmptyState">
                            Belum ada kegiatan terbaru.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );

    return (
        <div className="pb2Root">
            <Head title="Dashboard Posbankum" />

            <aside className="pb2Side">
                <button
                    className="pb2Brand pb2BrandButton"
                    type="button"
                    onClick={() => setActive("Beranda")}
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

                <div className="pb2BrandDivider" />

                <nav className="pb2Nav">
                    {menu.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`pb2NavItem ${active === item.label ? "is-active" : ""}`}
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
                        <div className="pb2TopTitle">
                            {active === "Beranda" ? headerTitle : active}
                        </div>
                        <div className="pb2TopSub">
                            {active === "Beranda"
                                ? headerSub ||
                                  auth?.user?.email ||
                                  "Dashboard Posbankum"
                                : "Kelola data Posbankum secara bertahap"}
                        </div>
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
                        >
                            <FiLogOut />
                            {loggingOut ? "Keluar..." : "Keluar"}
                        </button>
                    </div>
                </header>

                {active === "Beranda" ? (
                    renderBeranda()
                ) : (
                    <PlaceholderPage title={active} />
                )}
            </main>

            {notifOpen ? (
                <NotificationModal
                    notifications={notifications}
                    onClose={() => setNotifOpen(false)}
                />
            ) : null}
        </div>
    );
}
