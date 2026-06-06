import { Head, Link, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
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
    FiSearch,
    FiX,
    FiMapPin,
    FiExternalLink,
    FiPhone,
} from "react-icons/fi";
import { TbFileCheck } from "react-icons/tb";
import { BsCheck2Circle } from "react-icons/bs";
import { HiOutlineNewspaper } from "react-icons/hi2";

import "../../../css/adminDashboard.css";

import DataPosbankum from "./DataPosbankum";
import ManajemenAkun from "./ManajemenAkun";
import VerifikasiDataPosbankum from "./VerifikasiDataPosbankum";
import LaporanKegiatan from "./LaporanKegiatan";
import KelolaBerita from "./KelolaBerita";
import AdminProfile from "./AdminProfile";

import posbankumIcon from "../../assets/icon.png";
import logo from "../../assets/logo.png";

function formatDateID(value) {
    if (!value) return "-";

    try {
        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(value));
    } catch {
        return "-";
    }
}

function pickActivityIcon(type) {
    const value = String(type || "").toLowerCase();

    if (value.includes("pengaduan")) return <TbFileCheck />;
    if (value.includes("kegiatan")) return <FiCalendar />;
    if (value.includes("berita")) return <HiOutlineNewspaper />;

    return <BsCheck2Circle />;
}

function pickTone(type) {
    const value = String(type || "").toLowerCase();

    if (value.includes("pengaduan")) return "blue";
    if (value.includes("kegiatan")) return "green";
    if (value.includes("berita")) return "orange";

    return "blue";
}

export default function AdminDashboard() {
    const { props } = usePage();

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

    const [active, setActive] = useState("Beranda");
    const [rangeOpen, setRangeOpen] = useState(false);
    const [rangeDays, setRangeDays] = useState(30);
    const [detailSearch, setDetailSearch] = useState("");
    const [selectedPosDetail, setSelectedPosDetail] = useState(null);
    const [activityOpen, setActivityOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

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

    const handleLogout = () => {
        router.post("/logout");
    };

    const pageTitle = active === "Beranda" ? "Dashboard Admin" : active;

    const renderBeranda = () => (
        <section className="ad-grid">
            <div className="ad-wireTitle">Beranda</div>

            <div className="ad-cards">
                {statDefs.map((item) => (
                    <div className={`ad-card tone-${item.tone}`} key={item.key}>
                        <div className="ad-cardIcon">{item.icon}</div>

                        <div className="ad-cardBody">
                            <div className="ad-cardTitle">{item.title}</div>
                            <div className="ad-cardValue">
                                {stats[item.key] ?? 0}
                            </div>
                            <div className="ad-cardHint">{item.hint}</div>
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
                                Berdasarkan data pengaduan dan kegiatan
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
                                    {rangeDays} Hari
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
                            <div className="ad-panelSub">
                                Riwayat terbaru dari database
                            </div>
                        </div>

                        <button
                            type="button"
                            className="ad-linkBtn"
                            onClick={() => setActivityOpen(true)}
                        >
                            Lihat Semua
                        </button>
                    </div>

                    <div className="ad-activityList">
                        {activities.slice(0, 5).map((item, index) => (
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
                            Detail Data Posbankum
                        </div>
                        <div className="ad-panelSub">
                            Data ringkas seluruh Posbankum
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
                        <thead>
                            <tr>
                                <th className="ad-colPosbankum">Posbankum</th>
                                <th className="is-center">Paralegal</th>
                                <th className="is-center">Kegiatan</th>
                                <th className="is-center">Kasus</th>
                                <th className="is-center">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredDetailRows.map((row) => (
                                <tr
                                    key={row.id || row.name}
                                    className="ad-tableRowClickable"
                                    onClick={() => setSelectedPosDetail(row)}
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
                                            {row.paralegalCount || 0}
                                        </span>
                                    </td>
                                    <td className="is-center">
                                        {row.activityCount || 0}
                                    </td>
                                    <td className="is-center">
                                        {row.caseCount || 0}
                                    </td>
                                    <td className="is-center">
                                        <span className="ad-pillGreen">
                                            {row.status || "Aktif"}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {filteredDetailRows.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="ad-emptyMini">
                                            Data Posbankum belum tersedia.
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );

    const renderContent = () => {
        if (active === "Kelola Berita") {
            return <KelolaBerita rows={beritaRows} />;
        }

        if (active === "Data Posbankum") {
            return <DataPosbankum rows={detailRows} />;
        }

        if (active === "Verifikasi Data Posbankum") {
            return <VerifikasiDataPosbankum rows={verificationRows} />;
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

            <aside className="ad-side">
                <button
                    className="ad-brand ad-brandButton"
                    type="button"
                    onClick={() => setShowProfile(true)}
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
                                active === item.label ? "is-active" : ""
                            }`}
                            onClick={() => {
                                setShowProfile(false);
                                setActive(item.label);
                            }}
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
                        >
                            <FiLogOut />
                            Keluar
                        </button>
                    </div>
                </header>

                {renderContent()}

                <footer className="ad-footer">
                    <div className="ad-footerText">
                        © 2026 Kementerian Hukum Riau. All rights reserved.
                    </div>
                </footer>
            </main>

            {selectedPosDetail ? (
                <div className="ad-modalOverlay">
                    <div
                        className="ad-modalBackdrop"
                        onClick={() => setSelectedPosDetail(null)}
                    />
                    <div className="ad-detailModalCard">
                        <div className="ad-detailModalHead">
                            <div className="ad-detailModalHeadText">
                                <div className="ad-detailModalTitle">
                                    {selectedPosDetail.name}
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
                                        {selectedPosDetail.paralegalCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Paralegal
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-green">
                                    <FiCalendar className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedPosDetail.activityCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Kegiatan
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-orange">
                                    <TbFileCheck className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedPosDetail.caseCount || 0}
                                    </div>
                                    <div className="ad-detailStatLabel">
                                        Kasus
                                    </div>
                                </div>

                                <div className="ad-detailStatCard tone-blueAlt">
                                    <BsCheck2Circle className="ad-detailStatIcon" />
                                    <div className="ad-detailStatValue">
                                        {selectedPosDetail.status || "Aktif"}
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
                                                {selectedPosDetail.address ||
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
                                                {selectedPosDetail.phone || "-"}
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
                                                {selectedPosDetail.email || "-"}
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
                                                    selectedPosDetail.phone ||
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
                                                selectedPosDetail.latitude &&
                                                    selectedPosDetail.longitude
                                                    ? `https://www.google.com/maps/search/?api=1&query=${selectedPosDetail.latitude},${selectedPosDetail.longitude}`
                                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                          selectedPosDetail.address ||
                                                              selectedPosDetail.name ||
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

            {activityOpen ? (
                <div className="ad-modalOverlay">
                    <div
                        className="ad-modalBackdrop"
                        onClick={() => setActivityOpen(false)}
                    />
                    <div className="ad-modalCard">
                        <div className="ad-modalHead">
                            <div className="ad-modalHeadText">
                                <div className="ad-modalTitle">
                                    Semua Aktivitas
                                </div>
                                <div className="ad-modalSub">
                                    Aktivitas terbaru dari database
                                </div>
                            </div>

                            <button
                                type="button"
                                className="ad-modalHeadIconBtn"
                                onClick={() => setActivityOpen(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="ad-modalList">
                            {activities.map((item, index) => (
                                <div
                                    className="ad-modalItem"
                                    key={`${item.type}-${index}`}
                                >
                                    <div
                                        className={`ad-modalIconWrap tone-${pickTone(
                                            item.type,
                                        )}`}
                                    >
                                        {pickActivityIcon(item.type)}
                                    </div>

                                    <div className="ad-modalBody">
                                        <div className="ad-modalItemTitle">
                                            {item.title}
                                        </div>
                                        <div className="ad-modalItemDesc">
                                            {item.description}
                                        </div>
                                        <div className="ad-modalMeta">
                                            <span className="ad-modalMetaChip">
                                                <FiClock />
                                                {formatDateID(item.at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`ad-modalBadge tone-${pickTone(
                                            item.type,
                                        )}`}
                                    >
                                        {item.type}
                                    </div>
                                </div>
                            ))}

                            {activities.length === 0 ? (
                                <div className="ad-modalEmpty">
                                    Belum ada aktivitas.
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {showProfile ? (
                <AdminProfile
                    user={user}
                    onClose={() => setShowProfile(false)}
                />
            ) : null}
        </div>
    );
}
