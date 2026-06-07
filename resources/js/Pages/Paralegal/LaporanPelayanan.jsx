import { router } from "@inertiajs/react";
import { AiOutlineBarChart } from "react-icons/ai";
import { useEffect, useMemo, useState } from "react";
import {
    FiFileText,
    FiClock,
    FiCheckCircle,
    FiAlertTriangle,
    FiTrendingUp,
    FiCalendar,
    FiPlus,
    FiRotateCcw,
    FiSearch,
    FiFilter,
    FiEye,
    FiTrash2,
    FiPrinter,
    FiX,
    FiUser,
    FiPhone,
    FiMapPin,
    FiUsers,
    FiSend,
    FiPaperclip,
    FiDownload,
    FiChevronDown,
    FiInfo,
} from "react-icons/fi";

import "../../../css/Paralegal/laporanPelayanan.css";

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
    id_paralegal: "",
    paralegal_nama: "",
    paralegal_hp: "",
    catatan_internal: "",
    lampiran: [],
};

const EMPTY_REMINDER = {
    open: false,
    title: "Pengingat",
    subtitle: "Periksa kembali informasi berikut",
    description: "",
    buttonLabel: "Mengerti",
};

const MAX_NIK_LENGTH = 16;
const MAX_PHONE_LENGTH = 15;
const MAX_TITLE_LENGTH = 100;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const ALLOWED_UPLOAD_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];

function firstFilled(...values) {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const cleaned = String(value).trim();
        if (cleaned && cleaned !== "-") return cleaned;
    }
    return "";
}

function digitsOnly(value, max = 100) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, max);
}

function formatDateID(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatTimeID(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
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
    if (["selesai", "done", "completed", "diterima"].includes(raw))
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

function clampText(value, limit = 160) {
    const text = String(value || "").trim();
    if (!text) return "Belum ada deskripsi.";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
}

function formatFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentFileName(file, fallback = "Lampiran") {
    return firstFilled(file?.nama_file, file?.name, file?.filename, fallback);
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

function isAllowedFileType(file) {
    const mimeType = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    return (
        ALLOWED_UPLOAD_TYPES.includes(mimeType) ||
        ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext))
    );
}

function renderRequiredLabel(text) {
    return (
        <>
            {text} <span className="lpRequiredMark">*</span>
        </>
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

function normalizeReport(row, index = 0) {
    const updates = parseUpdates(row?.updates || row?.catatan_admin);
    const status = normalizeStatus(row?.status);
    const prioritas = normalizePriority(row?.prioritas);
    const id = row?.id_pengaduan || row?.id || `laporan-${index}`;

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
        updates: updates.length
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

function SuccessToast({ message, onClose }) {
    useEffect(() => {
        if (!message) return undefined;
        const timer = window.setTimeout(onClose, 3500);
        return () => window.clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="lpToast" role="status">
            <FiCheckCircle />
            <span>{message}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Tutup notifikasi"
            >
                <FiX />
            </button>
        </div>
    );
}

function ReminderModal({
    open,
    title,
    subtitle,
    description,
    buttonLabel,
    onClose,
}) {
    if (!open) return null;

    return (
        <div className="lpReminderOverlay" role="dialog" aria-modal="true">
            <div className="lpReminderCard">
                <div className="lpReminderIcon">
                    <FiInfo />
                </div>
                <div className="lpReminderTitle">{title}</div>
                <div className="lpReminderSub">{subtitle}</div>
                <div className="lpReminderText">{description}</div>
                <button
                    type="button"
                    className="lpBtn lpBtnPrimary"
                    onClick={onClose}
                >
                    {buttonLabel || "Mengerti"}
                </button>
            </div>
        </div>
    );
}

function DeleteConfirmModal({ open, loading, onCancel, onConfirm }) {
    if (!open) return null;

    return (
        <div className="lpReminderOverlay" role="dialog" aria-modal="true">
            <div className="lpReminderCard">
                <div className="lpReminderIcon danger">
                    <FiTrash2 />
                </div>
                <div className="lpReminderTitle">Hapus Laporan?</div>
                <div className="lpReminderSub">
                    Tindakan ini tidak dapat dibatalkan
                </div>
                <div className="lpReminderText">
                    Apakah Anda yakin ingin menghapus laporan ini? Data laporan
                    dan lampiran terkait akan dihapus.
                </div>
                <div className="lpReminderActions">
                    <button
                        type="button"
                        className="lpBtn lpBtnGhost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        className="lpBtn lpBtnDelete"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Menghapus..." : "Ya, Hapus"}
                    </button>
                </div>
            </div>
        </div>
    );
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
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(flash?.success || "");
    const [reminderModal, setReminderModal] = useState(EMPTY_REMINDER);
    const [formData, setFormData] = useState(EMPTY_FORM_DATA);

    useEffect(() => {
        setReports((initialReports || []).map(normalizeReport));
    }, [initialReports]);

    useEffect(() => {
        if (flash?.success) setSuccessMessage(flash.success);
    }, [flash?.success]);

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

    const closeReminderModal = () => setReminderModal(EMPTY_REMINDER);
    const openReminderModal = (payload) =>
        setReminderModal({ ...EMPTY_REMINDER, open: true, ...payload });

    const handleParalegalChange = (value) => {
        const selected = paralegalOptions.find(
            (item) => String(item.id) === String(value),
        );
        setFormData((prev) => ({
            ...prev,
            id_paralegal: selected?.id || "",
            paralegal_nama: selected?.nama || "",
            paralegal_hp: selected?.hp || "",
        }));
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);

        if (!files.length) {
            setFormData((prev) => ({ ...prev, lampiran: [] }));
            return;
        }

        const invalid = files.find((file) => !isAllowedFileType(file));
        if (invalid) {
            event.target.value = "";
            openReminderModal({
                title: "Format file tidak didukung",
                subtitle: "Periksa lampiran yang dipilih",
                description: `File ${invalid.name} tidak didukung. Hanya PNG, JPG, JPEG, dan PDF yang diperbolehkan.`,
            });
            return;
        }

        const oversize = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
        if (oversize) {
            event.target.value = "";
            openReminderModal({
                title: "Ukuran file terlalu besar",
                subtitle: "Lampiran melebihi batas maksimum",
                description: `Ukuran file ${oversize.name} melebihi batas 5MB.`,
            });
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
        if (!formData.lokasi_kejadian.trim())
            return "Lokasi kejadian wajib diisi.";
        if (!formData.id_paralegal) return "Nama paralegal wajib dipilih.";
        return "";
    };

    const resetForm = () => setFormData(EMPTY_FORM_DATA);

    const handleSubmit = (event) => {
        event.preventDefault();
        const validationMessage = validateForm();

        if (validationMessage) {
            openReminderModal({
                title: "Data laporan belum lengkap",
                subtitle: "Periksa kembali formulir laporan",
                description: validationMessage,
            });
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
                setSuccessMessage("Laporan berhasil disimpan.");
            },
            onError: (errors) => {
                const message =
                    Object.values(errors || {})[0] ||
                    "Gagal menyimpan laporan.";
                openReminderModal({
                    title: "Laporan gagal disimpan",
                    subtitle: "Terjadi kendala saat menyimpan data",
                    description: message,
                });
            },
            onFinish: () => setSaving(false),
        });
    };

    const handleDelete = (id) => {
        setDeleteTargetId(id);
    };

    const confirmDelete = () => {
        if (!deleteTargetId) return;
        setDeleting(true);
        router.delete(`/paralegal/laporan-pelayanan/${deleteTargetId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setReports((prev) =>
                    prev.filter(
                        (item) =>
                            String(item.id_pengaduan) !==
                            String(deleteTargetId),
                    ),
                );
                setSuccessMessage("Laporan berhasil dihapus.");
                setDeleteTargetId(null);
            },
            onError: (errors) => {
                const message =
                    Object.values(errors || {})[0] ||
                    "Gagal menghapus laporan.";
                openReminderModal({
                    title: "Laporan gagal dihapus",
                    subtitle: "Terjadi kendala saat menghapus data",
                    description: message,
                });
            },
            onFinish: () => setDeleting(false),
        });
    };

    const markAsDone = (report) => {
        if (!report?.id_pengaduan) return;
        router.patch(
            `/paralegal/laporan-pelayanan/${report.id_pengaduan}/status`,
            { status: "selesai" },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setSuccessMessage("Status laporan berhasil diperbarui."),
                onError: (errors) => {
                    const message =
                        Object.values(errors || {})[0] ||
                        "Gagal memperbarui status.";
                    openReminderModal({
                        title: "Status gagal diperbarui",
                        subtitle: "Periksa kembali laporan",
                        description: message,
                    });
                },
            },
        );
    };

    const handleOpenDetail = (report) => {
        setSelectedReport(report);
        setShowDetail(true);
    };

    const handleCloseDetail = () => {
        setShowDetail(false);
        setSelectedReport(null);
    };

    const handleOpenLampiran = (file) => {
        const url = file?.url || file?.public_url || file?.path_file || "";
        if (!url) return;
        if (isImageFile(file)) {
            setPreviewFile({ ...file, signedUrl: url });
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleDownloadLampiran = (file) => {
        const url = file?.url || file?.public_url || file?.path_file || "";
        if (!url) return;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handlePrint = () => {
        if (!selectedReport) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const showValue = (value) => String(value || "-");
        const html = `
            <!doctype html>
            <html>
                <head>
                    <title>${showValue(selectedReport.nomor_pengaduan)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 36px; color: #111827; }
                        .head { border-bottom: 3px solid #0f3f93; padding-bottom: 16px; margin-bottom: 24px; }
                        h1 { margin: 0 0 6px; font-size: 24px; }
                        .muted { color: #6b7280; font-size: 13px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
                        .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
                        .label { color: #6b7280; font-size: 12px; margin-bottom: 4px; }
                        .value { font-weight: 700; }
                        .text { line-height: 1.7; }
                        .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 12px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="head">
                        <h1>Laporan Pelayanan Posbankum</h1>
                        <div class="muted">${showValue(selectedReport.nomor_pengaduan)}</div>
                    </div>
                    <div class="grid">
                        <div class="box"><div class="label">Nama Pelapor</div><div class="value">${showValue(selectedReport.nama_pelapor)}</div></div>
                        <div class="box"><div class="label">Nomor Telepon</div><div class="value">${showValue(selectedReport.nomor_telepon)}</div></div>
                        <div class="box"><div class="label">Jenis Masalah</div><div class="value">${showValue(selectedReport.jenis_masalah)}</div></div>
                        <div class="box"><div class="label">Status</div><div class="value">${getStatusLabel(selectedReport.status)}</div></div>
                        <div class="box"><div class="label">Prioritas</div><div class="value">${getPriorityLabel(selectedReport.prioritas)}</div></div>
                        <div class="box"><div class="label">Paralegal</div><div class="value">${showValue(selectedReport.paralegal_nama)}</div></div>
                    </div>
                    <div class="box">
                        <div class="label">Judul Laporan</div>
                        <div class="value">${showValue(selectedReport.judul_pengaduan)}</div>
                    </div>
                    <br />
                    <div class="box">
                        <div class="label">Kronologi</div>
                        <div class="text">${showValue(selectedReport.kronologi)}</div>
                    </div>
                    <div class="footer">Dicetak dari Sistem Aplikasi Posbankum</div>
                    <script>window.onload = function(){ window.print(); };</script>
                </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const renderReportCard = (report) => (
        <div className="lpReportCard" key={report.id_pengaduan}>
            <div className="lpReportTitleRow">
                <div>
                    <h3 className="lpReportTitle">{report.judul_pengaduan}</h3>
                    <div className="lpReportNo">{report.nomor_pengaduan}</div>
                </div>
                <div className="lpBadgeRow">
                    <span
                        className={`lpBadge ${report.status === "selesai" ? "badgeGreen" : "badgeOrange"}`}
                    >
                        {getStatusLabel(report.status)}
                    </span>
                    <span
                        className={`lpBadge ${report.prioritas === "tinggi" ? "badgeRed" : report.prioritas === "rendah" ? "badgeBlue" : "badgeOrange"}`}
                    >
                        {getPriorityLabel(report.prioritas)}
                    </span>
                </div>
            </div>

            <div className="lpReportMeta">
                <span>
                    <FiCalendar />{" "}
                    {formatDateID(report.tanggal_kejadian || report.created_at)}
                </span>
                <span>
                    <FiMapPin />{" "}
                    {report.posbankum_info || report.lokasi_kejadian}
                </span>
                <span>
                    <FiPhone /> {report.nomor_telepon}
                </span>
            </div>

            <div className="lpNameBadge">
                <FiUser /> {report.nama_pelapor}
            </div>

            <div className="lpCategoryRow">
                <span className="lpCategoryBadge">{report.jenis_masalah}</span>
            </div>

            <p className="lpReportDesc">{clampText(report.kronologi, 240)}</p>

            <div className="lpUpdateBox">
                <div className="lpUpdateTitle">
                    <FiClock /> Update Terakhir
                </div>
                <div className="lpUpdateItem">
                    <span className="lpUpdateDot" />
                    <div className="lpUpdateContent">
                        <div className="lpUpdateHead">
                            <strong>
                                {report.updates?.[report.updates.length - 1]
                                    ?.title || "Laporan Diterima"}
                            </strong>
                            <span>
                                {report.updates?.[report.updates.length - 1]
                                    ?.date || formatDateID(report.created_at)}
                            </span>
                        </div>
                        <div className="lpUpdateDesc">
                            {report.updates?.[report.updates.length - 1]
                                ?.desc || "Laporan telah masuk ke sistem."}
                        </div>
                    </div>
                </div>
            </div>

            <div className="lpReportFooter">
                <div className="lpReportFootText">
                    Ditangani oleh <b>{report.paralegal_nama || "Paralegal"}</b>
                </div>
                <div className="lpActionRow">
                    {report.status !== "selesai" ? (
                        <button
                            type="button"
                            className="lpBtn lpBtnGhost"
                            onClick={() => markAsDone(report)}
                        >
                            <FiCheckCircle /> Selesai
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="lpBtn lpBtnDetail"
                        onClick={() => handleOpenDetail(report)}
                    >
                        <FiEye /> Detail
                    </button>
                    <button
                        type="button"
                        className="lpBtn lpBtnDelete"
                        onClick={() => handleDelete(report.id_pengaduan)}
                    >
                        <FiTrash2 /> Hapus
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="lpRoot">
            <SuccessToast
                message={successMessage}
                onClose={() => setSuccessMessage("")}
            />

            <ReminderModal
                open={reminderModal.open}
                title={reminderModal.title}
                subtitle={reminderModal.subtitle}
                description={reminderModal.description}
                buttonLabel={reminderModal.buttonLabel}
                onClose={closeReminderModal}
            />

            <div className="lpStatsGrid">
                <div className="lpStatCard is-total">
                    <div className="lpStatIcon">
                        <FiFileText />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Total Laporan</div>
                        <div className="lpStatValue">{stats.total}</div>
                    </div>
                </div>
                <div className="lpStatCard is-process">
                    <div className="lpStatIcon">
                        <FiClock />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Sedang Proses</div>
                        <div className="lpStatValue">{stats.aktif}</div>
                    </div>
                </div>
                <div className="lpStatCard is-done">
                    <div className="lpStatIcon">
                        <FiCheckCircle />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Selesai</div>
                        <div className="lpStatValue">{stats.selesai}</div>
                    </div>
                </div>
                <div className="lpStatCard is-high">
                    <div className="lpStatIcon">
                        <FiAlertTriangle />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Prioritas Tinggi</div>
                        <div className="lpStatValue">{stats.tinggi}</div>
                    </div>
                </div>
                <div className="lpStatCard is-rate">
                    <div className="lpStatIcon">
                        <FiTrendingUp />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Tingkat Selesai</div>
                        <div className="lpStatValue">
                            {stats.tingkatSelesai}%
                        </div>
                    </div>
                </div>
                <div className="lpStatCard is-average">
                    <div className="lpStatIcon">
                        <FiCalendar />
                    </div>
                    <div className="lpStatBody">
                        <div className="lpStatLabel">Rata-rata</div>
                        <div className="lpStatValue">{stats.avgHari} hari</div>
                    </div>
                </div>
            </div>

            <div className="lpTabBar">
                <button
                    type="button"
                    className={`lpTabBtn ${tab === "buat" ? "is-active" : ""}`}
                    onClick={() => setTab("buat")}
                >
                    <FiPlus /> Buat Laporan
                </button>
                <button
                    type="button"
                    className={`lpTabBtn ${tab === "aktif" ? "is-active" : ""}`}
                    onClick={() => setTab("aktif")}
                >
                    <FiClock /> Laporan Aktif ({activeReports.length})
                </button>
                <button
                    type="button"
                    className={`lpTabBtn ${tab === "riwayat" ? "is-active" : ""}`}
                    onClick={() => setTab("riwayat")}
                >
                    <FiRotateCcw /> Riwayat Selesai ({completedReports.length})
                </button>
                <button
                    type="button"
                    className={`lpTabBtn ${tab === "statistik" ? "is-active" : ""}`}
                    onClick={() => setTab("statistik")}
                >
                    <AiOutlineBarChart /> Statistik
                </button>
            </div>

            {tab === "buat" ? (
                <form className="lpFormCard" onSubmit={handleSubmit}>
                    <div className="lpInfoBox">
                        <FiInfo />
                        <div>
                            <div className="lpInfoTitle">
                                Petunjuk Pengisian
                            </div>
                            <div className="lpInfoText">
                                Lengkapi formulir laporan dengan data yang
                                akurat. Field bertanda (*) wajib diisi.
                            </div>
                        </div>
                    </div>

                    <section className="lpSection">
                        <div className="lpSectionTitle">
                            <FiUser /> Data Pelapor
                        </div>
                        <div className="lpFormGrid two">
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Nama Lengkap")}
                                </label>
                                <input
                                    value={formData.nama_pelapor}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            nama_pelapor: e.target.value,
                                        }))
                                    }
                                    maxLength={120}
                                    placeholder="Masukkan nama lengkap sesuai KTP"
                                />
                            </div>
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel(
                                        "NIK (Nomor Induk Kependudukan)",
                                    )}
                                </label>
                                <input
                                    value={formData.nik}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            nik: digitsOnly(
                                                e.target.value,
                                                MAX_NIK_LENGTH,
                                            ),
                                        }))
                                    }
                                    inputMode="numeric"
                                    maxLength={MAX_NIK_LENGTH}
                                    placeholder="16 digit NIK"
                                />
                            </div>
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Nomor Telepon/HP")}
                                </label>
                                <input
                                    value={formData.nomor_telepon}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            nomor_telepon: digitsOnly(
                                                e.target.value,
                                                MAX_PHONE_LENGTH,
                                            ),
                                        }))
                                    }
                                    inputMode="numeric"
                                    maxLength={MAX_PHONE_LENGTH}
                                    placeholder="081234567890"
                                />
                            </div>
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel(
                                        "Nama Lurah/Kepala Desa",
                                    )}
                                </label>
                                <input
                                    value={formData.nama_lurah}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            nama_lurah: e.target.value,
                                        }))
                                    }
                                    maxLength={120}
                                    placeholder="Nama Lurah/Kepala Desa"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="lpSection">
                        <div className="lpSectionTitle">
                            <FiFileText /> Detail Laporan
                        </div>
                        <div className="lpFormGrid two">
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Jenis Masalah")}
                                </label>
                                <select
                                    value={formData.jenis_masalah}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            jenis_masalah: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        Pilih Jenis Masalah
                                    </option>
                                    <option value="Pidana">Pidana</option>
                                    <option value="Perdata">Perdata</option>
                                    <option value="Ketenagakerjaan">
                                        Ketenagakerjaan
                                    </option>
                                    <option value="Keluarga">Keluarga</option>
                                    <option value="Pertanahan">
                                        Pertanahan
                                    </option>
                                    <option value="Konsumen">Konsumen</option>
                                </select>
                            </div>
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Prioritas")}
                                </label>
                                <select
                                    value={formData.prioritas}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            prioritas: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        Pilih Prioritas Laporan
                                    </option>
                                    <option value="tinggi">Tinggi</option>
                                    <option value="sedang">Sedang</option>
                                    <option value="rendah">Rendah</option>
                                </select>
                            </div>
                        </div>

                        <div className="lpField">
                            <label>
                                {renderRequiredLabel("Judul Laporan")}
                            </label>
                            <input
                                value={formData.judul_pengaduan}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        judul_pengaduan: e.target.value.slice(
                                            0,
                                            MAX_TITLE_LENGTH,
                                        ),
                                    }))
                                }
                                maxLength={MAX_TITLE_LENGTH}
                                placeholder="Ringkasan singkat masalah"
                            />
                        </div>

                        <div className="lpField">
                            <label>
                                {renderRequiredLabel("Kronologi Kejadian")}
                            </label>
                            <textarea
                                rows={6}
                                value={formData.kronologi}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        kronologi: e.target.value,
                                    }))
                                }
                                maxLength={3000}
                                placeholder="Jelaskan kronologi kejadian secara detail"
                            />
                        </div>
                    </section>

                    <section className="lpSection">
                        <div className="lpSectionTitle">
                            <FiMapPin /> Waktu dan Lokasi
                        </div>
                        <div className="lpFormGrid two">
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Tanggal Kejadian")}
                                </label>
                                <input
                                    type="date"
                                    value={formData.tanggal_kejadian}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            tanggal_kejadian: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Waktu Kejadian")}
                                </label>
                                <input
                                    type="time"
                                    value={formData.waktu_kejadian}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            waktu_kejadian: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="lpField">
                            <label>
                                {renderRequiredLabel("Lokasi Kejadian")}
                            </label>
                            <input
                                value={formData.lokasi_kejadian}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        lokasi_kejadian: e.target.value,
                                    }))
                                }
                                maxLength={255}
                                placeholder="Alamat/lokasi kejadian"
                            />
                        </div>
                    </section>

                    <section className="lpSection">
                        <div className="lpSectionTitle">
                            <FiUsers /> Paralegal dan Lampiran
                        </div>
                        <div className="lpFormGrid two">
                            <div className="lpField">
                                <label>
                                    {renderRequiredLabel("Nama Paralegal")}
                                </label>
                                <select
                                    value={formData.id_paralegal}
                                    onChange={(e) =>
                                        handleParalegalChange(e.target.value)
                                    }
                                >
                                    <option value="">Pilih Paralegal</option>
                                    {paralegalOptions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.nama}{" "}
                                            {item.hp ? `- ${item.hp}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="lpField">
                                <label>Nomor HP Paralegal</label>
                                <input
                                    value={formData.paralegal_hp}
                                    readOnly
                                    placeholder="Terisi otomatis"
                                />
                            </div>
                        </div>
                        <div className="lpField">
                            <label>Catatan Internal</label>
                            <textarea
                                rows={4}
                                value={formData.catatan_internal}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        catatan_internal: e.target.value,
                                    }))
                                }
                                placeholder="Catatan tambahan untuk internal posbankum"
                            />
                        </div>
                        <label className="lpUploadBox">
                            <input
                                type="file"
                                multiple
                                accept=".png,.jpg,.jpeg,.pdf"
                                onChange={handleFileChange}
                            />
                            <FiPaperclip />
                            <div className="lpUploadTextMain">
                                Upload Lampiran
                            </div>
                            <div className="lpUploadTextSub">
                                PNG, JPG, JPEG, atau PDF. Maksimal 5MB per file.
                            </div>
                        </label>
                        {formData.lampiran.length ? (
                            <div className="lpUploadList">
                                {formData.lampiran.map((file) => (
                                    <div
                                        className="lpUploadItem"
                                        key={`${file.name}-${file.size}`}
                                    >
                                        {file.name}{" "}
                                        {formatFileSize(file.size)
                                            ? `• ${formatFileSize(file.size)}`
                                            : ""}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </section>

                    <div className="lpFormActions">
                        <button
                            type="button"
                            className="lpBtn lpBtnGhost"
                            onClick={resetForm}
                            disabled={saving}
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="lpBtn lpBtnPrimary"
                            disabled={saving}
                        >
                            <FiSend />{" "}
                            {saving ? "Menyimpan..." : "Kirim Laporan"}
                        </button>
                    </div>
                </form>
            ) : null}

            {tab === "aktif" || tab === "riwayat" ? (
                <>
                    <div className="lpToolbar">
                        <div className="lpSearchWrap">
                            <FiSearch />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari laporan, pelapor, jenis masalah..."
                            />
                        </div>
                        <div className="lpFilterWrap">
                            <FiFilter />
                            <select
                                value={priorityFilter}
                                onChange={(e) =>
                                    setPriorityFilter(e.target.value)
                                }
                            >
                                <option value="semua">Semua Prioritas</option>
                                <option value="tinggi">Tinggi</option>
                                <option value="sedang">Sedang</option>
                                <option value="rendah">Rendah</option>
                            </select>
                            <FiChevronDown className="lpFilterChevron" />
                        </div>
                    </div>
                    <div className="lpListWrap">
                        {filteredReports.length ? (
                            filteredReports.map(renderReportCard)
                        ) : (
                            <div className="lpEmptyCard">
                                <div className="lpEmptyIcon">
                                    <FiFileText />
                                </div>
                                <h2>Belum ada laporan</h2>
                                <p>
                                    Data laporan akan muncul setelah dibuat atau
                                    diterima dari database.
                                </p>
                            </div>
                        )}
                    </div>
                </>
            ) : null}

            {tab === "statistik" ? (
                <div className="lpStatsPage">
                    <div className="lpStatsBoardGrid">
                        <div className="lpPanelCard">
                            <div className="lpPanelTitle">
                                <FiFileText /> Statistik Jenis Masalah
                            </div>
                            <div className="lpBarList">
                                {Object.entries(
                                    reports.reduce((acc, item) => {
                                        acc[item.jenis_masalah] =
                                            (acc[item.jenis_masalah] || 0) + 1;
                                        return acc;
                                    }, {}),
                                ).map(([label, value]) => (
                                    <div className="lpBarItem" key={label}>
                                        <div className="lpBarHead">
                                            <span>{label}</span>
                                            <strong>{value}</strong>
                                        </div>
                                        <div className="lpBarTrack">
                                            <div
                                                className="lpBarFill is-jenis"
                                                style={{
                                                    width: `${stats.total ? Math.max(12, Math.round((value / stats.total) * 100)) : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lpPanelCard">
                            <div className="lpPanelTitle">
                                <FiAlertTriangle /> Statistik Prioritas
                            </div>
                            <div className="lpBarList">
                                {["tinggi", "sedang", "rendah"].map(
                                    (priority) => {
                                        const value = reports.filter(
                                            (item) =>
                                                item.prioritas === priority,
                                        ).length;
                                        const cls =
                                            priority === "tinggi"
                                                ? "is-priority-high"
                                                : priority === "sedang"
                                                  ? "is-priority-mid"
                                                  : "is-priority-low";
                                        return (
                                            <div
                                                className="lpBarItem"
                                                key={priority}
                                            >
                                                <div className="lpBarHead">
                                                    <span>
                                                        {getPriorityLabel(
                                                            priority,
                                                        )}
                                                    </span>
                                                    <strong>{value}</strong>
                                                </div>
                                                <div className="lpBarTrack">
                                                    <div
                                                        className={`lpBarFill ${cls}`}
                                                        style={{
                                                            width: `${stats.total ? Math.max(12, Math.round((value / stats.total) * 100)) : 0}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="lpMiniStats">
                        <div className="lpMiniStat blue">
                            <div className="lpMiniLabel">Total</div>
                            <div className="lpMiniValue">{stats.total}</div>
                        </div>
                        <div className="lpMiniStat green">
                            <div className="lpMiniLabel">Selesai</div>
                            <div className="lpMiniValue">{stats.selesai}</div>
                        </div>
                        <div className="lpMiniStat slate">
                            <div className="lpMiniLabel">Aktif</div>
                            <div className="lpMiniValue">{stats.aktif}</div>
                        </div>
                        <div className="lpMiniStat orange">
                            <div className="lpMiniLabel">Rata-rata</div>
                            <div className="lpMiniValue">
                                {stats.avgHari} hari
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {showDetail && selectedReport ? (
                <div className="lpModalOverlay" role="dialog" aria-modal="true">
                    <div className="lpModal">
                        <div className="lpModalHeader">
                            <div>
                                <div className="lpModalTitle">
                                    Detail Laporan Pelayanan
                                </div>
                                <div className="lpModalSub">
                                    {selectedReport.nomor_pengaduan}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="lpModalClose"
                                onClick={handleCloseDetail}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="lpModalBody">
                            <div className="lpModalStatusRow">
                                <span
                                    className={`lpBadge ${selectedReport.status === "selesai" ? "badgeGreen" : "badgeOrange"}`}
                                >
                                    {getStatusLabel(selectedReport.status)}
                                </span>
                                <span
                                    className={`lpBadge ${selectedReport.prioritas === "tinggi" ? "badgeRed" : selectedReport.prioritas === "rendah" ? "badgeBlue" : "badgeOrange"}`}
                                >
                                    {getPriorityLabel(selectedReport.prioritas)}
                                </span>
                            </div>
                            <div className="lpModalGrid">
                                <div className="lpModalLeft">
                                    <section className="lpSection compact">
                                        <div className="lpSectionTitle">
                                            Data Pelapor
                                        </div>
                                        <div className="lpDetailInfoCard">
                                            <div className="lpDetailLine">
                                                <FiUser /> Nama:{" "}
                                                {selectedReport.nama_pelapor}
                                            </div>
                                            <div className="lpDetailLine">
                                                <FiPhone /> Telepon:{" "}
                                                {selectedReport.nomor_telepon}
                                            </div>
                                            <div className="lpDetailLine">
                                                <FiMapPin /> Lokasi Kejadian:{" "}
                                                {selectedReport.lokasi_kejadian}
                                            </div>
                                        </div>
                                    </section>
                                    <section className="lpSection compact">
                                        <div className="lpSectionTitle">
                                            Paralegal yang Mengurus
                                        </div>
                                        <div className="lpParalegalCard">
                                            <div className="lpParalegalName">
                                                <FiUsers />{" "}
                                                {selectedReport.paralegal_nama}
                                            </div>
                                            <div className="lpParalegalPhone">
                                                <FiPhone />{" "}
                                                {selectedReport.paralegal_hp ||
                                                    "-"}
                                            </div>
                                        </div>
                                    </section>
                                    <section className="lpSection compact">
                                        <div className="lpSectionTitle">
                                            Informasi Laporan
                                        </div>
                                        <div className="lpDetailBlock">
                                            <div className="lpDetailLabel">
                                                Judul Laporan
                                            </div>
                                            <div className="lpDetailValue">
                                                {selectedReport.judul_pengaduan}
                                            </div>
                                        </div>
                                        <div className="lpDetailBlock">
                                            <div className="lpDetailLabel">
                                                Jenis Masalah
                                            </div>
                                            <span className="lpCategoryBadge">
                                                {selectedReport.jenis_masalah}
                                            </span>
                                        </div>
                                        <div className="lpDetailBlock">
                                            <div className="lpDetailLabel">
                                                Kronologi
                                            </div>
                                            <div className="lpDetailTextBox">
                                                {selectedReport.kronologi}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                                <div className="lpModalRight">
                                    <section className="lpSection compact">
                                        <div className="lpSectionTitle">
                                            Timeline Lengkap
                                        </div>
                                        <div className="lpTimeline">
                                            {(selectedReport.updates || []).map(
                                                (item, index) => (
                                                    <div
                                                        className="lpTimelineItem"
                                                        key={`${item.title}-${index}`}
                                                    >
                                                        <div className="lpTimelineDot" />
                                                        <div className="lpTimelineCard">
                                                            <div className="lpTimelineHead">
                                                                <div className="lpTimelineTitle">
                                                                    {item.title}
                                                                </div>
                                                                <div className="lpTimelineDate">
                                                                    {item.date}
                                                                </div>
                                                            </div>
                                                            <div className="lpTimelineDesc">
                                                                {item.desc}
                                                            </div>
                                                            <div className="lpTimelineMeta">
                                                                <span>
                                                                    <FiClock />{" "}
                                                                    {item.time}
                                                                </span>
                                                                <span className="lpTimelineBy">
                                                                    {item.by}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </section>
                                    {selectedReport.lampiran?.length ? (
                                        <section className="lpSection compact">
                                            <div className="lpSectionTitle">
                                                Lampiran
                                            </div>
                                            <div className="lpAttachmentList">
                                                {selectedReport.lampiran.map(
                                                    (file, index) => (
                                                        <div
                                                            className="lpAttachmentItem"
                                                            key={`${file.id_lampiran || file.nama_file}-${index}`}
                                                        >
                                                            <div className="lpAttachmentInfo">
                                                                <FiFileText />
                                                                <div>
                                                                    <div>
                                                                        {getAttachmentFileName(
                                                                            file,
                                                                        )}
                                                                    </div>
                                                                    <small>
                                                                        {formatFileSize(
                                                                            file.size_bytes,
                                                                        )}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="lpAttachmentEyeBtn"
                                                                onClick={() =>
                                                                    handleOpenLampiran(
                                                                        file,
                                                                    )
                                                                }
                                                            >
                                                                <FiEye />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="lpAttachmentEyeBtn"
                                                                onClick={() =>
                                                                    handleDownloadLampiran(
                                                                        file,
                                                                    )
                                                                }
                                                            >
                                                                <FiDownload />
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </section>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className="lpModalFooter">
                            <button
                                type="button"
                                className="lpBtn lpBtnPrint"
                                onClick={handlePrint}
                            >
                                <FiPrinter /> Print
                            </button>
                            <button
                                type="button"
                                className="lpBtn lpBtnPrimary"
                                onClick={handleCloseDetail}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <DeleteConfirmModal
                open={!!deleteTargetId}
                loading={deleting}
                onCancel={() => !deleting && setDeleteTargetId(null)}
                onConfirm={confirmDelete}
            />

            {previewFile ? (
                <div
                    className="lpPreviewOverlay"
                    onClick={() => setPreviewFile(null)}
                >
                    <div
                        className="lpPreviewModal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="lpPreviewHeader">
                            <div className="lpPreviewTitleWrap">
                                <div className="lpPreviewTitle">
                                    Preview Lampiran Foto
                                </div>
                                <div className="lpPreviewSub">
                                    {getAttachmentFileName(previewFile)}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="lpPreviewHeaderClose"
                                onClick={() => setPreviewFile(null)}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="lpPreviewBody">
                            <img
                                src={previewFile.signedUrl}
                                alt={getAttachmentFileName(previewFile)}
                                className="lpPreviewImage"
                            />
                        </div>
                        <div className="lpPreviewFooter">
                            <button
                                type="button"
                                className="lpBtn lpBtnPrimary lpPreviewCloseBtn"
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
