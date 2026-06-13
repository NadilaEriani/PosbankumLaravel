import { router } from "@inertiajs/react";
import { FiSave } from "react-icons/fi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FiSearch,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiEye,
    FiFileText,
    FiFilter,
    FiClock,
    FiDownload,
    FiMapPin,
    FiInfo,
} from "react-icons/fi";
import { MdLocationSearching } from "react-icons/md";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import "../../../css/Admin/verifikasiDataPosbankum.css";

const BUCKET = "posbankum-docs";

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

function ensureLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);

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
                    if (index < urls.length) link.href = urls[index];
                    else reject(new Error("Leaflet CSS gagal dimuat."));
                };

                if (!existing && !document.getElementById(id))
                    document.head.appendChild(link);
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
                    if (index < urls.length) script.src = urls[index];
                    else reject(new Error("Leaflet JS gagal dimuat."));
                };

                if (!existing && !document.getElementById(id))
                    document.body.appendChild(script);
            };

            tryLoad();
        });

    return loadStylesheet("leaflet-css", LEAFLET_CSS_URLS)
        .then(() => loadScript("leaflet-js", LEAFLET_JS_URLS))
        .then((L) => {
            if (!L?.map) throw new Error("Leaflet tidak tersedia.");

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

function normalizeDropdownText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function VdDropdown({
    value,
    onChange,
    placeholder,
    searchPlaceholder = "Cari data...",
    options,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapRef = useRef(null);

    const isEmptyValue = value === "" || value === null || value === undefined;

    const selectedLabel = !isEmptyValue
        ? (options || []).find((o) => String(o.value) === String(value))
              ?.label || ""
        : "";

    const filteredOptions = useMemo(() => {
        const keyword = normalizeDropdownText(search);
        if (!keyword) return options || [];

        return (options || []).filter((opt) =>
            normalizeDropdownText(opt?.label).includes(keyword),
        );
    }, [options, search]);

    useEffect(() => {
        if (disabled) {
            setOpen(false);
            setSearch("");
        }
    }, [disabled]);

    useEffect(() => {
        if (!open) setSearch("");
    }, [open]);

    useEffect(() => {
        const onDown = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div className={`vd-dd ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
            <button
                type="button"
                className="vd-ddBtn"
                onClick={() => !disabled && setOpen((s) => !s)}
                aria-expanded={open}
                disabled={disabled}
            >
                <FiFilter className="vd-ddIcon" />
                <span
                    className={`vd-ddText ${selectedLabel ? "" : "is-placeholder"}`}
                >
                    {selectedLabel || placeholder}
                </span>
                <FiChevronDown
                    className={`vd-ddChevron ${open ? "is-open" : ""}`}
                />
            </button>

            {open && !disabled && (
                <div className="vd-ddMenu" role="listbox">
                    <label
                        className="vd-ddSearch"
                        aria-label={`Cari ${placeholder}`}
                    >
                        <FiSearch className="vd-ddSearchIcon" />
                        <input
                            className="vd-ddSearchInput"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={searchPlaceholder}
                            autoFocus
                        />
                        {search ? (
                            <button
                                type="button"
                                className="vd-ddSearchClear"
                                onClick={() => setSearch("")}
                                aria-label="Hapus pencarian filter"
                            >
                                <FiX />
                            </button>
                        ) : null}
                    </label>

                    <div className="vd-ddList">
                        {filteredOptions.length ? (
                            filteredOptions.map((opt) => {
                                const isActive =
                                    String(opt.value) === String(value);
                                return (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        className={`vd-ddItem ${isActive ? "is-active" : ""}`}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                        {isActive && (
                                            <BsCheck2Circle className="vd-ddCheck" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="vd-ddEmpty">
                                Data tidak ditemukan
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function VerifikasiDataPosbankum({
    rows = [],
    kabupatenRows = [],
    kecamatanRows = [],
}) {
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [kabupatenId, setKabupatenId] = useState("");
    const [kecamatanId, setKecamatanId] = useState("");

    const [kabupatenOpts, setKabupatenOpts] = useState([]);
    const [kecamatanAll, setKecamatanAll] = useState([]);

    const [posList, setPosList] = useState([]);
    const [uploadsByPos, setUploadsByPos] = useState({});

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 9;

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState("file");
    const [previewItems, setPreviewItems] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [selectedDoc, setSelectedDoc] = useState(null);
    const [verifyBusy, setVerifyBusy] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [rejectToastMessage, setRejectToastMessage] = useState("");

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const [locQuery, setLocQuery] = useState("");
    const [locDraft, setLocDraft] = useState({ lat: "", lng: "", alamat: "" });
    const [locErr, setLocErr] = useState("");
    const [locSearching, setLocSearching] = useState(false);
    const [locDirty, setLocDirty] = useState(false);
    const mapBoxRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapResizeObserverRef = useRef(null);

    const REQUIRED = useMemo(
        () => [
            { label: "SK Posbankum", key: "sk_posbankum" },
            { label: "SK Kadarkum", key: "sk_kadarkum" },
            { label: "Sapras", key: "sarpras" },
            { label: "Tagging Area", key: "tagging_area" },
        ],
        [],
    );

    const norm = (v) =>
        String(v ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    const KATEGORI_ALIASES = useMemo(
        () => ({
            sk_posbankum: "sk_posbankum",
            "sk posbankum": "sk_posbankum",
            "sk pos bankum": "sk_posbankum",

            sk_kadarkum: "sk_kadarkum",
            "sk kadarkum": "sk_kadarkum",
            "sk kab/kota": "sk_kadarkum",
            "sk kab kota": "sk_kadarkum",
            "sk kabupaten/kota": "sk_kadarkum",

            sarpras: "sarpras",
            sapras: "sarpras",
            "dokumentasi sarpras": "sarpras",
            "dokumentasi sapras": "sarpras",
            dokumentasi_sarpras: "sarpras",
            dokumentasi_sapras: "sarpras",

            tagging_area: "tagging_area",
            "tagging area": "tagging_area",
            "tag area": "tagging_area",
            "topping area": "tagging_area",
        }),
        [],
    );

    const canonKategori = (k) => {
        const n = norm(k);
        return KATEGORI_ALIASES[n] ?? n;
    };

    const normalizeStatus = (s) => {
        const x = norm(s);
        if (!x) return "menunggu";
        if (["setuju", "disetujui", "approved", "approve", "ok"].includes(x))
            return "disetujui";
        if (["tolak", "ditolak", "rejected", "reject", "bad"].includes(x))
            return "ditolak";
        return "menunggu";
    };

    const pickTimestamp = (u) =>
        u?.tgl_upload ??
        u?.tanggal_upload ??
        u?.uploaded_at ??
        u?.created_at ??
        u?.updated_at ??
        null;

    const pickPath = (u) =>
        u?.path_berkas ??
        u?.path ??
        u?.file_path ??
        u?.file_url ??
        u?.url ??
        u?.public_url ??
        "";

    const pickMime = (u) => u?.mime_type ?? u?.mime ?? "";
    const pickName = (u) =>
        u?.nama_berkas ?? u?.nama_file ?? u?.file_name ?? u?.name ?? "";
    const pickUploadId = (u) => u?.id_data ?? u?.id ?? u?.uuid ?? null;

    const formatTanggal = (ts) => {
        if (!ts) return "-";
        try {
            return new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(new Date(ts));
        } catch {
            return "-";
        }
    };

    const hasTaggingArea = (pos) => {
        const lat = Number(pos?.latitude ?? pos?.lat ?? pos?.latitude_pos);
        const lng = Number(
            pos?.longitude ?? pos?.lng ?? pos?.long ?? pos?.longitude_pos,
        );
        return Number.isFinite(lat) && Number.isFinite(lng);
    };

    const isChangedAfterCreate = (createdAt, updatedAt) => {
        if (!createdAt || !updatedAt) return false;

        const createdMs = new Date(createdAt).getTime();
        const updatedMs = new Date(updatedAt).getTime();

        if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs))
            return false;

        return updatedMs - createdMs > 1000;
    };

    const pickTaggingTanggal = (pos, taggingLatest) => {
        const savedVerificationDate =
            pos?.tgl_verifikasi_tagging_area ??
            pos?.tanggal_verifikasi_tagging_area ??
            pos?.tgl_verifikasi_tagging ??
            pos?.tgl_verifikasi_lokasi ??
            null;

        if (savedVerificationDate) return savedVerificationDate;
        if (taggingLatest) return pickTimestamp(taggingLatest);
        if (!hasTaggingArea(pos)) return null;

        return (
            pos?.tgl_upload_tagging_area ??
            pos?.tanggal_upload_tagging_area ??
            (isChangedAfterCreate(pos?.created_at, pos?.updated_at)
                ? pos?.updated_at
                : null)
        );
    };

    const pickTaggingRawStatus = (pos) =>
        pos?.status_verifikasi_tagging_area ??
        pos?.status_tagging_area ??
        pos?.status_verifikasi_tagging ??
        pos?.status_tagging ??
        "";

    const hasTaggingVerificationRecord = (pos) =>
        Boolean(
            pos?.tgl_verifikasi_tagging_area ||
            pos?.tanggal_verifikasi_tagging_area ||
            pos?.tgl_verifikasi_tagging ||
            pos?.tgl_verifikasi_lokasi ||
            pos?.id_user_verifikator_tagging_area ||
            pos?.id_user_verifikator_tagging ||
            pos?.id_user_verifikator_lokasi ||
            pos?.catatan_verifikasi_tagging_area ||
            pos?.catatan_tagging_area ||
            pos?.catatan_lokasi,
        );

    const getTaggingStatus = (pos, hasCoords, taggingLatest = null) => {
        const raw = pickTaggingRawStatus(pos);

        if (raw) {
            const status = normalizeStatus(raw);

            if (status === "menunggu") return "menunggu";
            if (hasTaggingVerificationRecord(pos)) return status;

            return "menunggu";
        }

        if (taggingLatest) {
            const uploadStatus = normalizeStatus(
                taggingLatest?.status_verifikasi ?? taggingLatest?.status,
            );

            return uploadStatus === "disetujui" || uploadStatus === "ditolak"
                ? uploadStatus
                : "menunggu";
        }

        return "menunggu";
    };

    const stripBucketPrefix = (p) => {
        const s = String(p || "");
        if (!s) return "";
        if (s.startsWith(`${BUCKET}/`)) return s.slice(BUCKET.length + 1);
        return s;
    };

    const makeSignedUrl = async (path) => {
        const raw = String(path || "").trim();
        if (!raw) return "";
        if (/^(data:|blob:)/i.test(raw)) return raw;
        if (
            raw.startsWith("/file-preview") ||
            raw.startsWith("/admin/verifikasi-data-posbankum/dokumen")
        )
            return raw;
        if (/^https?:\/\//i.test(raw) && !/\/storage\//i.test(raw)) return raw;

        const clean = stripBucketPrefix(raw)
            .replace(/^https?:\/\/[^/]+\/storage\//i, "")
            .replace(/^https?:\/\/[^/]+\//i, "")
            .replace(/[?#].*$/, "")
            .replace(/^public\//i, "")
            .replace(/^storage\//i, "")
            .replace(/^app\/public\//i, "")
            .replace(/^\/+/, "");

        if (!clean || clean.includes("..")) return "";

        return `/file-preview?path=${encodeURIComponent(clean)}`;
    };

    const isImagePreview = (item) => {
        const mime = String(item?.mime || item?.mime_type || "").toLowerCase();
        const name = String(
            item?.name || item?.nama_berkas || item?.url || "",
        ).toLowerCase();
        return (
            mime.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
        );
    };

    const normalizeAddressChunk = (value) => {
        return String(value || "")
            .replace(/\s+/g, " ")
            .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
            .trim();
    };

    const stripKnownAddressPrefix = (value) => {
        return normalizeAddressChunk(value)
            .replace(/^(kelurahan|kel\.?|desa|kampung)\s+/i, "")
            .replace(/^(kecamatan|kec\.?)\s+/i, "")
            .replace(/^(kota|kabupaten|kab\.?)\s+/i, "")
            .trim();
    };

    const uniqAddressParts = (parts) => {
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
    };

    const formatKelurahan = (part) => {
        const clean = normalizeAddressChunk(part);
        if (!clean) return "";
        if (/^(kelurahan|kel\.)\s+/i.test(clean)) {
            return clean.replace(/^kel\.?\s+/i, "Kelurahan ");
        }
        if (/^(desa|kampung)\s+/i.test(clean)) return clean;
        return `Kelurahan ${stripKnownAddressPrefix(clean)}`;
    };

    const formatKecamatan = (part) => {
        const clean = normalizeAddressChunk(part);
        if (!clean) return "";
        return `Kec. ${stripKnownAddressPrefix(clean)}`;
    };

    const formatKota = (part) => {
        const clean = normalizeAddressChunk(part);
        if (!clean) return "";
        if (/^kabupaten\s+/i.test(clean) || /^kab\.?\s+/i.test(clean)) {
            return `Kabupaten ${stripKnownAddressPrefix(clean)}`;
        }
        return `Kota ${stripKnownAddressPrefix(clean)}`;
    };

    const simplifyLocationAddress = (rawAddress) => {
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
                .slice(
                    kelurahanIndex + 1,
                    kotaIndex >= 0 ? kotaIndex : undefined,
                )
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
                        clean ===
                            stripKnownAddressPrefix(kotaPart).toLowerCase()
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
                            stripKnownAddressPrefix(
                                kelurahanPart,
                            ).toLowerCase() &&
                        clean !==
                            stripKnownAddressPrefix(kotaPart).toLowerCase()
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
    };

    const buildGoogleMapsLink = (lat, lng) => {
        const la = Number(lat);
        const lo = Number(lng);
        if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
        return `https://www.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}`;
    };

    const sortUploads = (items = []) => {
        return [...items].sort((a, b) => {
            const timeA = new Date(pickTimestamp(a) || 0).getTime() || 0;
            const timeB = new Date(pickTimestamp(b) || 0).getTime() || 0;
            if (timeA !== timeB) return timeB - timeA;

            const nameA = String(
                a?.nama_berkas || a?.path_berkas || a?.id_data || "",
            );
            const nameB = String(
                b?.nama_berkas || b?.path_berkas || b?.id_data || "",
            );
            return nameA.localeCompare(nameB);
        });
    };

    const addOptionalField = (payload, source, names, value) => {
        for (const name of names) {
            if (Object.prototype.hasOwnProperty.call(source || {}, name))
                payload[name] = value;
        }
    };

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

        if (mapBoxRef.current) mapBoxRef.current.innerHTML = "";
    }, []);

    const moveMarker = useCallback((lat, lng, zoom = 16) => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;

        const la = Number(lat);
        const lo = Number(lng);
        if (!Number.isFinite(la) || !Number.isFinite(lo)) return;

        try {
            map.invalidateSize(true);
        } catch {}

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
            const la = Number(lat);
            const lo = Number(lng);

            if (!Number.isFinite(la) || !Number.isFinite(lo)) {
                setLocErr("Koordinat lokasi tidak valid.");
                return;
            }

            const fixedLat = la.toFixed(6);
            const fixedLng = lo.toFixed(6);

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

    const searchLocation = async () => {
        const keyword = locQuery.trim();

        if (!keyword) {
            setLocErr("Warning: Isi kolom pencarian lokasi terlebih dahulu.");
            return;
        }

        setLocErr("");
        setLocSearching(true);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
                    keyword,
                )}&limit=1`,
                {
                    headers: {
                        "Accept-Language": "id-ID",
                    },
                },
            );

            const json = await res.json();
            const hit = json?.[0];

            if (!hit) {
                setLocErr(
                    "Warning: Lokasi tidak ditemukan. Periksa kembali penulisan lokasi, lalu tekan Cari lagi.",
                );
                return;
            }

            const lat = Number(hit.lat);
            const lng = Number(hit.lon);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setLocErr("Warning: Koordinat lokasi tidak valid.");
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
                "Warning: Pencarian lokasi gagal. Periksa koneksi internet, lalu coba lagi.",
            );
        } finally {
            setLocSearching(false);
        }
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setLocErr("Warning: Browser tidak mendukung geolocation.");
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
                setLocErr("Warning: Gagal mengambil lokasi saat ini.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            },
        );
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        setKabupatenOpts(Array.isArray(kabupatenRows) ? kabupatenRows : []);
    }, [kabupatenRows]);

    useEffect(() => {
        setKecamatanAll(Array.isArray(kecamatanRows) ? kecamatanRows : []);
    }, [kecamatanRows]);

    const kecamatanOpts = useMemo(() => {
        if (!kabupatenId) return [];
        return (kecamatanAll ?? []).filter(
            (kc) => kc.id_kabupaten === kabupatenId,
        );
    }, [kecamatanAll, kabupatenId]);

    useEffect(() => {
        setKecamatanId("");
    }, [kabupatenId]);

    const kabupatenNameById = useMemo(() => {
        const m = {};
        (kabupatenOpts ?? []).forEach((k) => {
            m[k.id_kabupaten] = k.nama;
        });
        return m;
    }, [kabupatenOpts]);

    const kecamatanNameById = useMemo(() => {
        const m = {};
        (kecamatanAll ?? []).forEach((k) => {
            m[k.id_kecamatan] = k.nama;
        });
        return m;
    }, [kecamatanAll]);

    const sourceRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

    useEffect(() => {
        setLoading(true);
        setErr("");

        const search = norm(debouncedQ);
        const grouped = {};

        const nextPos = sourceRows
            .map((item) => {
                const id = item?.id_posbankum ?? item?.id ?? item?.posbankum_id;
                const uploads = Array.isArray(item?.uploads)
                    ? item.uploads
                    : Array.isArray(item?.data_posbankum)
                      ? item.data_posbankum
                      : [];

                grouped[id] = sortUploads(uploads);

                return {
                    ...item,
                    id_posbankum: id,
                    nama:
                        item?.nama ?? item?.name ?? item?.posbankum_nama ?? "-",
                    id_kabupaten:
                        item?.id_kabupaten ??
                        item?.kabupaten_id ??
                        item?.kabupaten?.id_kabupaten ??
                        "",
                    id_kecamatan:
                        item?.id_kecamatan ??
                        item?.kecamatan_id ??
                        item?.kecamatan?.id_kecamatan ??
                        "",
                    id_kelurahan:
                        item?.id_kelurahan ??
                        item?.kelurahan_id ??
                        item?.kelurahan?.id_kelurahan ??
                        "",
                    kabupaten_nama:
                        item?.kabupaten_nama ??
                        item?.kabupaten?.nama ??
                        item?.kabupaten ??
                        "",
                    kecamatan_nama:
                        item?.kecamatan_nama ??
                        item?.kecamatan?.nama ??
                        item?.kecamatan ??
                        "",
                    kelurahan_nama:
                        item?.kelurahan_nama ??
                        item?.kelurahan?.nama ??
                        item?.kelurahan ??
                        "",
                };
            })
            .filter((item) => {
                if (
                    kabupatenId &&
                    String(item.id_kabupaten) !== String(kabupatenId)
                ) {
                    return false;
                }

                if (
                    kecamatanId &&
                    String(item.id_kecamatan) !== String(kecamatanId)
                ) {
                    return false;
                }

                if (!search) return true;

                return [
                    item?.nama,
                    item?.alamat,
                    item?.email_akun,
                    item?.nomor_tlp,
                    item?.kelurahan_nama,
                    item?.kecamatan_nama,
                    item?.kabupaten_nama,
                ]
                    .map((value) => norm(value))
                    .join(" ")
                    .includes(search);
            });

        setUploadsByPos(grouped);
        setPosList(nextPos);
        setPage(1);
        setLoading(false);
    }, [sourceRows, kabupatenId, kecamatanId, debouncedQ]);

    const cards = useMemo(() => {
        return (posList ?? []).map((p) => {
            const ups = uploadsByPos[p.id_posbankum] ?? [];

            const groupedByKey = {};
            for (const u of ups) {
                const key = canonKategori(u?.kategori);
                if (!key) continue;
                if (!groupedByKey[key]) groupedByKey[key] = [];
                groupedByKey[key].push(u);
            }

            Object.keys(groupedByKey).forEach((key) => {
                groupedByKey[key] = sortUploads(groupedByKey[key]);
            });

            const docs = REQUIRED.map((req) => {
                if (req.key === "tagging_area") {
                    const taggingUploads = groupedByKey.tagging_area ?? [];
                    const taggingLatest = taggingUploads[0];
                    const hasCoords = hasTaggingArea(p);
                    const taggingDate = pickTaggingTanggal(p, taggingLatest);

                    const taggingStatus = getTaggingStatus(
                        p,
                        hasCoords,
                        taggingLatest,
                    );

                    return {
                        label: req.label,
                        key: req.key,
                        tanggal: formatTanggal(taggingDate),
                        status: taggingStatus,
                        path: "__tagging_area__",
                        mime: "map",
                        name: "Tagging Area",
                        uploadId: taggingLatest
                            ? pickUploadId(taggingLatest)
                            : null,
                        files: taggingUploads,
                        viewerType: "tagging_area",
                        latitude: p.latitude ?? p.lat ?? p.latitude_pos ?? "",
                        longitude:
                            p.longitude ??
                            p.lng ??
                            p.long ??
                            p.longitude_pos ??
                            "",
                        alamat: p.alamat ?? "",
                        raw: p,
                        fileCount: hasCoords ? 1 : taggingUploads.length,
                    };
                }

                const files = groupedByKey[req.key] ?? [];
                const u = files[0];

                return {
                    label: req.label,
                    key: req.key,
                    tanggal: u ? formatTanggal(pickTimestamp(u)) : "-",
                    status: normalizeStatus(u?.status_verifikasi ?? u?.status),
                    path: u ? pickPath(u) : "",
                    mime: u ? pickMime(u) : "",
                    name: u ? pickName(u) : "",
                    uploadId: u ? pickUploadId(u) : null,
                    files,
                    raw: u ?? null,
                    fileCount: files.length,
                };
            });

            return { ...p, docs };
        });
    }, [posList, uploadsByPos, REQUIRED, KATEGORI_ALIASES]);

    const stats = useMemo(() => {
        let menunggu = 0;
        let disetujui = 0;
        let ditolak = 0;

        for (const c of cards) {
            for (const d of c.docs) {
                if (!d.path) continue;
                if (d.status === "disetujui") disetujui += 1;
                else if (d.status === "ditolak") ditolak += 1;
                else menunggu += 1;
            }
        }

        return { menunggu, disetujui, ditolak };
    }, [cards]);

    const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
    const pageClamped = Math.min(Math.max(page, 1), totalPages);

    const pageItems = useMemo(() => {
        const start = (pageClamped - 1) * PAGE_SIZE;
        return cards.slice(start, start + PAGE_SIZE);
    }, [cards, pageClamped]);

    const posById = useMemo(() => {
        const m = {};
        (posList ?? []).forEach((p) => {
            m[p.id_posbankum] = p;
        });
        return m;
    }, [posList]);

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewMode("file");
        setPreviewItems([]);
        setPreviewIndex(0);
        setPreviewLoading(false);
        setSelectedDoc(null);
        setVerifyBusy(false);
        setRejectOpen(false);
        setRejectReason("");
        setLocQuery("");
        setLocDraft({ lat: "", lng: "", alamat: "" });
        setLocErr("");
        setLocSearching(false);
        setLocDirty(false);
        destroyMap();
    };

    const openPreview = async (doc, posId) => {
        setErr("");
        if (!doc?.path) return;

        const p = posById[posId];
        const posName = p?.nama || "-";
        const kabName = kabupatenNameById[p?.id_kabupaten] ?? "-";
        const kecName = kecamatanNameById[p?.id_kecamatan] ?? "-";

        const nextSelected = {
            ...doc,
            posId,
            posName,
            kabName,
            kecName,
        };

        setSelectedDoc(nextSelected);
        setPreviewIndex(0);
        setPreviewItems([]);
        setPreviewLoading(true);

        if (doc.viewerType === "tagging_area") {
            setPreviewMode("tagging");
            setLocDraft({
                lat: doc.latitude ? String(doc.latitude) : "",
                lng: doc.longitude ? String(doc.longitude) : "",
                alamat: simplifyLocationAddress(doc.alamat || ""),
            });
            setLocDirty(false);
            setLocErr("");
            setPreviewOpen(true);
            setPreviewLoading(false);
            return;
        }

        setPreviewMode("file");
        setPreviewOpen(true);

        try {
            const files =
                Array.isArray(doc.files) && doc.files.length
                    ? doc.files
                    : [doc.raw || doc];
            const cleanFiles = files.filter((item) => pickPath(item));

            const items = (
                await Promise.all(
                    cleanFiles.map(async (item) => {
                        const uploadId = pickUploadId(item) || doc.uploadId;
                        const rawPath = pickPath(item);
                        const fileName = pickName(item) || doc.name || "Berkas";
                        const fileMime = pickMime(item) || doc.mime || "";
                        const url = uploadId
                            ? `/admin/verifikasi-data-posbankum/dokumen/${encodeURIComponent(
                                  uploadId,
                              )}/preview`
                            : rawPath
                              ? `/admin/verifikasi-data-posbankum/dokumen-preview?path=${encodeURIComponent(
                                    rawPath,
                                )}&name=${encodeURIComponent(
                                    fileName,
                                )}&mime=${encodeURIComponent(fileMime)}`
                              : await makeSignedUrl(rawPath);

                        if (!url) return null;

                        return {
                            url,
                            mime: fileMime,
                            name: fileName,
                            kategori: item?.kategori || doc.label || "",
                            raw: item,
                        };
                    }),
                )
            ).filter(Boolean);

            setPreviewItems(items);
        } catch (e) {
            setErr(e?.message || "Gagal membuka berkas");
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (!previewOpen) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e) => {
            if (e.key === "Escape") closePreview();

            if (previewMode === "file" && previewItems.length > 1) {
                if (e.key === "ArrowLeft") {
                    setPreviewIndex((i) =>
                        i === 0 ? previewItems.length - 1 : i - 1,
                    );
                }
                if (e.key === "ArrowRight") {
                    setPreviewIndex((i) =>
                        i >= previewItems.length - 1 ? 0 : i + 1,
                    );
                }
            }
        };

        window.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [previewOpen, previewMode, previewItems.length]);

    useEffect(() => {
        if (!previewOpen || previewMode !== "tagging") return;

        let cancelled = false;
        let bootstrapTimer = null;

        const waitForMapBox = async () => {
            let attempts = 0;
            while (!cancelled && attempts < 40) {
                const box = mapBoxRef.current;
                if (box && box.clientWidth > 0 && box.clientHeight > 0)
                    return box;
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

                const lat = Number(locDraft.lat);
                const lng = Number(locDraft.lng);
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

                if (!hasCoord) marker.setOpacity(0.75);

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

                    [150, 400, 900].forEach((delay) => {
                        setTimeout(() => {
                            try {
                                map.invalidateSize(true);
                            } catch {}
                        }, delay);
                    });
                });
            } catch {
                setLocErr("Warning: Peta gagal dimuat.");
            }
        };

        bootstrapTimer = setTimeout(initMap, 30);

        return () => {
            cancelled = true;
            if (bootstrapTimer) clearTimeout(bootstrapTimer);
            destroyMap();
        };
    }, [previewOpen, previewMode, destroyMap, applyPickedLocation]);

    const currentPreview = previewItems[previewIndex] || null;
    const currentPreviewUrl = currentPreview?.url || "";
    const currentPreviewName =
        currentPreview?.name || selectedDoc?.name || "Berkas";
    const currentPreviewKategori =
        selectedDoc?.label || currentPreview?.kategori || "Dokumen";
    const currentIsImage = isImagePreview(currentPreview);
    const selectedIsTagging = selectedDoc?.viewerType === "tagging_area";

    const prevPreview = () => {
        if (previewItems.length <= 1) return;
        setPreviewIndex((i) => (i === 0 ? previewItems.length - 1 : i - 1));
    };

    const nextPreview = () => {
        if (previewItems.length <= 1) return;
        setPreviewIndex((i) => (i >= previewItems.length - 1 ? 0 : i + 1));
    };

    const setDocStatusLocal = (
        posId,
        key,
        status,
        reason = "",
        options = {},
    ) => {
        const shouldSaveLocation = Boolean(options.saveLocation);
        const taggingUploadId = options.taggingUploadId || null;
        const now = options.now || new Date().toISOString();
        const nextAlamat = simplifyLocationAddress(locDraft.alamat);
        const nextLat = Number(locDraft.lat);
        const nextLng = Number(locDraft.lng);

        if (key === "tagging_area") {
            setPosList((prev) =>
                (prev ?? []).map((item) => {
                    if (item.id_posbankum !== posId) return item;

                    return {
                        ...item,
                        status_verifikasi_tagging_area: status,
                        status_tagging_area:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "status_tagging_area",
                            )
                                ? status
                                : item.status_tagging_area,
                        status_verifikasi_tagging:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "status_verifikasi_tagging",
                            )
                                ? status
                                : item.status_verifikasi_tagging,
                        status_tagging: Object.prototype.hasOwnProperty.call(
                            item,
                            "status_tagging",
                        )
                            ? status
                            : item.status_tagging,
                        status_lokasi: Object.prototype.hasOwnProperty.call(
                            item,
                            "status_lokasi",
                        )
                            ? status
                            : item.status_lokasi,
                        status_verifikasi_lokasi:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "status_verifikasi_lokasi",
                            )
                                ? status
                                : item.status_verifikasi_lokasi,
                        verification_status_location:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "verification_status_location",
                            )
                                ? status
                                : item.verification_status_location,
                        catatan_verifikasi_tagging_area: reason,
                        catatan_tagging_area:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "catatan_tagging_area",
                            )
                                ? reason
                                : item.catatan_tagging_area,
                        alasan_penolakan_tagging_area:
                            Object.prototype.hasOwnProperty.call(
                                item,
                                "alasan_penolakan_tagging_area",
                            )
                                ? reason
                                : item.alasan_penolakan_tagging_area,
                        catatan_lokasi: Object.prototype.hasOwnProperty.call(
                            item,
                            "catatan_lokasi",
                        )
                            ? reason
                            : item.catatan_lokasi,
                        ...(shouldSaveLocation
                            ? {
                                  alamat: nextAlamat,
                                  latitude: Number.isFinite(nextLat)
                                      ? nextLat
                                      : item.latitude,
                                  longitude: Number.isFinite(nextLng)
                                      ? nextLng
                                      : item.longitude,
                              }
                            : {}),
                        updated_at: now,
                    };
                }),
            );

            setUploadsByPos((prev) => {
                const list = prev?.[posId] ?? [];
                const latestIndex = list.findIndex(
                    (item) => canonKategori(item?.kategori) === "tagging_area",
                );

                const nextItem = {
                    ...(latestIndex >= 0 ? list[latestIndex] : {}),
                    id_data:
                        taggingUploadId ||
                        (latestIndex >= 0
                            ? list[latestIndex]?.id_data
                            : undefined),
                    id_posbankum: posId,
                    kategori: "tagging_area",
                    path_berkas: "__tagging_area__",
                    nama_berkas: "Tagging Area",
                    mime_type: "map",
                    status_verifikasi: status,
                    catatan_admin: status === "ditolak" ? reason : "",
                    tgl_verifikasi: now,
                    tgl_upload:
                        latestIndex >= 0
                            ? list[latestIndex]?.tgl_upload || now
                            : now,
                };

                if (latestIndex < 0) {
                    return {
                        ...prev,
                        [posId]: sortUploads([nextItem, ...list]),
                    };
                }

                const nextList = list.slice();
                nextList[latestIndex] = nextItem;
                return { ...prev, [posId]: sortUploads(nextList) };
            });

            return;
        }

        setUploadsByPos((prev) => {
            const list = prev?.[posId] ?? [];
            if (!list.length) return prev;

            let latestIdx = -1;
            let latestTime = -1;

            for (let i = 0; i < list.length; i++) {
                const u = list[i];
                const k = canonKategori(u?.kategori);
                if (k !== key) continue;

                const t = new Date(pickTimestamp(u) || 0).getTime();
                if (t > latestTime) {
                    latestTime = t;
                    latestIdx = i;
                }
            }

            if (latestIdx < 0) return prev;

            const nextList = list.slice();
            nextList[latestIdx] = {
                ...nextList[latestIdx],
                status_verifikasi: status,
                catatan_admin: Object.prototype.hasOwnProperty.call(
                    nextList[latestIdx],
                    "catatan_admin",
                )
                    ? reason
                    : nextList[latestIdx].catatan_admin,
                catatan_verifikasi: Object.prototype.hasOwnProperty.call(
                    nextList[latestIdx],
                    "catatan_verifikasi",
                )
                    ? reason
                    : nextList[latestIdx].catatan_verifikasi,
                alasan_penolakan: Object.prototype.hasOwnProperty.call(
                    nextList[latestIdx],
                    "alasan_penolakan",
                )
                    ? reason
                    : nextList[latestIdx].alasan_penolakan,
            };

            return { ...prev, [posId]: nextList };
        });
    };

    const errorMessageFromPayload = (errors, fallback) => {
        if (!errors || typeof errors !== "object") return fallback;

        const messages = Object.values(errors).flat().filter(Boolean).join(" ");

        return messages || fallback;
    };

    const patchRequest = (url, payload, fallback) =>
        new Promise((resolve, reject) => {
            router.patch(url, payload, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => resolve(),
                onError: (errors) =>
                    reject(
                        new Error(errorMessageFromPayload(errors, fallback)),
                    ),
            });
        });

    const updateTaggingVerification = async (
        status,
        reason = "",
        options = {},
    ) => {
        if (!selectedDoc?.posId) {
            throw new Error("ID Posbankum tidak ditemukan.");
        }

        const shouldSaveLocation = Boolean(options.saveLocation);
        const payload = {
            status,
            catatan: reason,
            save_location: shouldSaveLocation,
        };

        if (shouldSaveLocation) {
            const latNum = Number(locDraft.lat);
            const lngNum = Number(locDraft.lng);

            if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
                setLocErr("Koordinat tagging area belum valid.");
                throw new Error("Koordinat tagging area belum valid.");
            }

            payload.latitude = latNum;
            payload.longitude = lngNum;
            payload.alamat = simplifyLocationAddress(locDraft.alamat);
        }

        await patchRequest(
            `/admin/verifikasi-data-posbankum/tagging/${encodeURIComponent(
                selectedDoc.posId,
            )}/status`,
            payload,
            "Gagal memperbarui status tagging area.",
        );

        setDocStatusLocal(selectedDoc.posId, selectedDoc.key, status, reason, {
            saveLocation: shouldSaveLocation,
            now: new Date().toISOString(),
        });
    };

    const saveTaggingLocationOnly = async () => {
        if (!selectedDoc?.posId) return;

        setErr("");
        setVerifyBusy(true);

        try {
            const latNum = Number(locDraft.lat);
            const lngNum = Number(locDraft.lng);

            if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
                setLocErr("Koordinat tagging area belum valid.");
                setVerifyBusy(false);
                return;
            }

            await patchRequest(
                `/admin/verifikasi-data-posbankum/tagging/${encodeURIComponent(
                    selectedDoc.posId,
                )}/location`,
                {
                    latitude: latNum,
                    longitude: lngNum,
                    alamat: simplifyLocationAddress(locDraft.alamat),
                },
                "Gagal menyimpan perubahan tagging area.",
            );

            setDocStatusLocal(
                selectedDoc.posId,
                selectedDoc.key,
                normalizeStatus(selectedDoc.status),
                "",
                { saveLocation: true, now: new Date().toISOString() },
            );

            closePreview();
            setSuccessMessage("Perubahan tagging area berhasil disimpan!");
        } catch (e) {
            setErr(e?.message || "Gagal menyimpan perubahan tagging area.");
            setVerifyBusy(false);
        }
    };

    const updateFileVerification = async (status, reason = "") => {
        const payload = {
            status,
            catatan: reason,
            kategori: selectedDoc.key,
            id_posbankum: selectedDoc.posId,
        };

        if (selectedDoc?.uploadId) {
            await patchRequest(
                `/admin/verifikasi-data-posbankum/dokumen/${encodeURIComponent(
                    selectedDoc.uploadId,
                )}/status`,
                payload,
                "Gagal memperbarui status dokumen.",
            );
        } else if (selectedDoc?.path) {
            await patchRequest(
                "/admin/verifikasi-data-posbankum/dokumen-status-by-path",
                {
                    ...payload,
                    path: selectedDoc.path,
                },
                "Gagal memperbarui status dokumen.",
            );
        } else {
            throw new Error("ID dokumen tidak ditemukan.");
        }

        if (selectedDoc?.posId && selectedDoc?.key) {
            setDocStatusLocal(
                selectedDoc.posId,
                selectedDoc.key,
                status,
                reason,
            );
        }
    };

    const updateVerification = async (status, reason = "", options = {}) => {
        setErr("");
        setVerifyBusy(true);

        try {
            if (selectedDoc?.viewerType === "tagging_area") {
                await updateTaggingVerification(status, reason, options);
            } else {
                await updateFileVerification(status, reason);
            }

            closePreview();
            if (status === "disetujui") {
                setSuccessMessage(
                    "Data berhasil disetujui dan tersimpan di database!",
                );
            } else {
                setRejectToastMessage(
                    "Data berhasil ditolak dan tersimpan di database!",
                );
            }
        } catch (e) {
            setErr(e?.message || "Gagal memperbarui status verifikasi");
            setVerifyBusy(false);
        }
    };

    const openRejectModal = () => {
        setRejectReason("");
        setRejectOpen(true);
    };

    const confirmReject = async () => {
        const reason = rejectReason.trim();
        if (!reason) return;
        await updateVerification("ditolak", reason);
    };

    const renderDocIcon = (status) => {
        if (status === "disetujui")
            return <BsCheck2Circle className="vd-docStatusIcon" />;
        if (status === "ditolak")
            return <AiOutlineCloseCircle className="vd-docStatusIcon" />;
        return <FiClock className="vd-docStatusIcon" />;
    };

    const renderPreviewActions = () => {
        if (!selectedDoc) return null;

        if (selectedIsTagging) {
            return (
                <>
                    <button
                        className="vd-previewBtn vd-previewApproveBtn"
                        type="button"
                        onClick={() =>
                            updateVerification("disetujui", "", {
                                saveLocation: false,
                            })
                        }
                        disabled={verifyBusy}
                    >
                        {verifyBusy ? "Memproses..." : "Setuju"}
                    </button>
                    <button
                        className="vd-previewBtn vd-previewSaveBtn"
                        type="button"
                        onClick={saveTaggingLocationOnly}
                        disabled={
                            verifyBusy ||
                            !locDirty ||
                            !locDraft.lat ||
                            !locDraft.lng
                        }
                    >
                        <FiSave />
                        {verifyBusy ? "Memproses..." : "Simpan Perubahan"}
                    </button>
                </>
            );
        }

        return (
            <>
                <button
                    className="vd-previewBtn vd-previewRejectBtn"
                    type="button"
                    onClick={openRejectModal}
                    disabled={verifyBusy}
                >
                    Tolak
                </button>

                <button
                    className="vd-previewBtn vd-previewApproveBtn"
                    type="button"
                    onClick={() => updateVerification("disetujui")}
                    disabled={verifyBusy}
                >
                    {verifyBusy ? "Memproses..." : "Setuju"}
                </button>
            </>
        );
    };

    return (
        <section className="ad-pagePad">
            <div className="vd">
                <SuccessToast
                    message={successMessage}
                    onClose={() => setSuccessMessage("")}
                />
                <RejectToast
                    message={rejectToastMessage}
                    onClose={() => setRejectToastMessage("")}
                />

                <div className="vd-topBoxes">
                    <div className="vd-topBox">
                        <div className="vd-topBoxInner">
                            <div
                                className="vd-topIcon is-wait"
                                aria-hidden="true"
                            >
                                <FiClock />
                            </div>
                            <div className="vd-topText">
                                <div className="vd-topTitle">
                                    Menunggu Verifikasi
                                </div>
                                <div className="vd-topValue">
                                    {stats.menunggu}
                                </div>
                                <div className="vd-topHint">
                                    Dokumen Perlu Ditinjau
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="vd-topBox">
                        <div className="vd-topBoxInner">
                            <div
                                className="vd-topIcon is-ok"
                                aria-hidden="true"
                            >
                                <BsCheck2Circle />
                            </div>
                            <div className="vd-topText">
                                <div className="vd-topTitle">Disetujui</div>
                                <div className="vd-topValue">
                                    {stats.disetujui}
                                </div>
                                <div className="vd-topHint">
                                    Dokumen Terverifikasi
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="vd-topBox">
                        <div className="vd-topBoxInner">
                            <div
                                className="vd-topIcon is-no"
                                aria-hidden="true"
                            >
                                <AiOutlineCloseCircle />
                            </div>
                            <div className="vd-topText">
                                <div className="vd-topTitle">Ditolak</div>
                                <div className="vd-topValue">
                                    {stats.ditolak}
                                </div>
                                <div className="vd-topHint">
                                    Perlu Diperbaiki
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="vd-filterCard">
                    <div className="vd-toolbar">
                        <div className="vd-search">
                            <FiSearch className="vd-searchIcon" />
                            <input
                                className="vd-searchInput"
                                placeholder="Pencarian..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                            {q && (
                                <button
                                    className="vd-clearBtn"
                                    type="button"
                                    onClick={() => setQ("")}
                                    aria-label="Clear"
                                >
                                    <FiX />
                                </button>
                            )}
                        </div>

                        <div className="vd-filterRow">
                            <VdDropdown
                                value={kabupatenId}
                                onChange={(val) => setKabupatenId(val)}
                                placeholder="Pilih Kabupaten"
                                searchPlaceholder="Cari kabupaten..."
                                options={[
                                    { value: "", label: "Semua" },
                                    ...kabupatenOpts.map((k) => ({
                                        value: k.id_kabupaten,
                                        label: k.nama,
                                    })),
                                ]}
                            />

                            <VdDropdown
                                value={kecamatanId}
                                onChange={(val) => setKecamatanId(val)}
                                placeholder="Pilih Kecamatan"
                                searchPlaceholder="Cari kecamatan..."
                                disabled={!kabupatenId}
                                options={[
                                    { value: "", label: "Semua" },
                                    ...kecamatanOpts.map((kc) => ({
                                        value: kc.id_kecamatan,
                                        label: kc.nama,
                                    })),
                                ]}
                            />

                            {(kabupatenId || kecamatanId) && (
                                <button
                                    className="vd-resetBtn"
                                    type="button"
                                    onClick={() => {
                                        setKabupatenId("");
                                        setKecamatanId("");
                                    }}
                                    title="Reset filter"
                                >
                                    <FiX />
                                </button>
                            )}
                        </div>
                    </div>

                    {err && <div className="vd-error">{err}</div>}
                </div>

                <div className="vd-grid">
                    {loading ? (
                        <div className="vd-loading">Memuat data...</div>
                    ) : pageItems.length ? (
                        pageItems.map((p) => {
                            const kabName = stripKnownAddressPrefix(
                                kabupatenNameById[p.id_kabupaten] ?? "",
                            );
                            const kecName = stripKnownAddressPrefix(
                                kecamatanNameById[p.id_kecamatan] ?? "",
                            );
                            const loc =
                                [kabName, kecName]
                                    .filter(Boolean)
                                    .join(" • ") || "-";

                            return (
                                <div key={p.id_posbankum} className="vd-card">
                                    <div className="vd-cardHead">
                                        <div className="vd-cardTitle">
                                            {p.nama}
                                        </div>
                                        <div className="vd-cardSub">{loc}</div>
                                    </div>

                                    <div className="vd-docs">
                                        {p.docs.map((d) => {
                                            const tone =
                                                d.status === "disetujui"
                                                    ? "is-ok"
                                                    : d.status === "ditolak"
                                                      ? "is-no"
                                                      : "is-wait";

                                            return (
                                                <div
                                                    key={d.key}
                                                    className={`vd-docPill ${tone}`}
                                                >
                                                    <div className="vd-docLeft">
                                                        <span
                                                            className={`vd-docStatus ${tone}`}
                                                            title={d.status}
                                                        >
                                                            {renderDocIcon(
                                                                d.status,
                                                            )}
                                                        </span>
                                                        <div className="vd-docMeta">
                                                            <div className="vd-docLabel">
                                                                {d.label}
                                                            </div>
                                                            <div className="vd-docDate">
                                                                {d.tanggal}
                                                                {d.fileCount > 1
                                                                    ? ` • ${d.fileCount} Foto`
                                                                    : ""}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        className="vd-eyeBtn"
                                                        type="button"
                                                        disabled={
                                                            !d.path &&
                                                            d.key !==
                                                                "tagging_area"
                                                        }
                                                        title={
                                                            !d.path &&
                                                            d.key !==
                                                                "tagging_area"
                                                                ? "Belum ada berkas"
                                                                : "Lihat"
                                                        }
                                                        onClick={() =>
                                                            openPreview(
                                                                d,
                                                                p.id_posbankum,
                                                            )
                                                        }
                                                    >
                                                        <FiEye />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="vd-emptyCard">
                            <div className="vd-emptyIcon">
                                <FiFileText />
                            </div>
                            <h2>Tidak Ada Data Ditemukan</h2>
                            <p>
                                Tidak ada data posbankum yang sesuai dengan
                                filter yang dipilih.
                            </p>
                        </div>
                    )}
                </div>

                <div className="vd-pagination">
                    <button
                        className="vd-pageNav"
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pageClamped <= 1}
                        aria-label="Prev"
                    >
                        <FiChevronLeft />
                    </button>

                    {Array.from(
                        { length: Math.min(3, totalPages) },
                        (_, i) => i + 1,
                    ).map((n) => (
                        <button
                            key={n}
                            className={`vd-pageBtn ${pageClamped === n ? "is-active" : ""}`}
                            type="button"
                            onClick={() => setPage(n)}
                            disabled={n > totalPages}
                        >
                            {n}
                        </button>
                    ))}

                    <button
                        className="vd-pageNav"
                        type="button"
                        onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={pageClamped >= totalPages}
                        aria-label="Next"
                    >
                        <FiChevronRight />
                    </button>
                </div>

                {previewOpen && previewMode === "file" && (
                    <div
                        className="vd-overlay"
                        onMouseDown={closePreview}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="vd-previewModal"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="vd-previewHead">
                                <div>
                                    <div className="vd-previewTitle">
                                        {currentPreviewName}
                                    </div>
                                    <div className="vd-previewSub">
                                        {currentPreviewKategori}
                                    </div>
                                </div>

                                <button
                                    className="vd-previewClose"
                                    type="button"
                                    onClick={closePreview}
                                    aria-label="Tutup"
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="vd-previewToolbar">
                                <div className="vd-previewToolbarLeft">
                                    <span className="vd-dots">...</span>
                                    <div className="vd-previewCounter">
                                        <button
                                            type="button"
                                            onClick={prevPreview}
                                            disabled={previewItems.length <= 1}
                                            aria-label="Sebelumnya"
                                        >
                                            &lt;
                                        </button>
                                        <span>
                                            {previewItems.length
                                                ? previewIndex + 1
                                                : 0}{" "}
                                            / {previewItems.length || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={nextPreview}
                                            disabled={previewItems.length <= 1}
                                            aria-label="Berikutnya"
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                </div>

                                <div className="vd-zoomMock">
                                    <span>-</span>
                                    <b>100%</b>
                                    <span>+</span>
                                </div>

                                <a
                                    className="vd-downloadBtn"
                                    href={currentPreviewUrl || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => {
                                        if (!currentPreviewUrl)
                                            e.preventDefault();
                                    }}
                                >
                                    <FiDownload />
                                    <span>Download</span>
                                </a>
                            </div>

                            <div className="vd-previewBody">
                                <div
                                    className={`vd-docPaper ${currentIsImage ? "is-image" : ""}`}
                                >
                                    {previewLoading ? (
                                        <div className="vd-previewEmpty">
                                            Memuat preview...
                                        </div>
                                    ) : !currentPreviewUrl ? (
                                        <div className="vd-previewEmpty">
                                            <FiFileText className="vd-previewEmptyIcon" />
                                            <div>Berkas tidak tersedia.</div>
                                        </div>
                                    ) : currentIsImage ? (
                                        <img
                                            className="vd-previewImg"
                                            src={currentPreviewUrl}
                                            alt={currentPreviewName}
                                        />
                                    ) : (
                                        <iframe
                                            className="vd-previewFrame"
                                            src={currentPreviewUrl}
                                            title={currentPreviewName}
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="vd-previewFoot">
                                <div className="vd-previewActions">
                                    {renderPreviewActions()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {previewOpen && previewMode === "tagging" && (
                    <div
                        className="vd-overlay"
                        onMouseDown={closePreview}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="vd-locationModal"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="vd-locationHead">
                                <div className="vd-locationHeadTitle">
                                    <FiMapPin />
                                    Tagging Area Posbankum
                                </div>
                                <button
                                    className="vd-previewClose"
                                    type="button"
                                    onClick={closePreview}
                                    disabled={verifyBusy}
                                    aria-label="Tutup"
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="vd-locationBody">
                                <div
                                    className={`vd-locationMeta ${locDirty ? "is-dirty" : ""}`}
                                >
                                    <b>{selectedDoc?.posName || "-"}</b>
                                    <span>
                                        {selectedDoc?.kabName || "-"} •{" "}
                                        {selectedDoc?.kecName || "-"}
                                    </span>
                                </div>

                                <div className="vd-locSearchRow">
                                    <div className="vd-locSearch">
                                        <FiSearch className="vd-locSearchIcon" />
                                        <input
                                            className="vd-locSearchInput"
                                            placeholder="Cari lokasi (contoh: Jl. Sudirman, Pekanbaru)"
                                            value={locQuery}
                                            onChange={(e) => {
                                                setLocQuery(e.target.value);
                                                if (locErr) setLocErr("");
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    searchLocation();
                                            }}
                                            disabled={
                                                verifyBusy || locSearching
                                            }
                                        />
                                    </div>

                                    <button
                                        className="vd-locCariBtn"
                                        type="button"
                                        onClick={searchLocation}
                                        disabled={verifyBusy || locSearching}
                                    >
                                        {locSearching ? "Mencari..." : "Cari"}
                                    </button>

                                    <button
                                        className="vd-locGpsBtn"
                                        type="button"
                                        onClick={useMyLocation}
                                        title="Gunakan lokasi saat ini"
                                        disabled={verifyBusy || locSearching}
                                    >
                                        <MdLocationSearching />
                                    </button>
                                </div>

                                {locErr ? (
                                    <div
                                        className="vd-locSearchWarning"
                                        role="alert"
                                    >
                                        {locErr}
                                    </div>
                                ) : null}

                                <div className="vd-mapWrap">
                                    <div className="vd-mapShell">
                                        <div className="vd-mapInfoCard">
                                            <div className="vd-mapInfoCoords">
                                                {locDraft.lat && locDraft.lng
                                                    ? `${locDraft.lat}, ${locDraft.lng}`
                                                    : "Klik peta untuk pilih lokasi"}
                                            </div>
                                            <div className="vd-mapInfoAddr">
                                                {locDraft.alamat ||
                                                    "Alamat akan terisi setelah lokasi dipilih"}
                                            </div>
                                            {locDraft.lat && locDraft.lng ? (
                                                <a
                                                    className="vd-mapInfoLink"
                                                    href={buildGoogleMapsLink(
                                                        locDraft.lat,
                                                        locDraft.lng,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Lihat peta lebih besar
                                                </a>
                                            ) : null}
                                        </div>

                                        <div
                                            className="vd-mapBox"
                                            ref={mapBoxRef}
                                        ></div>
                                    </div>
                                </div>

                                <div className="vd-locFormGrid">
                                    <div className="vd-field">
                                        <div className="vd-fieldLabel">
                                            Latitude
                                        </div>
                                        <input
                                            className="vd-fieldInput"
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
                                            disabled={verifyBusy}
                                        />
                                    </div>

                                    <div className="vd-field">
                                        <div className="vd-fieldLabel">
                                            Longitude
                                        </div>
                                        <input
                                            className="vd-fieldInput"
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
                                            disabled={verifyBusy}
                                        />
                                    </div>
                                </div>

                                <div className="vd-field vd-fieldAlamat">
                                    <div className="vd-fieldLabel">
                                        Alamat Singkat
                                    </div>
                                    <textarea
                                        className="vd-fieldTextarea"
                                        placeholder="Contoh: Kelurahan Air Hitam, Kec. Payung Sekaki, Kota Pekanbaru"
                                        value={locDraft.alamat}
                                        onChange={(e) => {
                                            setLocDraft((prev) => ({
                                                ...prev,
                                                alamat: e.target.value,
                                            }));
                                            setLocDirty(true);
                                        }}
                                        disabled={verifyBusy}
                                    />
                                </div>

                                <div className="vd-tip">
                                    <FiInfo />
                                    <span>
                                        <b>Tip:</b> Geser marker atau klik pada
                                        peta untuk memilih koordinat, atau
                                        gunakan tombol lokasi untuk mendapatkan
                                        posisi saat ini.
                                    </span>
                                </div>

                                <div className="vd-locationActions">
                                    <div className="vd-previewActions">
                                        {renderPreviewActions()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {rejectOpen && selectedDoc && (
                    <div
                        className="vd-rejectOverlay"
                        onMouseDown={() => !verifyBusy && setRejectOpen(false)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="vd-rejectModal"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="vd-rejectHead">
                                <div className="vd-rejectIcon">
                                    <FiX />
                                </div>
                                <div>
                                    <div className="vd-rejectTitle">
                                        Tolak Dokumen
                                    </div>
                                    <div className="vd-rejectSub">
                                        Konfirmasi Verifikasi
                                    </div>
                                </div>
                            </div>

                            <div className="vd-rejectBody">
                                <div className="vd-rejectDetail">
                                    <div className="vd-rejectDetailTitle">
                                        <FiFileText />
                                        <span>Detail Dokumen</span>
                                    </div>
                                    <div className="vd-rejectInfo">
                                        <b>Posbankum:</b>{" "}
                                        <span>
                                            {selectedDoc.posName || "-"}
                                        </span>
                                    </div>
                                    <div className="vd-rejectInfo">
                                        <b>Kategori:</b>{" "}
                                        <span>{selectedDoc.label || "-"}</span>
                                    </div>
                                    <div className="vd-rejectInfo">
                                        <b>File:</b>{" "}
                                        <span>
                                            {selectedDoc.viewerType ===
                                            "tagging_area"
                                                ? "Tagging Area"
                                                : selectedDoc.name ||
                                                  currentPreviewName ||
                                                  "-"}
                                        </span>
                                    </div>
                                </div>

                                <label className="vd-rejectLabel">
                                    Alasan Penolakan <span>*</span>
                                </label>
                                <textarea
                                    className="vd-rejectTextarea"
                                    placeholder="Jelaskan alasan penolakan dokumen..."
                                    value={rejectReason}
                                    onChange={(e) =>
                                        setRejectReason(e.target.value)
                                    }
                                    disabled={verifyBusy}
                                />

                                <div className="vd-rejectWarning">
                                    <AiOutlineCloseCircle />
                                    <span>
                                        Dokumen akan ditolak dan Posbankum harus
                                        mengunggah ulang dokumen yang sesuai.
                                    </span>
                                </div>

                                <div className="vd-rejectActions">
                                    <button
                                        className="vd-rejectCancel"
                                        type="button"
                                        onClick={() => setRejectOpen(false)}
                                        disabled={verifyBusy}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        className="vd-rejectSubmit"
                                        type="button"
                                        onClick={confirmReject}
                                        disabled={
                                            !rejectReason.trim() || verifyBusy
                                        }
                                    >
                                        {verifyBusy ? "Memproses..." : "Tolak"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
