import { FiInfo } from "react-icons/fi";
import { HiOutlineShieldCheck } from "react-icons/hi";
import "./reminderModal.css";

export default function ReminderModal({
    open,
    title = "Pengingat",
    subtitle = "Periksa kembali informasi berikut",
    description = "",
    buttonLabel = "Mengerti",
    cancelLabel = "",
    confirmLabel = "",
    loading = false,
    onClose,
    onConfirm,
    variant = "default",
}) {
    if (!open) return null;

    const primaryLabel = confirmLabel || buttonLabel;
    const handlePrimary = onConfirm || onClose;
    const isNewsStatus = variant === "news-status";
    const isAccountStatus = variant === "account-status";
    const overlayVariantClass = isNewsStatus
        ? "rmOverlay--news-status"
        : isAccountStatus
          ? "rmOverlay--account-status"
          : "";
    const cardVariantClass = isNewsStatus
        ? "rmCard--news-status"
        : isAccountStatus
          ? "rmCard--account-status"
          : "";

    return (
        <div
            className={`rmOverlay ${overlayVariantClass}`}
            onMouseDown={loading ? undefined : onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`rmCard ${cardVariantClass}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="rmHead">
                    <div className="rmIconWrap" aria-hidden="true">
                        {isAccountStatus ? (
                            <HiOutlineShieldCheck />
                        ) : (
                            <FiInfo />
                        )}
                    </div>
                    <div className="rmHeadText">
                        <div className="rmTitle">{title}</div>
                        {subtitle ? (
                            <div className="rmSubtitle">{subtitle}</div>
                        ) : null}
                    </div>
                </div>

                <div className="rmDescription">{description}</div>

                <div className="rmActions">
                    {cancelLabel ? (
                        <button
                            className="rmBtn rmBtnGhost"
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                    ) : null}

                    <button
                        className="rmBtn rmBtnPrimary"
                        type="button"
                        onClick={handlePrimary}
                        disabled={loading}
                    >
                        {loading ? "Memproses..." : primaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
