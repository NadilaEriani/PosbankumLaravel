import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiSearch,
    FiX,
    FiFileText,
    FiChevronDown,
    FiChevronUp,
    FiMapPin,
    FiEye,
    FiClock,
    FiAlertCircle,
    FiFilter,
    FiCheck,
    FiDownload,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import icon from "../../assets/icon.png";
import "../../../css/dataPosbankum.css";

function stripKotaPrefix(value) {
    return String(value || "")
        .trim()
        .replace(/^(kota|kabupaten|kab\.?)\s+/i, "");
}

function norm(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function firstValue(source, keys, fallback = "") {
    for (const key of keys) {
        const value = source?.[key];
        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}

function normalizeStatus(value) {
    const status = norm(value);

    if (
        [
            "setuju",
            "disetujui",
            "approved",
            "approve",
            "ok",
            "diterima",
        ].includes(status)
    ) {
        return "disetujui";
    }

    if (["tolak", "ditolak", "rejected", "reject", "bad"].includes(status)) {
        return "ditolak";
    }

    return "menunggu";
}

function formatTanggal(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function pickTimestamp(row) {
    return firstValue(
        row,
        [
            "tgl_upload",
            "tanggal_upload",
            "uploaded_at",
            "created_at",
            "updated_at",
        ],
        null,
    );
}

function pickPath(row) {
    return firstValue(
        row,
        ["path_berkas", "path", "file_path", "file_url", "url", "public_url"],
        "",
    );
}

function pickMime(row) {
    return firstValue(row, ["mime_type", "mime"], "");
}

function pickName(row) {
    return firstValue(row, ["nama_berkas", "name", "file_name"], "Berkas");
}

function assetUrl(path) {
    const value = String(path ?? "").trim();
    if (!value) return "";

    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
        return value;
    }

    const clean = value.replace(/^public\//, "").replace(/^\/+/, "");
    if (clean.startsWith("storage/")) return `/${clean}`;

    return `/storage/${clean}`;
}

function hasTaggingArea(pos) {
    const lat = Number(
        firstValue(pos, ["latitude", "lat", "latitude_pos"], ""),
    );
    const lng = Number(
        firstValue(pos, ["longitude", "lng", "long", "longitude_pos"], ""),
    );

    return Number.isFinite(lat) && Number.isFinite(lng);
}

function isChangedAfterCreate(createdAt, updatedAt) {
    if (!createdAt || !updatedAt) return false;

    const createdMs = new Date(createdAt).getTime();
    const updatedMs = new Date(updatedAt).getTime();

    if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs))
        return false;

    return updatedMs - createdMs > 1000;
}

function buildOsmEmbed(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";

    const delta = 0.004;
    const left = lo - delta;
    const right = lo + delta;
    const top = la + delta;
    const bottom = la - delta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${la}%2C${lo}`;
}

function buildGoogleMapsLink(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";

    return `https://www.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}`;
}

function isImagePreview(item) {
    const mime = String(item?.mime || item?.mime_type || "").toLowerCase();
    const name = String(
        item?.name || item?.nama_berkas || item?.url || "",
    ).toLowerCase();

    return (
        mime.startsWith("image/") ||
        /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
    );
}

function sortUploads(items = []) {
    return [...items].sort((a, b) => {
        const timeA = new Date(pickTimestamp(a) || 0).getTime() || 0;
        const timeB = new Date(pickTimestamp(b) || 0).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;

        return String(pickName(a)).localeCompare(String(pickName(b)));
    });
}

function DpDropdown({
    value,
    onChange,
    placeholder,
    options,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const isEmptyValue = value === "" || value === null || value === undefined;
    const selectedLabel = !isEmptyValue
        ? (options || []).find((item) => String(item.value) === String(value))
              ?.label || ""
        : "";

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    useEffect(() => {
        const onDown = (event) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(event.target)) setOpen(false);
        };

        const onKey = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div className={`dp-dd ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
            <button
                type="button"
                className="dp-ddBtn"
                onClick={() => !disabled && setOpen((state) => !state)}
                aria-expanded={open}
                disabled={disabled}
            >
                <FiFilter className="dp-ddIcon" />
                <span
                    className={`dp-ddText ${selectedLabel ? "" : "is-placeholder"}`}
                >
                    {selectedLabel || placeholder}
                </span>
                <FiChevronDown
                    className={`dp-ddChevron ${open ? "is-open" : ""}`}
                />
            </button>

            {open && !disabled ? (
                <div className="dp-ddMenu" role="listbox">
                    {(options || []).map((option) => {
                        const isActive = String(option.value) === String(value);

                        return (
                            <button
                                key={`${option.value}-${option.label}`}
                                type="button"
                                className={`dp-ddItem ${isActive ? "is-active" : ""}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                                {isActive ? (
                                    <FiCheck className="dp-ddCheck" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

const REQUIRED = [
    { label: "SK Posbankum", key: "sk_posbankum" },
    { label: "SK Kab/Kota", key: "sk_kadarkum" },
    { label: "Sapras", key: "sarpras" },
    { label: "Tagging Area", key: "tagging_area" },
];

const KATEGORI_ALIASES = {
    "sk posbankum": "sk_posbankum",
    sk_posbankum: "sk_posbankum",
    "sk pos bankum": "sk_posbankum",
    "sk kab/kota": "sk_kadarkum",
    "sk kab kota": "sk_kadarkum",
    "sk kabupaten/kota": "sk_kadarkum",
    "sk kadarkum": "sk_kadarkum",
    sk_kadarkum: "sk_kadarkum",
    "dokumentasi sarpras": "sarpras",
    "dokumentasi sapras": "sarpras",
    dokumentasi_sarpras: "sarpras",
    dokumentasi_sapras: "sarpras",
    "dok sarpras": "sarpras",
    "dok sapras": "sarpras",
    sarpras: "sarpras",
    sapras: "sarpras",
    "tagging area": "tagging_area",
    "tag area": "tagging_area",
    "topping area": "tagging_area",
    tagging_area: "tagging_area",
};

function canonKategori(value) {
    const key = norm(value);
    return KATEGORI_ALIASES[key] ?? key;
}

function pickTaggingTanggal(pos, taggingLatest) {
    if (taggingLatest) return pickTimestamp(taggingLatest);
    if (!hasTaggingArea(pos)) return null;

    return isChangedAfterCreate(pos?.created_at, pos?.updated_at)
        ? pos?.updated_at
        : null;
}

function pickTaggingRawStatus(pos) {
    return firstValue(
        pos,
        [
            "status_verifikasi_tagging_area",
            "status_tagging_area",
            "status_verifikasi_tagging",
            "status_tagging",
        ],
        "",
    );
}

function hasTaggingVerificationRecord(pos) {
    return Boolean(
        firstValue(
            pos,
            [
                "tgl_verifikasi_tagging_area",
                "tanggal_verifikasi_tagging_area",
                "tgl_verifikasi_tagging",
                "tgl_verifikasi_lokasi",
                "id_user_verifikator_tagging_area",
                "id_user_verifikator_tagging",
                "id_user_verifikator_lokasi",
                "catatan_verifikasi_tagging_area",
                "catatan_tagging_area",
                "catatan_lokasi",
            ],
            "",
        ),
    );
}

function getTaggingStatus(pos, taggingLatest = null) {
    const rawStatus = pickTaggingRawStatus(pos);

    if (rawStatus) {
        const status = normalizeStatus(rawStatus);

        if (status === "menunggu") return "menunggu";
        if (hasTaggingVerificationRecord(pos)) return status;

        return "menunggu";
    }

    if (taggingLatest) {
        const uploadStatus = normalizeStatus(
            taggingLatest.status_verifikasi ?? taggingLatest.status,
        );

        return uploadStatus === "disetujui" || uploadStatus === "ditolak"
            ? uploadStatus
            : "menunggu";
    }

    return "menunggu";
}

function buildKabupatenOptions(rows, kabupatenRows) {
    const map = new Map();

    (kabupatenRows || []).forEach((item) => {
        const id = firstValue(item, ["id_kabupaten", "id"], "");
        const nama = firstValue(item, ["nama", "name", "kabupaten_nama"], "");
        if (id && nama) map.set(String(id), { value: id, label: nama });
    });

    (rows || []).forEach((item) => {
        const id = firstValue(item, ["id_kabupaten", "kabupaten_id"], "");
        const nama = firstValue(
            item,
            ["kabupaten_nama", "kabupaten", "kabupaten_name"],
            "",
        );
        if (id && nama && !map.has(String(id)))
            map.set(String(id), { value: id, label: nama });
    });

    return Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
    );
}

function buildKecamatanOptions(rows, kecamatanRows) {
    const map = new Map();

    (kecamatanRows || []).forEach((item) => {
        const id = firstValue(item, ["id_kecamatan", "id"], "");
        const idKabupaten = firstValue(
            item,
            ["id_kabupaten", "kabupaten_id"],
            "",
        );
        const nama = firstValue(item, ["nama", "name", "kecamatan_nama"], "");
        if (id && nama)
            map.set(String(id), {
                value: id,
                id_kabupaten: idKabupaten,
                label: nama,
            });
    });

    (rows || []).forEach((item) => {
        const id = firstValue(item, ["id_kecamatan", "kecamatan_id"], "");
        const idKabupaten = firstValue(
            item,
            ["id_kabupaten", "kabupaten_id"],
            "",
        );
        const nama = firstValue(
            item,
            ["kecamatan_nama", "kecamatan", "kecamatan_name"],
            "",
        );
        if (id && nama && !map.has(String(id))) {
            map.set(String(id), {
                value: id,
                id_kabupaten: idKabupaten,
                label: nama,
            });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
    );
}

export default function DataPosbankum({
    rows = [],
    kabupatenRows = [],
    kecamatanRows = [],
}) {
    const [tab, setTab] = useState("all");
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [kabupatenId, setKabupatenId] = useState("");
    const [kecamatanId, setKecamatanId] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItems, setPreviewItems] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewMime, setPreviewMime] = useState("");
    const [previewName, setPreviewName] = useState("");
    const [previewKategori, setPreviewKategori] = useState("");
    const [err, setErr] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        setKecamatanId("");
    }, [kabupatenId]);

    useEffect(() => {
        if (!previewOpen) return undefined;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (event) => {
            if (event.key === "Escape") setPreviewOpen(false);

            if (event.key === "ArrowLeft" && previewItems.length > 1) {
                setPreviewIndex((index) =>
                    index === 0
                        ? previewItems.length - 1
                        : Math.max(0, index - 1),
                );
            }

            if (event.key === "ArrowRight" && previewItems.length > 1) {
                setPreviewIndex((index) =>
                    index >= previewItems.length - 1
                        ? 0
                        : Math.min(previewItems.length - 1, index + 1),
                );
            }
        };

        window.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [previewOpen, previewItems.length]);

    const normalizedRows = useMemo(() => {
        return (Array.isArray(rows) ? rows : []).map((row, index) => ({
            ...row,
            id_posbankum: firstValue(
                row,
                ["id_posbankum", "id", "posbankum_id"],
                index + 1,
            ),
            nama: firstValue(
                row,
                ["nama", "name", "nama_posbankum"],
                `Posbankum ${index + 1}`,
            ),
            alamat: firstValue(
                row,
                ["alamat", "address", "lokasi"],
                "Alamat belum tersedia",
            ),
            id_kabupaten: firstValue(row, ["id_kabupaten", "kabupaten_id"], ""),
            id_kecamatan: firstValue(row, ["id_kecamatan", "kecamatan_id"], ""),
            kabupaten_nama: firstValue(
                row,
                ["kabupaten_nama", "kabupaten", "kabupaten_name"],
                "",
            ),
            kecamatan_nama: firstValue(
                row,
                ["kecamatan_nama", "kecamatan", "kecamatan_name"],
                "",
            ),
            latitude: firstValue(row, ["latitude", "lat", "latitude_pos"], ""),
            longitude: firstValue(
                row,
                ["longitude", "lng", "long", "longitude_pos"],
                "",
            ),
            uploads: Array.isArray(row?.uploads) ? row.uploads : [],
        }));
    }, [rows]);

    const kabupatenOpts = useMemo(
        () => buildKabupatenOptions(normalizedRows, kabupatenRows),
        [normalizedRows, kabupatenRows],
    );

    const kecamatanAll = useMemo(
        () => buildKecamatanOptions(normalizedRows, kecamatanRows),
        [normalizedRows, kecamatanRows],
    );

    const kecamatanOpts = useMemo(() => {
        if (!kabupatenId) return [];
        return kecamatanAll.filter(
            (item) => String(item.id_kabupaten) === String(kabupatenId),
        );
    }, [kecamatanAll, kabupatenId]);

    const enrichedRows = useMemo(() => {
        return normalizedRows.map((pos) => {
            const uploads = Array.isArray(pos.uploads) ? pos.uploads : [];
            const latestByKey = {};
            const groupedByKey = {};

            for (const upload of uploads) {
                const key = canonKategori(upload?.kategori);
                if (!key) continue;
                if (!groupedByKey[key]) groupedByKey[key] = [];
                groupedByKey[key].push(upload);
            }

            Object.keys(groupedByKey).forEach((key) => {
                groupedByKey[key] = sortUploads(groupedByKey[key]);
                latestByKey[key] = groupedByKey[key][0];
            });

            const docsOk = REQUIRED.filter(
                (req) => req.key !== "tagging_area",
            ).every((req) => {
                const upload = latestByKey[req.key];
                return (
                    upload &&
                    pickPath(upload) &&
                    normalizeStatus(
                        upload.status_verifikasi ?? upload.status,
                    ) === "disetujui"
                );
            });

            const taggingUpload = latestByKey.tagging_area;
            const taggingStatus = getTaggingStatus(pos, taggingUpload);
            const taggingHasData =
                hasTaggingArea(pos) ||
                Boolean(taggingUpload && pickPath(taggingUpload));
            const taggingOk = taggingHasData && taggingStatus === "disetujui";

            const completeness =
                docsOk && taggingOk ? "complete" : "incomplete";

            const detailRows = REQUIRED.map((req) => {
                if (req.key === "tagging_area") {
                    const taggingUploads = groupedByKey.tagging_area ?? [];
                    const taggingLatest = taggingUploads[0];
                    const hasCoords = hasTaggingArea(pos);
                    const taggingDate = pickTaggingTanggal(pos, taggingLatest);

                    if (hasCoords) {
                        return {
                            kategori: req.label,
                            tanggal: formatTanggal(taggingDate),
                            status: getTaggingStatus(pos, taggingLatest),
                            path: "__tagging_area__",
                            viewerType: "tagging_area",
                            latitude: pos.latitude,
                            longitude: pos.longitude,
                            alamat: pos.alamat || "",
                            fileCount: hasCoords ? 1 : taggingUploads.length,
                        };
                    }

                    if (taggingLatest) {
                        return {
                            kategori: req.label,
                            tanggal: formatTanggal(taggingDate),
                            status: normalizeStatus(
                                taggingLatest.status_verifikasi ??
                                    taggingLatest.status,
                            ),
                            path: pickPath(taggingLatest),
                            mime_type: pickMime(taggingLatest),
                            nama_berkas: pickName(taggingLatest),
                            files: taggingUploads,
                            fileCount: taggingUploads.length,
                        };
                    }

                    return {
                        kategori: req.label,
                        tanggal: "-",
                        status: "menunggu",
                        path: "",
                        mime_type: "",
                        nama_berkas: "",
                        fileCount: 0,
                    };
                }

                const files = groupedByKey[req.key] ?? [];
                const upload = files[0];

                return {
                    kategori: req.label,
                    tanggal: upload
                        ? formatTanggal(pickTimestamp(upload))
                        : "-",
                    status: normalizeStatus(
                        upload?.status_verifikasi ?? upload?.status,
                    ),
                    path: upload ? pickPath(upload) : "",
                    mime_type: upload ? pickMime(upload) : "",
                    nama_berkas: upload ? pickName(upload) : "",
                    files,
                    fileCount: files.length,
                };
            });

            return {
                ...pos,
                completeness,
                detailRows,
            };
        });
    }, [normalizedRows]);

    const stats = useMemo(() => {
        let menunggu = 0;
        let tidakLengkap = 0;

        for (const row of enrichedRows) {
            if (row.completeness === "incomplete") tidakLengkap += 1;

            for (const upload of row.uploads || []) {
                if (
                    normalizeStatus(
                        upload?.status_verifikasi ?? upload?.status,
                    ) === "menunggu"
                ) {
                    menunggu += 1;
                }
            }
        }

        return {
            aktif: enrichedRows.length,
            menunggu,
            tidakLengkap,
        };
    }, [enrichedRows]);

    const filteredRows = useMemo(() => {
        const search = norm(debouncedQ);

        return enrichedRows.filter((item) => {
            if (tab !== "all" && item.completeness !== tab) return false;
            if (
                kabupatenId &&
                String(item.id_kabupaten) !== String(kabupatenId)
            )
                return false;
            if (
                kecamatanId &&
                String(item.id_kecamatan) !== String(kecamatanId)
            )
                return false;

            if (!search) return true;

            return [
                item.nama,
                item.alamat,
                item.kabupaten_nama,
                item.kecamatan_nama,
                ...(item.uploads || []).map((upload) => upload?.kategori),
            ]
                .map((value) => norm(value))
                .join(" ")
                .includes(search);
        });
    }, [enrichedRows, tab, debouncedQ, kabupatenId, kecamatanId]);

    useEffect(() => {
        setExpandedId((current) => {
            if (!current) return null;
            return filteredRows.some(
                (item) => String(item.id_posbankum) === String(current),
            )
                ? current
                : null;
        });
    }, [filteredRows]);

    const tabs = useMemo(
        () => [
            { key: "all", label: "Semua Posbankum" },
            { key: "complete", label: "Posbankum Data Lengkap" },
            { key: "incomplete", label: "Posbankum Data Tidak lengkap" },
        ],
        [],
    );

    const openFile = (row) => {
        setErr("");
        setPreviewItems([]);
        setPreviewIndex(0);

        if (row?.viewerType === "tagging_area") {
            const mapUrl = buildOsmEmbed(row?.latitude, row?.longitude);
            const mapsLink = buildGoogleMapsLink(row?.latitude, row?.longitude);

            if (!mapUrl) return;

            const item = {
                type: "map",
                url: mapUrl,
                mapsLink,
                name: "Tagging Area",
                kategori: row?.kategori || "Tagging Area",
                alamat: row?.alamat || "",
                latitude: row?.latitude,
                longitude: row?.longitude,
            };

            setPreviewItems([item]);
            setPreviewUrl(mapUrl);
            setPreviewMime("map");
            setPreviewName(item.name);
            setPreviewKategori(item.kategori);
            setPreviewOpen(true);
            return;
        }

        const files =
            Array.isArray(row?.files) && row.files.length ? row.files : [row];
        const cleanFiles = files.filter((item) => pickPath(item));

        if (!cleanFiles.length) return;

        const items = cleanFiles
            .map((item) => {
                const url = assetUrl(pickPath(item));
                if (!url) return null;

                return {
                    type: "file",
                    url,
                    mime: pickMime(item) || row?.mime_type || "",
                    name: pickName(item) || row?.nama_berkas || "Berkas",
                    kategori: item?.kategori || row?.kategori || "",
                    row: item,
                };
            })
            .filter(Boolean);

        if (!items.length) return;

        setPreviewItems(items);
        setPreviewUrl(items[0]?.url || "");
        setPreviewMime(items[0]?.mime || "");
        setPreviewName(items[0]?.name || "Berkas");
        setPreviewKategori(row?.kategori || items[0]?.kategori || "");
        setPreviewOpen(true);
    };

    const currentPreview = previewItems[previewIndex] || null;
    const previewIsMap = currentPreview?.type === "map";
    const previewDisplayName = currentPreview?.name || previewName || "Berkas";
    const previewDisplayKategori =
        currentPreview?.kategori || previewKategori || "";
    const previewDisplayUrl = currentPreview?.url || previewUrl || "";

    const prevPreview = () => {
        if (previewItems.length <= 1) return;
        setPreviewIndex((index) =>
            index === 0 ? previewItems.length - 1 : index - 1,
        );
    };

    const nextPreview = () => {
        if (previewItems.length <= 1) return;
        setPreviewIndex((index) =>
            index >= previewItems.length - 1 ? 0 : index + 1,
        );
    };

    const renderStatus = (status) => {
        if (status === "disetujui") {
            return (
                <span className="dp-status is-ok">
                    <BsCheck2Circle />
                    <span>Setuju</span>
                </span>
            );
        }

        if (status === "ditolak") {
            return (
                <span className="dp-status is-reject">
                    <AiOutlineCloseCircle />
                    <span>Tolak</span>
                </span>
            );
        }

        return (
            <span className="dp-status is-warn">
                <FiClock />
                <span>Menunggu</span>
            </span>
        );
    };

    return (
        <section className="ad-pagePad">
            <div className="dp">
                {err ? <div className="dp-errorBox">{err}</div> : null}

                <div className="dp-topBoxes">
                    <div className="dp-topBox tone-green">
                        <div className="dp-topBoxInner">
                            <div
                                className="dp-topIcon is-green"
                                aria-hidden="true"
                            >
                                <img src={icon} alt="" className="dp-imgIcon" />
                            </div>
                            <div className="dp-topText">
                                <div className="dp-topTitle">
                                    Posbankum Aktif
                                </div>
                                <div className="dp-topValue">{stats.aktif}</div>
                                <div className="dp-topHint">
                                    Data lengkap & terverifikasi
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dp-topBox tone-yellow">
                        <div className="dp-topBoxInner">
                            <div
                                className="dp-topIcon is-yellow"
                                aria-hidden="true"
                            >
                                <FiClock />
                            </div>
                            <div className="dp-topText">
                                <div className="dp-topTitle">
                                    Menunggu Verifikasi
                                </div>
                                <div className="dp-topValue">
                                    {stats.menunggu}
                                </div>
                                <div className="dp-topHint">
                                    Dokumen belum diverifikasi
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dp-topBox tone-blue">
                        <div className="dp-topBoxInner">
                            <div
                                className="dp-topIcon is-red"
                                aria-hidden="true"
                            >
                                <FiAlertCircle />
                            </div>
                            <div className="dp-topText">
                                <div className="dp-topTitle">
                                    Data Tidak Lengkap
                                </div>
                                <div className="dp-topValue">
                                    {stats.tidakLengkap}
                                </div>
                                <div className="dp-topHint">
                                    Perlu dilengkapi
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dp-filterCard">
                    <div className="dp-toolbar">
                        <div className="dp-search">
                            <FiSearch className="dp-searchIcon" />
                            <input
                                className="dp-searchInput"
                                placeholder="Pencarian..."
                                value={q}
                                onChange={(event) => setQ(event.target.value)}
                            />
                            {q ? (
                                <button
                                    className="dp-clearBtn"
                                    type="button"
                                    onClick={() => setQ("")}
                                    aria-label="Clear"
                                >
                                    <FiX />
                                </button>
                            ) : null}
                        </div>

                        <div className="dp-filterRow">
                            <DpDropdown
                                value={kabupatenId}
                                onChange={setKabupatenId}
                                placeholder="Pilih Kabupaten"
                                options={[
                                    { value: "", label: "Semua" },
                                    ...kabupatenOpts.map((item) => ({
                                        value: item.value,
                                        label: item.label,
                                    })),
                                ]}
                            />

                            <DpDropdown
                                value={kecamatanId}
                                onChange={setKecamatanId}
                                placeholder="Pilih Kecamatan"
                                disabled={!kabupatenId}
                                options={[
                                    { value: "", label: "Semua" },
                                    ...kecamatanOpts.map((item) => ({
                                        value: item.value,
                                        label: item.label,
                                    })),
                                ]}
                            />

                            {kabupatenId || kecamatanId ? (
                                <button
                                    className="dp-resetFilterBtn"
                                    type="button"
                                    onClick={() => {
                                        setKabupatenId("");
                                        setKecamatanId("");
                                    }}
                                    title="Reset filter"
                                >
                                    <FiX />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="dp-divider" />

                    <div className="dp-tabs">
                        {tabs.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`dp-tab ${tab === item.key ? "is-active" : ""}`}
                                onClick={() => setTab(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="dp-list">
                    {filteredRows.length ? (
                        filteredRows.map((item) => {
                            const id = item.id_posbankum;
                            const isOpen = String(expandedId) === String(id);
                            const kabName = stripKotaPrefix(
                                item.kabupaten_nama || "",
                            );
                            const kecName = stripKotaPrefix(
                                item.kecamatan_nama || "",
                            );
                            const loc =
                                [kabName, kecName]
                                    .filter(Boolean)
                                    .join(" • ") || "-";
                            const detailRows = item.detailRows || [];
                            const badgeText =
                                item.completeness === "complete"
                                    ? "Lengkap"
                                    : "Tidak Lengkap";

                            return (
                                <div
                                    key={id}
                                    className={`dp-card ${isOpen ? "is-open" : ""}`}
                                >
                                    <div
                                        className="dp-cardHead"
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isOpen}
                                        onClick={() =>
                                            setExpandedId(isOpen ? null : id)
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                setExpandedId(
                                                    isOpen ? null : id,
                                                );
                                            }
                                        }}
                                    >
                                        <div
                                            className="dp-iconWrap"
                                            aria-hidden="true"
                                        >
                                            <img
                                                src={icon}
                                                alt=""
                                                className="dp-imgIcon"
                                            />
                                        </div>

                                        <div className="dp-titleWrap">
                                            <div className="dp-name">
                                                {item.nama}
                                            </div>
                                            <div className="dp-sub">
                                                <FiMapPin className="dp-subIcon" />
                                                <span className="dp-subText">
                                                    {loc}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="dp-right">
                                            <span
                                                className={`dp-rowBadge ${
                                                    item.completeness ===
                                                    "complete"
                                                        ? "is-ok"
                                                        : "is-warn"
                                                }`}
                                            >
                                                {badgeText}
                                            </span>

                                            <div
                                                className="dp-chevron"
                                                aria-hidden="true"
                                            >
                                                {isOpen ? (
                                                    <FiChevronUp />
                                                ) : (
                                                    <FiChevronDown />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {isOpen ? (
                                        <div
                                            className="dp-cardExpand"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <div className="dp-expandShell">
                                                <table className="dp-expandTable">
                                                    <thead>
                                                        <tr>
                                                            <th>KATEGORI</th>
                                                            <th>
                                                                TANGGAL UNGGAH
                                                            </th>
                                                            <th>STATUS</th>
                                                            <th>AKSI</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detailRows.map(
                                                            (row, index) => (
                                                                <tr
                                                                    key={`${id}-${row.kategori}-${index}`}
                                                                >
                                                                    <td className="dp-tdStrong">
                                                                        <span>
                                                                            {
                                                                                row.kategori
                                                                            }
                                                                        </span>
                                                                        {row.fileCount >
                                                                        1 ? (
                                                                            <span className="dp-fileCount">
                                                                                {
                                                                                    row.fileCount
                                                                                }{" "}
                                                                                Foto
                                                                            </span>
                                                                        ) : null}
                                                                    </td>
                                                                    <td>
                                                                        {
                                                                            row.tanggal
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {renderStatus(
                                                                            row.status,
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        {row.path ? (
                                                                            <button
                                                                                className="dp-viewBtn"
                                                                                type="button"
                                                                                onClick={(
                                                                                    event,
                                                                                ) => {
                                                                                    event.stopPropagation();
                                                                                    openFile(
                                                                                        row,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <FiEye />
                                                                                <span>
                                                                                    Lihat
                                                                                </span>
                                                                            </button>
                                                                        ) : (
                                                                            <span className="dp-muted">
                                                                                -
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>

                                                <div className="dp-expandFoot">
                                                    <button
                                                        className="dp-closeInlineBtn"
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedId(null)
                                                        }
                                                    >
                                                        Tutup
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                    ) : (
                        <div className="dp-emptyCard">
                            <div className="dp-emptyIcon">
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

                {previewOpen ? (
                    <div
                        className="dp-modalOverlay"
                        onMouseDown={() => setPreviewOpen(false)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="dp-modal dp-modalPreview"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className="dp-previewHead">
                                <div className="dp-previewTitleWrap">
                                    <div className="dp-previewTitle">
                                        {previewDisplayName}
                                    </div>
                                    <div className="dp-previewSub">
                                        {previewDisplayKategori}
                                        {previewItems.length > 1
                                            ? ` • ${previewIndex + 1} / ${previewItems.length}`
                                            : ""}
                                    </div>
                                </div>

                                <button
                                    className="dp-previewClose"
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    aria-label="Tutup"
                                >
                                    <FiX />
                                </button>
                            </div>

                            <div className="dp-previewToolbar">
                                <div className="dp-previewToolbarLeft">
                                    {previewItems.length > 1 ? (
                                        <div className="dp-previewCounter">
                                            <button
                                                type="button"
                                                onClick={prevPreview}
                                                aria-label="Foto sebelumnya"
                                            >
                                                &lt;
                                            </button>
                                            <span>
                                                {previewIndex + 1} /{" "}
                                                {previewItems.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={nextPreview}
                                                aria-label="Foto berikutnya"
                                            >
                                                &gt;
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                {!previewIsMap ? (
                                    <a
                                        className="dp-downloadBtn"
                                        href={previewDisplayUrl || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(event) => {
                                            if (!previewDisplayUrl)
                                                event.preventDefault();
                                        }}
                                    >
                                        <FiDownload />
                                        <span>Download</span>
                                    </a>
                                ) : currentPreview?.mapsLink ? (
                                    <a
                                        className="dp-downloadBtn"
                                        href={currentPreview.mapsLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <FiMapPin />
                                        <span>Buka Maps</span>
                                    </a>
                                ) : null}
                            </div>

                            <div className="dp-previewBody">
                                {!previewDisplayUrl ? (
                                    <div className="dp-previewEmpty">
                                        Berkas tidak tersedia.
                                    </div>
                                ) : previewIsMap ? (
                                    <div className="dp-mapPreviewWrap">
                                        <iframe
                                            src={previewDisplayUrl}
                                            title="Tagging Area"
                                            className="dp-previewFrame"
                                        />
                                        <div className="dp-mapInfo">
                                            <div className="dp-mapInfoTitle">
                                                Lokasi Tagging Area
                                            </div>
                                            <div className="dp-mapInfoText">
                                                {currentPreview?.alamat ||
                                                    "Alamat belum tersedia"}
                                            </div>
                                            <div className="dp-mapInfoCoord">
                                                {currentPreview?.latitude},{" "}
                                                {currentPreview?.longitude}
                                            </div>
                                        </div>
                                    </div>
                                ) : isImagePreview(currentPreview) ? (
                                    <div className="dp-previewMediaWrap">
                                        <img
                                            src={previewDisplayUrl}
                                            alt={previewDisplayName}
                                            className="dp-previewImg"
                                        />
                                    </div>
                                ) : (
                                    <iframe
                                        src={previewDisplayUrl}
                                        title={previewDisplayName}
                                        className="dp-previewFrame"
                                    />
                                )}
                            </div>

                            <div className="dp-modalFoot">
                                <button
                                    className="dp-backBtn"
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
