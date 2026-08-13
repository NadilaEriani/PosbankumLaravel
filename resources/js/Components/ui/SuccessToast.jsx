import { useEffect } from "react";
import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";
import { HiOutlineCheckCircle } from "react-icons/hi";
import "./successToast.css";

export default function SuccessToast({
    title = "Berhasil",
    message,
    onClose,
    variant = "default",
}) {
    useEffect(() => {
        if (!message) return undefined;

        const timer = window.setTimeout(() => {
            onClose?.();
        }, 3200);

        return () => window.clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    const isNewsStatus = variant === "news-status";

    return (
        <div
            className={`st-toast ${isNewsStatus ? "st-toast--news-status" : ""}`}
            role="status"
            aria-live="polite"
        >
            {isNewsStatus ? (
                <HiOutlineCheckCircle className="st-toastStatusIcon" />
            ) : (
                <div className="st-toastIcon">✓</div>
            )}

            <div className="st-toastBody">
                {!isNewsStatus ? (
                    <div className="st-toastTitle">{title}</div>
                ) : null}
                <div className="st-toastText">{message}</div>
            </div>

            <button
                className="st-toastClose"
                type="button"
                onClick={onClose}
                aria-label="Tutup notifikasi"
            >
                <FiX />
            </button>
        </div>
    );
}

SuccessToast.propTypes = {
    title: PropTypes.string,
    message: PropTypes.string,
    onClose: PropTypes.func,
    variant: PropTypes.oneOf(["default", "news-status"]),
};
