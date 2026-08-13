import { FiAlertTriangle } from "react-icons/fi";
import "./deleteConfirmModal.css";

export default function DeleteConfirmModal({
    open,
    title = "Hapus Data?",
    subtitle = "Tindakan ini tidak dapat dibatalkan",
    description = "Apakah Anda yakin ingin menghapus data ini? Semua data terkait akan dihapus permanen.",
    confirmLabel = "Ya, Hapus",
    cancelLabel = "Batal",
    loading = false,
    onCancel,
    onConfirm,
    variant = "default",
}) {
    if (!open) return null;

    const isNewsStatus = variant === "news-status";

    return (
        <div
            className={`dcmOverlay ${isNewsStatus ? "dcmOverlay--news-status" : ""}`}
            onMouseDown={loading ? undefined : onCancel}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`dcmCard ${isNewsStatus ? "dcmCard--news-status" : ""}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="dcmHead">
                    <div className="dcmIconWrap" aria-hidden="true">
                        <FiAlertTriangle />
                    </div>
                    <div className="dcmHeadText">
                        <div className="dcmTitle">{title}</div>
                        {subtitle ? (
                            <div className="dcmSubtitle">{subtitle}</div>
                        ) : null}
                    </div>
                </div>

                <div className="dcmDescription">{description}</div>

                <div className="dcmActions">
                    <button
                        className="dcmBtn dcmBtnGhost"
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className="dcmBtn dcmBtnDanger"
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Memproses..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
