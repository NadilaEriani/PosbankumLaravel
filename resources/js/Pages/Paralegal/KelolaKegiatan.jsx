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
    FiUsers,
    FiEye,
    FiUser,
} from "react-icons/fi";
import SuccessToast from "../../components/ui/SuccessToast";
import DeleteConfirmModal from "../../components/ui/DeleteConfirmModal";
import ReminderModal from "../../components/ui/ReminderModal";
import "../../../css/Paralegal/kelolaKegiatan.css";

const DEFAULT_FORM = {
    judul: "",
    deskripsi: "",
    tgl_mulai: "",
    tgl_selesai: "",
    lokasi: "",
    jumlah_peserta: "",
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

function pickNumber(obj, keys) {
    for (const key of keys) {
        const value = obj?.[key];
        const number = Number(value);

        if (Number.isFinite(number)) return number;
    }

    return null;
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
    if (clean.startsWith("/storage/")) return clean;
    if (clean.startsWith("storage/")) return `/${clean}`;

    return `/storage/${clean.replace(/^public\//, "")}`;
}

function getKegiatanId(item) {
    return item?.id_kegiatan ?? item?.id ?? null;
}

export default function KelolaKegiatan({
    kegiatanRows = [],
    paralegalOptions = [],
    currentPosbankum = {},
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
        if (flash?.success) {
            setSuccessMessage(flash.success);
        }
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
            jumlah_peserta: String(
                pickNumber(item, [
                    "jumlah_peserta",
                    "target_peserta",
                    "peserta",
                ]) ?? "",
            ),
            hasil_kegiatan: item?.hasil_kegiatan || "",
            anggota_terlibat: resolveSelectedAnggota(item, memberOptions),
            thumbnailFile: null,
        });

        const oldPath = item?.thumbnail_path || null;
        setExistingThumbPath(oldPath);
        setThumbPreviewUrl(getThumbUrl(item));
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

        if (!file.type.startsWith("image/")) {
            setFormError("Thumbnail harus berupa file gambar.");
            return;
        }

        revokeBlobPreview();
        setForm((prev) => ({ ...prev, thumbnailFile: file }));
        setThumbPreviewUrl(URL.createObjectURL(file));
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
        payload.append("jumlah_peserta", form.jumlah_peserta || "");
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
    const detailPeserta = detailItem
        ? pickNumber(detailItem, [
              "jumlah_peserta",
              "target_peserta",
              "peserta",
          ])
        : null;
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

    return (
        <div className="kk-wrap">
            <SuccessToast
                message={successMessage}
                onClose={() => setSuccessMessage("")}
            />
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
                        const peserta = pickNumber(item, [
                            "jumlah_peserta",
                            "target_peserta",
                            "peserta",
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

                                        {Number.isFinite(Number(peserta)) ? (
                                            <span className="kk-metaItem">
                                                <FiUsers className="kk-ic kk-ic-cal" />
                                                {peserta} peserta
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
                                <div className="kk-label">Jumlah Peserta</div>
                                <input
                                    className="kk-input"
                                    inputMode="numeric"
                                    value={form.jumlah_peserta}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            jumlah_peserta: event.target.value,
                                        }))
                                    }
                                    placeholder="Jumlah target peserta..."
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
                                    {Number.isFinite(Number(detailPeserta)) ? (
                                        <span className="kk-detail-metaItem">
                                            <FiUsers />
                                            {detailPeserta} peserta
                                        </span>
                                    ) : null}
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
                                        <FiUsers />
                                    </div>
                                    <div>
                                        <div className="kk-detail-infoLabel">
                                            Jumlah Peserta
                                        </div>
                                        <div className="kk-detail-infoValue">
                                            {Number.isFinite(
                                                Number(detailPeserta),
                                            )
                                                ? `${detailPeserta} peserta`
                                                : "-"}
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
