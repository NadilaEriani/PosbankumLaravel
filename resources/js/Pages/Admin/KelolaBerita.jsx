import { router } from "@inertiajs/react";
import { CgImage } from "react-icons/cg";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiFileText,
    FiCalendar,
    FiEdit,
    FiEye,
    FiPlus,
    FiSearch,
    FiTrash2,
    FiUser,
    FiX,
} from "react-icons/fi";
import "../../../css/kelolaBerita.css";

const KATEGORI_OPTIONS = [
    "Kegiatan",
    "Pelatihan",
    "Workshop",
    "Kunjungan",
    "Sosialisasi",
];

const formatDateID = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
};

const excerptText = (value, max = 130) => {
    const text = String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!text) return "Isi berita belum tersedia.";
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
};

const isExternalUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const isDataOrBlob = (value) => /^(data:|blob:)/i.test(String(value || ""));

function assetUrl(path) {
    const value = String(path || "").trim();
    if (!value) return "";

    if (isExternalUrl(value) || isDataOrBlob(value)) return value;
    if (value.startsWith("/storage/")) return value;
    if (value.startsWith("storage/")) return `/${value}`;

    const clean = value
        .replace(/^public\//, "")
        .replace(/^storage\//, "")
        .replace(/^\/+/, "");

    return `/storage/${clean}`;
}

function pickBeritaImagePath(item) {
    return (
        item?.gambar ||
        item?.thumbnail ||
        item?.foto ||
        item?.image ||
        item?.image_path ||
        item?.path_gambar ||
        item?.gambar_berita ||
        item?.file_gambar ||
        ""
    );
}

function inferCategory(item) {
    const source = `${item?.kategori || item?.category || ""} ${
        item?.judul || item?.title || ""
    } ${item?.isi || item?.content || ""}`.toLowerCase();

    if (source.includes("pelatihan")) return "Pelatihan";
    if (source.includes("workshop")) return "Workshop";
    if (source.includes("kunjungan")) return "Kunjungan";
    if (source.includes("sosialisasi")) return "Sosialisasi";
    return "Kegiatan";
}

function normalizeItem(item, index = 0, fallbackAuthor = "Admin") {
    const id = item?.id_berita ?? item?.id ?? index + 1;
    const gambar = pickBeritaImagePath(item);
    const imageUrl = item?.imageUrl || assetUrl(gambar);

    return {
        ...item,
        id,
        id_berita: item?.id_berita ?? id,
        judul: item?.judul ?? item?.title ?? "Tanpa Judul",
        isi:
            item?.isi ?? item?.content ?? item?.konten ?? item?.deskripsi ?? "",
        gambar,
        kategori: item?.kategori ?? item?.category ?? inferCategory(item),
        tgl_publish:
            item?.tgl_publish ??
            item?.date ??
            item?.created_at ??
            item?.updated_at,
        authorName:
            item?.authorName ??
            item?.author ??
            item?.nama_user ??
            item?.nama_lengkap ??
            fallbackAuthor ??
            "Admin",
        imageUrl,
    };
}

function beritaUrl(id = "") {
    const suffix = id ? `/${encodeURIComponent(id)}` : "";
    return `/admin/kelola-berita${suffix}`;
}

function errorMessageFromPayload(errors, fallback) {
    if (!errors || typeof errors !== "object") return fallback;

    const messages = Object.values(errors).flat().filter(Boolean).join(" ");
    return messages || fallback;
}

export default function KelolaBerita({
    rows = [],
    currentUserId = "",
    currentUserName = "Admin",
}) {
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState("");
    const [pageMode, setPageMode] = useState("list");
    const [modalMode, setModalMode] = useState("create");
    const [activeItem, setActiveItem] = useState(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [form, setForm] = useState({
        judul: "",
        isi: "",
        kategori: "",
        gambarFile: null,
    });
    const [existingImagePath, setExistingImagePath] = useState("");
    const [imagePreview, setImagePreview] = useState("");

    const fileInputRef = useRef(null);

    const normalizedItems = useMemo(
        () =>
            (Array.isArray(rows) ? rows : []).map((item, index) =>
                normalizeItem(item, index, currentUserName || "Admin"),
            ),
        [rows, currentUserName],
    );

    const filteredItems = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return normalizedItems;

        return normalizedItems.filter((item) => {
            const haystack = `${item?.judul || ""} ${item?.isi || ""} ${
                item?.kategori || ""
            } ${item?.authorName || ""}`.toLowerCase();

            return haystack.includes(keyword);
        });
    }, [normalizedItems, search]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        if (!deleteOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event) => {
            if (event.key === "Escape" && !deleting) closeDelete();
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow || "";
            document.removeEventListener("keydown", onKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteOpen, deleting]);

    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const resetForm = () => {
        if (imagePreview && imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(imagePreview);
        }

        setForm({
            judul: "",
            isi: "",
            kategori: "",
            gambarFile: null,
        });
        setExistingImagePath("");
        setImagePreview("");
        setFormError("");
        setActiveItem(null);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const openCreate = () => {
        resetForm();
        setModalMode("create");
        setPageMode("create");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openEdit = (item) => {
        resetForm();

        const imagePath = pickBeritaImagePath(item);
        const imageUrl = item?.imageUrl || assetUrl(imagePath);

        setModalMode("edit");
        setActiveItem(item);
        setExistingImagePath(imagePath || "");
        setImagePreview(imageUrl || "");
        setForm({
            judul: item?.judul || "",
            isi: item?.isi || "",
            kategori: item?.kategori || KATEGORI_OPTIONS[0],
            gambarFile: null,
        });
        setPageMode("edit");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeFormPage = () => {
        if (saving) return;
        setPageMode("list");
        resetForm();
    };

    const openDetail = (item) => {
        setActiveItem(item);
        setPageMode("detail");
        setFormError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeDetail = () => {
        setPageMode("list");
        setActiveItem(null);
    };

    const openDelete = (item) => {
        setActiveItem(item);
        setDeleteOpen(true);
    };

    const closeDelete = () => {
        if (deleting) return;
        setDeleteOpen(false);
        setActiveItem(null);
    };

    const handlePickImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (
            !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
                file.type,
            )
        ) {
            setFormError("Format gambar harus PNG, JPG, JPEG, atau WEBP.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFormError("Ukuran gambar maksimal 5MB.");
            event.target.value = "";
            return;
        }

        if (imagePreview && imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(imagePreview);
        }

        setFormError("");
        setImagePreview(URL.createObjectURL(file));
        setForm((prev) => ({ ...prev, gambarFile: file }));
    };

    const clearImage = () => {
        if (imagePreview && imagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(imagePreview);
        }

        setForm((prev) => ({ ...prev, gambarFile: null }));
        setExistingImagePath("");
        setImagePreview("");

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const buildFormData = () => {
        const judul = String(form.judul || "").trim();
        const isi = String(form.isi || "").trim();
        const kategori = String(form.kategori || KATEGORI_OPTIONS[0]).trim();

        if (!judul) return { error: "Judul berita wajib diisi." };
        if (!isi) return { error: "Isi berita wajib diisi." };

        const data = new FormData();
        data.append("judul", judul);
        data.append("isi", isi);
        data.append("kategori", kategori || KATEGORI_OPTIONS[0]);

        if (form.gambarFile) {
            data.append("gambar", form.gambarFile);
        }

        const activeImagePath = pickBeritaImagePath(activeItem);
        const removeImage =
            modalMode === "edit" &&
            Boolean(activeImagePath) &&
            !existingImagePath &&
            !form.gambarFile;

        data.append("remove_gambar", removeImage ? "1" : "0");

        return { data };
    };

    const refreshBeritaData = () => {
        router.reload({
            only: ["beritaRows"],
            preserveScroll: true,
            preserveState: false,
        });
    };

    const handleSubmit = () => {
        const { data, error } = buildFormData();

        if (error) {
            setFormError(error);
            return;
        }

        if (!currentUserId && modalMode === "create") {
            setFormError("Sesi admin tidak ditemukan. Silakan login ulang.");
            return;
        }

        setSaving(true);
        setFormError("");

        const options = {
            forceFormData: true,
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                closeFormPage();
                setToast({
                    type: "success",
                    message:
                        modalMode === "edit"
                            ? "Berita berhasil diperbarui!"
                            : "Berita berhasil ditambah!",
                });
                refreshBeritaData();
            },
            onError: (errors) => {
                setFormError(
                    errorMessageFromPayload(
                        errors,
                        modalMode === "edit"
                            ? "Gagal memperbarui berita."
                            : "Gagal menambah berita.",
                    ),
                );
            },
            onFinish: () => setSaving(false),
        };

        if (modalMode === "edit" && activeItem?.id_berita) {
            data.append("_method", "PUT");
            router.post(beritaUrl(activeItem.id_berita), data, options);
            return;
        }

        router.post(beritaUrl(), data, options);
    };

    const handleDelete = () => {
        if (!activeItem?.id_berita) return;

        setDeleting(true);
        setFormError("");

        router.delete(beritaUrl(activeItem.id_berita), {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setDeleteOpen(false);
                setActiveItem(null);
                setToast({
                    type: "success",
                    message: "Berita berhasil dihapus!",
                });
                refreshBeritaData();
            },
            onError: (errors) => {
                setFormError(
                    errorMessageFromPayload(errors, "Gagal menghapus berita."),
                );
            },
            onFinish: () => setDeleting(false),
        });
    };

    const renderFormPage = () => (
        <section className="kb-pageShell kb-formPage">
            <div className="kb-pageHead">
                <div>
                    <h2 className="kb-pageTitle">
                        {modalMode === "edit"
                            ? "Edit Berita"
                            : "Tambah Berita Baru"}
                    </h2>
                    <p className="kb-pageSub">
                        {modalMode === "edit"
                            ? "Perbarui informasi berita tanpa mengubah tampilan utama."
                            : "Lengkapi data berita baru yang akan ditampilkan."}
                    </p>
                </div>
                <button
                    className="kb-pageBackBtn"
                    type="button"
                    onClick={closeFormPage}
                    disabled={saving}
                >
                    Kembali
                </button>
            </div>

            <div className="kb-modal kb-pageCard">
                <div className="kb-modalHead">
                    <div className="kb-modalTitle">
                        {modalMode === "edit"
                            ? "Edit Berita"
                            : "Tambah Berita Baru"}
                    </div>
                </div>

                <div className="kb-modalBody">
                    <div className="kb-field">
                        <label className="kb-label">
                            Judul Berita <span>*</span>
                        </label>
                        <input
                            className="kb-input"
                            type="text"
                            value={form.judul}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    judul: event.target.value,
                                }))
                            }
                            placeholder="Masukkan judul berita..."
                        />
                    </div>

                    <div className="kb-formGrid">
                        <div className="kb-field">
                            <label className="kb-label">Thumbnail</label>
                            <div className="kb-uploadWrap">
                                <label
                                    className={`kb-uploadBox ${
                                        imagePreview ? "has-image" : ""
                                    }`}
                                    style={
                                        imagePreview
                                            ? {
                                                  backgroundImage: `url("${imagePreview}")`,
                                              }
                                            : undefined
                                    }
                                >
                                    {!imagePreview ? (
                                        <div className="kb-uploadEmpty">
                                            <CgImage className="kb-uploadIcon" />
                                            <div className="kb-uploadText">
                                                Klik untuk upload gambar
                                            </div>
                                            <div className="kb-uploadNote">
                                                PNG, JPG, JPEG, WEBP (Max 5MB)
                                            </div>
                                        </div>
                                    ) : null}
                                    <input
                                        ref={fileInputRef}
                                        className="kb-fileInput"
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={handlePickImage}
                                    />
                                </label>

                                {imagePreview ? (
                                    <button
                                        className="kb-removeImage"
                                        type="button"
                                        onClick={clearImage}
                                        aria-label="Hapus gambar"
                                    >
                                        <FiX />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="kb-field">
                            <label className="kb-label">Kategori</label>
                            <div className="kb-selectWrap">
                                <select
                                    className="kb-select"
                                    value={form.kategori}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            kategori: event.target.value,
                                        }))
                                    }
                                >
                                    <option value="" disabled>
                                        Pilih Kategori Berita
                                    </option>
                                    {KATEGORI_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="kb-field">
                        <label className="kb-label">
                            Isi Berita <span>*</span>
                        </label>
                        <textarea
                            className="kb-textarea"
                            value={form.isi}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    isi: event.target.value,
                                }))
                            }
                            placeholder="Tulis isi berita..."
                        />
                    </div>

                    {formError ? (
                        <div className="kb-formError">{formError}</div>
                    ) : null}

                    <div className="kb-modalActions">
                        <button
                            className="kb-btnGhost"
                            type="button"
                            onClick={closeFormPage}
                            disabled={saving}
                        >
                            Batal
                        </button>
                        <button
                            className="kb-btnPrimary"
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );

    const renderDetailPage = () => {
        if (!activeItem) return null;

        const detailImagePath = pickBeritaImagePath(activeItem);
        const detailImageUrl = activeItem.imageUrl || assetUrl(detailImagePath);

        return (
            <section className="kb-pageShell kb-detailPage">
                <div className="kb-pageHead">
                    <div>
                        <h2 className="kb-pageTitle">Detail Berita</h2>
                        <p className="kb-pageSub">
                            Lihat informasi berita dengan tampilan penuh
                            halaman.
                        </p>
                    </div>
                    <button
                        className="kb-pageBackBtn"
                        type="button"
                        onClick={closeDetail}
                    >
                        Kembali
                    </button>
                </div>

                <article className="kb-detailModal kb-pageCard">
                    <div
                        className={`kb-detailHero ${
                            !detailImageUrl ? "is-placeholder" : ""
                        }`}
                        style={
                            detailImageUrl
                                ? {
                                      backgroundImage: `linear-gradient(180deg, rgba(17, 24, 39, 0.08) 0%, rgba(17, 24, 39, 0.65) 100%), url("${detailImageUrl}")`,
                                  }
                                : undefined
                        }
                    >
                        <div className="kb-detailOverlay" />
                        <div className="kb-detailContent">
                            <span className="kb-badge is-detail">
                                {activeItem.kategori || "Kegiatan"}
                            </span>
                            <h3 className="kb-detailTitle">
                                {activeItem.judul || "Tanpa Judul"}
                            </h3>
                            <div className="kb-detailMeta">
                                <span className="kb-metaItem">
                                    <FiCalendar />
                                    {formatDateID(activeItem.tgl_publish)}
                                </span>
                                <span className="kb-detailAuthor">
                                    <FiUser />
                                    {activeItem.authorName || "Admin"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="kb-detailBody">
                        {String(activeItem.isi || "")
                            .split(/\n{2,}/)
                            .filter(Boolean)
                            .map((paragraph, index) => (
                                <p key={index}>{paragraph.trim()}</p>
                            ))}
                    </div>

                    <div className="kb-detailFooter">
                        <button
                            className="kb-btnGhost large"
                            type="button"
                            onClick={closeDetail}
                        >
                            Kembali
                        </button>
                    </div>
                </article>
            </section>
        );
    };

    const renderListPage = () => (
        <>
            <div className="kb-toolbar">
                <label className="kb-search" aria-label="Cari berita">
                    <FiSearch className="kb-searchIcon" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari berita..."
                    />
                    {search ? (
                        <button
                            className="kb-searchClear"
                            type="button"
                            onClick={() => setSearch("")}
                            aria-label="Hapus pencarian"
                        >
                            <FiX />
                        </button>
                    ) : null}
                </label>

                <button
                    className="kb-addButton"
                    type="button"
                    onClick={openCreate}
                >
                    <FiPlus />
                    Tambah Berita
                </button>
            </div>

            {formError && !deleteOpen ? (
                <div className="kb-alert">{formError}</div>
            ) : null}

            {filteredItems.length === 0 ? (
                <div className="kb-emptyCard">
                    <div className="kb-emptyIcon">
                        <FiFileText />
                    </div>
                    <h2>Tidak Ada Berita Ditemukan</h2>
                    <p>
                        Tidak ada berita yang sesuai dengan kata kunci
                        pencarian.
                    </p>
                </div>
            ) : (
                <div className="kb-grid">
                    {filteredItems.map((item) => {
                        const imagePath = pickBeritaImagePath(item);
                        const imageUrl = item.imageUrl || assetUrl(imagePath);

                        return (
                            <article key={item.id_berita} className="kb-card">
                                <div
                                    className={`kb-cardMedia ${
                                        !imageUrl ? "is-placeholder" : ""
                                    }`}
                                    style={
                                        imageUrl
                                            ? {
                                                  backgroundImage: `url("${imageUrl}")`,
                                              }
                                            : undefined
                                    }
                                >
                                    <span className="kb-badge">
                                        {item.kategori || "Kegiatan"}
                                    </span>
                                </div>

                                <div className="kb-cardBody">
                                    <h3 className="kb-cardTitle">
                                        {item.judul || "Tanpa Judul"}
                                    </h3>
                                    <p className="kb-cardText">
                                        {excerptText(item.isi, 140)}
                                    </p>

                                    <div className="kb-cardMeta">
                                        <span className="kb-metaItem">
                                            <FiCalendar />
                                            {formatDateID(item.tgl_publish)}
                                        </span>
                                        <span className="kb-metaAuthor">
                                            <FiUser />
                                            {item.authorName || "Admin"}
                                        </span>
                                    </div>
                                </div>

                                <div className="kb-cardActions">
                                    <button
                                        className="kb-btnView"
                                        type="button"
                                        onClick={() => openDetail(item)}
                                    >
                                        <FiEye />
                                        Lihat
                                    </button>
                                    <button
                                        className="kb-btnIcon is-green"
                                        type="button"
                                        onClick={() => openEdit(item)}
                                        aria-label="Edit berita"
                                    >
                                        <FiEdit />
                                    </button>
                                    <button
                                        className="kb-btnIcon is-red"
                                        type="button"
                                        onClick={() => openDelete(item)}
                                        aria-label="Hapus berita"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </>
    );

    return (
        <section className="ad-pagePad ad-pagePadBerita">
            <div className="kb-wrap">
                {toast ? (
                    <div
                        className={`kb-toast is-${toast.type || "success"}`}
                        role="status"
                    >
                        <div className="kb-toastIcon">✓</div>
                        <div className="kb-toastText">{toast.message}</div>
                        <button
                            className="kb-toastClose"
                            type="button"
                            onClick={() => setToast(null)}
                            aria-label="Tutup notifikasi"
                        >
                            <FiX />
                        </button>
                    </div>
                ) : null}

                <div className="ad-pageHeader">
                    <div className="ad-pageTitleWrap">
                        <h1 className="ad-wireTitle">Kelola Berita</h1>
                    </div>
                </div>

                {pageMode === "list" ? renderListPage() : null}
                {pageMode === "create" || pageMode === "edit"
                    ? renderFormPage()
                    : null}
                {pageMode === "detail" ? renderDetailPage() : null}

                {deleteOpen && activeItem ? (
                    <div className="kb-deleteOverlay" role="presentation">
                        <div
                            className="kb-deleteModal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="kb-delete-title"
                        >
                            <div
                                className="kb-deleteIconWrap"
                                aria-hidden="true"
                            >
                                <FiTrash2 />
                            </div>

                            <h2 id="kb-delete-title" className="kb-deleteTitle">
                                Hapus Berita
                            </h2>

                            <p className="kb-deleteText">
                                Apakah Anda yakin ingin menghapus berita ini?
                                Data yang sudah dihapus tidak dapat
                                dikembalikan.
                            </p>

                            {formError ? (
                                <div className="kb-formError">{formError}</div>
                            ) : null}

                            <div className="kb-deleteActions">
                                <button
                                    className="kb-deleteCancel"
                                    type="button"
                                    onClick={closeDelete}
                                    disabled={deleting}
                                >
                                    Batal
                                </button>
                                <button
                                    className="kb-deleteConfirm"
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? "Menghapus..." : "Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
