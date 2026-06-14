import { MdLocationSearching } from "react-icons/md";
import { router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SuccessToast from "../../components/ui/SuccessToast";
import {
    FiFileText,
    FiUpload,
    FiX,
    FiEye,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiMapPin,
    FiInfo,
    FiSearch,
    FiSave,
} from "react-icons/fi";
import "../../../css/Paralegal/kelolaPosbankum.css";

const DOC_STATUS_PROCESS = "menunggu";
const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const SAPRAS_PREVIEW_LIMIT = 8;
const LEAFLET_CSS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
];
const LEAFLET_JS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];
const LEAFLET_ICON_URLS = {
    iconRetina:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    icon: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadow: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
};

const DOC_TYPES = [
    { key: "sk_posbankum", title: "SK Posbankum", theme: "green" },
    { key: "sk_kadarkum", title: "SK Kadarkum", theme: "orange" },
    { key: "sarpras", title: "Dokumentasi Sapras", theme: "orange" },
];

function formatDateID(iso) {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return "-";
    }
}

function normStatus(s) {
    return String(s || "")
        .trim()
        .toLowerCase();
}

function statusKind(s) {
    const v = normStatus(s);
    if (!v) return "none";
    if (["diterima", "disetujui", "approved", "valid"].includes(v)) return "ok";
    if (["ditolak", "rejected", "tolak"].includes(v)) return "bad";
    if (
        [
            "menunggu",
            "pending",
            "review",
            "proses",
            "diproses",
            "verifikasi",
        ].includes(v)
    ) {
        return "wait";
    }
    return "wait";
}

function statusLabelFromKind(k) {
    if (k === "ok") return "Diterima";
    if (k === "bad") return "Ditolak";
    if (k === "wait") return "Proses";
    return "Belum";
}

function getRejectNote(row) {
    const note =
        row?.catatan_admin ??
        row?.catatan_penolakan ??
        row?.alasan_penolakan ??
        row?.catatan ??
        row?.keterangan ??
        row?.note ??
        "";

    return String(note || "").trim();
}

function buildOsmEmbed(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
    const d = 0.008;
    const left = lo - d;
    const right = lo + d;
    const top = la + d;
    const bottom = la - d;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
        `${left},${bottom},${right},${top}`,
    )}&layer=mapnik&marker=${encodeURIComponent(`${la},${lo}`)}`;
}

function buildPdfPreviewUrl(url) {
    if (!url) return "";
    return `${url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}

function ensureLeaflet() {
    if (window.L?.map) {
        return Promise.resolve(window.L);
    }

    const loadStylesheet = (id, urls) =>
        new Promise((resolve, reject) => {
            const existing = document.getElementById(id);
            if (existing?.dataset?.loaded === "true") {
                resolve();
                return;
            }

            let index = 0;
            const tryLoad = () => {
                const href = urls[index];
                if (!href) {
                    reject(new Error("Leaflet CSS gagal dimuat."));
                    return;
                }

                const link = existing || document.createElement("link");
                link.id = id;
                link.rel = "stylesheet";
                link.href = href;
                link.dataset.loaded = "false";

                link.onload = () => {
                    link.dataset.loaded = "true";
                    resolve();
                };

                link.onerror = () => {
                    index += 1;
                    if (index < urls.length) {
                        link.href = urls[index];
                    } else {
                        reject(new Error("Leaflet CSS gagal dimuat."));
                    }
                };

                if (!existing && !document.getElementById(id)) {
                    document.head.appendChild(link);
                }
            };

            tryLoad();
        });

    const loadScript = (id, urls) =>
        new Promise((resolve, reject) => {
            if (window.L?.map) {
                resolve(window.L);
                return;
            }

            const existing = document.getElementById(id);
            if (existing?.dataset?.loaded === "true" && window.L?.map) {
                resolve(window.L);
                return;
            }

            let index = 0;
            const tryLoad = () => {
                const src = urls[index];
                if (!src) {
                    reject(new Error("Leaflet JS gagal dimuat."));
                    return;
                }

                const script = existing || document.createElement("script");
                script.id = id;
                script.async = true;
                script.src = src;
                script.dataset.loaded = "false";

                script.onload = () => {
                    script.dataset.loaded = "true";
                    resolve(window.L);
                };

                script.onerror = () => {
                    index += 1;
                    if (index < urls.length) {
                        script.src = urls[index];
                    } else {
                        reject(new Error("Leaflet JS gagal dimuat."));
                    }
                };

                if (!existing && !document.getElementById(id)) {
                    document.body.appendChild(script);
                }
            };

            tryLoad();
        });

    return loadStylesheet("leaflet-css", LEAFLET_CSS_URLS)
        .then(() => loadScript("leaflet-js", LEAFLET_JS_URLS))
        .then((L) => {
            if (!L?.map) {
                throw new Error("Leaflet tidak tersedia.");
            }

            if (L.Icon?.Default) {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: LEAFLET_ICON_URLS.iconRetina,
                    iconUrl: LEAFLET_ICON_URLS.icon,
                    shadowUrl: LEAFLET_ICON_URLS.shadow,
                });
            }

            return L;
        });
}

function getLocationStatusRaw(row, hasCoords) {
    if (!row) return hasCoords ? "proses" : "";

    const raw =
        row.status_lokasi ??
        row.status_tagging ??
        row.status_tagging_area ??
        row.status_verifikasi_lokasi ??
        row.status_verifikasi_tagging_area ??
        row.status_verifikasi_tagging ??
        row.verification_status_location ??
        row.status ??
        "";

    if (raw) return raw;
    return hasCoords ? "proses" : "";
}

function isSaprasCategory(kategori) {
    return String(kategori || "").toLowerCase() === "sarpras";
}

function buildGoogleMapsLink(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}`;
}

function normalizeAddressChunk(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
        .trim();
}

function stripKnownAddressPrefix(value) {
    return normalizeAddressChunk(value)
        .replace(/^(kelurahan|kel\.?|desa|kampung)\s+/i, "")
        .replace(/^(kecamatan|kec\.?)\s+/i, "")
        .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
        .trim();
}

function uniqAddressParts(parts) {
    const seen = new Set();
    const result = [];

    for (const part of parts) {
        const clean = normalizeAddressChunk(part);
        const key = stripKnownAddressPrefix(clean).toLowerCase();
        if (!clean || !key || seen.has(key)) continue;
        seen.add(key);
        result.push(clean);
    }

    return result;
}

function formatKelurahan(part) {
    const clean = normalizeAddressChunk(part);
    if (!clean) return "";
    if (/^(kelurahan|kel\.)\s+/i.test(clean)) {
        return clean.replace(/^kel\.?\s+/i, "Kelurahan ");
    }
    if (/^(desa|kampung)\s+/i.test(clean)) return clean;
    return `Kelurahan ${stripKnownAddressPrefix(clean)}`;
}

function formatKecamatan(part) {
    const clean = normalizeAddressChunk(part);
    if (!clean) return "";
    return `Kec. ${stripKnownAddressPrefix(clean)}`;
}

function formatKota(part) {
    const clean = normalizeAddressChunk(part);
    if (!clean) return "";
    if (/^kabupaten\s+/i.test(clean) || /^kab\.?\s+/i.test(clean)) {
        return `Kabupaten ${stripKnownAddressPrefix(clean)}`;
    }
    return `Kota ${stripKnownAddressPrefix(clean)}`;
}

function simplifyLocationAddress(rawAddress) {
    const raw = String(rawAddress || "").trim();
    if (!raw) return "";

    const ignored =
        /^(indonesia|sumatra|sumatera|riau|pulau sumatra|pulau sumatera)$/i;
    const parts = uniqAddressParts(
        raw
            .split(",")
            .map((item) => normalizeAddressChunk(item))
            .filter(
                (item) =>
                    item && !ignored.test(item) && !/^\d{5,6}$/.test(item),
            ),
    );

    if (!parts.length) return raw;

    let kelurahanIndex = parts.findIndex((part) =>
        /^(kelurahan|kel\.?|desa|kampung)\s+/i.test(part),
    );

    let kotaIndex = parts.findIndex((part) =>
        /^(kota|kabupaten|kab\.?)\s+/i.test(part),
    );
    if (kotaIndex < 0) {
        kotaIndex = parts.findIndex((part) => /pekanbaru/i.test(part));
    }

    if (kelurahanIndex < 0) {
        kelurahanIndex = parts.findIndex((part) => /air hitam/i.test(part));
    }

    const kelurahanPart = kelurahanIndex >= 0 ? parts[kelurahanIndex] : "";
    const kotaPart = kotaIndex >= 0 ? parts[kotaIndex] : "";

    let kecamatanPart = "";
    const explicitKecIndex = parts.findIndex((part) =>
        /^(kecamatan|kec\.?)\s+/i.test(part),
    );
    if (explicitKecIndex >= 0) {
        kecamatanPart = parts[explicitKecIndex];
    } else if (kelurahanIndex >= 0) {
        const afterKel = parts
            .slice(kelurahanIndex + 1, kotaIndex >= 0 ? kotaIndex : undefined)
            .find((part) => {
                const clean = stripKnownAddressPrefix(part).toLowerCase();
                if (!clean) return false;
                if (
                    clean ===
                    stripKnownAddressPrefix(kelurahanPart).toLowerCase()
                )
                    return false;
                if (
                    kotaPart &&
                    clean === stripKnownAddressPrefix(kotaPart).toLowerCase()
                )
                    return false;
                return true;
            });
        kecamatanPart = afterKel || "";
    }

    if (!kecamatanPart && kotaIndex > 0) {
        kecamatanPart = parts
            .slice(0, kotaIndex)
            .reverse()
            .find((part) => {
                const clean = stripKnownAddressPrefix(part).toLowerCase();
                return (
                    clean &&
                    clean !==
                        stripKnownAddressPrefix(kelurahanPart).toLowerCase() &&
                    clean !== stripKnownAddressPrefix(kotaPart).toLowerCase()
                );
            });
    }

    const result = [
        kelurahanPart ? formatKelurahan(kelurahanPart) : "",
        kecamatanPart ? formatKecamatan(kecamatanPart) : "",
        kotaPart ? formatKota(kotaPart) : "",
    ].filter(Boolean);

    if (result.length >= 2) return result.join(", ");

    return parts.slice(0, 3).join(", ");
}

function normalizeStorageUrl(raw) {
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

function buildPreviewItem(row, signedUrl, fallbackName = "") {
    return {
        id:
            row?.id_data ||
            row?.id ||
            `${row?.kategori || "item"}-${row?.path_berkas || fallbackName}`,
        row,
        signedUrl:
            signedUrl ||
            normalizeStorageUrl(
                row?.url ||
                    row?.public_url ||
                    row?.path_berkas ||
                    row?.path_file,
            ),
        mime_type: row?.mime_type || "",
        nama_berkas:
            row?.nama_berkas || row?.nama_file || fallbackName || "Dokumen",
        path_berkas: row?.path_berkas || row?.path_file || "",
        tgl_upload: row?.tgl_upload || row?.created_at || "",
    };
}

function isImageMime(mimeType, name = "") {
    const mime = String(mimeType || "").toLowerCase();
    const filename = String(name || "").toLowerCase();
    return (
        mime.startsWith("image/") ||
        filename.endsWith(".png") ||
        filename.endsWith(".jpg") ||
        filename.endsWith(".jpeg")
    );
}

function validateOneFile(file) {
    if (!file) return "Pilih file dulu.";

    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    const allowedByMime = ALLOWED_MIME.has(mime);
    const allowedByExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

    if (!allowedByMime && !allowedByExt) {
        return "Format file harus PDF/JPG/PNG.";
    }

    if (file.size > MAX_FILE) return "Ukuran maksimal 5MB.";
    return "";
}

function collectValidFiles(files, multiple) {
    const normalized = Array.from(files || []).filter(Boolean);
    const picked = multiple ? normalized : normalized.slice(0, 1);

    if (!picked.length) {
        return { files: [], error: "Pilih file dulu." };
    }

    for (const file of picked) {
        const msg = validateOneFile(file);
        if (msg) {
            return { files: [], error: `${file.name}: ${msg}` };
        }
    }

    return { files: picked, error: "" };
}

function sortRowsForDetail(rows = []) {
    return [...rows].sort((a, b) => {
        const timeA =
            new Date(a?.tgl_upload || a?.created_at || 0).getTime() || 0;
        const timeB =
            new Date(b?.tgl_upload || b?.created_at || 0).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;

        const nameA = String(
            a?.nama_berkas || a?.path_berkas || a?.id_data || "",
        );
        const nameB = String(
            b?.nama_berkas || b?.path_berkas || b?.id_data || "",
        );
        return nameA.localeCompare(nameB);
    });
}

function hasApprovedRows(rows = []) {
    return (rows || []).some(
        (row) => statusKind(row?.status_verifikasi || row?.status) === "ok",
    );
}

function pickProtectedLatestRow(rows = []) {
    const sortedRows = sortRowsForDetail(rows || []);
    return (
        sortedRows.find(
            (row) => statusKind(row?.status_verifikasi || row?.status) === "ok",
        ) ||
        sortedRows[0] ||
        null
    );
}

function pickCoordsFromRow(row) {
    if (!row) return { lat: "", lng: "" };

    const lat =
        row.latitude ??
        row.lat ??
        row.latitude_pos ??
        row.lat_pos ??
        row.lattitude ??
        null;

    const lng =
        row.longitude ??
        row.lng ??
        row.long ??
        row.longitude_pos ??
        row.lng_pos ??
        row.long_pos ??
        null;

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { lat: String(lat), lng: String(lng) };
    }

    const koordinat = row.koordinat ?? row.coordinate ?? row.coords ?? "";
    if (typeof koordinat === "string" && koordinat.includes(",")) {
        const [a, b] = koordinat.split(",").map((v) => v.trim());
        if (Number.isFinite(Number(a)) && Number.isFinite(Number(b))) {
            return { lat: a, lng: b };
        }
    }

    return { lat: "", lng: "" };
}

export default function KelolaPosbankum({
    profile = {},
    currentPosbankum = {},
    documents = [],
    location = {},
    flash = {},
}) {
    const posbankumId =
        profile?.id_posbankum ??
        profile?.posbankum_id ??
        currentPosbankum?.id_posbankum ??
        currentPosbankum?.id ??
        null;

    const docTypes = useMemo(() => DOC_TYPES, []);
    const [posRow, setPosRow] = useState(currentPosbankum || null);
    const [posName, setPosName] = useState(
        currentPosbankum?.nama || currentPosbankum?.name || "Posbankum",
    );

    const initialCoords = pickCoordsFromRow({
        ...currentPosbankum,
        ...location,
    });
    const [locSaved, setLocSaved] = useState({
        lat: location?.lat || initialCoords.lat || "",
        lng: location?.lng || initialCoords.lng || "",
        alamat: location?.alamat || currentPosbankum?.alamat || "",
    });
    const [locDraft, setLocDraft] = useState(locSaved);
    const [locDirty, setLocDirty] = useState(false);
    const [savingLoc, setSavingLoc] = useState(false);
    const [locErr, setLocErr] = useState("");

    const [docsLatest, setDocsLatest] = useState({});
    const [docsByCategory, setDocsByCategory] = useState({});
    const [previewUrl, setPreviewUrl] = useState({});
    const [loadingDocs, setLoadingDocs] = useState(false);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadKey, setUploadKey] = useState("");
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedPreviewItems, setSelectedPreviewItems] = useState([]);
    const [existingPreviewItems, setExistingPreviewItems] = useState([]);
    const fileRef = useRef(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailTitle, setDetailTitle] = useState("Preview Dokumen");
    const [detailItems, setDetailItems] = useState([]);
    const [detailIndex, setDetailIndex] = useState(0);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailErr, setDetailErr] = useState("");

    const [successMessage, setSuccessMessage] = useState("");

    const [editLocOpen, setEditLocOpen] = useState(false);
    const [locQuery, setLocQuery] = useState("");
    const mapBoxRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapResizeObserverRef = useRef(null);

    const clearBlobPreviewItems = useCallback((items) => {
        for (const item of items || []) {
            if (item?.isBlob && item?.signedUrl?.startsWith("blob:")) {
                try {
                    URL.revokeObjectURL(item.signedUrl);
                } catch {}
            }
        }
    }, []);

    const destroyMap = useCallback(() => {
        if (mapResizeObserverRef.current) {
            try {
                mapResizeObserverRef.current.disconnect();
            } catch {}
            mapResizeObserverRef.current = null;
        }

        if (mapRef.current) {
            try {
                mapRef.current.off();
                mapRef.current.remove();
            } catch {}
            mapRef.current = null;
        }

        markerRef.current = null;

        if (mapBoxRef.current) {
            mapBoxRef.current.innerHTML = "";
        }
    }, []);

    useEffect(() => {
        return () => {
            clearBlobPreviewItems(selectedPreviewItems);
        };
    }, [selectedPreviewItems, clearBlobPreviewItems]);

    useEffect(() => {
        const nextPos = currentPosbankum || {};
        setPosRow(nextPos);
        setPosName(nextPos?.nama || nextPos?.name || "Posbankum");

        const coords = pickCoordsFromRow({ ...nextPos, ...location });
        const nextLocation = {
            lat: location?.lat || coords.lat || "",
            lng: location?.lng || coords.lng || "",
            alamat: simplifyLocationAddress(
                location?.alamat || nextPos?.alamat || "",
            ),
        };

        setLocSaved(nextLocation);
        if (!editLocOpen) {
            setLocDraft(nextLocation);
            setLocDirty(false);
        }
    }, [currentPosbankum, location, editLocOpen]);

    useEffect(() => {
        const grouped = {};
        for (const row of documents || []) {
            const key = String(
                row?.kategori || row?.jenis_dokumen || "",
            ).toLowerCase();
            if (!key) continue;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        }

        Object.keys(grouped).forEach((kategori) => {
            grouped[kategori] = sortRowsForDetail(grouped[kategori]);
        });

        const latest = {};
        const nextPreview = {};
        for (const item of docTypes) {
            latest[item.key] = pickProtectedLatestRow(grouped[item.key] || []);
            const row = latest[item.key];
            const url = normalizeStorageUrl(
                row?.url ||
                    row?.public_url ||
                    row?.path_berkas ||
                    row?.path_file,
            );
            if (url) nextPreview[item.key] = url;
        }

        setDocsByCategory(grouped);
        setDocsLatest(latest);
        setPreviewUrl(nextPreview);
        setLoadingDocs(false);
    }, [documents, docTypes]);

    useEffect(() => {
        /*
         * Jangan langsung menampilkan flash success saat halaman baru dibuka.
         * Pesan sukses dari session Laravel/Inertia kadang masih tersisa dari aksi sebelumnya,
         * sehingga toast bisa muncul sendiri saat user hanya masuk ke menu.
         * Notifikasi sukses untuk aksi di halaman ini tetap ditampilkan lewat onSuccess router.
         */
    }, [flash?.success]);

    const hasSavedCoords =
        Number.isFinite(Number(locSaved.lat)) &&
        Number.isFinite(Number(locSaved.lng));

    const locationKind = useMemo(() => {
        return statusKind(
            getLocationStatusRaw({ ...posRow, ...location }, hasSavedCoords),
        );
    }, [posRow, location, hasSavedCoords]);

    const locationLabel = statusLabelFromKind(locationKind);

    const stats = useMemo(() => {
        const total = 4;
        let ok = 0;
        let wait = 0;
        let bad = 0;
        let none = 0;

        for (const item of docTypes) {
            const row = docsLatest[item.key];
            const kind = row
                ? statusKind(row.status_verifikasi || row.status)
                : "none";
            if (kind === "ok") ok += 1;
            else if (kind === "wait") wait += 1;
            else if (kind === "bad") bad += 1;
            else none += 1;
        }

        if (hasSavedCoords) {
            if (locationKind === "ok") ok += 1;
            else if (locationKind === "bad") bad += 1;
            else wait += 1;
        } else {
            none += 1;
        }

        return { total, ok, wait, bad, none };
    }, [docTypes, docsLatest, hasSavedCoords, locationKind]);

    const moveMarker = useCallback((lat, lng, zoom = 16) => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;

        const la = Number(lat);
        const lo = Number(lng);
        if (!Number.isFinite(la) || !Number.isFinite(lo)) return;

        map.setView([la, lo], zoom);

        if (markerRef.current) {
            markerRef.current.setLatLng([la, lo]);
            markerRef.current.setOpacity(1);
        } else {
            markerRef.current = L.marker([la, lo], {
                draggable: true,
            }).addTo(map);
        }
    }, []);

    const reverseGeocode = useCallback(async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
                    lat,
                )}&lon=${encodeURIComponent(lng)}`,
                {
                    headers: {
                        "Accept-Language": "id-ID",
                    },
                },
            );
            const json = await res.json();
            return simplifyLocationAddress(json?.display_name || "");
        } catch {
            return "";
        }
    }, []);

    const applyPickedLocation = useCallback(
        async (lat, lng, withReverse = true) => {
            const fixedLat = Number(lat).toFixed(6);
            const fixedLng = Number(lng).toFixed(6);

            moveMarker(fixedLat, fixedLng, 16);
            setLocDraft((prev) => ({
                ...prev,
                lat: fixedLat,
                lng: fixedLng,
            }));
            setLocDirty(true);
            setLocErr("");

            if (withReverse) {
                const alamat = await reverseGeocode(fixedLat, fixedLng);
                if (alamat) {
                    setLocDraft((prev) => ({
                        ...prev,
                        lat: fixedLat,
                        lng: fixedLng,
                        alamat,
                    }));
                }
            }
        },
        [moveMarker, reverseGeocode],
    );

    useEffect(() => {
        if (!editLocOpen) return;

        let cancelled = false;
        let bootstrapTimer = null;

        const waitForMapBox = async () => {
            let attempts = 0;
            while (!cancelled && attempts < 40) {
                const box = mapBoxRef.current;
                if (box && box.clientWidth > 0 && box.clientHeight > 0) {
                    return box;
                }
                attempts += 1;
                await new Promise((resolve) => setTimeout(resolve, 80));
            }
            return mapBoxRef.current;
        };

        const initMap = async () => {
            try {
                setLocErr("");
                destroyMap();

                const box = await waitForMapBox();
                if (cancelled || !box) return;

                const L = await ensureLeaflet();
                if (cancelled || !mapBoxRef.current) return;

                const lat = Number(locDraft.lat || locSaved.lat);
                const lng = Number(locDraft.lng || locSaved.lng);
                const hasCoord = Number.isFinite(lat) && Number.isFinite(lng);

                const startLat = hasCoord ? lat : 0.5071;
                const startLng = hasCoord ? lng : 101.4478;
                const startZoom = hasCoord ? 16 : 11;

                const map = L.map(mapBoxRef.current, {
                    zoomControl: true,
                    scrollWheelZoom: true,
                    dragging: true,
                    tap: true,
                    doubleClickZoom: true,
                    boxZoom: true,
                    keyboard: true,
                    preferCanvas: true,
                }).setView([startLat, startLng], startZoom);

                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        maxZoom: 19,
                        attribution: "© OpenStreetMap",
                        crossOrigin: true,
                    },
                ).addTo(map);

                const marker = L.marker([startLat, startLng], {
                    draggable: true,
                }).addTo(map);

                marker.on("dragend", async (e) => {
                    const pos = e.target.getLatLng();
                    await applyPickedLocation(pos.lat, pos.lng, true);
                });

                map.on("click", async (e) => {
                    await applyPickedLocation(e.latlng.lat, e.latlng.lng, true);
                });

                markerRef.current = marker;
                mapRef.current = map;

                if (!hasCoord) {
                    marker.setOpacity(0.9);
                }

                if (
                    typeof ResizeObserver !== "undefined" &&
                    mapBoxRef.current
                ) {
                    const observer = new ResizeObserver(() => {
                        try {
                            map.invalidateSize(true);
                        } catch {}
                    });
                    observer.observe(mapBoxRef.current);
                    mapResizeObserverRef.current = observer;
                }

                map.whenReady(() => {
                    requestAnimationFrame(() => {
                        try {
                            map.invalidateSize(true);
                        } catch {}
                    });

                    setTimeout(() => {
                        try {
                            map.invalidateSize(true);
                        } catch {}
                    }, 150);

                    setTimeout(() => {
                        try {
                            map.invalidateSize(true);
                        } catch {}
                    }, 400);

                    setTimeout(() => {
                        try {
                            map.invalidateSize(true);
                        } catch {}
                    }, 900);
                });
            } catch (e) {
                console.warn("init map:", e);
                setLocErr("Peta gagal dimuat.");
            }
        };

        bootstrapTimer = setTimeout(initMap, 30);

        return () => {
            cancelled = true;
            if (bootstrapTimer) clearTimeout(bootstrapTimer);
            destroyMap();
        };
    }, [
        editLocOpen,
        locSaved.lat,
        locSaved.lng,
        locDraft.lat,
        locDraft.lng,
        applyPickedLocation,
        destroyMap,
    ]);

    const searchLocation = async () => {
        const q = locQuery.trim();

        if (!q) {
            setLocErr("Masukkan nama lokasi terlebih dahulu.");
            return;
        }

        setLocErr("");

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
                    q,
                )}&limit=1`,
                {
                    headers: {
                        "Accept-Language": "id-ID",
                    },
                },
            );

            if (!res.ok) {
                setLocErr(
                    "Pencarian lokasi gagal. Periksa koneksi lalu coba lagi.",
                );
                return;
            }

            const json = await res.json();
            const hit = Array.isArray(json) ? json[0] : null;
            if (!hit) {
                setLocErr(
                    "Lokasi tidak ditemukan. Periksa ejaan atau gunakan kata kunci lain.",
                );
                return;
            }

            const lat = Number(hit.lat);
            const lng = Number(hit.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setLocErr(
                    "Koordinat lokasi tidak valid. Periksa input lokasi lalu coba lagi.",
                );
                return;
            }

            setLocDraft((prev) => ({
                ...prev,
                lat: lat.toFixed(6),
                lng: lng.toFixed(6),
                alamat: simplifyLocationAddress(
                    hit.display_name || prev.alamat,
                ),
            }));
            setLocDirty(true);
            setLocErr("");

            setTimeout(() => {
                moveMarker(lat, lng, 16);
            }, 120);
        } catch {
            setLocErr(
                "Pencarian lokasi gagal. Periksa koneksi lalu coba lagi.",
            );
        }
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setLocErr("Browser tidak mendukung geolocation.");
            return;
        }

        setLocErr("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = Number(position.coords.latitude).toFixed(6);
                const lng = Number(position.coords.longitude).toFixed(6);

                setLocDraft((prev) => ({
                    ...prev,
                    lat,
                    lng,
                }));
                setLocDirty(true);
                setLocErr("");

                setTimeout(() => {
                    moveMarker(lat, lng, 16);
                }, 120);

                const alamat = await reverseGeocode(lat, lng);
                if (alamat) {
                    setLocDraft((prev) => ({
                        ...prev,
                        lat,
                        lng,
                        alamat,
                    }));
                }
            },
            () => {
                setLocErr("Gagal mengambil lokasi saat ini.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            },
        );
    };

    const saveLocation = async () => {
        if (!posbankumId) return;

        if (locationKind === "ok") {
            setLocErr("Tagging Area yang sudah diterima tidak dapat diubah.");
            return;
        }

        const latNum = Number(locDraft.lat);
        const lngNum = Number(locDraft.lng);

        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            setLocErr("Latitude dan longitude harus valid.");
            return;
        }

        setSavingLoc(true);
        setLocErr("");

        router.patch(
            "/paralegal/kelola-posbankum/lokasi",
            {
                lat: locDraft.lat,
                lng: locDraft.lng,
                alamat: simplifyLocationAddress(locDraft.alamat),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    const savedAddress = simplifyLocationAddress(
                        locDraft.alamat,
                    );
                    setLocSaved({ ...locDraft, alamat: savedAddress });
                    setLocDirty(false);
                    setEditLocOpen(false);
                    setSuccessMessage("Lokasi Posbankum berhasil disimpan!");
                },
                onError: (errors) => {
                    const first = Object.values(errors || {})[0];
                    setLocErr(first || "Gagal menyimpan lokasi.");
                },
                onFinish: () => setSavingLoc(false),
            },
        );
    };

    const getDocToneClass = (kind) => {
        if (kind === "ok") return "doc-ok";
        if (kind === "bad") return "doc-bad";
        if (kind === "wait") return "doc-wait";
        return "doc-none";
    };

    const renderCardPreview = (item, row) => {
        const url =
            previewUrl[item.key] ||
            normalizeStorageUrl(
                row?.url ||
                    row?.public_url ||
                    row?.path_berkas ||
                    row?.path_file,
            );
        const mime = String(row?.mime_type || "");
        const isSapras = item.key === "sarpras";

        if (!row || !url) {
            return <div className="kpPreviewPh" />;
        }

        if (isImageMime(mime, row?.nama_berkas || row?.path_berkas)) {
            return (
                <img
                    className={`kpPreviewImg ${isSapras ? "is-sapras" : ""}`}
                    src={url}
                    alt={item.title}
                />
            );
        }

        if (
            mime === "application/pdf" ||
            String(row?.nama_berkas || row?.path_berkas || "")
                .toLowerCase()
                .endsWith(".pdf")
        ) {
            return (
                <iframe
                    className="kpPreviewPdf"
                    title={`Preview ${item.title}`}
                    src={buildPdfPreviewUrl(url)}
                />
            );
        }

        return <div className="kpPreviewPh" />;
    };

    const renderSaprasGrid = (items, removable = false) => {
        if (!items.length) return null;

        return (
            <div className="kpSaprasGridWrap">
                <div className="kpSaprasGridHead">
                    <div className="kpSaprasGridCount">{items.length} File</div>
                    {removable ? (
                        <button
                            type="button"
                            className="kpSaprasResetBtn"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearBlobPreviewItems(selectedPreviewItems);
                                setSelectedFiles([]);
                                setSelectedPreviewItems([]);
                                setUploadErr("");
                                if (fileRef.current) fileRef.current.value = "";
                            }}
                        >
                            Reset Pilihan
                        </button>
                    ) : null}
                </div>

                <div className="kpSaprasGrid">
                    {items.map((item, index) => (
                        <div
                            className="kpSaprasTile"
                            key={`${item.id}-${index}`}
                        >
                            {isImageMime(item.mime_type, item.nama_berkas) ? (
                                <img
                                    className="kpSaprasTileImg"
                                    src={item.signedUrl}
                                    alt={item.nama_berkas}
                                />
                            ) : (
                                <div className="kpSaprasTilePdf">
                                    <div className="kpSaprasTilePdfLabel">
                                        PDF
                                    </div>
                                    <div className="kpSaprasTilePdfName">
                                        {item.nama_berkas}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderUploadPreview = () => {
        const activeSelected = selectedPreviewItems;
        const activeExisting = existingPreviewItems;
        const isSapras = isSaprasCategory(uploadKey);

        if (!activeSelected.length && !activeExisting.length) {
            return (
                <div className="kpDropEmpty">
                    <div className="kpDropIcon">
                        <FiUpload />
                    </div>
                    <div className="kpDropText">
                        <div className="kpDropMain">Klik untuk pilih file</div>
                        <div className="kpDropSub">
                            atau drag &amp; drop file di sini
                        </div>
                    </div>
                </div>
            );
        }

        if (isSapras) {
            return renderSaprasGrid(
                activeSelected.length ? activeSelected : activeExisting,
                activeSelected.length > 0,
            );
        }

        const current = activeSelected[0] || activeExisting[0];
        if (!current) return null;

        if (isImageMime(current.mime_type, current.nama_berkas)) {
            return (
                <div className="kpUploadPreviewWrap">
                    <img
                        className="kpUploadPreviewImg"
                        src={current.signedUrl}
                        alt="Preview upload"
                    />
                    {activeSelected.length ? (
                        <button
                            type="button"
                            className="kpUploadRemove"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearBlobPreviewItems(selectedPreviewItems);
                                setSelectedFiles([]);
                                setSelectedPreviewItems([]);
                                setUploadErr("");
                                if (fileRef.current) fileRef.current.value = "";
                            }}
                        >
                            <FiX />
                        </button>
                    ) : null}
                </div>
            );
        }

        if (
            current.mime_type === "application/pdf" ||
            String(current.nama_berkas || "")
                .toLowerCase()
                .endsWith(".pdf")
        ) {
            return (
                <div className="kpUploadPdfWrap">
                    <iframe
                        className="kpUploadPdfFrame"
                        title="Preview PDF Upload"
                        src={buildPdfPreviewUrl(current.signedUrl)}
                    />
                    <div className="kpDropSub kpPdfName">
                        {current.nama_berkas || "Upload Terbaru"}
                    </div>
                </div>
            );
        }

        return null;
    };

    const currentDetailItem = useMemo(
        () => detailItems[detailIndex] || null,
        [detailItems, detailIndex],
    );
    const saprasCount = (docsByCategory.sarpras || []).length;
    const mapPreviewLink = buildGoogleMapsLink(
        locDraft.lat || locSaved.lat,
        locDraft.lng || locSaved.lng,
    );

    const handlePrevDetail = useCallback(() => {
        setDetailIndex((prev) => Math.max(0, prev - 1));
    }, []);

    const handleNextDetail = useCallback(() => {
        setDetailIndex((prev) => Math.min(detailItems.length - 1, prev + 1));
    }, [detailItems.length]);

    useEffect(() => {
        if (!detailItems.length) {
            if (detailIndex !== 0) setDetailIndex(0);
            return;
        }

        if (detailIndex > detailItems.length - 1) {
            setDetailIndex(detailItems.length - 1);
        }
    }, [detailItems, detailIndex]);

    const openUpload = async (kategori) => {
        const found = docTypes.find((x) => x.key === kategori);
        const rows = docsByCategory[kategori] || [];
        const isSapras = isSaprasCategory(kategori);

        if (hasApprovedRows(rows)) {
            setSuccessMessage(
                "Dokumen yang sudah diterima tidak dapat diganti.",
            );
            return;
        }

        clearBlobPreviewItems(selectedPreviewItems);

        setUploadKey(kategori);
        setUploadTitle(
            found?.title
                ? `Upload ${found.title}`
                : "Upload Dokumentasi Sapras",
        );
        setSelectedFiles([]);
        setSelectedPreviewItems([]);
        setExistingPreviewItems([]);
        setUploadErr("");
        setUploadOpen(true);

        if (!rows.length) return;

        const previewRows = isSapras
            ? rows.slice(0, SAPRAS_PREVIEW_LIMIT)
            : rows.slice(0, 1);

        setExistingPreviewItems(
            previewRows
                .map((row) => buildPreviewItem(row))
                .filter((item) => item.signedUrl),
        );
    };

    const closeUpload = () => {
        if (uploading) return;

        clearBlobPreviewItems(selectedPreviewItems);

        setUploadOpen(false);
        setUploadKey("");
        setUploadTitle("");
        setUploadErr("");
        setSelectedFiles([]);
        setSelectedPreviewItems([]);
        setExistingPreviewItems([]);
        if (fileRef.current) fileRef.current.value = "";
    };

    const pickFile = () => fileRef.current?.click();

    const setPreviewFromFiles = useCallback(
        (files) => {
            clearBlobPreviewItems(selectedPreviewItems);
            const nextItems = files.map((file, index) =>
                buildPreviewItem(
                    {
                        id_data: `${file.name}-${index}-${file.lastModified || Date.now()}`,
                        mime_type: file.type,
                        nama_berkas: file.name,
                    },
                    URL.createObjectURL(file),
                    file.name,
                ),
            );

            for (const item of nextItems) {
                item.isBlob = true;
            }

            setSelectedPreviewItems(nextItems);
        },
        [selectedPreviewItems, clearBlobPreviewItems],
    );

    const applySelectedFiles = useCallback(
        (incomingFiles) => {
            const multiple = isSaprasCategory(uploadKey);
            const { files, error } = collectValidFiles(incomingFiles, multiple);
            if (error) {
                setUploadErr(error);
                if (fileRef.current) fileRef.current.value = "";
                return;
            }

            setUploadErr("");
            setSelectedFiles(files);
            setPreviewFromFiles(files);
        },
        [uploadKey, setPreviewFromFiles],
    );

    const onFileChange = (e) => {
        applySelectedFiles(e.target.files || []);
    };

    const onDrop = (e) => {
        e.preventDefault();
        if (uploading) return;
        applySelectedFiles(e.dataTransfer?.files || []);
    };

    const doUpload = async () => {
        if (!posbankumId) return setUploadErr("id_posbankum tidak ditemukan.");
        if (!uploadKey) return setUploadErr("Kategori dokumen tidak valid.");
        if (uploadKey === "tagging_area")
            return setUploadErr(
                "Tagging Area tidak diganti lewat upload dokumen.",
            );
        if (!selectedFiles.length) return setUploadErr("Pilih file dulu.");

        const existingRows = docsByCategory[uploadKey] || [];
        const latestRow = docsLatest[uploadKey] || null;

        if (
            hasApprovedRows(existingRows) ||
            (latestRow &&
                statusKind(latestRow.status_verifikasi || latestRow.status) ===
                    "ok")
        ) {
            return setUploadErr(
                "Dokumen yang sudah diterima tidak dapat diganti.",
            );
        }

        setUploading(true);
        setUploadErr("");

        const payload = new FormData();
        payload.append("kategori", uploadKey);
        if (selectedFiles.length === 1) {
            payload.append("dokumen", selectedFiles[0]);
        } else {
            selectedFiles.forEach((file) => {
                payload.append("dokumen[]", file);
            });
        }

        router.post("/paralegal/kelola-posbankum/dokumen", payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                closeUpload();
                setSuccessMessage(
                    "Dokumen berhasil dikirim untuk verifikasi admin.",
                );
            },
            onError: (errors) => {
                const first = Object.values(errors || {})[0];
                setUploadErr(first || "Gagal mengunggah dokumen.");
            },
            onFinish: () => setUploading(false),
        });
    };

    const openDetail = async (row, title) => {
        if (!row) return;

        setDetailOpen(true);
        setDetailTitle(title || "Preview Dokumen");
        setDetailLoading(true);
        setDetailErr("");
        setDetailItems([]);
        setDetailIndex(0);

        try {
            const kategori = row.kategori || row.jenis_dokumen || "";
            const rows = kategori ? docsByCategory[kategori] || [row] : [row];
            const items = sortRowsForDetail(rows)
                .map((item) => buildPreviewItem(item))
                .filter((item) => item.signedUrl);

            const currentIndex = Math.max(
                0,
                items.findIndex(
                    (item) =>
                        String(item.row?.id_data || item.row?.id) ===
                        String(row.id_data || row.id),
                ),
            );

            setDetailItems(
                items.length
                    ? items
                    : [buildPreviewItem(row)].filter((item) => item.signedUrl),
            );
            setDetailIndex(currentIndex === -1 ? 0 : currentIndex);
        } catch (e) {
            setDetailErr(e?.message || "Gagal memuat dokumen.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailTitle("Preview Dokumen");
        setDetailItems([]);
        setDetailIndex(0);
        setDetailErr("");
        setDetailLoading(false);
    };

    if (!posbankumId) {
        return (
            <section className="kpRoot kdpRoot">
                <div className="kpBox kpError">
                    <b>Profile belum lengkap</b>
                    <div className="kpMuted" style={{ marginTop: 6 }}>
                        id_posbankum tidak ada pada profile user ini.
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="kpRoot kdpRoot">
            <SuccessToast
                message={successMessage}
                onClose={() => setSuccessMessage("")}
            />

            <div className="kpPageHead">
                <div>
                    <div className="kpTitle">Kelola Data Posbankum</div>
                    <div className="kpTitleUnderline" />
                </div>
            </div>

            <div className="kpStats">
                <div className="kpStatCard stat-total">
                    <div className="kpStatIcon is-stat">
                        <FiFileText />
                    </div>
                    <div className="kpStatText">
                        <div className="kpStatLabel">Total</div>
                        <div className="kpStatValue">{stats.total}</div>
                    </div>
                </div>

                <div className="kpStatCard stat-ok">
                    <div className="kpStatIcon is-stat">
                        <FiCheckCircle />
                    </div>
                    <div className="kpStatText">
                        <div className="kpStatLabel">Diterima</div>
                        <div className="kpStatValue">{stats.ok}</div>
                    </div>
                </div>

                <div className="kpStatCard stat-wait">
                    <div className="kpStatIcon is-stat">
                        <FiClock />
                    </div>
                    <div className="kpStatText">
                        <div className="kpStatLabel">Proses</div>
                        <div className="kpStatValue">{stats.wait}</div>
                    </div>
                </div>

                <div className="kpStatCard stat-bad">
                    <div className="kpStatIcon is-stat">
                        <FiXCircle />
                    </div>
                    <div className="kpStatText">
                        <div className="kpStatLabel">Ditolak</div>
                        <div className="kpStatValue">{stats.bad}</div>
                    </div>
                </div>

                <div className="kpStatCard stat-none">
                    <div className="kpStatIcon is-stat">
                        <FiUpload />
                    </div>
                    <div className="kpStatText">
                        <div className="kpStatLabel">Belum</div>
                        <div className="kpStatValue">{stats.none}</div>
                    </div>
                </div>
            </div>

            <div className="kpHint">
                <div className="kpHintHead">
                    <div className="kpHintIcon">
                        <FiInfo />
                    </div>
                    <div className="kpHintContent">
                        <div className="kpHintTitle">
                            Petunjuk Kelola Data Posbankum
                        </div>
                        <div className="kpHintText">
                            Lengkapi 4 data wajib: <b>SK Posbankum</b>,{" "}
                            <b>SK Kadarkum</b>, <b>Dokumentasi Sapras</b>{" "}
                            (format PDF/JPG/PNG, max 5MB), dan{" "}
                            <b>Tagging Area</b>. Untuk Tagging Area, atur lokasi
                            melalui peta lalu simpan. Status awal data yang baru
                            disimpan adalah <b>Proses</b> sampai admin
                            mengubahnya menjadi <b>Diterima</b> atau{" "}
                            <b>Ditolak</b>.
                        </div>
                    </div>
                </div>
            </div>

            <div className="kpDocs kpDocsMain">
                {docTypes.map((item) => {
                    const row = docsLatest[item.key];
                    const categoryRows = docsByCategory[item.key] || [];
                    const hasApprovedDocument = hasApprovedRows(categoryRows);
                    const kind = row
                        ? statusKind(row.status_verifikasi || row.status)
                        : "none";
                    const label = statusLabelFromKind(kind);
                    const note = getRejectNote(row);
                    const uploadAt =
                        row?.tgl_upload || row?.created_at
                            ? formatDateID(row?.tgl_upload || row?.created_at)
                            : "-";

                    return (
                        <div
                            className={`kpDocCard ${getDocToneClass(kind)}`}
                            key={item.key}
                        >
                            <div className="kpDocTop">
                                <div className="kpDocTitleWrap">
                                    <div className="kpDocTitle">
                                        {item.title}
                                    </div>
                                    {item.key === "sarpras" &&
                                    saprasCount > 1 ? (
                                        <div className="kpDocCountBadge">
                                            {saprasCount} File
                                        </div>
                                    ) : null}
                                </div>
                                <div
                                    className={[
                                        "kpStatusPill",
                                        kind === "ok"
                                            ? "is-ok"
                                            : kind === "wait"
                                              ? "is-wait"
                                              : kind === "bad"
                                                ? "is-bad"
                                                : "is-none",
                                    ].join(" ")}
                                >
                                    {kind === "ok" ? (
                                        <FiCheckCircle />
                                    ) : kind === "wait" ? (
                                        <FiClock />
                                    ) : kind === "bad" ? (
                                        <FiXCircle />
                                    ) : (
                                        <FiUpload />
                                    )}
                                    <span>{label}</span>
                                </div>
                            </div>

                            <div className="kpDocMeta">
                                Upload: {uploadAt}
                                {item.key === "sarpras" && saprasCount > 0
                                    ? ` • ${saprasCount} File`
                                    : ""}
                            </div>

                            <div className="kpPreview">
                                {renderCardPreview(item, row)}
                            </div>

                            <div className="kpDocActions">
                                <button
                                    className={[
                                        "kpBtnPrimary",
                                        kind === "bad"
                                            ? "is-danger"
                                            : "is-blue",
                                    ].join(" ")}
                                    type="button"
                                    onClick={() => openUpload(item.key)}
                                    disabled={uploading || hasApprovedDocument}
                                    title={
                                        hasApprovedDocument
                                            ? "Dokumen yang sudah diterima tidak dapat diganti"
                                            : "Ganti dokumen"
                                    }
                                >
                                    <FiUpload />
                                    Ganti
                                </button>

                                <button
                                    className="kpBtnIcon"
                                    type="button"
                                    onClick={() =>
                                        row &&
                                        openDetail(
                                            row,
                                            `${item.title} ${posName}`,
                                        )
                                    }
                                    disabled={
                                        !row?.path_berkas &&
                                        !row?.url &&
                                        !row?.public_url
                                    }
                                    title="Lihat"
                                >
                                    <FiEye />
                                </button>
                            </div>

                            {kind === "bad" ? (
                                <div className="kpAdminNote kpAdminNoteBelowAction">
                                    <div className="kpAdminNoteTitle">
                                        <FiInfo />
                                        <span>Alasan Penolakan</span>
                                    </div>
                                    <div className="kpAdminNoteText">
                                        {note ||
                                            "Alasan penolakan belum tersedia. Pastikan admin mengisi catatan penolakan pada data ini."}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                <div
                    className={`kpDocCard kpMapCard ${getDocToneClass(locationKind)}`}
                >
                    <div className="kpDocTop">
                        <div className="kpDocTitle">Tagging Area</div>
                        <div
                            className={[
                                "kpStatusPill",
                                locationKind === "ok"
                                    ? "is-ok"
                                    : locationKind === "wait"
                                      ? "is-wait"
                                      : locationKind === "bad"
                                        ? "is-bad"
                                        : "is-none",
                            ].join(" ")}
                        >
                            {locationKind === "ok" ? (
                                <FiCheckCircle />
                            ) : locationKind === "wait" ? (
                                <FiClock />
                            ) : locationKind === "bad" ? (
                                <FiXCircle />
                            ) : (
                                <FiUpload />
                            )}
                            <span>
                                {hasSavedCoords ? locationLabel : "Belum"}
                            </span>
                        </div>
                    </div>

                    <div className="kpDocMeta">
                        Upload:{" "}
                        {posRow?.updated_at
                            ? formatDateID(posRow.updated_at)
                            : "-"}
                    </div>

                    <div className="kpPreview">
                        <div className="kpLocMap">
                            {hasSavedCoords ? (
                                <div className="kpLocMapPreview">
                                    <iframe
                                        className="kpLocFrame"
                                        title="Tagging Area"
                                        src={buildOsmEmbed(
                                            locSaved.lat,
                                            locSaved.lng,
                                        )}
                                    />
                                    <div
                                        className="kpLocPreviewShield"
                                        aria-hidden="true"
                                    />
                                </div>
                            ) : (
                                <div className="kpLocMapPh">
                                    <FiMapPin />
                                    <span>Lokasi belum diatur</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="kpLocMiniCoords">
                        <FiMapPin />
                        <span>
                            {hasSavedCoords
                                ? `${locSaved.lat}, ${locSaved.lng}`
                                : "-"}
                        </span>
                    </div>

                    <div className="kpDocActions">
                        <button
                            className="kpBtnPrimary is-blue"
                            type="button"
                            onClick={() => {
                                if (locationKind === "ok") {
                                    setSuccessMessage(
                                        "Tagging Area yang sudah diterima tidak dapat diubah.",
                                    );
                                    return;
                                }

                                setLocErr("");
                                setLocQuery("");
                                const rawAlamat = String(
                                    posRow?.alamat || locSaved.alamat || "",
                                );
                                const cleanAlamat =
                                    simplifyLocationAddress(rawAlamat);
                                setLocDraft({
                                    lat: locSaved.lat || "",
                                    lng: locSaved.lng || "",
                                    alamat: cleanAlamat,
                                });
                                setLocDirty(cleanAlamat !== rawAlamat.trim());
                                setEditLocOpen(true);
                            }}
                            disabled={locationKind === "ok"}
                            title={
                                locationKind === "ok"
                                    ? "Tagging Area yang sudah diterima tidak dapat diubah"
                                    : "Atur lokasi"
                            }
                        >
                            <FiMapPin />
                            Atur Lokasi
                        </button>
                    </div>
                </div>
            </div>

            {uploadOpen && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard kpModalUpload">
                        <div className="kpModalHead">
                            <div className="kpModalHeadTitle">
                                {uploadTitle}
                            </div>
                            <button
                                className="kpModalClose"
                                type="button"
                                onClick={closeUpload}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kpModalBody kpModalBodyScroll">
                            <div className="kpRuleBox">
                                <div className="kpRuleTitle">
                                    Ketentuan Upload Dokumen
                                </div>
                                <ul className="kpRuleList">
                                    <li>Format file: PDF, JPG, PNG</li>
                                    <li>Ukuran maksimal: 5MB</li>
                                    <li>
                                        Pastikan dokumen terbaca dengan jelas
                                    </li>
                                    <li>
                                        Gunakan scan berkualitas tinggi untuk
                                        dokumen fisik
                                    </li>
                                    <li>
                                        Pastikan semua informasi terlihat
                                        lengkap
                                    </li>
                                    {isSaprasCategory(uploadKey) ? (
                                        <li>
                                            Dokumentasi Sapras dapat diupload
                                            lebih dari 1 file
                                        </li>
                                    ) : null}
                                </ul>
                            </div>

                            <div
                                className={`kpDrop kpDropPreview ${isSaprasCategory(uploadKey) ? "is-sapras" : ""}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={onDrop}
                                onClick={pickFile}
                                role="button"
                                tabIndex={0}
                            >
                                {renderUploadPreview()}
                            </div>

                            {uploadErr ? (
                                <div className="kpModalErr">{uploadErr}</div>
                            ) : null}

                            <div className="kpModalActions">
                                <button
                                    className="kpBtnGhost"
                                    type="button"
                                    onClick={closeUpload}
                                    disabled={uploading}
                                >
                                    Batal
                                </button>
                                <button
                                    className="kpBtnSave"
                                    type="button"
                                    onClick={doUpload}
                                    disabled={
                                        uploading || !selectedFiles.length
                                    }
                                >
                                    {uploading ? "Upload..." : "Upload"}
                                </button>
                            </div>
                        </div>

                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,image/png,image/jpeg"
                            multiple={isSaprasCategory(uploadKey)}
                            style={{ display: "none" }}
                            onChange={onFileChange}
                        />
                    </div>
                </div>
            )}

            {detailOpen && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard kpModalMedium">
                        <div className="kpModalHead">
                            <div className="kpModalHeadTitle">
                                {detailTitle}
                            </div>
                            <button
                                className="kpModalClose"
                                type="button"
                                onClick={closeDetail}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kpModalBody kpModalBodyPreview kpModalBodyScroll">
                            {detailItems.length > 0 ? (
                                <div className="kpDetailToolbar">
                                    <div className="kpDetailCountPill">
                                        {detailIndex + 1} / {detailItems.length}
                                    </div>

                                    <div className="kpDetailNavGroup">
                                        <button
                                            type="button"
                                            className="kpDetailNavBtn"
                                            onClick={handlePrevDetail}
                                            disabled={detailIndex <= 0}
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            className="kpDetailNavBtn"
                                            onClick={handleNextDetail}
                                            disabled={
                                                detailIndex >=
                                                detailItems.length - 1
                                            }
                                        >
                                            ›
                                        </button>
                                    </div>

                                    <div className="kpDetailToolbarSpacer" />
                                </div>
                            ) : null}

                            <div className="kpPreviewBig">
                                {detailLoading ? (
                                    <div className="kpPreviewBigText">
                                        Memuat...
                                    </div>
                                ) : detailErr ? (
                                    <div className="kpPreviewBigText">
                                        {detailErr}
                                    </div>
                                ) : currentDetailItem?.signedUrl ? (
                                    isImageMime(
                                        currentDetailItem.mime_type,
                                        currentDetailItem.nama_berkas,
                                    ) ? (
                                        <div
                                            className="kpPreviewBigMedia"
                                            key={`${currentDetailItem.id || "img"}-${detailIndex}`}
                                        >
                                            <img
                                                key={`${currentDetailItem.signedUrl}-${detailIndex}`}
                                                className="kpPreviewBigImg"
                                                src={
                                                    currentDetailItem.signedUrl
                                                }
                                                alt={
                                                    currentDetailItem.nama_berkas ||
                                                    "Preview"
                                                }
                                                loading="eager"
                                            />
                                        </div>
                                    ) : (
                                        <iframe
                                            key={`${currentDetailItem.id || "pdf"}-${detailIndex}`}
                                            className="kpPreviewBigFrame"
                                            title="Preview"
                                            src={buildPdfPreviewUrl(
                                                currentDetailItem.signedUrl,
                                            )}
                                        />
                                    )
                                ) : (
                                    <div className="kpPreviewBigText">
                                        Tidak ada preview.
                                    </div>
                                )}
                            </div>

                            <div className="kpModalActions kpModalActionsPreview">
                                <button
                                    className="kpBtnGhost"
                                    type="button"
                                    onClick={closeDetail}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editLocOpen && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard kpModalLoc">
                        <div className="kpModalHead">
                            <div className="kpModalHeadTitle">
                                <FiMapPin />
                                Edit Lokasi Posbankum
                            </div>
                            <button
                                className="kpModalClose"
                                type="button"
                                onClick={() => setEditLocOpen(false)}
                                disabled={savingLoc}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kpModalBody kpModalBodyScroll">
                            <div className="kpLocSearchRow">
                                <div className="kpLocSearch">
                                    <FiSearch className="kpLocSearchIcon" />
                                    <input
                                        className="kpLocSearchInput"
                                        placeholder="Cari lokasi (contoh: Jl. Sudirman, Pekanbaru)"
                                        value={locQuery}
                                        onChange={(e) => {
                                            setLocQuery(e.target.value);
                                            if (locErr) setLocErr("");
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                searchLocation();
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    className="kpLocCariBtn"
                                    type="button"
                                    onClick={searchLocation}
                                >
                                    Cari
                                </button>

                                <button
                                    className="kpLocGpsBtn"
                                    type="button"
                                    onClick={useMyLocation}
                                    title="Gunakan lokasi saat ini"
                                >
                                    <MdLocationSearching />
                                </button>
                            </div>

                            {locErr ? (
                                <div
                                    className="kpInlineErr"
                                    role="alert"
                                    aria-live="polite"
                                >
                                    {locErr}
                                </div>
                            ) : null}

                            <div className="kpMapWrap">
                                <div className="kpMapShell">
                                    <div className="kpMapInfoCard">
                                        <div className="kpMapInfoCoords">
                                            {locDraft.lat && locDraft.lng
                                                ? `${locDraft.lat}, ${locDraft.lng}`
                                                : "Klik peta untuk pilih lokasi"}
                                        </div>
                                        <div className="kpMapInfoAddr">
                                            {locDraft.alamat ||
                                                "Alamat akan terisi setelah lokasi dipilih"}
                                        </div>
                                        {mapPreviewLink ? (
                                            <a
                                                className="kpMapInfoLink"
                                                href={mapPreviewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Lihat peta lebih besar
                                            </a>
                                        ) : null}
                                    </div>

                                    <div
                                        className={`kpMapBox ${locErr.includes("Peta") ? "has-error" : ""}`}
                                        ref={mapBoxRef}
                                    >
                                        {locErr.includes("Peta") ? (
                                            <div className="kpMapFallbackText">
                                                {locErr}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="kpLocFormGrid">
                                <div className="kpField">
                                    <div className="kpFieldLabel">Latitude</div>
                                    <input
                                        className="kpFieldInput"
                                        value={locDraft.lat}
                                        onChange={(e) => {
                                            setLocDraft((prev) => ({
                                                ...prev,
                                                lat: e.target.value,
                                            }));
                                            setLocDirty(true);
                                        }}
                                        onBlur={() =>
                                            moveMarker(
                                                locDraft.lat,
                                                locDraft.lng,
                                                16,
                                            )
                                        }
                                    />
                                </div>

                                <div className="kpField">
                                    <div className="kpFieldLabel">
                                        Longitude
                                    </div>
                                    <input
                                        className="kpFieldInput"
                                        value={locDraft.lng}
                                        onChange={(e) => {
                                            setLocDraft((prev) => ({
                                                ...prev,
                                                lng: e.target.value,
                                            }));
                                            setLocDirty(true);
                                        }}
                                        onBlur={() =>
                                            moveMarker(
                                                locDraft.lat,
                                                locDraft.lng,
                                                16,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="kpField kpFieldAlamat">
                                <div className="kpFieldLabel">
                                    Alamat Singkat
                                </div>
                                <textarea
                                    className="kpFieldTextarea"
                                    placeholder="Contoh: Kelurahan Air Hitam, Kec. Payung Sekaki, Kota Pekanbaru"
                                    value={locDraft.alamat}
                                    onChange={(e) => {
                                        setLocDraft((prev) => ({
                                            ...prev,
                                            alamat: e.target.value,
                                        }));
                                        setLocDirty(true);
                                    }}
                                />
                            </div>

                            <div className="kpTip">
                                <FiInfo />
                                <span>
                                    <b>Tip:</b> Geser marker atau klik pada peta
                                    untuk memilih koordinat, atau gunakan tombol
                                    lokasi untuk mendapatkan posisi saat ini.
                                </span>
                            </div>

                            <div className="kpModalActions">
                                <button
                                    className="kpBtnGhost"
                                    type="button"
                                    onClick={() => setEditLocOpen(false)}
                                    disabled={savingLoc}
                                >
                                    Batal
                                </button>
                                <button
                                    className="kpBtnSave"
                                    type="button"
                                    onClick={saveLocation}
                                    disabled={!locDirty || savingLoc}
                                >
                                    <FiSave />
                                    {savingLoc
                                        ? "Menyimpan..."
                                        : "Simpan Lokasi"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loadingDocs ? <div className="kpLoading">Memuat...</div> : null}
        </section>
    );
}
