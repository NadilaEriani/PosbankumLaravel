import { MdOutlineLocationOn } from "react-icons/md";
import { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";

import {
    AiOutlineThunderbolt,
    AiOutlineMail,
    AiOutlineCheck,
    AiOutlineYoutube,
    AiOutlineClose,
    AiOutlineQuestionCircle,
} from "react-icons/ai";
import { BiRightArrowAlt, BiFile, BiShield } from "react-icons/bi";
import { MdLanguage } from "react-icons/md";
import { BsTelephone, BsClock, BsInstagram } from "react-icons/bs";
import { TbArrowBarRight } from "react-icons/tb";
import {
    FiUsers,
    FiSearch,
    FiPhone,
    FiMail,
    FiExternalLink,
    FiFacebook,
    FiTwitter,
    FiMessageCircle,
    FiSend,
    FiLayers,
    FiZoomIn,
    FiZoomOut,
} from "react-icons/fi";
import { HiArrowTrendingUp } from "react-icons/hi2";
import { HiOutlineScale } from "react-icons/hi";
import { SlLocationPin } from "react-icons/sl";
import { IoCloseOutline, IoLocateSharp } from "react-icons/io5";
import { IoIosArrowDown, IoIosArrowUp, IoMdTime } from "react-icons/io";

import burung from "../assets/burung.png";
import burung1 from "../assets/burung1.png";
import burung5 from "../assets/burung5.png";
import burung8 from "../assets/burung8.png";
import logo from "../assets/logo.png";
import medalIcon from "../assets/medal.png";
import earthIcon from "../assets/earth.png";
import mapsIcon from "../assets/maps.png";
import "../../css/landingPage.css";

const ORG_FULL = "Kantor Wilayah Kementerian Hukum Riau";
const ORG_ADDR = "Kanwil Kemenkum Riau, Pekanbaru";
const ORG_EMAIL = "humaskumriau@gmail.com";
const ORG_WA_DISPLAY = "0811-6904-422";
const ORG_WA_TEL = "628116904422";
const ORG_HOURS_DAYS = "Senin - Jumat";
const ORG_HOURS_TIME = "08:00 - 16:00 WIB";

const SOCIAL_LINKS = {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    youtube: "#",
};

const markerPositions = [
    { top: "22%", left: "35%" },
    { top: "46%", left: "48%" },
    { top: "28%", left: "78%" },
    { top: "63%", left: "18%" },
    { top: "57%", left: "90%" },
    { top: "38%", left: "66%" },
    { top: "72%", left: "60%" },
    { top: "30%", left: "12%" },
];

const faqItems = [
    {
        // SLOT ICON FAQ 1: import icon di atas, lalu ganti null dengan nama icon.
        // Contoh: icon: AiOutlineQuestionCircle,
        icon: AiOutlineQuestionCircle,
        question:
            "Apa itu Pos Bantuan Hukum dan siapa yang berhak mendapatkan layanannya?",
        answer: "Pos Bantuan Hukum adalah layanan penyuluhan, konsultasi, dan pendampingan hukum yang diberikan secara gratis kepada masyarakat tidak mampu melalui paralegal terlatih di setiap kelurahan.",
    },
    {
        // SLOT ICON FAQ 2
        icon: MdOutlineLocationOn,
        question:
            "Bagaimana cara mengetahui lokasi Posbankum di kelurahan saya?",
        answer: "Anda dapat menemukan lokasi Posbankum terdekat melalui peta interaktif di website ini atau menghubungi kantor kelurahan/desa setempat untuk informasi layanan terdekat.",
    },
    {
        // SLOT ICON FAQ 3
        icon: FiUsers,
        question: "Apa saja tugas paralegal di Posbankum?",
        answer: "Paralegal Posbankum bertugas memberikan konsultasi hukum awal, membantu penyusunan dokumen sederhana, memberi informasi hak-hak hukum, dan menghubungkan masyarakat dengan layanan bantuan hukum lanjutan.",
    },
    {
        // SLOT ICON FAQ 4
        icon: BiFile,
        question: "Apa saja dokumen yang dikelola dalam sistem Posbankum?",
        answer: "Dokumen yang biasanya diperlukan antara lain KTP, Kartu Keluarga, surat keterangan tidak mampu jika ada, dan dokumen pendukung lain yang berkaitan dengan permasalahan hukum Anda.",
    },
    {
        // SLOT ICON FAQ 5
        icon: HiOutlineScale,
        question: "Apakah layanan Posbankum benar-benar gratis?",
        answer: "Ya, layanan Posbankum diberikan secara gratis untuk masyarakat yang membutuhkan bantuan hukum dan memenuhi persyaratan layanan yang berlaku.",
    },
    {
        // SLOT ICON FAQ 6
        icon: IoMdTime,
        question: "Berapa lama proses penanganan kasus di Posbankum?",
        answer: "Waktu penanganan kasus bervariasi tergantung kompleksitas masalah hukum. Konsultasi awal umumnya dapat dilakukan pada hari yang sama, sedangkan tindak lanjut menyesuaikan jenis kasus.",
    },
    {
        // SLOT ICON FAQ 7
        icon: BsTelephone,
        question: "Bagaimana cara menghubungi paralegal Posbankum?",
        answer: "Anda dapat menghubungi paralegal Posbankum melalui nomor telepon atau WhatsApp, email, atau datang langsung ke Posbankum terdekat pada jam layanan yang tersedia.",
    },
    {
        // SLOT ICON FAQ 8
        icon: HiOutlineScale,
        question: "Apa perbedaan antara Posbankum dengan Advokat/Pengacara?",
        answer: "Posbankum menyediakan layanan konsultasi awal, informasi hukum, dan pendampingan dasar secara gratis. Untuk penanganan perkara yang membutuhkan kuasa hukum di pengadilan, masyarakat dapat dirujuk ke lembaga bantuan hukum atau advokat sesuai kebutuhan.",
    },
];

const norm = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

const KATEGORI_ALIASES = {
    tagging_area: "tagging_area",
    "tagging area": "tagging_area",
    "tag area": "tagging_area",
    "taging area": "tagging_area",
    taging_area: "tagging_area",
    "topping area": "tagging_area",
};

const canonKategori = (kategori) => {
    const key = norm(kategori);
    return KATEGORI_ALIASES[key] ?? key;
};

const normalizeMap = (items, idKey) => {
    return (items || []).reduce((acc, item) => {
        if (item?.[idKey]) {
            acc[item[idKey]] = item.nama || "";
        }

        return acc;
    }, {});
};

const countBy = (items, key) => {
    return (items || []).reduce((acc, item) => {
        if (!item?.[key]) return acc;

        acc[item[key]] = (acc[item[key]] || 0) + 1;

        return acc;
    }, {});
};

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const OSM_TILE_SIZE = 256;
const OSM_DEFAULT_CENTER = { lat: 0.5071, lng: 101.4478 };
const OSM_DEFAULT_ZOOM = 13;
const RIAU_COORDINATE_BOUNDS = {
    minLat: -2.5,
    maxLat: 3.5,
    minLng: 99,
    maxLng: 105,
};

const parseCoordinateValue = (value) => {
    if (value === undefined || value === null) return null;

    const number = Number(String(value).trim().replace(",", "."));

    return Number.isFinite(number) ? number : null;
};

const isRiauCoordinate = (lat, lng) => {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= RIAU_COORDINATE_BOUNDS.minLat &&
        lat <= RIAU_COORDINATE_BOUNDS.maxLat &&
        lng >= RIAU_COORDINATE_BOUNDS.minLng &&
        lng <= RIAU_COORDINATE_BOUNDS.maxLng
    );
};

const normalizeRiauCoordinate = (latValue, lngValue) => {
    const lat = parseCoordinateValue(latValue);
    const lng = parseCoordinateValue(lngValue);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    if (isRiauCoordinate(lat, lng)) {
        return { lat, lng };
    }

    if (isRiauCoordinate(lng, lat)) {
        return { lat: lng, lng: lat };
    }

    return null;
};

const getCoordinate = (item) => {
    return normalizeRiauCoordinate(
        item?.latitude ?? item?.lat ?? item?.latitude_pos,
        item?.longitude ?? item?.lng ?? item?.long ?? item?.longitude_pos,
    );
};

const hasValidCoordinate = (item) => Boolean(getCoordinate(item));

const getMapCenterFromItems = (items) => {
    const coordinates = (items || []).map(getCoordinate).filter(Boolean);

    if (!coordinates.length) return OSM_DEFAULT_CENTER;

    const total = coordinates.reduce(
        (acc, coordinate) => ({
            lat: acc.lat + coordinate.lat,
            lng: acc.lng + coordinate.lng,
        }),
        { lat: 0, lng: 0 },
    );

    return {
        lat: total.lat / coordinates.length,
        lng: total.lng / coordinates.length,
    };
};

const latLngToWorldPixel = (lat, lng, zoom) => {
    const safeLat = clampNumber(lat, -85.05112878, 85.05112878);
    const safeLng = clampNumber(lng, -180, 180);
    const sinLat = Math.sin((safeLat * Math.PI) / 180);
    const scale = OSM_TILE_SIZE * 2 ** zoom;

    return {
        x: ((safeLng + 180) / 360) * scale,
        y:
            (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
            scale,
    };
};

const worldPixelToLatLng = (x, y, zoom) => {
    const scale = OSM_TILE_SIZE * 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));

    return {
        lat: clampNumber(lat, -85.05112878, 85.05112878),
        lng: ((((lng + 180) % 360) + 360) % 360) - 180,
    };
};

const getOsmTiles = (center, zoom, size) => {
    const safeWidth = Math.max(Number(size?.width) || 760, 320);
    const safeHeight = Math.max(Number(size?.height) || 560, 320);
    const centerPixel = latLngToWorldPixel(center.lat, center.lng, zoom);
    const startX = centerPixel.x - safeWidth / 2;
    const startY = centerPixel.y - safeHeight / 2;
    const startTileX = Math.floor(startX / OSM_TILE_SIZE);
    const endTileX = Math.floor((startX + safeWidth) / OSM_TILE_SIZE);
    const startTileY = Math.floor(startY / OSM_TILE_SIZE);
    const endTileY = Math.floor((startY + safeHeight) / OSM_TILE_SIZE);
    const tileCount = 2 ** zoom;
    const tiles = [];

    for (let x = startTileX; x <= endTileX; x += 1) {
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;

        for (let y = startTileY; y <= endTileY; y += 1) {
            if (y < 0 || y >= tileCount) continue;

            tiles.push({
                key: `${zoom}-${x}-${y}`,
                src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
                left: Math.round(x * OSM_TILE_SIZE - startX),
                top: Math.round(y * OSM_TILE_SIZE - startY),
            });
        }
    }

    return tiles;
};

const getOsmPixelPosition = (item, center, zoom, size) => {
    const coordinate = getCoordinate(item);

    if (!coordinate) return null;

    const safeWidth = Math.max(Number(size?.width) || 760, 320);
    const safeHeight = Math.max(Number(size?.height) || 560, 320);
    const centerPixel = latLngToWorldPixel(center.lat, center.lng, zoom);
    const targetPixel = latLngToWorldPixel(
        coordinate.lat,
        coordinate.lng,
        zoom,
    );
    const left = targetPixel.x - centerPixel.x + safeWidth / 2;
    const top = targetPixel.y - centerPixel.y + safeHeight / 2;

    return {
        top,
        left,
        popupTop: clampNumber(top + 8, 12, Math.max(safeHeight - 220, 12)),
        popupLeft: clampNumber(left - 96, 12, Math.max(safeWidth - 360, 12)),
        mapWidth: safeWidth,
        mapHeight: safeHeight,
    };
};

const formatPosbankumTitle = (name) => {
    const value = String(name ?? "").trim();

    if (!value) return "Posbankum";
    if (/^posbankum/i.test(value)) return value;

    return `Posbankum Kec. ${value}`;
};

function Reveal({ children, className = "", direction = "up", delay = 0 }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.18 },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`lp-reveal lp-reveal-${direction} ${
                visible ? "is-visible" : ""
            } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

function LocationCard({ item, index, active, onClick }) {
    return (
        <div
            className={`lp-location-item ${active ? "active" : ""}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="lp-location-number">{index + 1}</div>

            <div className="lp-location-content">
                <h4>{item.name}</h4>
                <p>{item.address}</p>

                <div className="lp-location-meta">
                    <span className="lp-meta-pill lp-meta-status">
                        <AiOutlineCheck /> {item.status}
                    </span>

                    <span className="lp-meta-pill lp-meta-number">
                        <FiUsers /> {item.paralegalCount}
                    </span>

                    <span className="lp-meta-text">{item.caseCount} kasus</span>
                </div>
            </div>
        </div>
    );
}

function MapInfoPopup({ location, position }) {
    if (!location || !position) return null;

    return (
        <div
            className="lp-map-location-popup"
            style={{
                top: `${position.popupTop}px`,
                left: `${position.popupLeft}px`,
            }}
            onClick={(event) => event.stopPropagation()}
        >
            <div className="lp-map-popup-header">
                <h3>{formatPosbankumTitle(location.name)}</h3>
            </div>

            <div className="lp-map-popup-body">
                <div className="lp-map-popup-info-row">
                    <SlLocationPin />
                    <span>{location.address}</span>
                </div>

                <div className="lp-map-popup-info-row">
                    <FiPhone />
                    <span>{location.phone}</span>
                </div>

                <div className="lp-map-popup-meta">
                    <span className="lp-map-popup-status">
                        <AiOutlineCheck /> {location.status}
                    </span>

                    <span className="lp-map-popup-paralegal">
                        <FiUsers /> {location.paralegalCount} Paralegal
                    </span>

                    <span className="lp-map-popup-case">
                        {location.caseCount} kasus
                    </span>
                </div>
            </div>
        </div>
    );
}

function ChatbotPanel({ open, onClose }) {
    const [message, setMessage] = useState("");
    const hasMessage = message.trim().length > 0;

    if (!open) return null;

    return (
        <div className="lp-chatbot-panel">
            <div className="lp-chatbot-header">
                <div className="lp-chatbot-title-wrap">
                    <span className="lp-chatbot-logo">
                        <FiMessageCircle />
                    </span>

                    <div>
                        <h3>Chatbot Posbankum</h3>
                        <p>
                            <span></span>
                            Aktif sekarang
                        </p>
                    </div>
                </div>

                <div className="lp-chatbot-controls">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup chatbot"
                    >
                        <AiOutlineClose />
                    </button>
                </div>
            </div>

            <div className="lp-chatbot-body">
                <div className="lp-chatbot-message">
                    Selamat datang di Chatbot Posbankum! Saya siap membantu Anda
                    dengan informasi seputar layanan bantuan hukum. Silakan
                    pilih topik di bawah atau ketik pertanyaan Anda.
                </div>

                <div className="lp-chatbot-time">13.33</div>
            </div>

            <div className="lp-chatbot-topics">
                <h4>Topik Populer:</h4>

                <div className="lp-chatbot-topic-grid">
                    <button type="button">
                        <span>
                            <SlLocationPin />
                        </span>
                        Cek Posbankum Terdekat
                    </button>

                    <button type="button">
                        <span>
                            <BiShield />
                        </span>
                        Syarat Bantuan Hukum
                    </button>

                    <button type="button">
                        <span>
                            <BsClock />
                        </span>
                        Jam Operasional
                    </button>

                    <button type="button">
                        <span>
                            <BsTelephone />
                        </span>
                        Kontak Admin
                    </button>
                </div>
            </div>

            <div className="lp-chatbot-input-wrap">
                <label className="lp-chatbot-input">
                    <input
                        type="text"
                        placeholder="Ketik pesan Anda..."
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <button type="button" aria-label="Bantuan">
                        ?
                    </button>
                </label>

                <button
                    type="button"
                    className={`lp-chatbot-send ${hasMessage ? "has-text" : ""}`}
                    aria-label="Kirim pesan"
                    disabled={!hasMessage}
                >
                    <FiSend />
                </button>
            </div>

            <div className="lp-chatbot-powered">
                Powered by Posbankum AI Assistant
            </div>
        </div>
    );
}

function DetailPopup({ location, onClose }) {
    if (!location) return null;

    return (
        <div className="lp-modal-overlay" role="dialog" aria-modal="true">
            <div className="lp-detail-popup">
                <div className="lp-detail-popup-header">
                    <div className="lp-detail-title-wrap">
                        <span className="lp-detail-logo-box">
                            <img
                                src={burung5}
                                alt="Logo Posbankum"
                                className="lp-detail-logo-img"
                            />
                        </span>

                        <div>
                            <h2>{formatPosbankumTitle(location.name)}</h2>

                            <div className="lp-detail-subline">
                                <span className="lp-detail-status">
                                    <AiOutlineCheck /> {location.status}
                                </span>

                                <span>
                                    {location.region ||
                                        "Kabupaten/Kota belum tersedia"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="lp-modal-close"
                        onClick={onClose}
                        aria-label="Tutup detail"
                    >
                        <IoCloseOutline />
                    </button>
                </div>

                <div className="lp-detail-popup-body">
                    <div className="lp-detail-summary-grid">
                        <div className="lp-detail-summary-card lp-detail-summary-blue">
                            <span className="lp-detail-summary-icon">
                                <FiUsers />
                            </span>

                            <div>
                                <small>Paralegal Aktif</small>
                                <strong>{location.paralegalCount}</strong>
                                <p>Siap membantu Anda</p>
                            </div>
                        </div>

                        <div className="lp-detail-summary-card lp-detail-summary-purple">
                            <span className="lp-detail-summary-icon">
                                <AiOutlineCheck />
                            </span>

                            <div>
                                <small>Kasus Ditangani</small>
                                <strong>{location.caseCount}</strong>
                                <p>Total penanganan kasus</p>
                            </div>
                        </div>
                    </div>

                    <div className="lp-detail-contact-card">
                        <div className="lp-detail-contact-title">
                            <span>
                                <SlLocationPin />
                            </span>
                            <h3>Informasi Kontak</h3>
                        </div>

                        <div className="lp-detail-contact-list">
                            <div className="lp-detail-contact-row">
                                <span className="lp-detail-contact-icon lp-info-blue">
                                    <SlLocationPin />
                                </span>

                                <div>
                                    <small>Alamat Lengkap</small>
                                    <strong>{location.address}</strong>
                                </div>
                            </div>

                            <div className="lp-detail-contact-row">
                                <span className="lp-detail-contact-icon lp-info-green">
                                    <FiPhone />
                                </span>

                                <div>
                                    <small>Nomor Telepon</small>
                                    <strong>{location.phone}</strong>
                                </div>

                                {location.phone && location.phone !== "-" ? (
                                    <a
                                        className="lp-detail-contact-action lp-detail-action-green"
                                        href={`tel:${location.phone}`}
                                    >
                                        Telepon
                                    </a>
                                ) : null}
                            </div>

                            <div className="lp-detail-contact-row">
                                <span className="lp-detail-contact-icon lp-info-purple">
                                    <FiMail />
                                </span>

                                <div>
                                    <small>Email</small>
                                    <strong>{location.email}</strong>
                                </div>

                                {location.email && location.email !== "-" ? (
                                    <a
                                        className="lp-detail-contact-action lp-detail-action-purple"
                                        href={`mailto:${location.email}`}
                                    >
                                        Email
                                    </a>
                                ) : null}
                            </div>

                            <div className="lp-detail-contact-row">
                                <span className="lp-detail-contact-icon lp-info-orange">
                                    <BsClock />
                                </span>

                                <div>
                                    <small>Jam Operasional</small>
                                    <strong>{location.operationalHours}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AllLocationsPopup({
    locations,
    loading,
    error,
    searchValue,
    setSearchValue,
    onClose,
    onSelect,
}) {
    return (
        <div className="lp-modal-overlay" role="dialog" aria-modal="true">
            <div className="lp-all-popup">
                <div className="lp-all-popup-header">
                    <div>
                        <h2>Semua Lokasi Posbankum</h2>
                        <p>Kota Pekanbaru, Riau</p>
                    </div>

                    <button
                        type="button"
                        className="lp-modal-close"
                        onClick={onClose}
                        aria-label="Tutup semua lokasi"
                    >
                        <IoCloseOutline />
                    </button>
                </div>

                <div className="lp-all-search-wrap">
                    <label className="lp-all-search">
                        <FiSearch />

                        <input
                            type="text"
                            placeholder="Cari nama atau alamat Posbankum..."
                            value={searchValue}
                            onChange={(event) =>
                                setSearchValue(event.target.value)
                            }
                        />
                    </label>
                </div>

                <div className="lp-all-popup-body">
                    {loading ? (
                        <div className="lp-location-empty">
                            Memuat data Posbankum dari database...
                        </div>
                    ) : error ? (
                        <div className="lp-location-error">{error}</div>
                    ) : locations.length ? (
                        locations.map((item) => (
                            <div className="lp-all-card" key={item.id}>
                                <div className="lp-all-card-header">
                                    <span className="lp-all-logo-box">
                                        <img
                                            src={burung5}
                                            alt="Logo Posbankum"
                                            className="lp-all-logo-img"
                                        />
                                    </span>

                                    <div>
                                        <h3>{item.name}</h3>

                                        <span className="lp-all-status-badge">
                                            <AiOutlineCheck /> {item.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="lp-all-card-body">
                                    <div className="lp-detail-info-row">
                                        <span className="lp-detail-info-icon lp-info-blue">
                                            <SlLocationPin />
                                        </span>

                                        <div>
                                            <small>Alamat</small>
                                            <strong>{item.address}</strong>
                                        </div>
                                    </div>

                                    <div className="lp-detail-info-row">
                                        <span className="lp-detail-info-icon lp-info-green">
                                            <FiPhone />
                                        </span>

                                        <div>
                                            <small>Telepon</small>
                                            <strong>{item.phone}</strong>
                                        </div>
                                    </div>

                                    <div className="lp-detail-info-row">
                                        <span className="lp-detail-info-icon lp-info-purple">
                                            <FiMail />
                                        </span>

                                        <div>
                                            <small>Email</small>
                                            <strong>{item.email}</strong>
                                        </div>
                                    </div>

                                    <div className="lp-detail-info-row">
                                        <span className="lp-detail-info-icon lp-info-orange">
                                            <BsClock />
                                        </span>

                                        <div>
                                            <small>Jam Operasional</small>
                                            <strong>
                                                {item.operationalHours}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="lp-all-card-bottom">
                                        <div className="lp-all-mini-stats">
                                            <div className="lp-all-mini-stat lp-all-mini-stat-blue">
                                                <span>
                                                    <FiUsers /> Paralegal
                                                </span>

                                                <strong>
                                                    {item.paralegalCount}
                                                </strong>
                                                <small>Aktif</small>
                                            </div>

                                            <div className="lp-all-mini-stat lp-all-mini-stat-purple">
                                                <span>
                                                    <AiOutlineCheck /> Kasus
                                                </span>

                                                <strong>
                                                    {item.caseCount}
                                                </strong>
                                                <small>Ditangani</small>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="lp-all-map-button"
                                            onClick={() => onSelect(item)}
                                        >
                                            <FiExternalLink /> Lihat di Peta
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="lp-location-empty">
                            Data Posbankum tidak ditemukan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LandingPage({
    auth = null,
    posbankums = [],
    dashboardUrl = "/dashboard",
}) {
    const user = auth?.user ?? null;

    const [loading, setLoading] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);

    const [searchTerm, setSearchTerm] = useState("");
    const locations = useMemo(() => {
        return Array.isArray(posbankums) ? posbankums : [];
    }, [posbankums]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const loadingPosbankum = false;
    const posbankumError = "";

    const [detailPopup, setDetailPopup] = useState(null);
    const [mapPopup, setMapPopup] = useState(null);
    const [mapZoom, setMapZoom] = useState(OSM_DEFAULT_ZOOM);
    const [mapCenter, setMapCenter] = useState(OSM_DEFAULT_CENTER);
    const [mapSize, setMapSize] = useState({ width: 760, height: 560 });
    const [mapDragging, setMapDragging] = useState(false);
    const [userMapMarker, setUserMapMarker] = useState(null);
    const [chatbotOpen, setChatbotOpen] = useState(false);
    const [showAllLocations, setShowAllLocations] = useState(false);
    const [allSearchTerm, setAllSearchTerm] = useState("");

    const heroRef = useRef(null);
    const whyRef = useRef(null);
    const mapRef = useRef(null);
    const osmMapRef = useRef(null);
    const mapDragRef = useRef({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        centerPixel: null,
        moved: false,
    });

    useEffect(() => {
        const node = osmMapRef.current;
        if (!node) return undefined;

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            setMapSize({
                width: Math.max(Math.round(rect.width), 320),
                height: Math.max(Math.round(rect.height), 320),
            });
        };

        updateSize();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        }

        const observer = new ResizeObserver(updateSize);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const filteredLocations = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        if (!keyword) return locations;

        return locations.filter((item) => {
            const combined =
                `${item.name} ${item.district} ${item.address}`.toLowerCase();

            return combined.includes(keyword);
        });
    }, [locations, searchTerm]);

    const filteredAllLocations = useMemo(() => {
        const keyword = allSearchTerm.trim().toLowerCase();

        if (!keyword) return locations;

        return locations.filter((item) => {
            const combined =
                `${item.name} ${item.district} ${item.address} ${item.phone} ${item.email}`.toLowerCase();

            return combined.includes(keyword);
        });
    }, [locations, allSearchTerm]);

    useEffect(() => {
        if (!filteredLocations.length) {
            setSelectedLocation(null);
            return;
        }

        const exists = filteredLocations.find(
            (item) => item.id === selectedLocation?.id,
        );

        if (!exists) {
            setSelectedLocation(filteredLocations[0]);
        }
    }, [filteredLocations, selectedLocation]);

    const goDashboard = () => {
        setLoading(true);
        router.visit(dashboardUrl, {
            onFinish: () => setLoading(false),
        });
    };

    const onLogout = () => {
        setLoading(true);
        router.post(
            "/logout",
            {},
            {
                onFinish: () => setLoading(false),
            },
        );
    };

    const scrollToRef = (ref) => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const mapSourceLocations = filteredLocations.length
        ? filteredLocations
        : locations;

    useEffect(() => {
        const center = getMapCenterFromItems(mapSourceLocations);
        setMapCenter(center);
        setMapPopup(null);
    }, [mapSourceLocations]);

    const osmTiles = useMemo(() => {
        return getOsmTiles(mapCenter, mapZoom, mapSize);
    }, [mapCenter, mapZoom, mapSize]);

    const mapMarkers = useMemo(() => {
        return mapSourceLocations
            .filter(hasValidCoordinate)
            .map((item) => ({
                item,
                position: getOsmPixelPosition(
                    item,
                    mapCenter,
                    mapZoom,
                    mapSize,
                ),
            }))
            .filter((marker) => marker.position);
    }, [mapSourceLocations, mapCenter, mapZoom, mapSize]);

    const userMapMarkerPosition = useMemo(() => {
        if (!userMapMarker) return null;

        return getOsmPixelPosition(userMapMarker, mapCenter, mapZoom, mapSize);
    }, [userMapMarker, mapCenter, mapZoom, mapSize]);

    const handleMapPinClick = (item, position) => {
        setSelectedLocation(item);
        setMapPopup((current) =>
            current?.item?.id === item.id ? null : { item, position },
        );
    };

    const shouldIgnoreMapDragTarget = (target) => {
        return Boolean(
            target?.closest?.("button, a, input, .lp-map-location-popup"),
        );
    };

    const startMapDrag = (clientX, clientY, pointerId) => {
        const centerPixel = latLngToWorldPixel(
            mapCenter.lat,
            mapCenter.lng,
            mapZoom,
        );

        mapDragRef.current = {
            active: true,
            pointerId,
            startX: clientX,
            startY: clientY,
            centerPixel,
            moved: false,
        };

        setMapDragging(true);
    };

    const moveMapDrag = (clientX, clientY, pointerId) => {
        const drag = mapDragRef.current;
        if (!drag.active || drag.pointerId !== pointerId) return;

        const dx = clientX - drag.startX;
        const dy = clientY - drag.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            drag.moved = true;
            setMapPopup(null);
        }

        const nextCenter = worldPixelToLatLng(
            drag.centerPixel.x - dx,
            drag.centerPixel.y - dy,
            mapZoom,
        );

        setMapCenter(nextCenter);
    };

    const finishMapDrag = (pointerId) => {
        const drag = mapDragRef.current;
        if (!drag.active || drag.pointerId !== pointerId) return;

        mapDragRef.current = {
            active: false,
            pointerId: null,
            startX: 0,
            startY: 0,
            centerPixel: null,
            moved: drag.moved,
        };
        setMapDragging(false);

        window.setTimeout(
            () => {
                mapDragRef.current.moved = false;
            },
            drag.moved ? 280 : 0,
        );
    };

    const handleMapPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (shouldIgnoreMapDragTarget(event.target)) return;

        startMapDrag(event.clientX, event.clientY, event.pointerId);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handleMapPointerMove = (event) => {
        moveMapDrag(event.clientX, event.clientY, event.pointerId);
    };

    const endMapDrag = (event) => {
        const drag = mapDragRef.current;
        if (!drag.active || drag.pointerId !== event.pointerId) return;

        event.currentTarget.releasePointerCapture?.(event.pointerId);
        finishMapDrag(event.pointerId);
    };

    const handleMapTouchStart = (event) => {
        if (event.touches.length !== 1) return;
        if (shouldIgnoreMapDragTarget(event.target)) return;

        const touch = event.touches[0];
        startMapDrag(touch.clientX, touch.clientY, "touch");
    };

    const handleMapTouchMove = (event) => {
        const drag = mapDragRef.current;
        if (!drag.active || drag.pointerId !== "touch") return;
        if (!event.touches.length) return;

        event.preventDefault();

        const touch = event.touches[0];
        moveMapDrag(touch.clientX, touch.clientY, "touch");
    };

    const endMapTouchDrag = () => {
        finishMapDrag("touch");
    };

    const locateCurrentUser = () => {
        setMapPopup(null);

        if (!navigator.geolocation) {
            setMapCenter(getMapCenterFromItems(mapSourceLocations));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const coordinate = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                };

                setUserMapMarker(coordinate);
                setMapCenter({ lat: coords.latitude, lng: coords.longitude });
            },
            () => {
                setMapCenter(getMapCenterFromItems(mapSourceLocations));
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
        );
    };
    const clearMapView = () => {
        const center = getMapCenterFromItems(mapSourceLocations);

        setUserMapMarker(null);
        setMapZoom(OSM_DEFAULT_ZOOM);
        setMapCenter(center);
        setMapPopup(null);
        setSelectedLocation(null);
    };

    const selectLocationFromPopup = (item) => {
        const coordinate = getCoordinate(item);
        const popupPosition = coordinate
            ? getOsmPixelPosition(item, coordinate, mapZoom, mapSize)
            : null;

        setSelectedLocation(item);
        setShowAllLocations(false);
        setDetailPopup(null);

        if (coordinate) {
            setMapCenter(coordinate);
            setMapPopup({ item, position: popupPosition });
        } else {
            setMapPopup(null);
        }

        window.setTimeout(() => {
            mapRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 80);
    };

    return (
        <div className="lp-page">
            <Head title="Posbankum" />

            <div className="lp-topbar">
                <div className="lp-container lp-topbar-inner">
                    <div className="lp-topbar-left">
                        <span className="lp-topbar-link lp-topbar-info">
                            <AiOutlineMail />
                            <span>{ORG_EMAIL}</span>
                        </span>

                        <span className="lp-topbar-link lp-topbar-info">
                            <BsTelephone />
                            <span>{ORG_WA_DISPLAY}</span>
                        </span>
                    </div>

                    <div className="lp-topbar-right">
                        <span>
                            <MdLanguage />
                            <strong>ID</strong> | EN
                        </span>
                    </div>
                </div>
            </div>

            <header className="lp-header">
                <div className="lp-container lp-header-inner">
                    <Link href="/" className="lp-brand">
                        <span className="lp-brand-logo">
                            <img src={logo} alt="Logo Pengayoman" />
                        </span>

                        <span
                            className="lp-brand-divider"
                            aria-hidden="true"
                        ></span>

                        <span className="lp-brand-bird">
                            <img src={burung5} alt="Logo SiBapak" />
                        </span>

                        <span className="lp-brand-title">SiBapak</span>
                    </Link>

                    {!user ? (
                        <Link href="/login" className="lp-btn-login">
                            <TbArrowBarRight className="lp-login-icon" />
                            Masuk
                        </Link>
                    ) : (
                        <div className="lp-header-actions">
                            <button
                                className="lp-btn-login"
                                onClick={goDashboard}
                                disabled={loading}
                            >
                                {loading ? "..." : "Dashboard"}
                            </button>

                            <button
                                className="lp-btn-danger"
                                onClick={onLogout}
                                disabled={loading}
                            >
                                Keluar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main>
                <section className="lp-section lp-hero" ref={heroRef}>
                    <div className="lp-container">
                        <div className="lp-hero-grid">
                            <Reveal className="lp-hero-left" direction="left">
                                <div className="lp-hero-card">
                                    <img
                                        src={burung}
                                        alt="Maskot Posbankum"
                                        className="lp-hero-bird"
                                    />

                                    <div className="lp-hero-name">
                                        <strong>Posbankum</strong>
                                        <span>Kanwil Kemenkum Riau</span>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal direction="right">
                                <div className="lp-badge">
                                    <span className="lp-badge-dot"></span>
                                    {ORG_FULL}
                                </div>

                                <h1 className="lp-hero-title">
                                    Ayo Cek Data <span>Posbankum</span>
                                    <br />
                                    di Wilayah Anda
                                </h1>

                                <p className="lp-hero-desc">
                                    Temukan informasi lengkap Pos Bantuan Hukum
                                    (Posbankum) di desa atau kelurahan Anda.
                                    Akses data paralegal aktif, dokumen hukum,
                                    hingga kegiatan Posbankum terbaru dengan
                                    mudah dan cepat.
                                </p>

                                <div className="lp-hero-stats">
                                    <div className="lp-stat">
                                        <div className="lp-stat-icon lp-stat-green">
                                            <AiOutlineCheck />
                                        </div>

                                        <div className="lp-stat-text">
                                            Data Real-time &amp; Akurat
                                        </div>
                                    </div>

                                    <div className="lp-stat">
                                        <div className="lp-stat-icon lp-stat-blue">
                                            <BiShield />
                                        </div>

                                        <div className="lp-stat-text">
                                            Resmi Pemerintah
                                        </div>
                                    </div>

                                    <div className="lp-stat">
                                        <div className="lp-stat-icon lp-stat-blue-2">
                                            <FiUsers />
                                        </div>

                                        <div className="lp-stat-text">
                                            1K+ Paralegal Terlatih
                                        </div>
                                    </div>

                                    <div className="lp-stat">
                                        <div className="lp-stat-icon lp-stat-orange">
                                            <HiArrowTrendingUp />
                                        </div>

                                        <div className="lp-stat-text">
                                            100+ Kasus Ditangani
                                        </div>
                                    </div>
                                </div>

                                <div className="lp-hero-actions">
                                    <button
                                        className="lp-btn-primary"
                                        onClick={() => scrollToRef(mapRef)}
                                    >
                                        <SlLocationPin />
                                        Lihat Posbankum Terdekat
                                        <BiRightArrowAlt />
                                    </button>

                                    <button
                                        className="lp-btn-outline"
                                        onClick={() => scrollToRef(whyRef)}
                                    >
                                        Pelajari Lebih Lanjut
                                    </button>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-why-section" ref={whyRef}>
                    <div className="lp-container">
                        <Reveal className="lp-center-head" direction="down">
                            <div className="lp-label-pill">
                                KEUNGGULAN LAYANAN
                            </div>

                            <h2 className="lp-section-title">
                                Mengapa Memilih Kami?
                            </h2>

                            <p className="lp-section-subtitle">
                                Posbankum hadir untuk memberikan akses keadilan
                                yang merata bagi seluruh lapisan masyarakat.
                            </p>
                        </Reveal>

                        <div className="lp-why-grid">
                            <Reveal direction="up" delay={40}>
                                <div className="lp-why-card lp-why-card-blue">
                                    <div className="lp-why-icon">
                                        <AiOutlineThunderbolt />
                                    </div>

                                    <h3>Akses Mudah &amp; Cepat</h3>

                                    <p>
                                        Layanan bantuan hukum yang mudah diakses
                                        kapan saja dan di mana saja.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal direction="up" delay={120}>
                                <div className="lp-why-card lp-why-card-orange">
                                    <div className="lp-why-icon">
                                        <img
                                            src={medalIcon}
                                            alt=""
                                            className="lp-why-image-icon"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <h3>Paralegal Berpengalaman</h3>

                                    <p>
                                        Didampingi paralegal terlatih dan
                                        bersertifikat resmi.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal direction="up" delay={200}>
                                <div className="lp-why-card lp-why-card-green">
                                    <div className="lp-why-icon">
                                        <img
                                            src={earthIcon}
                                            alt=""
                                            className="lp-why-image-icon"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <h3>Jangkauan Luas</h3>

                                    <p>
                                        Tersebar di seluruh desa dan kelurahan
                                        di Provinsi Riau.
                                    </p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-service-section">
                    <div className="lp-container">
                        <div className="lp-service-grid">
                            <Reveal direction="right">
                                <div>
                                    <div className="lp-green-badge">
                                        <BiShield /> LAYANAN MASYARAKAT
                                    </div>

                                    <h2 className="lp-blue-title">
                                        Akses Bantuan Hukum <span>Gratis</span>
                                    </h2>

                                    <p className="lp-section-copy">
                                        Kanwil Kemenkum Riau melalui Posbankum
                                        menyediakan layanan bantuan hukum gratis
                                        untuk masyarakat kurang mampu. Posbankum
                                        hadir di setiap kelurahan untuk
                                        memastikan keadilan dapat diakses oleh
                                        seluruh lapisan masyarakat.
                                    </p>

                                    <div className="lp-service-list">
                                        <div className="lp-service-item">
                                            <div className="lp-service-item-icon is-blue">
                                                <BiFile />
                                            </div>
                                            Informasi Hukum
                                        </div>

                                        <div className="lp-service-item">
                                            <div className="lp-service-item-icon is-green">
                                                <FiMessageCircle />
                                            </div>
                                            Konsultasi Hukum
                                        </div>

                                        <div className="lp-service-item">
                                            <div className="lp-service-item-icon is-orange">
                                                <HiOutlineScale />
                                            </div>
                                            Mediasi
                                        </div>

                                        <div className="lp-service-item">
                                            <div className="lp-service-item-icon is-purple">
                                                <FiUsers />
                                            </div>
                                            Rujukan Advokat
                                        </div>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal direction="left">
                                <div className="lp-service-visual">
                                    <div className="lp-service-circle">
                                        <img
                                            src={burung8}
                                            alt="Bantuan Hukum Gratis"
                                        />
                                    </div>

                                    <div className="lp-service-footer">
                                        <strong>Bantuan Hukum Gratis</strong>
                                        <span>Untuk Seluruh Masyarakat</span>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-info-section">
                    <div className="lp-container">
                        <div className="lp-info-grid">
                            <Reveal direction="left">
                                <div className="lp-info-card">
                                    <div className="lp-online-badge">
                                        <span className="lp-online-dot"></span>
                                        Online
                                    </div>

                                    <div className="lp-info-visual">
                                        <img
                                            src={burung1}
                                            alt="Platform Digital Posbankum"
                                        />
                                    </div>

                                    <div className="lp-info-footer">
                                        <strong>
                                            Platform Digital Terintegrasi
                                        </strong>
                                        <span>Akses Informasi 24/7</span>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal direction="right">
                                <div>
                                    <div className="lp-red-badge">
                                        <SlLocationPin /> PUSAT INFORMASI
                                    </div>

                                    <h2 className="lp-blue-title">
                                        Pusat Informasi Layanan Hukum
                                    </h2>

                                    <p className="lp-section-copy">
                                        Akses informasi lengkap tentang prosedur
                                        bantuan hukum, hak-hak Anda sebagai
                                        warga negara, dan informasi hukum
                                        terkini dari paralegal profesional yang
                                        tersebar di seluruh Indonesia.
                                    </p>

                                    <a
                                        className="lp-red-button"
                                        href={`https://wa.me/${ORG_WA_TEL}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Hubungi Paralegal <BiRightArrowAlt />
                                    </a>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-map-section" ref={mapRef}>
                    <div className="lp-container">
                        <Reveal className="lp-center-head" direction="down">
                            <div className="lp-map-badge">
                                <SlLocationPin /> PETA LOKASI INTERAKTIF
                            </div>

                            <h2 className="lp-map-title">
                                Temukan Posbankum Terdekat
                            </h2>

                            <p className="lp-section-subtitle">
                                Jelajahi peta interaktif dan temukan lokasi Pos
                                Bantuan Hukum di seluruh wilayah Provinsi Riau.
                            </p>
                        </Reveal>

                        <div className="lp-map-grid">
                            <Reveal direction="left">
                                <div className="lp-map-shell">
                                    <div className="lp-map-toolbar">
                                        <label className="lp-map-search">
                                            <FiSearch />

                                            <input
                                                type="text"
                                                placeholder="Cari Posbankum di Pekanbaru..."
                                                value={searchTerm}
                                                onChange={(event) =>
                                                    setSearchTerm(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </label>

                                        <div className="lp-map-count">
                                            <span className="lp-map-count-dot"></span>
                                            {loadingPosbankum
                                                ? "Memuat..."
                                                : `${filteredLocations.length} Lokasi`}
                                        </div>
                                    </div>

                                    <div
                                        className={`lp-osm-map ${mapDragging ? "is-dragging" : ""}`}
                                        ref={osmMapRef}
                                        onPointerDown={handleMapPointerDown}
                                        onPointerMove={handleMapPointerMove}
                                        onPointerUp={endMapDrag}
                                        onPointerCancel={endMapDrag}
                                        onTouchStart={handleMapTouchStart}
                                        onTouchMove={handleMapTouchMove}
                                        onTouchEnd={endMapTouchDrag}
                                        onTouchCancel={endMapTouchDrag}
                                        onClick={() => {
                                            if (mapDragRef.current.moved)
                                                return;
                                            setMapPopup(null);
                                        }}
                                    >
                                        <div
                                            className="lp-osm-tile-layer"
                                            aria-hidden="true"
                                        >
                                            {osmTiles.map((tile) => (
                                                <img
                                                    key={tile.key}
                                                    src={tile.src}
                                                    alt=""
                                                    className="lp-osm-tile"
                                                    draggable="false"
                                                    style={{
                                                        left: tile.left,
                                                        top: tile.top,
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {mapMarkers.map(
                                            ({ item, position }) => {
                                                const active =
                                                    item.id ===
                                                    selectedLocation?.id;

                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className={`lp-map-pin ${active ? "active" : ""}`}
                                                        style={{
                                                            top: `${position.top}px`,
                                                            left: `${position.left}px`,
                                                        }}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleMapPinClick(
                                                                item,
                                                                position,
                                                            );
                                                        }}
                                                        aria-label={item.name}
                                                    >
                                                        <img
                                                            src={mapsIcon}
                                                            alt="Lokasi Posbankum"
                                                            className="lp-map-pin-img"
                                                        />
                                                    </button>
                                                );
                                            },
                                        )}

                                        {userMapMarkerPosition ? (
                                            <span
                                                className="lp-user-map-marker"
                                                style={{
                                                    top: `${userMapMarkerPosition.top}px`,
                                                    left: `${userMapMarkerPosition.left}px`,
                                                }}
                                                aria-label="Posisi saat ini"
                                            >
                                                <span></span>
                                            </span>
                                        ) : null}

                                        {mapPopup ? (
                                            <MapInfoPopup
                                                location={mapPopup.item}
                                                position={mapPopup.position}
                                            />
                                        ) : null}

                                        <div className="lp-map-compass">N</div>

                                        <div
                                            className="lp-map-zoom"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMapZoom((value) =>
                                                        Math.min(value + 1, 18),
                                                    )
                                                }
                                                aria-label="Perbesar peta"
                                            >
                                                <FiZoomIn />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMapZoom((value) =>
                                                        Math.max(value - 1, 10),
                                                    )
                                                }
                                                aria-label="Perkecil peta"
                                            >
                                                <FiZoomOut />
                                            </button>

                                            <button
                                                type="button"
                                                className="lp-map-current-button"
                                                onClick={locateCurrentUser}
                                                aria-label="Lihat posisi saat ini"
                                            >
                                                <IoLocateSharp
                                                    className="lp-map-current-icon"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="lp-map-scale lp-map-clear-button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                clearMapView();
                                            }}
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            className="lp-map-layer"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <FiLayers /> Layer
                                        </button>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal direction="right">
                                <div className="lp-location-panel">
                                    <div className="lp-location-header">
                                        <div>
                                            <h3>Daftar Posbankum</h3>

                                            <p>Kota Pekanbaru, Riau</p>
                                        </div>

                                        <button
                                            type="button"
                                            className="lp-see-all-button"
                                            onClick={() =>
                                                setShowAllLocations(true)
                                            }
                                        >
                                            Lihat Semua Lokasi
                                        </button>
                                    </div>

                                    <div className="lp-location-list">
                                        {loadingPosbankum ? (
                                            <div className="lp-location-empty">
                                                Memuat data Posbankum dari
                                                database...
                                            </div>
                                        ) : posbankumError ? (
                                            <div className="lp-location-error">
                                                {posbankumError}
                                            </div>
                                        ) : filteredLocations.length ? (
                                            filteredLocations
                                                .slice(0, 5)
                                                .map((item, index) => (
                                                    <LocationCard
                                                        key={item.id}
                                                        item={item}
                                                        index={index}
                                                        active={
                                                            item.id ===
                                                            selectedLocation?.id
                                                        }
                                                        onClick={() => {
                                                            setSelectedLocation(
                                                                item,
                                                            );
                                                            setMapPopup(null);
                                                            setDetailPopup(
                                                                item,
                                                            );
                                                        }}
                                                    />
                                                ))
                                        ) : (
                                            <div className="lp-location-empty">
                                                Data Posbankum tidak ditemukan.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-faq-section">
                    <div className="lp-container">
                        <div className="lp-faq-wrap">
                            <div className="lp-center-head">
                                <div className="lp-faq-badge">FAQ</div>

                                <h2 className="lp-faq-title">
                                    Pertanyaan yang Sering Diajukan
                                </h2>

                                <p className="lp-faq-copy">
                                    Temukan jawaban dari pertanyaan umum seputar
                                    layanan Posbankum, alur akses layanan,
                                    lokasi hingga informasi bantuan hukum bagi
                                    masyarakat.
                                </p>
                            </div>

                            <div className="lp-faq-list">
                                {faqItems.map((item, index) => {
                                    const open = openFaq === index;
                                    const FaqIcon = item.icon;

                                    return (
                                        <div
                                            className="lp-faq-item"
                                            key={item.question}
                                        >
                                            <button
                                                type="button"
                                                className="lp-faq-button"
                                                onClick={() =>
                                                    setOpenFaq(
                                                        open ? null : index,
                                                    )
                                                }
                                            >
                                                <div className="lp-faq-button-left">
                                                    <span className="lp-faq-icon-wrap">
                                                        {FaqIcon ? (
                                                            typeof FaqIcon ===
                                                            "function" ? (
                                                                <FaqIcon />
                                                            ) : (
                                                                FaqIcon
                                                            )
                                                        ) : (
                                                            <span className="lp-faq-icon-placeholder">
                                                                ?
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="lp-faq-question">
                                                        {item.question}
                                                    </span>
                                                </div>

                                                <span className="lp-faq-arrow">
                                                    {open ? (
                                                        <IoIosArrowUp />
                                                    ) : (
                                                        <IoIosArrowDown />
                                                    )}
                                                </span>
                                            </button>

                                            <div
                                                className={`lp-faq-answer-wrap ${open ? "open" : ""}`}
                                                aria-hidden={!open}
                                            >
                                                <div className="lp-faq-answer">
                                                    {item.answer}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="lp-section lp-cta-section">
                    <div className="lp-container">
                        <div className="lp-cta-box">
                            <h2 className="lp-cta-title">
                                Masih Ada Pertanyaan?
                            </h2>

                            <p className="lp-cta-copy">
                                Tim kami siap membantu Anda. Hubungi kami
                                melalui email atau telepon untuk informasi lebih
                                lanjut.
                            </p>

                            <a
                                className="lp-contact-button"
                                href="https://riau.kemenkum.go.id/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <BsTelephone /> Hubungi Kami
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="lp-footer">
                <div className="lp-container lp-footer-inner">
                    <div className="lp-footer-grid">
                        <div className="lp-footer-brand">
                            <div className="lp-footer-logo">
                                <span className="lp-footer-logo-box">
                                    <img src={burung5} alt="Logo SiBapak" />
                                </span>
                                <span>SiBapak</span>
                            </div>

                            <p className="lp-footer-copy">
                                Pos Bantuan Hukum yang tersebar di seluruh
                                Indonesia untuk memberikan akses keadilan bagi
                                masyarakat.
                            </p>

                            <div
                                className="lp-footer-socials"
                                aria-label="Akun sosial media"
                            >
                                <a
                                    href={SOCIAL_LINKS.facebook}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Facebook SiBapak"
                                >
                                    <FiFacebook />
                                </a>

                                <a
                                    href={SOCIAL_LINKS.twitter}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Twitter SiBapak"
                                >
                                    <FiTwitter />
                                </a>

                                <a
                                    href={SOCIAL_LINKS.instagram}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Instagram SiBapak"
                                >
                                    <BsInstagram />
                                </a>

                                <a
                                    href={SOCIAL_LINKS.youtube}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="YouTube SiBapak"
                                >
                                    <AiOutlineYoutube />
                                </a>
                            </div>
                        </div>

                        <div className="lp-footer-col lp-footer-link-col">
                            <h4>Tautan Cepat</h4>
                            <a href="#">Tentang Kami</a>
                            <a href="#">Layanan</a>
                            <a href="#">Kontak</a>
                        </div>

                        <div className="lp-footer-col lp-footer-link-col">
                            <h4>Layanan Kami</h4>
                            <a href="#">Cek Posbankum</a>
                            <a href="#">Data Paralegal</a>
                            <a href="#">Dokumen Hukum</a>
                            <a href="#">Pengaduan</a>
                        </div>

                        <div className="lp-footer-col lp-footer-contact-col">
                            <h4>Hubungi Kami</h4>

                            <a
                                className="lp-footer-contact-item"
                                href={`mailto:${ORG_EMAIL}`}
                            >
                                <span className="lp-footer-contact-icon">
                                    <AiOutlineMail />
                                </span>

                                <span className="lp-footer-contact-text">
                                    <small>Email</small>
                                    <strong>{ORG_EMAIL}</strong>
                                </span>
                            </a>

                            <a
                                className="lp-footer-contact-item"
                                href={`https://wa.me/${ORG_WA_TEL}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <span className="lp-footer-contact-icon">
                                    <BsTelephone />
                                </span>

                                <span className="lp-footer-contact-text">
                                    <small>Telepon</small>
                                    <strong>{ORG_WA_DISPLAY}</strong>
                                </span>
                            </a>

                            <span className="lp-footer-contact-item">
                                <span className="lp-footer-contact-icon">
                                    <SlLocationPin />
                                </span>

                                <span className="lp-footer-contact-text">
                                    <small>Alamat</small>
                                    <strong>{ORG_ADDR}</strong>
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <span>
                            © 2026 Posbankum - Kementerian Hukum RI. All rights
                            reserved.
                        </span>

                        <span>Kebijakan Privasi | Syarat &amp; Ketentuan</span>
                    </div>
                </div>
            </footer>

            {chatbotOpen ? (
                <div
                    className="lp-chatbot-backdrop"
                    onClick={() => setChatbotOpen(false)}
                ></div>
            ) : null}

            <ChatbotPanel
                open={chatbotOpen}
                onClose={() => setChatbotOpen(false)}
            />

            <button
                type="button"
                className={`lp-float-chat ${chatbotOpen ? "is-open" : ""}`}
                onClick={() => setChatbotOpen((value) => !value)}
                aria-label={
                    chatbotOpen
                        ? "Tutup chatbot Posbankum"
                        : "Buka chatbot Posbankum"
                }
            >
                {chatbotOpen ? <AiOutlineClose /> : <FiMessageCircle />}
            </button>

            <DetailPopup
                location={detailPopup}
                onClose={() => setDetailPopup(null)}
            />

            {showAllLocations ? (
                <AllLocationsPopup
                    locations={filteredAllLocations}
                    loading={loadingPosbankum}
                    error={posbankumError}
                    searchValue={allSearchTerm}
                    setSearchValue={setAllSearchTerm}
                    onClose={() => setShowAllLocations(false)}
                    onSelect={selectLocationFromPopup}
                />
            ) : null}
        </div>
    );
}
