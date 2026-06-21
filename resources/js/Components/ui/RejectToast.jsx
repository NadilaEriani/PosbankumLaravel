import { useEffect } from "react";
import PropTypes from "prop-types";
import { FiX } from "react-icons/fi";
import "./rejectToast.css";

export default function RejectToast({ message, onClose }) {
    useEffect(() => {
        if (!message) return undefined;

        const timer = window.setTimeout(() => {
            onClose?.();
        }, 3200);

        return () => window.clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="rt-toast" role="status" aria-live="polite">
            <div className="rt-toastIcon">✓</div>

            <div className="rt-toastBody">
                <div className="rt-toastText">{message}</div>
            </div>

            <button
                className="rt-toastClose"
                type="button"
                onClick={onClose}
                aria-label="Tutup notifikasi"
            >
                <FiX />
            </button>
        </div>
    );
}

RejectToast.propTypes = {
    message: PropTypes.string,
    onClose: PropTypes.func,
};
