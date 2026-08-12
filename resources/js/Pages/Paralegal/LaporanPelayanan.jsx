import { router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FiAlertTriangle,
    FiCalendar,
    FiCheckCircle,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiDownload,
    FiEye,
    FiFileText,
    FiFilter,
    FiMapPin,
    FiPaperclip,
    FiPlus,
    FiPrinter,
    FiSearch,
    FiTrash2,
    FiUser,
    FiUsers,
    FiX,
    FiPhone,
    FiInfo,
} from "react-icons/fi";
import { AiOutlineBarChart } from "react-icons/ai";
import { TbLocation } from "react-icons/tb";
import { TfiStatsUp } from "react-icons/tfi";
import { BsSend } from "react-icons/bs";
import { RiHistoryFill } from "react-icons/ri";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import "../../../css/Paralegal/laporanPelayanan.css";

const INCIDENT_LEAFLET_CSS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
];
const INCIDENT_LEAFLET_JS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];
const INCIDENT_LEAFLET_ICON_URLS = {
    iconRetina:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    icon: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadow: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
};

function ensureIncidentLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);

    const ensureCss = () =>
        new Promise((resolve, reject) => {
            const existing = document.getElementById("leaflet-css");
            if (existing) {
                resolve();
                return;
            }

            let index = 0;
            const link = document.createElement("link");
            link.id = "leaflet-css";
            link.rel = "stylesheet";
            const loadNext = () => {
                const href = INCIDENT_LEAFLET_CSS_URLS[index];
                if (!href) {
                    reject(new Error("Leaflet CSS gagal dimuat."));
                    return;
                }
                link.href = href;
            };
            link.onload = resolve;
            link.onerror = () => {
                index += 1;
                loadNext();
            };
            loadNext();
            document.head.appendChild(link);
        });

    const ensureJs = () =>
        new Promise((resolve, reject) => {
            if (window.L?.map) {
                resolve(window.L);
                return;
            }

            const existing = document.getElementById("leaflet-js");
            if (existing) {
                const timer = window.setInterval(() => {
                    if (window.L?.map) {
                        window.clearInterval(timer);
                        resolve(window.L);
                    }
                }, 30);
                window.setTimeout(() => {
                    window.clearInterval(timer);
                    if (window.L?.map) resolve(window.L);
                    else reject(new Error("Leaflet JS gagal dimuat."));
                }, 5000);
                return;
            }

            let index = 0;
            const script = document.createElement("script");
            script.id = "leaflet-js";
            script.async = true;
            const loadNext = () => {
                const src = INCIDENT_LEAFLET_JS_URLS[index];
                if (!src) {
                    reject(new Error("Leaflet JS gagal dimuat."));
                    return;
                }
                script.src = src;
            };
            script.onload = () => resolve(window.L);
            script.onerror = () => {
                index += 1;
                loadNext();
            };
            loadNext();
            document.body.appendChild(script);
        });

    return ensureCss()
        .then(ensureJs)
        .then((L) => {
            if (!L?.map) throw new Error("Leaflet tidak tersedia.");
            if (L.Icon?.Default) {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: INCIDENT_LEAFLET_ICON_URLS.iconRetina,
                    iconUrl: INCIDENT_LEAFLET_ICON_URLS.icon,
                    shadowUrl: INCIDENT_LEAFLET_ICON_URLS.shadow,
                });
            }
            return L;
        });
}

function normalizeAreaText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(
            /\b(kelurahan|kel|desa|kecamatan|kec|kabupaten|kab|kota|provinsi)\b/g,
            " ",
        )
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function containsAreaName(haystack, needle) {
    const cleanHaystack = ` ${normalizeAreaText(haystack)} `;
    const cleanNeedle = normalizeAreaText(needle);
    return cleanNeedle !== "" && cleanHaystack.includes(` ${cleanNeedle} `);
}

function parseCoordinate(value, min, max) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return Number.NaN;
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
        return Number.NaN;
    }

    return number;
}

const EMPTY_FORM_DATA = {
    nama_pelapor: "",
    nik: "",
    nomor_telepon: "",
    nama_lurah: "",
    jenis_masalah: "",
    prioritas: "",
    judul_pengaduan: "",
    kronologi: "",
    tanggal_kejadian: "",
    waktu_kejadian: "",
    lokasi_kejadian: "",
    latitude_kejadian: "",
    longitude_kejadian: "",
    id_paralegal: "",
    paralegal_nama: "",
    paralegal_hp: "",
    catatan_internal: "",
    lampiran: [],
};

const MAX_NIK_LENGTH = 16;
const MAX_PHONE_LENGTH = 15;
const MAX_TITLE_LENGTH = 100;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const ALLOWED_UPLOAD_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];

const PRIORITY_FILTER_OPTIONS = [
    { value: "semua", triggerLabel: "Semua Prioritas", optionLabel: "Semua" },
    { value: "tinggi", triggerLabel: "Tinggi", optionLabel: "Tinggi" },
    { value: "sedang", triggerLabel: "Sedang", optionLabel: "Sedang" },
    { value: "rendah", triggerLabel: "Rendah", optionLabel: "Rendah" },
];

function firstFilled(...values) {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const cleaned = String(value).trim();
        if (cleaned && cleaned !== "-") return cleaned;
    }
    return "";
}

function getReportLocationMap(report) {
    const latRaw = firstFilled(
        report?.latitude_kejadian,
        report?.latitude,
        report?.lat,
    );
    const lngRaw = firstFilled(
        report?.longitude_kejadian,
        report?.longitude,
        report?.lng,
        report?.long,
    );
    const lat = latRaw === "" ? Number.NaN : Number(latRaw);
    const lng = lngRaw === "" ? Number.NaN : Number(lngRaw);

    const hasCoordinates =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;

    if (hasCoordinates) {
        const delta = 0.008;
        const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

        return {
            src: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                bbox,
            )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`,
            externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${lat},${lng}`,
            )}`,
            coordinateText: `${lat}, ${lng}`,
        };
    }

    const address = firstFilled(report?.lokasi_kejadian, report?.location);
    if (!address) return null;

    return {
        src: `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address,
        )}`,
        coordinateText: "",
    };
}

function digitsOnly(value, max = 100) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, max);
}

function formatDateID(value, withMonthShort = false) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: withMonthShort ? "short" : "long",
        year: "numeric",
    });
}

function formatTimeID(value) {
    if (!value) return "-";
    if (/^\d{2}:\d{2}/.test(String(value))) return String(value).slice(0, 5);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function getDaysDiff(value) {
    if (!value) return 0;
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return 0;
    const now = new Date();
    return Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
}

function normalizeStatus(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (["selesai", "done", "completed", "complete"].includes(raw))
        return "selesai";
    return "diproses";
}

function getStatusLabel(value) {
    return normalizeStatus(value) === "selesai" ? "Selesai" : "Diproses";
}

function normalizePriority(value) {
    const raw = String(value || "")
        .trim()
        .toLowerCase();
    if (raw.includes("tinggi") || raw === "high") return "tinggi";
    if (raw.includes("rendah") || raw === "low") return "rendah";
    return "sedang";
}

function getPriorityLabel(value) {
    const priority = normalizePriority(value);
    if (priority === "tinggi") return "Tinggi";
    if (priority === "rendah") return "Rendah";
    return "Sedang";
}

function getCategoryTone(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("pidana")) return "blue";
    if (raw.includes("kerja")) return "blue";
    if (raw.includes("keluarga")) return "blue";
    if (raw.includes("perdata")) return "neutral";
    return "neutral";
}

function clampText(value, limit = 220) {
    const text = String(value || "").trim();
    if (!text) return "Belum ada deskripsi.";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}...`;
}

function formatFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentFileName(file, fallback = "Lampiran") {
    return (
        firstFilled(file?.nama_file, file?.name, file?.filename, fallback) ||
        fallback
    );
}

function isImageFile(file) {
    const mime = String(file?.mime_type || file?.type || "").toLowerCase();
    const name = String(
        file?.nama_file || file?.name || file?.url || "",
    ).toLowerCase();
    return (
        mime.startsWith("image/") ||
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg")
    );
}

function normalizePreviewUrl(raw) {
    const clean = String(raw || "").trim();
    if (!clean) return "";
    if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
    if (clean.startsWith("/file-preview")) return clean;
    if (clean.startsWith("file-preview")) return `/${clean}`;

    const pathOnly = clean.split("#")[0].split("?")[0];
    const normalized = pathOnly
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^(storage|public|app\/public)\//i, "")
        .replace(/^\/+/, "");

    if (!normalized) return "";
    return `/file-preview?path=${encodeURIComponent(normalized)}`;
}

function isAllowedFileType(file) {
    const mimeType = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    return (
        ALLOWED_UPLOAD_TYPES.includes(mimeType) ||
        ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext))
    );
}

function parseUpdates(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (Array.isArray(parsed?.updates)) return parsed.updates;
    } catch {}
    return [];
}

function computeProgress(status, updates, storedProgress) {
    if (Number.isFinite(Number(storedProgress))) {
        return Math.max(0, Math.min(100, Number(storedProgress)));
    }
    const totalUpdates = Math.max(0, (updates?.length || 0) - 1);
    if (normalizeStatus(status) === "selesai") return 100;
    return Math.max(0, Math.min(95, totalUpdates * 25));
}

function normalizeReport(row, index = 0) {
    const updates = parseUpdates(row?.updates || row?.catatan_admin);
    const status = normalizeStatus(row?.status);
    const prioritas = normalizePriority(row?.prioritas);
    const id = row?.id_pengaduan || row?.id || `laporan-${index}`;
    const progress = computeProgress(status, updates, row?.progress);

    return {
        id_pengaduan: id,
        id_posbankum: row?.id_posbankum || "",
        nomor_pengaduan:
            row?.nomor_pengaduan ||
            `PBKT/${new Date().getFullYear()}/${String(index + 1).padStart(3, "0")}`,
        nama_pelapor: row?.nama_pelapor || "-",
        nik: row?.nik || "",
        nomor_telepon: row?.nomor_telepon || "-",
        nama_lurah: row?.nama_lurah || "-",
        jenis_masalah: row?.jenis_masalah || row?.kategori_masalah || "Lainnya",
        judul_pengaduan:
            row?.judul_pengaduan ||
            row?.judul_laporan ||
            row?.title ||
            "Laporan Pelayanan",
        kronologi: row?.kronologi || row?.description || "Belum ada kronologi.",
        tanggal_kejadian:
            row?.tanggal_kejadian || row?.created_at || row?.date || null,
        waktu_kejadian: row?.waktu_kejadian || "",
        lokasi_kejadian: row?.lokasi_kejadian || row?.location || "-",
        latitude_kejadian:
            row?.latitude_kejadian ?? row?.latitude ?? row?.lat ?? "",
        longitude_kejadian:
            row?.longitude_kejadian ??
            row?.longitude ??
            row?.lng ??
            row?.long ??
            "",
        posbankum_info:
            row?.posbankum_info || row?.posbankum_nama || row?.posbankum || "-",
        status,
        prioritas,
        created_at: row?.created_at || row?.tanggal_kejadian || null,
        paralegal_nama:
            row?.paralegal_nama || row?.nama_paralegal || "Paralegal",
        paralegal_hp: row?.paralegal_hp || row?.nomor_telepon_paralegal || "-",
        catatan_internal: row?.catatan_internal || "",
        lampiran: Array.isArray(row?.lampiran) ? row.lampiran : [],
        updates:
            updates.length > 0
                ? updates
                : [
                      {
                          title:
                              status === "selesai"
                                  ? "Laporan Selesai"
                                  : "Laporan Diterima",
                          date: formatDateID(
                              row?.created_at || row?.tanggal_kejadian,
                          ),
                          time: formatTimeID(
                              row?.created_at || row?.tanggal_kejadian,
                          ),
                          desc:
                              row?.catatan_internal ||
                              "Laporan telah masuk ke sistem.",
                          by: row?.paralegal_nama || "Admin Posbankum",
                      },
                  ],
        progress,
        kelurahan_nama: row?.kelurahan_nama || "",
        kecamatan_nama: row?.kecamatan_nama || "",
        kabupaten_nama: row?.kabupaten_nama || "Pekanbaru",
        provinsi_nama: row?.provinsi || "Riau",
    };
}

function buildStats(reports) {
    const total = reports.length;
    const aktif = reports.filter((item) => item.status === "diproses").length;
    const selesai = reports.filter((item) => item.status === "selesai").length;
    const tinggi = reports.filter((item) => item.prioritas === "tinggi").length;
    const tingkatSelesai = total ? Math.round((selesai / total) * 100) : 0;
    const avgHari = total
        ? Math.round(
              reports.reduce(
                  (sum, item) =>
                      sum +
                      getDaysDiff(item.tanggal_kejadian || item.created_at),
                  0,
              ) / total,
          )
        : 0;
    return { total, aktif, selesai, tinggi, tingkatSelesai, avgHari };
}

function ReportListCard({ report, onDetail, onDelete }) {
    const lastUpdate = report.updates?.[report.updates.length - 1];

    return (
        <article className="lpvCard">
            <div className="lpvCardHeader">
                <div>
                    <h3 className="lpvCardTitle">{report.judul_pengaduan}</h3>
                    <div className="lpvCardNumber">
                        {report.nomor_pengaduan}
                    </div>
                </div>
                <div className="lpvHeaderChips">
                    <span
                        className={`lpvChip ${report.status === "selesai" ? "isGreen" : "isBlue"}`}
                    >
                        <FiClock /> {getStatusLabel(report.status)}
                    </span>
                    <span
                        className={`lpvChip ${report.prioritas === "tinggi" ? "isRed" : "isOrange"}`}
                    >
                        <FiAlertTriangle /> Prioritas{" "}
                        {getPriorityLabel(report.prioritas)}
                    </span>
                </div>
            </div>

            <div className="lpvMetaRow">
                <span>
                    <FiUser /> {report.nama_pelapor}
                </span>
                <span>NIK: {report.nik || "-"}</span>
                <span>
                    <FiMapPin />{" "}
                    {firstFilled(
                        report.kelurahan_nama,
                        report.posbankum_info,
                        "-",
                    )}
                </span>
                <span>
                    <FiCalendar /> {formatDateID(report.tanggal_kejadian, true)}
                </span>
                <span>
                    <FiClock /> {getDaysDiff(report.tanggal_kejadian)} hari
                </span>
            </div>

            <div className="lpvTagLine">
                <span className="lpvTag isParalegal">
                    {report.paralegal_nama}
                </span>
                <span
                    className={`lpvTag isCategory ${getCategoryTone(report.jenis_masalah)}`}
                >
                    {report.jenis_masalah}
                </span>
            </div>

            <p className="lpvDescription">{clampText(report.kronologi, 260)}</p>

            <div className="lpvUpdateBox">
                <div className="lpvUpdateTitle">
                    <FiClock /> Update Terakhir
                </div>
                <div className="lpvUpdateHeadline">
                    {lastUpdate?.title || "Belum ada update"}
                </div>
                <div className="lpvUpdateMeta">
                    {lastUpdate?.date || "-"} • {lastUpdate?.time || "-"}
                </div>
                <div className="lpvUpdateDesc">
                    {lastUpdate?.desc || "Belum ada catatan update."}
                </div>
            </div>

            <div className="lpvFooterRow">
                <div className="lpvFooterMeta">
                    <span>
                        <FiFileText /> {report.updates?.length || 0} Update
                    </span>
                    <span>
                        <FiPaperclip /> {report.lampiran?.length || 0} Lampiran
                    </span>
                </div>
                <div className="lpvActionRow">
                    <button
                        type="button"
                        className="lpvDangerBtn"
                        onClick={() => onDelete(report)}
                    >
                        <FiTrash2 /> Hapus
                    </button>
                    <button
                        type="button"
                        className="lpvPrimaryBtn"
                        onClick={() => onDetail(report)}
                    >
                        <FiEye /> Detail
                    </button>
                </div>
            </div>
        </article>
    );
}

function StatBox({ icon, label, value, tone }) {
    return (
        <div className={`lpvStatCard ${tone}`}>
            <div className="lpvStatIcon">{icon}</div>
            <div className="lpvStatBody">
                <div className="lpvStatLabel">{label}</div>
                <div className="lpvStatValue">{value}</div>
            </div>
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="lpvEmptyState">
            <FiInfo />
            <span>{message}</span>
        </div>
    );
}

function getFullWilayah(report) {
    return firstFilled(
        [report.kelurahan_nama, report.kecamatan_nama, report.kabupaten_nama]
            .filter(Boolean)
            .join(", "),
        report.lokasi_kejadian,
        "-",
    );
}

function getDetailTopMetrics(report) {
    return [
        {
            label: "Tanggal Laporan",
            value: formatDateID(report.created_at || report.tanggal_kejadian),
        },
        {
            label: "Tanggal Kejadian",
            value: formatDateID(report.tanggal_kejadian),
        },
        {
            label: "Durasi",
            value: `${getDaysDiff(report.tanggal_kejadian)} hari`,
        },
    ];
}

function buildPrintHtml(report) {
    const topMetrics = getDetailTopMetrics(report);
    const badgeStatusClass = report.status === "selesai" ? "done" : "process";
    const badgePriorityClass =
        report.prioritas === "tinggi"
            ? "danger"
            : report.prioritas === "rendah"
              ? "soft"
              : "warning";
    const timelineMarkup = (report.updates || [])
        .map(
            (item) => `
                <div class="print-timeline-item">
                    <div class="print-timeline-dot"></div>
                    <div class="print-timeline-card">
                        <div class="print-timeline-head">
                            <strong>${item.title || "Update"}</strong>
                            <span>${item.date || "-"}${item.time ? ` • ${item.time}` : ""}</span>
                        </div>
                        <p>${item.desc || "-"}</p>
                        <small>${item.by || "Posbankum"}</small>
                    </div>
                </div>`,
        )
        .join("");

    return `
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Print ${report.nomor_pengaduan}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111827; background: #ffffff; }
    .page { width: 100%; max-width: 900px; margin: 0 auto; padding: 32px 38px 40px; }
    .print-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
    h1 { margin:0; font-size: 22px; line-height:1.2; }
    .code { margin-top:8px; color:#4b5563; font-size: 13px; }
    .badges { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
    .badge { display:inline-flex; align-items:center; padding:7px 12px; border-radius:999px; font-size:12px; font-weight:700; }
    .badge.process { background:#dbeafe; color:#0f3f93; }
    .badge.done { background:#dcfce7; color:#15803d; }
    .badge.danger { background:#fee2e2; color:#dc2626; }
    .badge.warning { background:#ffedd5; color:#ea580c; }
    .badge.soft { background:#eef2ff; color:#4f46e5; }
    .title-line { width: 88px; height: 4px; border-radius: 999px; margin-top: 10px; background: linear-gradient(90deg, #ffd82b 0%, #ffab4a 100%); }
    .section-title { margin: 30px 0 12px; font-size: 14px; font-weight: 800; padding-bottom: 8px; border-bottom: 2px solid #2b3056; }
    .grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
    .grid-2 { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
    .metric-card, .field-card, .note-box { border:1px solid #e5e7eb; border-radius:14px; background:#fff; }
    .metric-card { padding: 14px 16px; }
    .metric-label, .field-label { color:#6b7280; font-size:11px; font-weight:700; text-transform: uppercase; letter-spacing:.05em; }
    .metric-value, .field-value { margin-top:6px; font-size:14px; font-weight:700; color:#111827; }
    .field-card { padding: 15px 16px; min-height: 78px; }
    .story-box { border:1px solid #e5e7eb; border-radius:14px; padding:16px; line-height:1.75; font-size:14px; color:#374151; }
    .note-box { margin-top: 16px; padding: 16px; background:#fff7ed; border-color:#fdba74; color:#9a3412; }
    .note-box.green { background:#ecfdf5; border-color:#86efac; color:#166534; }
    .timeline { margin-top: 16px; position: relative; padding-left: 18px; }
    .timeline:before { content:""; position:absolute; left:6px; top:4px; bottom:4px; width:2px; background:#dbe2f0; }
    .print-timeline-item { position:relative; padding-left: 18px; margin-bottom: 18px; }
    .print-timeline-dot { position:absolute; left:-1px; top:10px; width:14px; height:14px; border-radius:50%; background:#2b3056; border:4px solid #eef2ff; }
    .print-timeline-card { border:1px solid #e5e7eb; border-radius:14px; padding:14px 16px; }
    .print-timeline-head { display:flex; justify-content:space-between; gap:14px; font-size:13px; margin-bottom:10px; }
    .print-timeline-head span { color:#6b7280; }
    .print-timeline-card p { margin:0 0 10px; line-height:1.7; font-size:13px; color:#374151; }
    .print-timeline-card small { color:#0f3f93; font-weight:700; }
    .print-footer { margin-top: 26px; display:flex; justify-content:space-between; color:#6b7280; font-size:11px; }
    @media print { .page { padding: 18px 26px 26px; } }
</style>
</head>
<body>
    <div class="page">
        <div class="print-topbar">
            <div>
                <h1>Detail Laporan Pelayanan</h1>
                <div class="code">${report.nomor_pengaduan}</div>
                <div class="badges">
                    <span class="badge ${badgeStatusClass}">Status: ${getStatusLabel(report.status)}</span>
                    <span class="badge ${badgePriorityClass}">Prioritas: ${getPriorityLabel(report.prioritas)}</span>
                </div>
                <div class="title-line"></div>
            </div>
        </div>

        <div class="section-title">Informasi Laporan</div>
        <div class="field-card" style="margin-bottom:14px;">
            <div class="field-label">Judul Laporan</div>
            <div class="field-value">${report.judul_pengaduan}</div>
        </div>
        <div class="field-card" style="margin-bottom:14px;">
            <div class="field-label">Jenis Masalah</div>
            <div class="field-value">${report.jenis_masalah}</div>
        </div>
        <div class="story-box">${report.kronologi}</div>

        <div class="grid-3" style="margin-top:14px;">
            ${topMetrics
                .map(
                    (item) =>
                        `<div class="metric-card"><div class="metric-label">${item.label}</div><div class="metric-value">${item.value}</div></div>`,
                )
                .join("")}
        </div>

        <div class="field-card" style="margin-top:14px;">
            <div class="field-label">Lokasi Kejadian</div>
            <div class="field-value">${report.lokasi_kejadian || "-"}</div>
        </div>

        ${report.catatan_internal ? `<div class="note-box"><strong>Catatan Paralegal</strong><div style="margin-top:8px; line-height:1.7;">${report.catatan_internal}</div></div>` : ""}

        <div class="section-title">Data Pelapor</div>
        <div class="grid-2">
            <div class="field-card"><div class="field-label">Nama Pelapor</div><div class="field-value">${report.nama_pelapor || "-"}</div></div>
            <div class="field-card"><div class="field-label">NIK</div><div class="field-value">${report.nik || "-"}</div></div>
            <div class="field-card"><div class="field-label">Nomor Telepon</div><div class="field-value">${report.nomor_telepon || "-"}</div></div>
            <div class="field-card"><div class="field-label">Lurah / Kades</div><div class="field-value">${report.nama_lurah || "-"}</div></div>
            <div class="field-card"><div class="field-label">Posbankum / Kecamatan</div><div class="field-value">${getFullWilayah(report)}</div></div>
            <div class="field-card"><div class="field-label">Provinsi</div><div class="field-value">${report.provinsi_nama || "Riau"}</div></div>
        </div>

        <div class="section-title">Paralegal yang Mengurus</div>
        <div class="grid-2">
            <div class="field-card"><div class="field-label">Nama Paralegal</div><div class="field-value">${report.paralegal_nama || "-"}</div></div>
            <div class="field-card"><div class="field-label">Nomor HP Paralegal</div><div class="field-value">${report.paralegal_hp || "-"}</div></div>
        </div>

        <div class="section-title">Progres Penanganan</div>
        <div class="timeline">${timelineMarkup || "<div class='field-card'><div class='field-value'>Belum ada progres penanganan.</div></div>"}</div>

        <div class="print-footer">
            <span>Dicetak dari Sistem Posbankum</span>
            <span>Halaman 1</span>
        </div>
    </div>
    <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

export default function LaporanPelayanan({
    profile = {},
    reports: initialReports = [],
    paralegalOptions: initialParalegals = [],
    currentPosbankum = {},
    flash = {},
}) {
    const [reports, setReports] = useState(() =>
        (initialReports || []).map(normalizeReport),
    );
    const [tab, setTab] = useState("aktif");
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("semua");
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
    const priorityDropdownRef = useRef(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toastSuccess, setToastSuccess] = useState({
        title: "Berhasil",
        message: "",
    });
    const [toastReject, setToastReject] = useState("");
    const [formData, setFormData] = useState(EMPTY_FORM_DATA);
    const [locationSearchQuery, setLocationSearchQuery] = useState("");
    const [locationSearchResults, setLocationSearchResults] = useState([]);
    const [locationSearchError, setLocationSearchError] = useState("");
    const [locationSearching, setLocationSearching] = useState(false);
    const [locationResolving, setLocationResolving] = useState(false);
    const incidentMapBoxRef = useRef(null);
    const incidentMapRef = useRef(null);
    const incidentMarkerRef = useRef(null);
    const incidentMapResizeObserverRef = useRef(null);
    const incidentPickRef = useRef(null);

    useEffect(() => {
        setReports((initialReports || []).map(normalizeReport));
    }, [initialReports]);

    useEffect(() => {
        /*
         * Jangan menampilkan flash success umum saat komponen ini dibuka.
         * Flash dari menu lain masih bisa tersimpan di props dashboard Inertia,
         * sehingga toast sukses dapat muncul ulang ketika user hanya pindah menu.
         * Aksi di Laporan Pelayanan tetap menampilkan toast lewat onSuccess router.
         */
        if (flash?.error || flash?.reject) {
            setToastReject(String(flash?.error || flash?.reject));
        }
    }, [flash?.error, flash?.reject]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                priorityDropdownRef.current &&
                !priorityDropdownRef.current.contains(event.target)
            ) {
                setPriorityDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const priorityFilterLabel = useMemo(() => {
        return (
            PRIORITY_FILTER_OPTIONS.find(
                (option) => option.value === priorityFilter,
            )?.triggerLabel || "Semua Prioritas"
        );
    }, [priorityFilter]);

    const paralegalOptions = useMemo(() => {
        return (initialParalegals || []).map((item, index) => ({
            id:
                item?.id ||
                item?.id_paralegal ||
                item?.id_user ||
                `paralegal-${index}`,
            nama:
                item?.nama ||
                item?.nama_paralegal ||
                item?.nama_lengkap ||
                item?.name ||
                "Paralegal",
            hp: item?.hp || item?.nomor_telepon || item?.phone || "",
        }));
    }, [initialParalegals]);

    const currentParalegal = useMemo(() => {
        const profileUser = profile?.user || {};
        const fallbackParalegal = paralegalOptions[0] || {};

        return {
            id: firstFilled(
                profile?.id_paralegal,
                profile?.paralegal_id,
                profile?.id_user,
                profile?.user_id,
                profile?.id,
                profileUser?.id_paralegal,
                profileUser?.paralegal_id,
                profileUser?.id_user,
                profileUser?.user_id,
                profileUser?.id,
                fallbackParalegal?.id,
            ),
            nama: firstFilled(
                profile?.nama_paralegal,
                profile?.paralegal_nama,
                profile?.nama_lengkap,
                profile?.nama,
                profile?.name,
                profileUser?.nama_paralegal,
                profileUser?.paralegal_nama,
                profileUser?.nama_lengkap,
                profileUser?.nama,
                profileUser?.name,
                fallbackParalegal?.nama,
                "Paralegal",
            ),
            hp: firstFilled(
                profile?.paralegal_hp,
                profile?.nomor_telepon_paralegal,
                profile?.nomor_telepon,
                profile?.no_hp,
                profile?.hp,
                profile?.phone,
                profile?.telepon,
                profileUser?.paralegal_hp,
                profileUser?.nomor_telepon_paralegal,
                profileUser?.nomor_telepon,
                profileUser?.no_hp,
                profileUser?.hp,
                profileUser?.phone,
                profileUser?.telepon,
                fallbackParalegal?.hp,
            ),
        };
    }, [profile, paralegalOptions]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            id_paralegal: currentParalegal.id || "",
            paralegal_nama: currentParalegal.nama || "",
            paralegal_hp: currentParalegal.hp || "",
        }));
    }, [currentParalegal]);

    const incidentArea = useMemo(() => {
        const latitude = parseCoordinate(
            firstFilled(
                currentPosbankum?.latitude,
                currentPosbankum?.lat,
                currentPosbankum?.latitude_pos,
            ),
            -90,
            90,
        );
        const longitude = parseCoordinate(
            firstFilled(
                currentPosbankum?.longitude,
                currentPosbankum?.lng,
                currentPosbankum?.long,
                currentPosbankum?.longitude_pos,
            ),
            -180,
            180,
        );

        return {
            latitude,
            longitude,
            hasTaggingCoordinates:
                Number.isFinite(latitude) &&
                latitude >= -90 &&
                latitude <= 90 &&
                Number.isFinite(longitude) &&
                longitude >= -180 &&
                longitude <= 180,
            kelurahan: firstFilled(
                currentPosbankum?.kelurahan_nama,
                currentPosbankum?.kelurahan,
            ),
            kecamatan: firstFilled(
                currentPosbankum?.kecamatan_nama,
                currentPosbankum?.kecamatan,
            ),
            kabupaten: firstFilled(
                currentPosbankum?.kabupaten_nama,
                currentPosbankum?.kabupaten,
            ),
        };
    }, [currentPosbankum]);

    const incidentAreaLabel = useMemo(
        () =>
            [
                incidentArea.kelurahan,
                incidentArea.kecamatan,
                incidentArea.kabupaten,
            ]
                .filter(Boolean)
                .join(", ") || "wilayah Posbankum",
        [incidentArea],
    );

    const stats = useMemo(() => buildStats(reports), [reports]);

    const activeReports = useMemo(
        () => reports.filter((item) => item.status === "diproses"),
        [reports],
    );
    const completedReports = useMemo(
        () => reports.filter((item) => item.status === "selesai"),
        [reports],
    );

    const filteredReports = useMemo(() => {
        const source = tab === "riwayat" ? completedReports : activeReports;
        const keyword = search.trim().toLowerCase();

        return source.filter((item) => {
            const matchPriority =
                priorityFilter === "semua" || item.prioritas === priorityFilter;
            const combined = [
                item.nomor_pengaduan,
                item.nama_pelapor,
                item.nik,
                item.judul_pengaduan,
                item.jenis_masalah,
                item.kronologi,
                item.paralegal_nama,
            ]
                .join(" ")
                .toLowerCase();
            const matchSearch = !keyword || combined.includes(keyword);
            return matchPriority && matchSearch;
        });
    }, [activeReports, completedReports, priorityFilter, search, tab]);

    const handleFieldChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const destroyIncidentMap = useCallback(() => {
        if (incidentMapResizeObserverRef.current) {
            try {
                incidentMapResizeObserverRef.current.disconnect();
            } catch {}
            incidentMapResizeObserverRef.current = null;
        }

        if (incidentMapRef.current) {
            try {
                incidentMapRef.current.off();
                incidentMapRef.current.remove();
            } catch {}
            incidentMapRef.current = null;
        }

        incidentMarkerRef.current = null;
        if (incidentMapBoxRef.current) {
            incidentMapBoxRef.current.innerHTML = "";
        }
    }, []);

    const moveIncidentMarker = useCallback((lat, lng, zoom = 17) => {
        const map = incidentMapRef.current;
        const L = window.L;
        const latitude = Number(lat);
        const longitude = Number(lng);

        if (
            !map ||
            !L?.marker ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return;
        }

        try {
            map.invalidateSize(true);
        } catch {}
        map.setView([latitude, longitude], zoom);

        if (incidentMarkerRef.current) {
            incidentMarkerRef.current.setLatLng([latitude, longitude]);
            return;
        }

        const marker = L.marker([latitude, longitude], {
            draggable: true,
        }).addTo(map);
        marker.on("dragend", (event) => {
            const next = event?.target?.getLatLng?.();
            if (next && incidentPickRef.current) {
                incidentPickRef.current(next.lat, next.lng);
            }
        });
        incidentMarkerRef.current = marker;
    }, []);

    const locationMatchesIncidentArea = useCallback(
        (result) => {
            const expected = [
                incidentArea.kelurahan,
                incidentArea.kecamatan,
                incidentArea.kabupaten,
            ].filter(Boolean);

            if (!expected.length) return false;

            const address =
                result?.address && typeof result.address === "object"
                    ? Object.values(result.address).join(" ")
                    : "";
            const haystack = `${result?.display_name || ""} ${address}`;

            return expected.every((name) => containsAreaName(haystack, name));
        },
        [incidentArea],
    );

    const reverseIncidentLocation = useCallback(async (lat, lng) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(
                lat,
            )}&lon=${encodeURIComponent(lng)}`,
            {
                headers: {
                    "Accept-Language": "id-ID",
                },
            },
        );

        if (!response.ok) {
            throw new Error("Lokasi tidak dapat diverifikasi.");
        }

        return response.json();
    }, []);

    const applyIncidentLocation = useCallback(
        (result, latValue = null, lngValue = null) => {
            const latitude = Number(latValue ?? result?.lat);
            const longitude = Number(lngValue ?? result?.lon);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                setLocationSearchError(
                    "Koordinat lokasi kejadian tidak valid.",
                );
                return false;
            }

            if (!locationMatchesIncidentArea(result)) {
                setLocationSearchError(
                    `Lokasi berada di luar tagging area Posbankum (${incidentAreaLabel}). Pilih lokasi yang masih berada di wilayah tersebut.`,
                );
                return false;
            }

            const address = firstFilled(
                result?.display_name,
                "Lokasi terpilih",
            ).slice(0, 255);
            const fixedLat = latitude.toFixed(7);
            const fixedLng = longitude.toFixed(7);

            setFormData((prev) => ({
                ...prev,
                lokasi_kejadian: address,
                latitude_kejadian: fixedLat,
                longitude_kejadian: fixedLng,
            }));
            setLocationSearchQuery(address);
            setLocationSearchResults([]);
            setLocationSearchError("");
            moveIncidentMarker(fixedLat, fixedLng, 17);
            return true;
        },
        [incidentAreaLabel, locationMatchesIncidentArea, moveIncidentMarker],
    );

    const pickIncidentCoordinates = useCallback(
        async (lat, lng) => {
            if (!incidentArea.hasTaggingCoordinates) {
                setLocationSearchError(
                    "Tagging Area Posbankum belum diatur. Atur lokasi Posbankum terlebih dahulu sebelum menentukan lokasi kejadian.",
                );
                return;
            }

            setLocationResolving(true);
            setLocationSearchError("");

            try {
                const result = await reverseIncidentLocation(lat, lng);
                if (!result?.display_name) {
                    throw new Error("Lokasi tidak ditemukan.");
                }
                const accepted = applyIncidentLocation(result, lat, lng);
                if (!accepted) {
                    const previousLat = parseCoordinate(
                        formData.latitude_kejadian,
                        -90,
                        90,
                    );
                    const previousLng = parseCoordinate(
                        formData.longitude_kejadian,
                        -180,
                        180,
                    );
                    if (
                        Number.isFinite(previousLat) &&
                        Number.isFinite(previousLng)
                    ) {
                        moveIncidentMarker(previousLat, previousLng, 17);
                    }
                }
            } catch {
                setLocationSearchError(
                    "Lokasi tidak dapat diverifikasi. Periksa koneksi internet lalu coba lagi.",
                );
                const previousLat = parseCoordinate(
                    formData.latitude_kejadian,
                    -90,
                    90,
                );
                const previousLng = parseCoordinate(
                    formData.longitude_kejadian,
                    -180,
                    180,
                );
                if (
                    Number.isFinite(previousLat) &&
                    Number.isFinite(previousLng)
                ) {
                    moveIncidentMarker(previousLat, previousLng, 17);
                }
            } finally {
                setLocationResolving(false);
            }
        },
        [
            applyIncidentLocation,
            formData.latitude_kejadian,
            formData.longitude_kejadian,
            incidentArea.hasTaggingCoordinates,
            moveIncidentMarker,
            reverseIncidentLocation,
        ],
    );

    incidentPickRef.current = pickIncidentCoordinates;

    const searchIncidentLocation = async () => {
        const keyword = locationSearchQuery.trim();
        if (!keyword) {
            setLocationSearchResults([]);
            setLocationSearchError(
                "Masukkan nama jalan, daerah, atau lokasi terlebih dahulu.",
            );
            return;
        }

        if (!incidentArea.hasTaggingCoordinates) {
            setLocationSearchResults([]);
            setLocationSearchError(
                "Tagging Area Posbankum belum diatur. Atur lokasi Posbankum terlebih dahulu.",
            );
            return;
        }

        setLocationSearching(true);
        setLocationSearchResults([]);
        setLocationSearchError("");

        const areaContext = [
            incidentArea.kelurahan,
            incidentArea.kecamatan,
            incidentArea.kabupaten,
        ]
            .filter(Boolean)
            .join(", ");
        const query = areaContext ? `${keyword}, ${areaContext}` : keyword;

        try {
            const fetchSearchResults = async (searchQuery) => {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=id&q=${encodeURIComponent(
                        searchQuery,
                    )}&limit=5`,
                    {
                        headers: {
                            "Accept-Language": "id-ID",
                        },
                    },
                );

                if (!response.ok) throw new Error("search failed");
                const json = await response.json();
                return Array.isArray(json)
                    ? json.filter(
                          (item) =>
                              Number.isFinite(Number(item?.lat)) &&
                              Number.isFinite(Number(item?.lon)),
                      )
                    : [];
            };

            let results = await fetchSearchResults(query);
            if (!results.length && query !== keyword) {
                // Fallback pencarian umum membuat hasil di luar wilayah tetap
                // bisa dipilih, lalu ditolak oleh validasi tagging area dengan
                // pesan yang jelas, bukan dianggap sebagai koordinat valid.
                results = await fetchSearchResults(keyword);
            }

            if (!results.length) {
                setLocationSearchError(
                    "Lokasi tidak ditemukan. Periksa kembali nama lokasi yang Anda masukkan.",
                );
                return;
            }

            setLocationSearchResults(results);
            if (results.length === 1) {
                applyIncidentLocation(results[0]);
            }
        } catch {
            setLocationSearchError(
                "Pencarian lokasi gagal. Periksa koneksi internet lalu coba lagi.",
            );
        } finally {
            setLocationSearching(false);
        }
    };

    const useCurrentIncidentLocation = () => {
        if (!incidentArea.hasTaggingCoordinates) {
            setLocationSearchError(
                "Tagging Area Posbankum belum diatur. Atur lokasi Posbankum terlebih dahulu.",
            );
            return;
        }

        if (!navigator.geolocation) {
            setLocationSearchError(
                "Browser/perangkat ini tidak mendukung fitur lokasi terkini.",
            );
            return;
        }

        setLocationSearchError("");
        setLocationResolving(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                pickIncidentCoordinates(
                    position.coords.latitude,
                    position.coords.longitude,
                );
            },
            (error) => {
                setLocationResolving(false);
                if (error?.code === 1) {
                    setLocationSearchError(
                        "Izin lokasi ditolak. Aktifkan izin lokasi pada browser lalu coba lagi.",
                    );
                } else if (error?.code === 2) {
                    setLocationSearchError(
                        "Lokasi perangkat tidak dapat diperoleh saat ini. Coba lagi beberapa saat.",
                    );
                } else if (error?.code === 3) {
                    setLocationSearchError(
                        "Permintaan lokasi terkini melewati batas waktu. Coba lagi.",
                    );
                } else {
                    setLocationSearchError(
                        "Lokasi perangkat tidak dapat diperoleh.",
                    );
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 30000,
            },
        );
    };

    useEffect(() => {
        if (
            tab !== "buat" ||
            !incidentArea.hasTaggingCoordinates ||
            !incidentMapBoxRef.current
        ) {
            destroyIncidentMap();
            return undefined;
        }

        let cancelled = false;
        const initialize = async () => {
            try {
                const L = await ensureIncidentLeaflet();
                if (
                    cancelled ||
                    !incidentMapBoxRef.current ||
                    incidentMapRef.current
                )
                    return;

                const map = L.map(incidentMapBoxRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                }).setView([incidentArea.latitude, incidentArea.longitude], 15);

                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        maxZoom: 19,
                        attribution: "&copy; OpenStreetMap contributors",
                    },
                ).addTo(map);

                map.on("click", (event) => {
                    if (event?.latlng && incidentPickRef.current) {
                        incidentPickRef.current(
                            event.latlng.lat,
                            event.latlng.lng,
                        );
                    }
                });

                incidentMapRef.current = map;

                const selectedLat = parseCoordinate(
                    formData.latitude_kejadian,
                    -90,
                    90,
                );
                const selectedLng = parseCoordinate(
                    formData.longitude_kejadian,
                    -180,
                    180,
                );

                if (
                    Number.isFinite(selectedLat) &&
                    Number.isFinite(selectedLng)
                ) {
                    moveIncidentMarker(selectedLat, selectedLng, 17);
                } else {
                    // Saat form pertama kali dibuka, gunakan titik Tagging Area
                    // Posbankum sebagai lokasi awal. Paralegal tetap dapat
                    // memindahkan marker, mencari lokasi, atau memakai GPS.
                    const defaultLat = Number(incidentArea.latitude).toFixed(7);
                    const defaultLng = Number(incidentArea.longitude).toFixed(
                        7,
                    );
                    const defaultAddress = firstFilled(
                        currentPosbankum?.alamat,
                        incidentAreaLabel,
                        "Tagging Area Posbankum",
                    ).slice(0, 255);

                    setFormData((prev) => {
                        const prevLat = parseCoordinate(
                            prev.latitude_kejadian,
                            -90,
                            90,
                        );
                        const prevLng = parseCoordinate(
                            prev.longitude_kejadian,
                            -180,
                            180,
                        );

                        // Jangan menimpa lokasi bila user sudah sempat memilih
                        // titik lain ketika Leaflet sedang dimuat.
                        if (
                            Number.isFinite(prevLat) &&
                            Number.isFinite(prevLng)
                        ) {
                            return prev;
                        }

                        return {
                            ...prev,
                            lokasi_kejadian: defaultAddress,
                            latitude_kejadian: defaultLat,
                            longitude_kejadian: defaultLng,
                        };
                    });
                    setLocationSearchQuery((prev) =>
                        String(prev || "").trim() ? prev : defaultAddress,
                    );
                    setLocationSearchResults([]);
                    setLocationSearchError("");
                    moveIncidentMarker(defaultLat, defaultLng, 17);
                }

                window.setTimeout(() => {
                    try {
                        map.invalidateSize(true);
                    } catch {}
                }, 80);

                if (typeof ResizeObserver !== "undefined") {
                    incidentMapResizeObserverRef.current = new ResizeObserver(
                        () => {
                            try {
                                map.invalidateSize(false);
                            } catch {}
                        },
                    );
                    incidentMapResizeObserverRef.current.observe(
                        incidentMapBoxRef.current,
                    );
                }
            } catch {
                setLocationSearchError(
                    "Peta gagal dimuat. Periksa koneksi internet lalu buka kembali menu Laporan Pelayanan.",
                );
            }
        };

        initialize();

        return () => {
            cancelled = true;
            destroyIncidentMap();
        };
    }, [
        currentPosbankum?.alamat,
        destroyIncidentMap,
        incidentArea.hasTaggingCoordinates,
        incidentArea.latitude,
        incidentArea.longitude,
        incidentAreaLabel,
        moveIncidentMarker,
        tab,
    ]);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            setFormData((prev) => ({ ...prev, lampiran: [] }));
            return;
        }
        const invalid = files.find((file) => !isAllowedFileType(file));
        if (invalid) {
            event.target.value = "";
            setToastReject(
                `File ${invalid.name} tidak didukung. Gunakan PNG, JPG, JPEG, atau PDF.`,
            );
            return;
        }
        const oversize = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
        if (oversize) {
            event.target.value = "";
            setToastReject(`Ukuran file ${oversize.name} melebihi batas 5MB.`);
            return;
        }
        setFormData((prev) => ({ ...prev, lampiran: files }));
    };

    const validateForm = () => {
        if (!formData.nama_pelapor.trim())
            return "Nama lengkap pelapor wajib diisi.";
        if (digitsOnly(formData.nik).length !== 16)
            return "NIK harus berisi 16 digit angka.";
        if (digitsOnly(formData.nomor_telepon).length < 10)
            return "Nomor telepon minimal 10 digit.";
        if (!formData.nama_lurah.trim())
            return "Nama lurah/kepala desa wajib diisi.";
        if (!formData.jenis_masalah) return "Jenis masalah wajib dipilih.";
        if (!formData.prioritas) return "Prioritas laporan wajib dipilih.";
        if (!formData.judul_pengaduan.trim())
            return "Judul laporan wajib diisi.";
        if (!formData.kronologi.trim())
            return "Kronologi kejadian wajib diisi.";
        if (!formData.tanggal_kejadian) return "Tanggal kejadian wajib diisi.";
        if (!formData.waktu_kejadian) return "Waktu kejadian wajib diisi.";
        if (!incidentArea.hasTaggingCoordinates)
            return "Tagging Area Posbankum belum diatur. Atur lokasi Posbankum terlebih dahulu.";
        if (!formData.lokasi_kejadian.trim())
            return "Lokasi kejadian wajib dipilih melalui maps.";
        if (
            !Number.isFinite(
                parseCoordinate(formData.latitude_kejadian, -90, 90),
            ) ||
            !Number.isFinite(
                parseCoordinate(formData.longitude_kejadian, -180, 180),
            )
        )
            return "Koordinat lokasi kejadian belum dipilih pada maps.";
        if (!formData.paralegal_nama.trim())
            return "Data paralegal login tidak ditemukan. Silakan login ulang.";
        return "";
    };

    const resetForm = () => {
        const hasDefaultLocation = incidentArea.hasTaggingCoordinates;
        const defaultLat = hasDefaultLocation
            ? Number(incidentArea.latitude).toFixed(7)
            : "";
        const defaultLng = hasDefaultLocation
            ? Number(incidentArea.longitude).toFixed(7)
            : "";
        const defaultAddress = hasDefaultLocation
            ? firstFilled(
                  currentPosbankum?.alamat,
                  incidentAreaLabel,
                  "Tagging Area Posbankum",
              ).slice(0, 255)
            : "";

        setFormData({
            ...EMPTY_FORM_DATA,
            lokasi_kejadian: defaultAddress,
            latitude_kejadian: defaultLat,
            longitude_kejadian: defaultLng,
            id_paralegal: currentParalegal.id || "",
            paralegal_nama: currentParalegal.nama || "",
            paralegal_hp: currentParalegal.hp || "",
        });
        setLocationSearchQuery(defaultAddress);
        setLocationSearchResults([]);
        setLocationSearchError("");

        if (hasDefaultLocation && incidentMapRef.current) {
            moveIncidentMarker(defaultLat, defaultLng, 17);
        } else if (incidentMarkerRef.current && incidentMapRef.current) {
            try {
                incidentMapRef.current.removeLayer(incidentMarkerRef.current);
            } catch {}
            incidentMarkerRef.current = null;
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const validationMessage = validateForm();
        if (validationMessage) {
            setToastReject(validationMessage);
            return;
        }

        const payload = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === "lampiran") return;
            payload.append(key, value || "");
        });
        formData.lampiran.forEach((file) => payload.append("lampiran[]", file));

        setSaving(true);
        router.post("/paralegal/laporan-pelayanan", payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                resetForm();
                setTab("aktif");
                setToastSuccess({
                    title: "Berhasil!",
                    message: "Laporan berhasil disimpan.",
                });
            },
            onError: (errors) => {
                const message =
                    Object.values(errors || {})[0] ||
                    "Gagal menyimpan laporan.";
                setToastReject(String(message));
            },
            onFinish: () => setSaving(false),
        });
    };

    const handleDelete = (report) => {
        if (!report?.id_pengaduan) return;
        const confirmed = window.confirm(
            "Apakah Anda yakin ingin menghapus laporan ini?",
        );
        if (!confirmed) return;

        router.delete(`/paralegal/laporan-pelayanan/${report.id_pengaduan}`, {
            preserveScroll: true,
            onSuccess: () => {
                setReports((prev) =>
                    prev.filter(
                        (item) =>
                            String(item.id_pengaduan) !==
                            String(report.id_pengaduan),
                    ),
                );
                setToastSuccess({
                    title: "Berhasil!",
                    message: "Laporan berhasil dihapus.",
                });
                if (
                    selectedReport &&
                    String(selectedReport.id_pengaduan) ===
                        String(report.id_pengaduan)
                ) {
                    setSelectedReport(null);
                    setTab("aktif");
                }
            },
            onError: (errors) => {
                const message =
                    Object.values(errors || {})[0] ||
                    "Gagal menghapus laporan.";
                setToastReject(String(message));
            },
        });
    };

    const handleOpenDetail = (report) => {
        setSelectedReport(report);
    };

    const handleOpenLampiran = (file) => {
        const url = normalizePreviewUrl(
            file?.url || file?.public_url || file?.path_file || "",
        );
        if (!url) return;
        if (isImageFile(file)) {
            setPreviewFile({ ...file, signedUrl: url });
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleDownloadLampiran = (file) => {
        const url = normalizePreviewUrl(
            file?.url || file?.public_url || file?.path_file || "",
        );
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = getAttachmentFileName(file, "lampiran");
        link.click();
    };

    const handlePrint = (report) => {
        if (!report) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setToastReject("Jendela print diblokir browser.");
            return;
        }
        printWindow.document.open();
        printWindow.document.write(buildPrintHtml(report));
        printWindow.document.close();
    };

    const renderStats = () => (
        <div className="lpvStatsGrid">
            <StatBox
                icon={<FiFileText />}
                label="Total Laporan"
                value={stats.total}
                tone="toneNavy"
            />
            <StatBox
                icon={<FiClock />}
                label="Sedang Proses"
                value={stats.aktif}
                tone="toneYellow"
            />
            <StatBox
                icon={<FiCheckCircle />}
                label="Selesai"
                value={stats.selesai}
                tone="toneGreen"
            />
            <StatBox
                icon={<FiAlertTriangle />}
                label="Prioritas Tinggi"
                value={stats.tinggi}
                tone="toneRed"
            />
            <StatBox
                icon={<TfiStatsUp />}
                label="Tingkat Selesai"
                value={`${stats.tingkatSelesai}%`}
                tone="toneOrange"
            />
            <StatBox
                icon={<FiCalendar />}
                label="Rata-rata"
                value={`${stats.avgHari} hari`}
                tone="toneIndigo"
            />
        </div>
    );

    const renderToolbar = () => (
        <div className="lpvToolbarCard">
            <div className="lpvTabsRow">
                <button
                    type="button"
                    className={`lpvTopTab ${tab === "buat" ? "active" : ""}`}
                    onClick={() => setTab("buat")}
                >
                    <FiPlus /> Buat Laporan
                </button>
                <button
                    type="button"
                    className={`lpvTopTab ${tab === "aktif" ? "active" : ""}`}
                    onClick={() => setTab("aktif")}
                >
                    <FiClock /> Laporan Aktif ({activeReports.length})
                </button>
                <button
                    type="button"
                    className={`lpvTopTab ${tab === "riwayat" ? "active" : ""}`}
                    onClick={() => setTab("riwayat")}
                >
                    <RiHistoryFill /> Riwayat Selesai ({completedReports.length}
                    )
                </button>
                <button
                    type="button"
                    className={`lpvTopTab ${tab === "statistik" ? "active" : ""}`}
                    onClick={() => setTab("statistik")}
                >
                    <AiOutlineBarChart /> Statistik
                </button>
            </div>
        </div>
    );

    const renderSearchBar = () => (
        <div className="lpvSearchCard">
            <div className="lpvSearchBox">
                <FiSearch />
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari laporan (nama, NIK, nomor laporan)..."
                />
            </div>
            <div className="lpvFilterGroup">
                <div className="lpvFilterIcon">
                    <FiFilter />
                </div>
                <div
                    className={`lpvPriorityDropdown ${priorityDropdownOpen ? "is-open" : ""}`}
                    ref={priorityDropdownRef}
                >
                    <button
                        type="button"
                        className="lpvPriorityTrigger"
                        onClick={() =>
                            setPriorityDropdownOpen((current) => !current)
                        }
                        aria-haspopup="listbox"
                        aria-expanded={priorityDropdownOpen}
                    >
                        <span>{priorityFilterLabel}</span>
                        <FiChevronRight />
                    </button>

                    {priorityDropdownOpen ? (
                        <div className="lpvPriorityMenu" role="listbox">
                            {PRIORITY_FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`lpvPriorityOption ${priorityFilter === option.value ? "is-active" : ""}`}
                                    onClick={() => {
                                        setPriorityFilter(option.value);
                                        setPriorityDropdownOpen(false);
                                    }}
                                    role="option"
                                    aria-selected={
                                        priorityFilter === option.value
                                    }
                                >
                                    {option.optionLabel}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );

    const renderStatistics = () => {
        const currentMonthLabel = new Date().toLocaleDateString("id-ID", {
            month: "long",
        });
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalThisMonth = reports.filter((item) => {
            const date = new Date(item.created_at || item.tanggal_kejadian);
            return (
                !Number.isNaN(date.getTime()) &&
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
            );
        }).length;
        const categoryRows = [
            "Pidana",
            "Perdata",
            "Ketenagakerjaan",
            "Keluarga",
            "Pertanahan",
            "Konsumen",
        ].map((name) => {
            const count = reports.filter((item) =>
                String(item.jenis_masalah || "")
                    .toLowerCase()
                    .includes(name.toLowerCase()),
            ).length;
            return {
                name,
                count,
                percent: stats.total
                    ? Math.round((count / stats.total) * 100)
                    : 0,
            };
        });
        const priorityRows = ["tinggi", "sedang", "rendah"].map((priority) => {
            const count = reports.filter(
                (item) => item.prioritas === priority,
            ).length;
            return {
                key: priority,
                name: getPriorityLabel(priority),
                count,
                percent: stats.total
                    ? Math.round((count / stats.total) * 100)
                    : 0,
            };
        });

        return (
            <div className="lpvStatContent">
                <div className="lpvStatPanelGrid">
                    <section className="lpvStatPanel">
                        <div className="lpvStatPanelTitle isBlue">
                            <AiOutlineBarChart />
                            <span>Berdasarkan Jenis Masalah</span>
                        </div>
                        <div className="lpvBarList">
                            {categoryRows.map((item) => (
                                <div className="lpvBarRow" key={item.name}>
                                    <div className="lpvBarHead">
                                        <span>{item.name}</span>
                                        <strong>
                                            {item.count} ({item.percent}%)
                                        </strong>
                                    </div>
                                    <div className="lpvStatTrack">
                                        <div
                                            className="lpvStatFill isBlue"
                                            style={{
                                                width: `${item.percent}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="lpvStatPanel">
                        <div className="lpvStatPanelTitle isRed">
                            <FiAlertTriangle />
                            <span>Berdasarkan Prioritas</span>
                        </div>
                        <div className="lpvBarList priority">
                            {priorityRows.map((item) => (
                                <div className="lpvBarRow" key={item.key}>
                                    <div className="lpvBarHead">
                                        <span>{item.name}</span>
                                        <strong
                                            className={`priorityText ${item.key}`}
                                        >
                                            {item.count} ({item.percent}%)
                                        </strong>
                                    </div>
                                    <div className="lpvStatTrack">
                                        <div
                                            className={`lpvStatFill priority ${item.key}`}
                                            style={{
                                                width: `${item.percent}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="lpvPerformancePanel">
                    <div className="lpvPerformanceTitle">
                        <FiChevronRight />
                        <span>Ringkasan Performa</span>
                    </div>
                    <div className="lpvPerformanceGrid">
                        <div className="lpvPerformanceCard blue">
                            <span>Total Laporan {currentMonthLabel}</span>
                            <strong>{totalThisMonth || stats.total}</strong>
                        </div>
                        <div className="lpvPerformanceCard green">
                            <span>Tingkat Penyelesaian</span>
                            <strong>{stats.tingkatSelesai}%</strong>
                        </div>
                        <div className="lpvPerformanceCard indigo">
                            <span>Rata-rata Durasi</span>
                            <strong>{stats.avgHari} hari</strong>
                        </div>
                        <div className="lpvPerformanceCard orange">
                            <span>Laporan Aktif</span>
                            <strong>{stats.aktif}</strong>
                        </div>
                    </div>
                </section>
            </div>
        );
    };

    const renderForm = () => (
        <div className="lpvFormCard lpvCreateCard">
            <div className="lpvGuideBox">
                <div className="lpvGuideIcon">
                    <FiInfo />
                </div>
                <div>
                    <div className="lpvGuideTitle">Petunjuk Pengisian</div>
                    <p>
                        Lengkapi formulir laporan dengan data yang akurat untuk
                        wilayah <strong>{incidentAreaLabel}</strong>. Field
                        bertanda (*) wajib diisi.
                    </p>
                </div>
            </div>

            <form className="lpvCreateForm" onSubmit={handleSubmit}>
                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle">
                        <FiUser />
                        <span>Data Pelapor</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <div className="lpvCreateGrid two">
                        <label className="lpvCreateField">
                            <span>
                                Nama Lengkap <b>*</b>
                            </span>
                            <div className="lpvInputShell">
                                <FiUser />
                                <input
                                    value={formData.nama_pelapor}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "nama_pelapor",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={120}
                                    placeholder="Masukkan nama lengkap sesuai KTP"
                                />
                            </div>
                        </label>
                        <label className="lpvCreateField">
                            <span>
                                NIK (Nomor Induk Kependudukan) <b>*</b>
                            </span>
                            <div className="lpvInputShell">
                                <FiFileText />
                                <input
                                    value={formData.nik}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "nik",
                                            digitsOnly(
                                                e.target.value,
                                                MAX_NIK_LENGTH,
                                            ),
                                        )
                                    }
                                    maxLength={MAX_NIK_LENGTH}
                                    placeholder="16 digit NIK"
                                />
                            </div>
                        </label>
                        <label className="lpvCreateField">
                            <span>
                                Nomor Telepon/HP <b>*</b>
                            </span>
                            <div className="lpvInputShell">
                                <FiPhone />
                                <input
                                    value={formData.nomor_telepon}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "nomor_telepon",
                                            digitsOnly(
                                                e.target.value,
                                                MAX_PHONE_LENGTH,
                                            ),
                                        )
                                    }
                                    maxLength={MAX_PHONE_LENGTH}
                                    placeholder="081234567890"
                                />
                            </div>
                        </label>
                        <label className="lpvCreateField">
                            <span>
                                Nama Lurah/Kepala Desa <b>*</b>
                            </span>
                            <div className="lpvInputShell">
                                <FiMapPin />
                                <input
                                    value={formData.nama_lurah}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "nama_lurah",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={120}
                                    placeholder="Nama Lurah/Kepala Desa"
                                />
                            </div>
                        </label>
                    </div>
                </section>

                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle">
                        <FiFileText />
                        <span>Detail Laporan</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <div className="lpvCreateGrid two narrow">
                        <label className="lpvCreateField">
                            <span>
                                Jenis Masalah <b>*</b>
                            </span>
                            <select
                                value={formData.jenis_masalah}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "jenis_masalah",
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih Jenis Masalah</option>
                                <option value="Pidana">Pidana</option>
                                <option value="Perdata">Perdata</option>
                                <option value="Keluarga">Keluarga</option>
                                <option value="Ketenagakerjaan">
                                    Ketenagakerjaan
                                </option>
                                <option value="Pertanahan">Pertanahan</option>
                                <option value="Konsumen">Konsumen</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </label>
                        <label className="lpvCreateField">
                            <span>
                                Prioritas <b>*</b>
                            </span>
                            <select
                                value={formData.prioritas}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "prioritas",
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">
                                    Pilih Prioritas Laporan
                                </option>
                                <option value="tinggi">Tinggi</option>
                                <option value="sedang">Sedang</option>
                                <option value="rendah">Rendah</option>
                            </select>
                        </label>
                    </div>
                    <div className="lpvCreateGrid one">
                        <label className="lpvCreateField">
                            <span>
                                Judul Laporan <b>*</b>
                            </span>
                            <input
                                value={formData.judul_pengaduan}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "judul_pengaduan",
                                        e.target.value.slice(
                                            0,
                                            MAX_TITLE_LENGTH,
                                        ),
                                    )
                                }
                                maxLength={MAX_TITLE_LENGTH}
                                placeholder="Ringkasan singkat masalah (max 100 karakter)"
                            />
                        </label>
                        <label className="lpvCreateField">
                            <span>
                                Kronologi Kejadian <b>*</b>
                            </span>
                            <textarea
                                rows={7}
                                value={formData.kronologi}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "kronologi",
                                        e.target.value,
                                    )
                                }
                                placeholder="Jelaskan kronologi kejadian secara detail (kapan, dimana, bagaimana, siapa saja yang terlibat)..."
                            />
                        </label>
                    </div>
                </section>

                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle">
                        <FiMapPin />
                        <span>Lokasi & Waktu Kejadian</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <div className="lpvCreateGrid two">
                        <label className="lpvCreateField">
                            <span>
                                Tanggal Kejadian <b>*</b>
                            </span>
                            <div className="lpvInputShell">
                                <FiCalendar />
                                <input
                                    type="date"
                                    value={formData.tanggal_kejadian}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "tanggal_kejadian",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </label>
                        <label className="lpvCreateField">
                            <span>Waktu Kejadian</span>
                            <div className="lpvInputShell">
                                <FiClock />
                                <input
                                    type="time"
                                    value={formData.waktu_kejadian}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "waktu_kejadian",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </label>
                    </div>
                    <div className="lpvCreateField lpvIncidentPicker">
                        <span>
                            Lokasi Kejadian <b>*</b>
                        </span>

                        <div
                            className={`lpvIncidentAreaNote ${incidentArea.hasTaggingCoordinates ? "is-ready" : "is-blocked"}`}
                        >
                            <FiMapPin />
                            <div>
                                <strong>Tagging Area Posbankum</strong>
                                <span>
                                    {incidentArea.hasTaggingCoordinates
                                        ? incidentAreaLabel
                                        : "Belum Diatur — lokasi kejadian belum dapat dipilih."}
                                </span>
                            </div>
                        </div>

                        <div className="lpvIncidentSearchRow">
                            <div className="lpvIncidentSearchInput">
                                <FiSearch />
                                <input
                                    value={locationSearchQuery}
                                    onChange={(e) => {
                                        setLocationSearchQuery(e.target.value);
                                        setLocationSearchResults([]);
                                        if (locationSearchError)
                                            setLocationSearchError("");
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            searchIncidentLocation();
                                        }
                                    }}
                                    placeholder="Cari jalan, kelurahan, kecamatan, atau lokasi"
                                    disabled={
                                        !incidentArea.hasTaggingCoordinates ||
                                        locationSearching ||
                                        locationResolving
                                    }
                                />
                            </div>
                            <button
                                type="button"
                                className="lpvIncidentSearchBtn"
                                onClick={searchIncidentLocation}
                                disabled={
                                    !incidentArea.hasTaggingCoordinates ||
                                    locationSearching ||
                                    locationResolving
                                }
                            >
                                <FiSearch />
                                {locationSearching ? "Mencari..." : "Cari"}
                            </button>
                            <button
                                type="button"
                                className="lpvIncidentGpsBtn"
                                onClick={useCurrentIncidentLocation}
                                disabled={
                                    !incidentArea.hasTaggingCoordinates ||
                                    locationSearching ||
                                    locationResolving
                                }
                                title="Gunakan lokasi terkini"
                            >
                                <TbLocation />
                                <span>Lokasi Terkini</span>
                            </button>
                        </div>

                        {locationSearchResults.length ? (
                            <div
                                className="lpvIncidentResults"
                                role="listbox"
                                aria-label="Hasil pencarian lokasi kejadian"
                            >
                                {locationSearchResults.map((item, index) => (
                                    <button
                                        key={`${item.place_id || index}-${item.lat}-${item.lon}`}
                                        type="button"
                                        className="lpvIncidentResultItem"
                                        onClick={() =>
                                            applyIncidentLocation(item)
                                        }
                                    >
                                        <FiMapPin />
                                        <span>{item.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {locationSearchError ? (
                            <div className="lpvIncidentError" role="alert">
                                <FiAlertTriangle />
                                <span>{locationSearchError}</span>
                            </div>
                        ) : null}

                        {incidentArea.hasTaggingCoordinates ? (
                            <div className="lpvIncidentMapShell">
                                <div
                                    ref={incidentMapBoxRef}
                                    className="lpvIncidentMap"
                                />
                                {locationResolving ? (
                                    <div className="lpvIncidentMapLoading">
                                        Memvalidasi lokasi dalam tagging area...
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="lpvIncidentMapBlocked">
                                <FiMapPin />
                                <strong>Maps belum dapat digunakan</strong>
                                <span>
                                    Koordinat Tagging Area Posbankum harus
                                    disimpan terlebih dahulu pada menu Data
                                    Posbankum.
                                </span>
                            </div>
                        )}

                        <div className="lpvIncidentSelected">
                            <div className="lpvInputShell disabled">
                                <FiMapPin />
                                <input
                                    value={formData.lokasi_kejadian}
                                    readOnly
                                    placeholder="Pilih lokasi melalui pencarian, maps, atau Lokasi Terkini"
                                />
                            </div>
                            {formData.latitude_kejadian &&
                            formData.longitude_kejadian ? (
                                <small>
                                    Koordinat: {formData.latitude_kejadian},{" "}
                                    {formData.longitude_kejadian}
                                </small>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle">
                        <FiUsers />
                        <span>Data Paralegal yang Mengurus</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <div className="lpvCreateGrid two">
                        <label className="lpvCreateField">
                            <span>
                                Nama Paralegal <b>*</b>
                            </span>
                            <div className="lpvInputShell disabled">
                                <FiUser />
                                <input
                                    value={formData.paralegal_nama}
                                    placeholder="Otomatis mengambil nama paralegal login"
                                    readOnly
                                />
                            </div>
                        </label>
                        <label className="lpvCreateField">
                            <span>Nomor HP Paralegal</span>
                            <div className="lpvInputShell disabled">
                                <FiPhone />
                                <input
                                    value={formData.paralegal_hp}
                                    placeholder="Otomatis mengambil nomor HP paralegal login"
                                    readOnly
                                />
                            </div>
                        </label>
                    </div>
                </section>

                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle textOnly">
                        <span>Lampiran Dokumen/Bukti</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <label className="lpvDropzone">
                        <input
                            type="file"
                            multiple
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={handleFileChange}
                        />
                        <span className="lpvDropIcon">
                            <FiPaperclip />
                        </span>
                        <strong>Klik untuk upload dokumen/foto</strong>
                        <small>PNG, JPG, PDF (Max 5MB per file)</small>
                    </label>
                    {formData.lampiran.length ? (
                        <div className="lpvUploadList isCreate">
                            {formData.lampiran.map((file) => (
                                <div
                                    className="lpvUploadItem"
                                    key={`${file.name}-${file.size}`}
                                >
                                    <span>{file.name}</span>
                                    <small>{formatFileSize(file.size)}</small>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </section>

                <section className="lpvFormSection">
                    <div className="lpvFormSectionTitle textOnly">
                        <span>Catatan Internal Paralegal</span>
                    </div>
                    <div className="lpvFormSectionLine" />
                    <label className="lpvCreateField">
                        <textarea
                            rows={4}
                            value={formData.catatan_internal}
                            onChange={(e) =>
                                handleFieldChange(
                                    "catatan_internal",
                                    e.target.value,
                                )
                            }
                            placeholder="Catatan khusus atau tindak lanjut yang diperlukan (opsional)"
                        />
                    </label>
                </section>

                <div className="lpvCreateActions">
                    <button
                        type="button"
                        className="lpvResetBtn"
                        onClick={() => resetForm()}
                    >
                        Reset Form
                    </button>
                    <button
                        type="submit"
                        className="lpvSendBtn"
                        disabled={saving}
                    >
                        <BsSend /> {saving ? "Mengirim..." : "Kirim Laporan"}
                    </button>
                </div>
            </form>
        </div>
    );

    const renderDetailPage = () => {
        if (!selectedReport) return null;
        const report = selectedReport;
        const topMetrics = getDetailTopMetrics(report);
        const wilayahLabel = getFullWilayah(report);
        const reportLocationMap = getReportLocationMap(report);

        return (
            <div className="lpdWrap">
                <div className="lpdTopbar">
                    <div>
                        <div className="lpvBreadcrumb">
                            Laporan Pelayanan <FiChevronRight /> Detail Laporan
                        </div>
                        <h2 className="lpdPageTitle">
                            Detail Laporan Pelayanan
                        </h2>
                        <div className="lpvTitleLine" />
                    </div>
                    <div className="lpdTopActions">
                        <button
                            type="button"
                            className="lpvGhostBtn icon"
                            onClick={() => handlePrint(report)}
                        >
                            <FiPrinter /> Cetak
                        </button>
                        <button
                            type="button"
                            className="lpvPrimaryBtn"
                            onClick={() => setSelectedReport(null)}
                        >
                            Kembali ke Daftar
                        </button>
                    </div>
                </div>

                <div className="lpdSummaryCard">
                    <div className="lpdSummaryMain">
                        <div className="lpdCode">
                            No. Laporan: {report.nomor_pengaduan}
                        </div>
                        <h3 className="lpdCaseTitle">
                            {report.judul_pengaduan}
                        </h3>
                        <div className="lpdBadgeRow">
                            <span
                                className={`lpvChip ${report.status === "selesai" ? "isGreen" : "isBlue"}`}
                            >
                                {getStatusLabel(report.status)}
                            </span>
                            <span
                                className={`lpvChip ${report.prioritas === "tinggi" ? "isRed" : "isOrange"}`}
                            >
                                Prioritas {getPriorityLabel(report.prioritas)}
                            </span>
                            <span className="lpvChip isNeutral">
                                {report.jenis_masalah}
                            </span>
                        </div>
                    </div>
                    <div className="lpdMetricGrid">
                        {topMetrics.map((item) => (
                            <div className="lpdMetricCard" key={item.label}>
                                <div className="lpdMetricLabel">
                                    {item.label}
                                </div>
                                <div className="lpdMetricValue">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="lpdPartyRow">
                        <div className="lpdPartyCol">
                            <span>Pelapor</span>
                            <strong>{report.nama_pelapor}</strong>
                        </div>
                        <div className="lpdPartyCol">
                            <span>Paralegal</span>
                            <strong>{report.paralegal_nama}</strong>
                        </div>
                        <div className="lpdPartyCol">
                            <span>Wilayah</span>
                            <strong>{wilayahLabel}</strong>
                        </div>
                    </div>
                </div>

                <div className="lpdMainGrid">
                    <div className="lpdLeftColumn">
                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <FiUser />
                                </div>
                                <div>
                                    <h3>Data Pelapor</h3>
                                    <span />
                                </div>
                            </div>
                            <div className="lpdFieldGrid three">
                                <div className="lpdFieldItem">
                                    <span>Nama Pelapor</span>
                                    <strong>{report.nama_pelapor}</strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>NIK</span>
                                    <strong>{report.nik || "-"}</strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>No. Telepon</span>
                                    <strong>
                                        {report.nomor_telepon || "-"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Desa / Kelurahan</span>
                                    <strong>
                                        {report.kelurahan_nama || "-"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Kecamatan</span>
                                    <strong>
                                        {report.kecamatan_nama || "-"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Lurah / Kades</span>
                                    <strong>{report.nama_lurah || "-"}</strong>
                                </div>
                            </div>
                        </section>

                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <FiFileText />
                                </div>
                                <div>
                                    <h3>Detail Kejadian</h3>
                                    <span />
                                </div>
                            </div>
                            <div className="lpdStoryTitle">
                                Kronologi Kejadian
                            </div>
                            <div className="lpdStoryBox">
                                {report.kronologi}
                            </div>
                            <div className="lpdDetailMeta">
                                <div className="lpdFieldItem">
                                    <span>Waktu Kejadian</span>
                                    <strong>
                                        {formatDateID(report.tanggal_kejadian)},{" "}
                                        {formatTimeID(report.waktu_kejadian)}{" "}
                                        WIB
                                    </strong>
                                </div>
                                <div className="lpdFieldItem lpdLocationField">
                                    <span>Lokasi Kejadian</span>
                                    <strong>{report.lokasi_kejadian}</strong>

                                    {reportLocationMap ? (
                                        <div className="lpdLocationMap">
                                            <iframe
                                                className="lpdLocationMapFrame"
                                                title={`Lokasi kejadian ${report.nomor_pengaduan}`}
                                                src={reportLocationMap.src}
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                            <div className="lpdLocationMapMeta">
                                                <div>
                                                    <FiMapPin />
                                                    <span>
                                                        {reportLocationMap.coordinateText ||
                                                            report.lokasi_kejadian}
                                                    </span>
                                                </div>
                                                <a
                                                    href={
                                                        reportLocationMap.externalUrl
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Buka Maps
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="lpdLocationUnavailable">
                                            Lokasi peta belum tersedia pada
                                            laporan ini.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`lpdNoteBox ${report.status === "selesai" ? "success" : "warning"}`}
                            >
                                <strong>
                                    {report.status === "selesai"
                                        ? "Solusi / Hasil Penanganan"
                                        : "Catatan Paralegal"}
                                </strong>
                                <p>
                                    {report.catatan_internal ||
                                        (report.status === "selesai"
                                            ? "Laporan telah selesai ditangani."
                                            : "Belum ada catatan paralegal pada laporan ini.")}
                                </p>
                            </div>
                        </section>

                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <FiClock />
                                </div>
                                <div>
                                    <h3>Progres Penanganan</h3>
                                    <span />
                                </div>
                            </div>
                            <div className="lpdTimeline">
                                {(report.updates || []).map((item, index) => (
                                    <div
                                        className="lpdTimelineItem"
                                        key={`${item.title}-${index}`}
                                    >
                                        <div className="lpdTimelineDot" />
                                        <div className="lpdTimelineCard">
                                            <div className="lpdTimelineHead">
                                                <strong>{item.title}</strong>
                                                <span>
                                                    {item.date} • {item.time}
                                                </span>
                                            </div>
                                            <p>{item.desc}</p>
                                            <small>{item.by}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="lpdRightColumn">
                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <FiUsers />
                                </div>
                                <div>
                                    <h3>Paralegal Penanggung Jawab</h3>
                                    <span />
                                </div>
                            </div>
                            <div className="lpdFieldGrid">
                                <div className="lpdFieldItem">
                                    <span>Nama Paralegal</span>
                                    <strong>{report.paralegal_nama}</strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Nomor HP</span>
                                    <strong>
                                        {report.paralegal_hp || "-"}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <TbLocation />
                                </div>
                                <div>
                                    <h3>Wilayah Layanan</h3>
                                    <span />
                                </div>
                            </div>
                            <div className="lpdFieldGrid">
                                <div className="lpdFieldItem">
                                    <span>Provinsi</span>
                                    <strong>
                                        {report.provinsi_nama || "Riau"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Kabupaten/Kota</span>
                                    <strong>
                                        {report.kabupaten_nama || "Pekanbaru"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Kecamatan</span>
                                    <strong>
                                        {report.kecamatan_nama || "-"}
                                    </strong>
                                </div>
                                <div className="lpdFieldItem">
                                    <span>Kelurahan</span>
                                    <strong>
                                        {report.kelurahan_nama || "-"}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        <section className="lpdPanel">
                            <div className="lpdPanelHead">
                                <div className="lpdPanelIcon">
                                    <FiPaperclip />
                                </div>
                                <div>
                                    <h3>
                                        Lampiran ({report.lampiran?.length || 0}
                                        )
                                    </h3>
                                    <span />
                                </div>
                            </div>
                            {(report.lampiran || []).length ? (
                                <div className="lpdAttachmentList">
                                    {report.lampiran.map((file, index) => (
                                        <div
                                            className="lpdAttachmentItem"
                                            key={`${getAttachmentFileName(file)}-${index}`}
                                        >
                                            <div className="lpdAttachmentInfo">
                                                <FiFileText />
                                                <div>
                                                    <strong>
                                                        {getAttachmentFileName(
                                                            file,
                                                        )}
                                                    </strong>
                                                    <small>
                                                        {formatFileSize(
                                                            file.size_bytes,
                                                        )}
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="lpdAttachmentActions">
                                                <button
                                                    type="button"
                                                    className="lpdIconBtn"
                                                    onClick={() =>
                                                        handleOpenLampiran(file)
                                                    }
                                                >
                                                    <FiEye />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="lpdIconBtn"
                                                    onClick={() =>
                                                        handleDownloadLampiran(
                                                            file,
                                                        )
                                                    }
                                                >
                                                    <FiDownload />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="lpdNoAttachment">
                                    Tidak ada lampiran pada laporan ini.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="lpvWrap">
            <SuccessToast
                title={toastSuccess.title}
                message={toastSuccess.message}
                onClose={() =>
                    setToastSuccess({ title: "Berhasil", message: "" })
                }
            />
            <RejectToast
                message={toastReject}
                onClose={() => setToastReject("")}
            />
            {selectedReport ? (
                renderDetailPage()
            ) : (
                <>
                    {renderStats()}
                    {renderToolbar()}
                    {tab === "buat" ? (
                        renderForm()
                    ) : tab === "statistik" ? (
                        renderStatistics()
                    ) : (
                        <>
                            {renderSearchBar()}
                            <div className="lpvListWrap">
                                {filteredReports.length ? (
                                    filteredReports.map((report) => (
                                        <ReportListCard
                                            key={report.id_pengaduan}
                                            report={report}
                                            onDetail={handleOpenDetail}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                ) : (
                                    <EmptyState
                                        message={
                                            tab === "riwayat"
                                                ? "Belum ada riwayat laporan selesai."
                                                : "Belum ada laporan aktif."
                                        }
                                    />
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {previewFile ? (
                <div
                    className="lpvPreviewOverlay"
                    onClick={() => setPreviewFile(null)}
                >
                    <div
                        className="lpvPreviewModal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="lpvPreviewHeader">
                            <div>
                                <div className="lpvPreviewTitle">
                                    Preview Lampiran
                                </div>
                                <div className="lpvPreviewSub">
                                    {getAttachmentFileName(previewFile)}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="lpdIconBtn"
                                onClick={() => setPreviewFile(null)}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="lpvPreviewBody">
                            <img
                                src={previewFile.signedUrl}
                                alt={getAttachmentFileName(previewFile)}
                                className="lpvPreviewImage"
                            />
                        </div>
                        <div className="lpvPreviewFooter">
                            <button
                                type="button"
                                className="lpvGhostBtn"
                                onClick={() =>
                                    handleDownloadLampiran(previewFile)
                                }
                            >
                                <FiDownload /> Unduh
                            </button>
                            <button
                                type="button"
                                className="lpvPrimaryBtn"
                                onClick={() => setPreviewFile(null)}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
