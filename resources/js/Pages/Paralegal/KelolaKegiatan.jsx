import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiSearch,
    FiUpload,
    FiCalendar,
    FiFileText,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiEdit,
    FiTrash2,
    FiPlus,
    FiX,
    FiMapPin,
    FiEye,
    FiUser,
} from "react-icons/fi";
import SuccessToast from "../../Components/ui/SuccessToast";
import DeleteConfirmModal from "../../Components/ui/DeleteConfirmModal";
import ReminderModal from "../../Components/ui/ReminderModal";
import "../../../css/Paralegal/kelolaKegiatan.css";

const DEFAULT_FORM = {
    judul: "",
    deskripsi: "",
    tgl_mulai: "",
    tgl_selesai: "",
    lokasi: "",
    hasil_kegiatan: "",
    anggota_terlibat: [],
    thumbnailFile: null,
};

const toDateInput = (value) => {
    if (!value) return "";
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
};

const norm = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

function statusKind(statusRaw) {
    const status = norm(statusRaw);

    if (!status) return "process";
    if (status.includes("tolak") || status.includes("reject")) return "reject";

    if (
        status.includes("proses") ||
        status.includes("pending") ||
        status.includes("menunggu") ||
        status.includes("diproses")
    ) {
        return "process";
    }

    if (
        status.includes("terima") ||
        status.includes("setuju") ||
        status.includes("approve") ||
        status.includes("valid") ||
        status.includes("selesai") ||
        status.includes("done") ||
        status.includes("finish")
    ) {
        return "accept";
    }

    return "process";
}

function statusLabel(statusRaw) {
    const kind = statusKind(statusRaw);

    if (kind === "process") return "Menunggu";
    if (kind === "reject") return "Ditolak";

    return "Disetujui";
}

function pickFirst(obj, keys) {
    for (const key of keys) {
        const value = obj?.[key];

        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) continue;

        const clean = String(value).trim();

        if (clean) return clean;
    }

    return "";
}

function parseListValue(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === "string") return item.trim();
                return String(
                    item?.nama ||
                        item?.name ||
                        item?.full_name ||
                        item?.nama_paralegal ||
                        "",
                ).trim();
            })
            .filter(Boolean);
    }

    if (typeof value === "object") {
        return Object.values(value)
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    const raw = String(value || "").trim();
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return parseListValue(parsed);
    } catch {
        return raw
            .split(/[,;\n]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
}

function getAnggotaList(item) {
    return [
        ...parseListValue(item?.anggota_terlibat),
        ...parseListValue(item?.anggota),
        ...parseListValue(item?.peserta_terlibat),
        ...parseListValue(item?.tim_terlibat),
    ].filter((name, index, arr) => arr.indexOf(name) === index);
}

function normalizeParalegalOptions(options = []) {
    return (options || [])
        .map((item, index) => {
            const id =
                item?.id_paralegal ??
                item?.id ??
                item?.id_user ??
                `paralegal-${index}`;
            const nama =
                item?.nama_paralegal ??
                item?.nama ??
                item?.nama_lengkap ??
                item?.name ??
                "";

            return {
                ...item,
                id_paralegal: id,
                nama_paralegal: nama,
            };
        })
        .filter((item) => item.id_paralegal && item.nama_paralegal);
}

function buildAnggotaPayload(selectedIds, options) {
    return (selectedIds || [])
        .map((id) => {
            const found = (options || []).find(
                (item) => String(item.id_paralegal) === String(id),
            );
            return found?.nama_paralegal || "";
        })
        .filter(Boolean);
}

function resolveSelectedAnggota(item, options) {
    const savedNames = getAnggotaList(item);
    if (!savedNames.length) return [];

    const normalizedNames = savedNames.map((name) => norm(name));

    return (options || [])
        .filter((member) =>
            normalizedNames.includes(norm(member.nama_paralegal)),
        )
        .map((member) => member.id_paralegal);
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatShortText(value, max = 120) {
    const text = String(value || "").trim();

    if (!text) return "-";
    if (text.length <= max) return text;

    return `${text.slice(0, max).trim()}...`;
}

function getThumbUrl(itemOrPath) {
    const raw =
        typeof itemOrPath === "object"
            ? itemOrPath?.thumbnail_url ||
              itemOrPath?.thumb_url ||
              itemOrPath?.image_url ||
              itemOrPath?.thumbnail_path
            : itemOrPath;

    const clean = String(raw || "").trim();

    if (!clean) return null;
    if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
    if (clean.startsWith("/file-preview")) return clean;
    if (clean.startsWith("file-preview")) return `/${clean}`;

    const pathOnly = clean.split("#")[0].split("?")[0];
    const normalized = pathOnly
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^(storage|public|app\/public)\//i, "")
        .replace(/^\/+/, "");

    if (!normalized) return null;
    return `/file-preview?path=${encodeURIComponent(normalized)}`;
}

function fileNameFromPath(value) {
    const clean = String(value || "")
        .split("#")[0]
        .split("?")[0]
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean)
        .pop();

    return clean ? decodeURIComponent(clean) : "Dokumentasi kegiatan";
}

function fileExt(value) {
    const name = fileNameFromPath(value).toLowerCase();
    const match = name.match(/\.([a-z0-9]+)$/i);

    return match ? match[1] : "";
}

function isPdfFileValue(value) {
    const text = String(value || "").toLowerCase();
    return text.includes("application/pdf") || fileExt(text) === "pdf";
}

function isImageFileValue(value) {
    const text = String(value || "").toLowerCase();
    if (text.startsWith("data:image/") || text.startsWith("blob:")) return true;

    return ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(
        fileExt(text),
    );
}

function formatDateRange(start, end) {
    const startLabel = formatDate(start);
    const endLabel = formatDate(end || start);

    if (startLabel === "-" && endLabel === "-") return "-";
    if (startLabel === endLabel) return startLabel;

    return `${startLabel} - ${endLabel}`;
}

function cleanPosName(value) {
    return String(value || "")
        .replace(/^posbankum\s+/i, "")
        .trim();
}

function getReporterName(item, options, profile, currentPosbankum) {
    const direct = pickFirst(item, [
        "nama_pelapor",
        "pelapor",
        "created_by_nama",
        "created_by_name",
        "nama_user",
        "nama_paralegal",
        "reporter_name",
    ]);

    const posName = cleanPosName(
        currentPosbankum?.nama || currentPosbankum?.name || "",
    );

    if (direct) {
        return posName && !direct.toLowerCase().includes("paralegal")
            ? `${direct} (Paralegal ${posName})`
            : direct;
    }

    const createdId = pickFirst(item, [
        "created_by",
        "id_user",
        "id_paralegal",
    ]);
    if (createdId) {
        const found = (options || []).find((member) =>
            [member?.id_paralegal, member?.id, member?.id_user].some(
                (id) => String(id || "") === String(createdId),
            ),
        );
        const name = found?.nama_paralegal || found?.nama || found?.name || "";
        if (name) {
            return posName ? `${name} (Paralegal ${posName})` : name;
        }
    }

    const profileName = pickFirst(profile, ["nama_lengkap", "name", "nama"]);
    if (profileName) {
        return posName ? `${profileName} (Paralegal ${posName})` : profileName;
    }

    const anggota = getAnggotaList(item);
    if (anggota.length) {
        return posName ? `${anggota[0]} (Paralegal ${posName})` : anggota[0];
    }

    return posName ? `Paralegal ${posName}` : "Paralegal";
}

function getKegiatanId(item) {
    return item?.id_kegiatan ?? item?.id ?? null;
}

export default function KelolaKegiatan({
    kegiatanRows = [],
    paralegalOptions = [],
    currentPosbankum = {},
    profile = {},
    flash = {},
}) {
    const [loading, setLoading] = useState(false);
    const [kegiatan, setKegiatan] = useState(() => kegiatanRows || []);
    const [search, setSearch] = useState("");
    const [posName, setPosName] = useState("Posbankum");

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteItem, setDeleteItem] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [resubmitModalOpen, setResubmitModalOpen] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [editingItem, setEditingItem] = useState(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState(null);

    const [existingThumbPath, setExistingThumbPath] = useState(null);
    const [thumbPreviewUrl, setThumbPreviewUrl] = useState(null);
    const [thumbPreviewName, setThumbPreviewName] = useState("");
    const [thumbPreviewKind, setThumbPreviewKind] = useState("");

    const [form, setForm] = useState(DEFAULT_FORM);

    const fileInputRef = useRef(null);
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);

    const memberOptions = useMemo(
        () => normalizeParalegalOptions(paralegalOptions),
        [paralegalOptions],
    );

    useEffect(() => {
        setKegiatan(kegiatanRows || []);
        setLoading(false);
    }, [kegiatanRows]);

    useEffect(() => {
        const name = String(
            currentPosbankum?.nama || currentPosbankum?.name || "",
        ).trim();
        if (name) setPosName(name);
    }, [currentPosbankum]);

    useEffect(() => {
        /*
         * Jangan langsung menampilkan flash success saat halaman baru dibuka.
         * Pesan sukses dari session Laravel/Inertia kadang masih tersisa dari aksi sebelumnya,
         * sehingga toast bisa muncul sendiri saat user hanya masuk ke menu.
         * Notifikasi sukses untuk aksi di halaman ini tetap ditampilkan lewat onSuccess router.
         */
    }, [flash?.success]);

    useEffect(() => {
        return () => {
            if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(thumbPreviewUrl);
            }
        };
    }, [thumbPreviewUrl]);

    const openPicker = (ref) => {
        const element = ref?.current;

        if (!element) return;
        if (element.showPicker) element.showPicker();
        else element.focus();
    };

    const revokeBlobPreview = () => {
        if (thumbPreviewUrl && thumbPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(thumbPreviewUrl);
        }
    };

    const resetForm = () => {
        revokeBlobPreview();
        setThumbPreviewUrl(null);
        setThumbPreviewName("");
        setThumbPreviewKind("");
        setExistingThumbPath(null);
        setEditingItem(null);
        setForm(DEFAULT_FORM);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const stats = useMemo(() => {
        const rows = kegiatan || [];
        let process = 0;
        let reject = 0;
        let accept = 0;

        for (const item of rows) {
            const kind = statusKind(item?.status);

            if (kind === "process") process += 1;
            else if (kind === "reject") reject += 1;
            else if (kind === "accept") accept += 1;
        }

        return {
            total: rows.length,
            process,
            reject,
            accept,
        };
    }, [kegiatan]);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) return kegiatan;

        return (kegiatan || []).filter((item) => {
            const judul = String(
                item.judul || item.nama_kegiatan || "",
            ).toLowerCase();
            const deskripsi = String(
                item.deskripsi || item.catatan || "",
            ).toLowerCase();
            const lokasi = pickFirst(item, [
                "lokasi",
                "tempat",
                "alamat",
                "location",
            ]).toLowerCase();

            return (
                judul.includes(keyword) ||
                deskripsi.includes(keyword) ||
                lokasi.includes(keyword)
            );
        });
    }, [kegiatan, search]);

    const openCreate = () => {
        setFormError("");
        resetForm();
        setModalMode("create");
        setModalOpen(true);
    };

    const openEdit = (item) => {
        setFormError("");
        resetForm();
        setModalMode("edit");
        setEditingItem(item);

        setForm({
            judul: item?.judul || item?.nama_kegiatan || "",
            deskripsi: item?.deskripsi || item?.catatan || "",
            tgl_mulai: toDateInput(
                item?.tgl_mulai || item?.tanggal_kegiatan || item?.tanggal,
            ),
            tgl_selesai: toDateInput(item?.tgl_selesai),
            lokasi: pickFirst(item, ["lokasi", "tempat", "alamat", "location"]),
            hasil_kegiatan: item?.hasil_kegiatan || "",
            anggota_terlibat: resolveSelectedAnggota(item, memberOptions),
            thumbnailFile: null,
        });

        const oldPath = item?.thumbnail_path || null;
        const oldUrl = getThumbUrl(item);
        setExistingThumbPath(oldPath);
        setThumbPreviewName(oldPath ? fileNameFromPath(oldPath) : "");
        setThumbPreviewKind(
            oldPath ? (isPdfFileValue(oldPath) ? "pdf" : "image") : "",
        );
        setThumbPreviewUrl(oldPath && !isPdfFileValue(oldPath) ? oldUrl : null);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setResubmitModalOpen(false);
        setModalOpen(false);
    };

    const openDetail = (item) => {
        setDetailItem(item);
        setDetailOpen(true);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailItem(null);
    };

    const setSelectedFile = (file) => {
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isImage && !isPdf) {
            setFormError(
                "Dokumentasi harus berformat PNG, JPG, JPEG, WEBP, atau PDF.",
            );
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFormError("Ukuran dokumentasi maksimal 5MB.");
            return;
        }

        revokeBlobPreview();
        setFormError("");
        setForm((prev) => ({ ...prev, thumbnailFile: file }));
        setThumbPreviewName(file.name);
        setThumbPreviewKind(isPdf ? "pdf" : "image");
        setThumbPreviewUrl(isImage ? URL.createObjectURL(file) : null);
    };

    const onPickFile = (event) => {
        const file = event.target.files?.[0] || null;
        if (file) setSelectedFile(file);
    };

    const onDropFile = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0] || null;
        if (file) setSelectedFile(file);
    };

    const clearThumb = () => {
        if (saving) return;

        revokeBlobPreview();
        setForm((prev) => ({ ...prev, thumbnailFile: null }));
        setThumbPreviewUrl(null);
        setThumbPreviewName("");
        setThumbPreviewKind("");
        setExistingThumbPath(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDelete = (item) => {
        setDeleteItem(item);
    };

    const submitPayload = (resubmitRejected = false) => {
        const payload = new FormData();

        payload.append("judul", form.judul.trim());
        payload.append("deskripsi", form.deskripsi.trim());
        payload.append("tgl_mulai", form.tgl_mulai);
        payload.append("tgl_selesai", form.tgl_selesai || "");
        payload.append("lokasi", form.lokasi.trim());
        payload.append("hasil_kegiatan", form.hasil_kegiatan.trim());
        payload.append(
            "anggota_terlibat",
            JSON.stringify(
                buildAnggotaPayload(form.anggota_terlibat, memberOptions),
            ),
        );
        payload.append("remove_thumbnail", existingThumbPath ? "0" : "1");

        if (form.thumbnailFile) {
            payload.append("thumbnail", form.thumbnailFile);
        }

        if (resubmitRejected) {
            payload.append("resubmit_rejected", "1");
        }

        return payload;
    };

    const handleSubmit = (resubmitRejected = false) => {
        setFormError("");

        if (!form.judul.trim()) {
            setFormError("Judul kegiatan wajib diisi.");
            return;
        }

        if (!form.tgl_mulai) {
            setFormError("Tanggal Mulai wajib diisi.");
            return;
        }

        if (form.tgl_selesai && form.tgl_selesai < form.tgl_mulai) {
            setFormError("Tanggal Selesai tidak boleh sebelum Tanggal Mulai.");
            return;
        }

        if (!form.lokasi.trim()) {
            setFormError("Lokasi wajib diisi.");
            return;
        }

        const isRejectedEdit =
            modalMode === "edit" &&
            statusKind(editingItem?.status) === "reject";

        if (isRejectedEdit && !resubmitRejected) {
            setResubmitModalOpen(true);
            return;
        }

        setSaving(true);

        const payload = submitPayload(resubmitRejected);
        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setResubmitModalOpen(false);
                setModalOpen(false);
                resetForm();
                setSuccessMessage(
                    resubmitRejected
                        ? "Kegiatan berhasil dikirim ulang untuk ditinjau admin!"
                        : modalMode === "edit"
                          ? "Kegiatan berhasil diperbarui!"
                          : "Kegiatan berhasil ditambahkan!",
                );
            },
            onError: (errors) => {
                const firstError = Object.values(errors || {})[0];
                setFormError(firstError || "Gagal menyimpan kegiatan.");
            },
            onFinish: () => setSaving(false),
        };

        if (modalMode === "create") {
            router.post("/paralegal/kelola-kegiatan", payload, options);
            return;
        }

        const id = getKegiatanId(editingItem);

        if (!id) {
            setSaving(false);
            setFormError("Data edit tidak valid.");
            return;
        }

        payload.append("_method", "PUT");
        router.post(`/paralegal/kelola-kegiatan/${id}`, payload, options);
    };

    const confirmDelete = () => {
        const item = deleteItem;
        const id = getKegiatanId(item);

        if (!item || !id || deleting) return;

        setDeleting(true);
        setFormError("");

        router.delete(`/paralegal/kelola-kegiatan/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteItem(null);
                setSuccessMessage("Kegiatan berhasil dihapus!");
            },
            onError: (errors) => {
                const firstError = Object.values(errors || {})[0];
                setFormError(firstError || "Gagal menghapus kegiatan.");
            },
            onFinish: () => setDeleting(false),
        });
    };

    const toggleAnggota = (id) => {
        setForm((prev) => {
            const current = prev.anggota_terlibat || [];
            const exists = current.some((item) => String(item) === String(id));

            return {
                ...prev,
                anggota_terlibat: exists
                    ? current.filter((item) => String(item) !== String(id))
                    : [...current, id],
            };
        });
    };

    const detailThumbUrl = detailItem ? getThumbUrl(detailItem) : null;
    const detailKind = statusKind(detailItem?.status);
    const detailLokasi = detailItem
        ? pickFirst(detailItem, ["lokasi", "tempat", "alamat", "location"]) ||
          posName
        : posName;
    const detailAnggota = detailItem ? getAnggotaList(detailItem) : [];
    const detailCatatan = detailItem
        ? pickFirst(detailItem, [
              "catatan",
              "catatan_admin",
              "note",
              "keterangan",
          ])
        : "";
    const detailHasil = detailItem?.hasil_kegiatan || "";

    const formHasDocument = Boolean(
        thumbPreviewUrl || thumbPreviewName || existingThumbPath,
    );
    const formDocumentIsImage =
        thumbPreviewKind !== "pdf" && Boolean(thumbPreviewUrl);
    const formDocumentName =
        thumbPreviewName ||
        (existingThumbPath
            ? fileNameFromPath(existingThumbPath)
            : "Dokumentasi kegiatan");

    const detailRawFile = detailItem
        ? detailItem?.thumbnail_path ||
          detailItem?.gambar ||
          detailItem?.image ||
          detailItem?.thumbnail_url ||
          ""
        : "";
    const detailFileIsPdf = isPdfFileValue(detailRawFile);
    const detailHeroStyle =
        detailThumbUrl && !detailFileIsPdf
            ? { backgroundImage: `url(${detailThumbUrl})` }
            : undefined;
    const detailTitle = detailItem?.judul || detailItem?.nama_kegiatan || "-";
    const detailStatusText =
        detailKind === "accept" ? "Selesai" : statusLabel(detailItem?.status);
    const detailReporter = detailItem
        ? getReporterName(detailItem, memberOptions, profile, currentPosbankum)
        : "-";

    if (modalOpen) {
        const isEditMode = modalMode === "edit";

        return (
            <div className="kk-wrap kk-pageMode">
                <SuccessToast
                    message={successMessage}
                    onClose={() => setSuccessMessage("")}
                />

                <div className="kk-pageTop">
                    <div className="kk-pageTitleBlock">
                        <div className="kk-breadcrumb">
                            <button type="button" onClick={closeModal}>
                                Kelola Kegiatan
                            </button>
                            <span>›</span>
                            <strong>
                                {isEditMode
                                    ? "Edit Kegiatan"
                                    : "Tambah Kegiatan"}
                            </strong>
                        </div>
                        <h1 className="kk-pageTitle">
                            {isEditMode ? "Edit Kegiatan" : "Tambah Kegiatan"}
                        </h1>
                        <div className="kk-pageLine" />
                    </div>

                    <div className="kk-pageActions">
                        <button
                            className="kk-topBtn kk-topBtnGhost"
                            type="button"
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Batal
                        </button>
                        <button
                            className="kk-topBtn kk-topBtnPrimary"
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={saving}
                        >
                            {saving
                                ? "Menyimpan..."
                                : isEditMode
                                  ? "Simpan Perubahan"
                                  : "Simpan"}
                        </button>
                    </div>
                </div>

                <section className="kk-formPageCard">
                    <div className="kk-formPageHead">Informasi Kegiatan</div>
                    <div className="kk-formPageBody">
                        <div className="kk-formGroup">
                            <label className="kk-formLabel">
                                Judul Kegiatan
                            </label>
                            <input
                                className="kk-formInput"
                                value={form.judul}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        judul: event.target.value,
                                    }))
                                }
                                placeholder="Masukkan nama/judul kegiatan yang akan dilaksanakan"
                            />
                        </div>

                        <div className="kk-formTwoCols">
                            <div className="kk-formGroup">
                                <label className="kk-formLabel">
                                    Tanggal Mulai
                                </label>
                                <div className="kk-formDateWrap">
                                    <input
                                        ref={startDateRef}
                                        className="kk-formInput kk-formDateInput"
                                        type="date"
                                        value={form.tgl_mulai}
                                        onChange={(event) =>
                                            setForm((prev) => {
                                                const nextMulai =
                                                    event.target.value;
                                                const invalidEnd =
                                                    prev.tgl_selesai &&
                                                    nextMulai &&
                                                    prev.tgl_selesai <
                                                        nextMulai;

                                                return {
                                                    ...prev,
                                                    tgl_mulai: nextMulai,
                                                    tgl_selesai: invalidEnd
                                                        ? ""
                                                        : prev.tgl_selesai,
                                                };
                                            })
                                        }
                                    />
                                    <FiCalendar
                                        className="kk-formDateIcon"
                                        onClick={() => openPicker(startDateRef)}
                                    />
                                </div>
                            </div>

                            <div className="kk-formGroup">
                                <label className="kk-formLabel">
                                    Tanggal Selesai
                                </label>
                                <div className="kk-formDateWrap">
                                    <input
                                        ref={endDateRef}
                                        className="kk-formInput kk-formDateInput"
                                        type="date"
                                        value={form.tgl_selesai}
                                        min={form.tgl_mulai || undefined}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                tgl_selesai: event.target.value,
                                            }))
                                        }
                                    />
                                    <FiCalendar
                                        className="kk-formDateIcon"
                                        onClick={() => openPicker(endDateRef)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="kk-formGroup">
                            <label className="kk-formLabel">Lokasi</label>
                            <input
                                className="kk-formInput"
                                value={form.lokasi}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        lokasi: event.target.value,
                                    }))
                                }
                                placeholder="Nama gedung/alamat tempat kegiatan dilaksanakan"
                            />
                        </div>

                        <div className="kk-formGroup">
                            <label className="kk-formLabel">
                                Dokumentasi / Thumbnail
                            </label>
                            <div className="kk-documentWrap">
                                <label
                                    className={`kk-documentUpload ${formHasDocument ? "has-file" : ""} ${formDocumentIsImage ? "has-image" : ""}`}
                                    style={
                                        formDocumentIsImage
                                            ? {
                                                  backgroundImage: `url(${thumbPreviewUrl})`,
                                              }
                                            : undefined
                                    }
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDrop={onDropFile}
                                >
                                    {!formHasDocument ? (
                                        <div className="kk-documentEmpty">
                                            <FiUpload className="kk-documentIcon" />
                                            <div className="kk-documentTitle">
                                                Klik untuk upload gambar atau
                                                file
                                            </div>
                                            <div className="kk-documentHint">
                                                PNG, JPG, JPEG, WEBP, PDF (Max
                                                5MB)
                                            </div>
                                        </div>
                                    ) : !formDocumentIsImage ? (
                                        <div className="kk-documentFilePreview">
                                            <FiFileText />
                                            <span>{formDocumentName}</span>
                                        </div>
                                    ) : null}

                                    <input
                                        ref={fileInputRef}
                                        className="kk-file"
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                                        onChange={onPickFile}
                                    />
                                </label>

                                {formHasDocument ? (
                                    <button
                                        className="kk-documentRemove"
                                        type="button"
                                        title="Hapus dokumentasi"
                                        onClick={clearThumb}
                                        disabled={saving}
                                    >
                                        <FiX />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="kk-formGroup">
                            <label className="kk-formLabel">Deskripsi</label>
                            <textarea
                                className="kk-formTextarea kk-formTextareaDescription"
                                value={form.deskripsi}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        deskripsi: event.target.value,
                                    }))
                                }
                                placeholder="Jelaskan tujuan, agenda, dan detail pelaksanaan kegiatan secara lengkap..."
                            />
                        </div>

                        <div className="kk-formGroup kk-formGroupLast">
                            <label className="kk-formLabel">
                                Hasil Kegiatan
                            </label>
                            <textarea
                                className="kk-formTextarea kk-formTextareaResult"
                                value={form.hasil_kegiatan}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        hasil_kegiatan: event.target.value,
                                    }))
                                }
                                placeholder="Jelaskan hasil dan capaian dari pelaksanaan kegiatan..."
                            />
                        </div>

                        {formError ? (
                            <div className="kk-form-error kk-formPageError">
                                {formError}
                            </div>
                        ) : null}
                    </div>
                </section>

                <ReminderModal
                    open={resubmitModalOpen}
                    title="Kirim Ulang Kegiatan?"
                    subtitle="Kegiatan yang ditolak akan masuk kembali ke proses peninjauan admin."
                    description="Pastikan seluruh perubahan sudah sesuai dengan alasan penolakan. Apakah Anda ingin mengirim ulang kegiatan ini agar dapat ditinjau kembali oleh admin?"
                    cancelLabel="Periksa Lagi"
                    confirmLabel={saving ? "Mengirim..." : "Ya, Kirim Ulang"}
                    loading={saving}
                    onClose={() => {
                        if (!saving) setResubmitModalOpen(false);
                    }}
                    onConfirm={() => handleSubmit(true)}
                />
            </div>
        );
    }

    if (detailOpen && detailItem) {
        return (
            <div className="kk-wrap kk-pageMode">
                <SuccessToast
                    message={successMessage}
                    onClose={() => setSuccessMessage("")}
                />

                <div className="kk-pageTop kk-pageTopDetail">
                    <div className="kk-pageTitleBlock">
                        <div className="kk-breadcrumb">
                            <button type="button" onClick={closeDetail}>
                                Kelola Kegiatan
                            </button>
                            <span>›</span>
                            <strong>Detail Kegiatan</strong>
                        </div>
                        <h1 className="kk-pageTitle">Detail Kegiatan</h1>
                        <div className="kk-pageLine" />
                    </div>

                    <button
                        className="kk-topBtn kk-topBtnPrimary kk-closeDetailBtn"
                        type="button"
                        onClick={closeDetail}
                    >
                        Tutup
                    </button>
                </div>

                <article className={`kk-detailPageCard is-${detailKind}`}>
                    <div className="kk-detailPageHero" style={detailHeroStyle}>
                        {detailFileIsPdf ? (
                            <div className="kk-detailFilePreview">
                                <FiFileText />
                                <span>{fileNameFromPath(detailRawFile)}</span>
                            </div>
                        ) : !detailThumbUrl ? (
                            <div className="kk-detailFilePreview">
                                <FiUpload />
                                <span>Dokumentasi belum tersedia</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="kk-detailPageBody">
                        <span
                            className={`kk-detailPageStatus is-${detailKind}`}
                        >
                            {detailStatusText}
                        </span>

                        <h2 className="kk-detailPageTitle">{detailTitle}</h2>

                        <div className="kk-detailSummaryGrid">
                            <div className="kk-detailSummaryCard">
                                <div className="kk-detailSummaryLabel">
                                    Nama Pelapor
                                </div>
                                <div className="kk-detailSummaryValue">
                                    {detailReporter || "-"}
                                </div>
                            </div>

                            <div className="kk-detailSummaryCard">
                                <div className="kk-detailSummaryLabel">
                                    Tanggal
                                </div>
                                <div className="kk-detailSummaryValue">
                                    {formatDateRange(
                                        detailItem.tgl_mulai ||
                                            detailItem.tgl_upload ||
                                            detailItem.created_at,
                                        detailItem.tgl_selesai,
                                    )}
                                </div>
                            </div>

                            <div className="kk-detailSummaryCard">
                                <div className="kk-detailSummaryLabel">
                                    Lokasi
                                </div>
                                <div className="kk-detailSummaryValue">
                                    {detailLokasi || "-"}
                                </div>
                            </div>
                        </div>

                        <section className="kk-detailTextSection">
                            <h3>Deskripsi</h3>
                            <p>
                                {detailItem.deskripsi ||
                                    detailItem.catatan ||
                                    "-"}
                            </p>
                        </section>

                        <section className="kk-detailTextSection">
                            <h3>Hasil Kegiatan</h3>
                            <p>{detailHasil || "-"}</p>
                        </section>

                        {detailKind === "reject" && detailCatatan ? (
                            <div className="kk-detailRejectNotice">
                                <div className="kk-detailRejectIcon">
                                    <FiXCircle />
                                </div>
                                <div className="kk-detailRejectBody">
                                    <div className="kk-detailRejectTitle">
                                        Alasan Penolakan dari Admin
                                    </div>
                                    <div className="kk-detailRejectSub">
                                        Catatan perbaikan dari proses verifikasi
                                    </div>
                                    <div className="kk-detailRejectText">
                                        {detailCatatan}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </article>
            </div>
        );
    }

    return (
        <div className="kk-wrap">
            <SuccessToast
                message={successMessage}
                onClose={() => setSuccessMessage("")}
            />

            <div className="kk-listPageHeading">
                <h1 className="kk-pageTitle">Kelola Kegiatan</h1>
                <div className="kk-pageLine" />
            </div>

            <div className="kk-stats">
                <div className="kk-statCard">
                    <div className="kk-statIcon">
                        <FiFileText />
                    </div>
                    <div>
                        <div className="kk-statLabel">Total Kegiatan</div>
                        <div className="kk-statValue">{stats.total}</div>
                    </div>
                </div>

                <div className="kk-statCard">
                    <div className="kk-statIcon">
                        <FiCheckCircle />
                    </div>
                    <div>
                        <div className="kk-statLabel">Disetujui</div>
                        <div className="kk-statValue">{stats.accept}</div>
                    </div>
                </div>

                <div className="kk-statCard">
                    <div className="kk-statIcon">
                        <FiClock />
                    </div>
                    <div>
                        <div className="kk-statLabel">Menunggu</div>
                        <div className="kk-statValue">{stats.process}</div>
                    </div>
                </div>

                <div className="kk-statCard">
                    <div className="kk-statIcon">
                        <FiXCircle />
                    </div>
                    <div>
                        <div className="kk-statLabel">Ditolak</div>
                        <div className="kk-statValue">{stats.reject}</div>
                    </div>
                </div>
            </div>

            <div className="kk-row">
                <div className="kk-search">
                    <FiSearch className="kk-ic kk-ic-search" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari kegiatan..."
                    />
                </div>

                <button className="kk-add" type="button" onClick={openCreate}>
                    <FiPlus />
                    Tambah Kegiatan
                </button>
            </div>

            {formError ? (
                <div className="kk-form-error">{formError}</div>
            ) : null}

            <div className="kk-list">
                {loading ? (
                    <div className="kk-emptyCard is-loading">
                        Memuat data kegiatan...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="kk-emptyCard">
                        <div className="kk-emptyIcon">
                            <FiFileText />
                        </div>
                        <h2>Tidak Ada Kegiatan Ditemukan</h2>
                        <p>
                            Tidak ada kegiatan yang sesuai dengan kata kunci
                            pencarian.
                        </p>
                    </div>
                ) : (
                    filtered.map((item) => {
                        const id = getKegiatanId(item);
                        const kind = statusKind(item.status);
                        const pill = statusLabel(item.status);
                        const thumbUrl = getThumbUrl(item);
                        const lokasi = pickFirst(item, [
                            "lokasi",
                            "tempat",
                            "alamat",
                            "location",
                        ]);
                        const catatan = pickFirst(item, [
                            "catatan",
                            "catatan_admin",
                            "note",
                            "keterangan",
                        ]);
                        const isRejected = kind === "reject";
                        const isAccepted = kind === "accept";

                        return (
                            <div className="kk-card" key={id}>
                                <div
                                    className="kk-media"
                                    style={
                                        thumbUrl
                                            ? {
                                                  backgroundImage: `url(${thumbUrl})`,
                                              }
                                            : undefined
                                    }
                                >
                                    <span
                                        className={`kk-statusPill is-${kind}`}
                                    >
                                        {isRejected ? <FiXCircle /> : null}
                                        {pill}
                                    </span>
                                </div>

                                <div className="kk-cardBody">
                                    <div className="kk-judul">
                                        {item.judul ||
                                            item.nama_kegiatan ||
                                            "-"}
                                    </div>
                                    <div className="kk-desc">
                                        {formatShortText(
                                            item.deskripsi || item.catatan,
                                            128,
                                        )}
                                    </div>

                                    {isRejected && catatan ? (
                                        <div className="kk-rejectBox">
                                            <div className="kk-rejectTitle">
                                                Alasan Penolakan:
                                            </div>
                                            <div className="kk-rejectText">
                                                {catatan}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="kk-meta">
                                        <span className="kk-metaItem">
                                            <FiCalendar className="kk-ic kk-ic-cal" />
                                            {formatDate(
                                                item.tgl_mulai ||
                                                    item.tgl_upload ||
                                                    item.created_at,
                                            )}
                                        </span>

                                        {lokasi ? (
                                            <span className="kk-metaItem">
                                                <FiMapPin className="kk-ic kk-ic-cal" />
                                                {lokasi}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="kk-cardFooter">
                                    <button
                                        className="kk-btnView"
                                        type="button"
                                        onClick={() => openDetail(item)}
                                        title="Lihat"
                                    >
                                        <FiEye />
                                        {isRejected ? "Lihat Detail" : "Lihat"}
                                    </button>

                                    {!isAccepted ? (
                                        <button
                                            className="kk-btnIcon is-orange"
                                            type="button"
                                            title="Edit"
                                            onClick={() => openEdit(item)}
                                        >
                                            <FiEdit />
                                        </button>
                                    ) : null}

                                    {isRejected ? (
                                        <button
                                            className="kk-btnIcon is-red"
                                            type="button"
                                            title="Hapus"
                                            onClick={() => handleDelete(item)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <DeleteConfirmModal
                open={!!deleteItem}
                title="Hapus Kegiatan?"
                subtitle="Tindakan ini tidak dapat dibatalkan"
                description="Apakah Anda yakin ingin menghapus kegiatan ini? Data kegiatan akan dihapus permanen."
                confirmLabel="Ya, Hapus"
                loading={deleting}
                onCancel={() => !deleting && setDeleteItem(null)}
                onConfirm={confirmDelete}
            />

            {modalOpen ? (
                <div className="kk-modal-overlay" onMouseDown={closeModal}>
                    <div
                        className="kk-modal kk-modal-modern"
                        onMouseDown={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className={`kk-modal-head ${modalMode === "edit" ? "is-orange" : "is-blue"}`}
                        >
                            <div className="kk-modal-title">
                                {modalMode === "edit"
                                    ? "Edit Kegiatan"
                                    : "Tambah Kegiatan"}
                            </div>

                            <button
                                className="kk-modal-close"
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kk-modal-body">
                            <div className="kk-field">
                                <div className="kk-label">
                                    Judul Kegiatan{" "}
                                    <span className="kk-req">*</span>
                                </div>
                                <input
                                    className="kk-input"
                                    value={form.judul}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            judul: event.target.value,
                                        }))
                                    }
                                    placeholder="Tulis judul kegiatan..."
                                />
                            </div>

                            <div className="kk-field">
                                <div className="kk-label">Thumbnail</div>

                                <div className="kk-thumbBoxWrap">
                                    <label
                                        className={`kk-thumb-upload ${thumbPreviewUrl ? "has-image" : ""}`}
                                        style={
                                            thumbPreviewUrl
                                                ? {
                                                      backgroundImage: `url(${thumbPreviewUrl})`,
                                                  }
                                                : undefined
                                        }
                                        onDragOver={(event) =>
                                            event.preventDefault()
                                        }
                                        onDrop={onDropFile}
                                    >
                                        {!thumbPreviewUrl ? (
                                            <div className="kk-thumbEmpty">
                                                <FiUpload className="kk-ic kk-ic-upload" />
                                                <div className="kk-thumbEmptyText">
                                                    Klik untuk pilih file
                                                </div>
                                                <div className="kk-thumbEmptySub">
                                                    atau drag & drop file di
                                                    sini
                                                </div>
                                            </div>
                                        ) : null}

                                        <input
                                            ref={fileInputRef}
                                            className="kk-file"
                                            type="file"
                                            accept="image/*"
                                            onChange={onPickFile}
                                        />
                                    </label>

                                    {thumbPreviewUrl ? (
                                        <button
                                            className="kk-thumbRemove"
                                            type="button"
                                            title="Hapus thumbnail"
                                            onClick={clearThumb}
                                            disabled={saving}
                                        >
                                            <FiX />
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="kk-twoCols">
                                <div className="kk-field">
                                    <div className="kk-label">
                                        Tanggal Mulai{" "}
                                        <span className="kk-req">*</span>
                                    </div>
                                    <div className="kk-datebox">
                                        <input
                                            ref={startDateRef}
                                            className="kk-input kk-input-date"
                                            type="date"
                                            value={form.tgl_mulai}
                                            onChange={(event) =>
                                                setForm((prev) => {
                                                    const nextMulai =
                                                        event.target.value;
                                                    const invalidEnd =
                                                        prev.tgl_selesai &&
                                                        nextMulai &&
                                                        prev.tgl_selesai <
                                                            nextMulai;

                                                    return {
                                                        ...prev,
                                                        tgl_mulai: nextMulai,
                                                        tgl_selesai: invalidEnd
                                                            ? ""
                                                            : prev.tgl_selesai,
                                                    };
                                                })
                                            }
                                        />
                                        <FiCalendar
                                            className="kk-date-ic"
                                            onClick={() =>
                                                openPicker(startDateRef)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="kk-field">
                                    <div className="kk-label">
                                        Tanggal Selesai
                                    </div>
                                    <div className="kk-datebox">
                                        <input
                                            ref={endDateRef}
                                            className="kk-input kk-input-date"
                                            type="date"
                                            value={form.tgl_selesai}
                                            min={form.tgl_mulai || undefined}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    tgl_selesai:
                                                        event.target.value,
                                                }))
                                            }
                                        />
                                        <FiCalendar
                                            className="kk-date-ic"
                                            onClick={() =>
                                                openPicker(endDateRef)
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="kk-field">
                                <div className="kk-label">
                                    Lokasi <span className="kk-req">*</span>
                                </div>
                                <input
                                    className="kk-input"
                                    value={form.lokasi}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            lokasi: event.target.value,
                                        }))
                                    }
                                    placeholder="Masukkan lokasi..."
                                />
                            </div>

                            <div className="kk-field">
                                <div className="kk-label">
                                    Anggota yang Terlibat
                                </div>
                                <div className="kk-memberSelectBox">
                                    {memberOptions.length ? (
                                        <div className="kk-memberSelectList">
                                            {memberOptions.map((member) => {
                                                const checked =
                                                    form.anggota_terlibat.some(
                                                        (id) =>
                                                            String(id) ===
                                                            String(
                                                                member.id_paralegal,
                                                            ),
                                                    );

                                                return (
                                                    <button
                                                        className={`kk-memberSelectChip ${checked ? "is-selected" : ""}`}
                                                        type="button"
                                                        key={
                                                            member.id_paralegal
                                                        }
                                                        onClick={() =>
                                                            toggleAnggota(
                                                                member.id_paralegal,
                                                            )
                                                        }
                                                    >
                                                        <FiUser />
                                                        <span>
                                                            {
                                                                member.nama_paralegal
                                                            }
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="kk-memberSelectEmpty">
                                            Belum ada data paralegal yang dapat
                                            dipilih.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="kk-field">
                                <div className="kk-label">
                                    Deskripsi Kegiatan
                                </div>
                                <textarea
                                    className="kk-textarea"
                                    value={form.deskripsi}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            deskripsi: event.target.value,
                                        }))
                                    }
                                    placeholder="Tulis deskripsi kegiatan..."
                                    rows={5}
                                />
                            </div>

                            <div className="kk-field kk-lastField">
                                <div className="kk-label">Hasil Kegiatan</div>
                                <textarea
                                    className="kk-textarea"
                                    value={form.hasil_kegiatan}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            hasil_kegiatan: event.target.value,
                                        }))
                                    }
                                    placeholder="Tulis hasil kegiatan..."
                                    rows={4}
                                />
                            </div>

                            {formError ? (
                                <div className="kk-form-error kk-form-error-modal">
                                    {formError}
                                </div>
                            ) : null}
                        </div>

                        <div className="kk-modal-actions">
                            <button
                                className="kk-btn kk-btn-ghost"
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                Batal
                            </button>

                            <button
                                className={`kk-btn ${modalMode === "edit" ? "kk-btn-orange" : "kk-btn-primary"}`}
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={saving}
                            >
                                {saving
                                    ? "Menyimpan..."
                                    : modalMode === "edit"
                                      ? "Update"
                                      : "Tambah"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <ReminderModal
                open={resubmitModalOpen}
                title="Kirim Ulang Kegiatan?"
                subtitle="Kegiatan yang ditolak akan masuk kembali ke proses peninjauan admin."
                description="Pastikan seluruh perubahan sudah sesuai dengan alasan penolakan. Apakah Anda ingin mengirim ulang kegiatan ini agar dapat ditinjau kembali oleh admin?"
                cancelLabel="Periksa Lagi"
                confirmLabel={saving ? "Mengirim..." : "Ya, Kirim Ulang"}
                loading={saving}
                onClose={() => {
                    if (!saving) setResubmitModalOpen(false);
                }}
                onConfirm={() => handleSubmit(true)}
            />

            {detailOpen && detailItem ? (
                <div className="kk-detail-overlay" onMouseDown={closeDetail}>
                    <div
                        className="kk-detail-modal kk-detail-modern"
                        onMouseDown={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="kk-detail-hero"
                            style={
                                detailThumbUrl
                                    ? {
                                          backgroundImage: `url(${detailThumbUrl})`,
                                      }
                                    : undefined
                            }
                        >
                            <div className="kk-detail-heroShade" />
                            <button
                                className="kk-detail-close"
                                type="button"
                                onClick={closeDetail}
                            >
                                <FiX />
                            </button>

                            <div className="kk-detail-heroContent">
                                <span
                                    className={`kk-detail-status is-${detailKind}`}
                                >
                                    {statusLabel(detailItem.status)}
                                </span>
                                <div className="kk-detail-title">
                                    {detailItem.judul ||
                                        detailItem.nama_kegiatan ||
                                        "-"}
                                </div>
                                <div className="kk-detail-meta">
                                    <span className="kk-detail-metaItem">
                                        <FiCalendar />
                                        {formatDate(
                                            detailItem.tgl_mulai ||
                                                detailItem.tgl_upload,
                                        )}
                                    </span>
                                    <span className="kk-detail-metaItem">
                                        <FiMapPin />
                                        {detailLokasi || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="kk-detail-body">
                            {detailKind === "reject" && detailCatatan ? (
                                <div className="kk-adminAlert">
                                    <div className="kk-adminAlertTitle">
                                        Alasan Penolakan Admin
                                    </div>
                                    <div className="kk-adminAlertText">
                                        {detailCatatan}
                                    </div>
                                </div>
                            ) : null}

                            <div className="kk-detail-infoGrid">
                                <div className="kk-detail-infoCard">
                                    <div className="kk-detail-infoIcon">
                                        <FiCalendar />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Tanggal Mulai
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {formatDate(detailItem.tgl_mulai)}
                                        </div>
                                    </div>
                                </div>

                                <div className="kk-detail-infoCard">
                                    <div className="kk-detail-infoIcon">
                                        <FiCalendar />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Tanggal Selesai
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {formatDate(detailItem.tgl_selesai)}
                                        </div>
                                    </div>
                                </div>

                                <div className="kk-detail-infoCard">
                                    <div className="kk-detail-infoIcon">
                                        <FiMapPin />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Lokasi
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {detailLokasi || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="kk-detail-infoCard">
                                    <div className="kk-detail-infoIcon">
                                        <FiFileText />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Tanggal Upload
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {formatDate(
                                                detailItem.tgl_upload ||
                                                    detailItem.created_at,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="kk-detail-infoCard">
                                    <div className="kk-detail-infoIcon">
                                        <FiCheckCircle />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Status
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {statusLabel(detailItem.status)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="kk-detail-section">
                                <div className="kk-detail-sectionTitle">
                                    Deskripsi Kegiatan
                                </div>
                                <div className="kk-detail-desc">
                                    {detailItem.deskripsi ||
                                        detailItem.catatan ||
                                        "-"}
                                </div>
                            </div>

                            <div className="kk-detail-section">
                                <div className="kk-detail-sectionTitle">
                                    Hasil Kegiatan
                                </div>
                                <div className="kk-detail-desc">
                                    {detailHasil || "-"}
                                </div>
                            </div>

                            <div className="kk-detail-section">
                                <div className="kk-detail-sectionTitle">
                                    Anggota yang Terlibat
                                </div>
                                {detailAnggota.length ? (
                                    <div className="kk-memberList">
                                        {detailAnggota.map((name) => (
                                            <span
                                                className="kk-memberChip"
                                                key={name}
                                            >
                                                <FiUser />
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="kk-detail-desc">-</div>
                                )}
                            </div>
                        </div>

                        <div className="kk-detail-actions">
                            <button
                                className="kk-btn kk-btn-ghost kk-detail-closeBtn"
                                type="button"
                                onClick={closeDetail}
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
