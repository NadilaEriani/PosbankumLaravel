import { useEffect } from "react";
import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";
import "./successToast.css";

export default function SuccessToast({ title = "Berhasil", message, onClose }) {
    useEffect(() => {
        if (!message) return undefined;

        const timer = window.setTimeout(() => {
            onClose?.();
        }, 3200);

        return () => window.clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="st-toast" role="status" aria-live="polite">
            <div className="st-toastIcon">✓</div>

            <div className="st-toastBody">
                <div className="st-toastTitle">{title}</div>
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
};
