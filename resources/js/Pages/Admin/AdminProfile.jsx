import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
    FiBriefcase,
    FiEdit,
    FiSave,
    FiX,
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
} from "react-icons/fi";
import { BiShield } from "react-icons/bi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { IoAlertCircleOutline } from "react-icons/io5";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import posbankum from "../../assets/icon.png";
import birdIcon from "../../assets/burung5.png";
import "../../../css/Admin/adminProfile.css";

const INITIAL_FORM = {
    full_name: "",
    nip: "",
    email_kantor: "",
    nomor_telepon: "",
    nomor_kantor: "",
    jabatan: "",
    unit_kerja: "",
    alamat_kantor: "",
    foto_profile: "",
};

const EXTENDED_PROFILE_COLUMNS = [
    "nip",
    "email_kantor",
    "nomor_telepon",
    "nomor_kantor",
    "jabatan",
    "unit_kerja",
    "alamat_kantor",
    "foto_profile",
];

function sanitizeText(value) {
    if (value === null || value === undefined) return "";
    return typeof value === "string" ? value : String(value);
}

function safeTrim(value) {
    return sanitizeText(value).trim();
}

function normalizeEmail(value) {
    return safeTrim(value)
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, "")
        .replace(/＠/g, "@")
        .replace(/。/g, ".")
        .toLowerCase();
}

function isValidEmail(value) {
    const email = normalizeEmail(value);

    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(
        email,
    );
}

function isExternalUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
}

function isDataOrBlob(value) {
    return /^(data:|blob:)/i.test(String(value || ""));
}

function getProfilePhotoUrl(value) {
    const path = safeTrim(value).replace(/\\/g, "/");

    if (!path) return "";
    if (isDataOrBlob(path)) return path;
    if (path.startsWith("/file-preview")) return path;
    if (isExternalUrl(path) && !/\/storage\//i.test(path)) return path;

    const clean = path
        .replace(/^https?:\/\/[^/]+\/storage\//i, "")
        .replace(/^https?:\/\/[^/]+\//i, "")
        .replace(/[?#].*$/, "")
        .replace(/^public\//i, "")
        .replace(/^storage\//i, "")
        .replace(/^app\/public\//i, "")
        .replace(/^\/+/, "");

    if (!clean || clean.includes("..")) return "";

    return `/file-preview?path=${encodeURIComponent(clean)}`;
}

function buildFormData(data = {}, fallbackUser = {}) {
    const fullName =
        data.full_name ||
        data.nama_lengkap ||
        data.name ||
        fallbackUser.nama_lengkap ||
        fallbackUser.name ||
        "";

    const email =
        data.email_kantor ||
        data.email ||
        fallbackUser.email_kantor ||
        fallbackUser.email ||
        "";

    return {
        full_name: sanitizeText(fullName),
        nip: sanitizeText(data.nip ?? fallbackUser.nip),
        email_kantor: sanitizeText(email),
        nomor_telepon: sanitizeText(
            data.nomor_telepon ?? fallbackUser.nomor_telepon,
        ),
        nomor_kantor: sanitizeText(
            data.nomor_kantor ?? fallbackUser.nomor_kantor,
        ),
        jabatan: sanitizeText(data.jabatan ?? fallbackUser.jabatan),
        unit_kerja:
            sanitizeText(data.unit_kerja ?? fallbackUser.unit_kerja) ||
            "Kantor Wilayah Kementerian Hukum Riau",
        alamat_kantor: sanitizeText(
            data.alamat_kantor ?? fallbackUser.alamat_kantor,
        ),
        foto_profile: sanitizeText(
            data.foto_profile ?? fallbackUser.foto_profile,
        ),
    };
}

function getFirstError(
    errors,
    fallback = "Terjadi kesalahan. Silakan coba lagi.",
) {
    if (!errors) return fallback;
    if (typeof errors === "string") return errors;

    const firstValue = Object.values(errors)[0];

    if (Array.isArray(firstValue)) return firstValue[0] || fallback;
    if (typeof firstValue === "string") return firstValue;

    return fallback;
}

function hasExtendedSchema(user) {
    if (!user || typeof user !== "object") return false;

    return EXTENDED_PROFILE_COLUMNS.some((column) =>
        Object.prototype.hasOwnProperty.call(user, column),
    );
}

export default function AdminProfile({ user = {}, onClose, onBack }) {
    const closeProfile = onClose || onBack || (() => {});
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [form, setForm] = useState(() => buildFormData(user));
    const [initialForm, setInitialForm] = useState(() => buildFormData(user));
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [removePhotoRequested, setRemovePhotoRequested] = useState(false);
    const photoInputRef = useRef(null);

    useEffect(() => {
        if (editing) return;

        const next = buildFormData(user);
        setForm(next);
        setInitialForm(next);
        setSubmitError("");
        setFieldErrors({});
    }, [user, editing]);

    useEffect(() => {
        return () => {
            if (photoPreview && photoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const schemaNotice = useMemo(() => {
        if (hasExtendedSchema(user)) return "";

        return "Sebagian field profil admin membutuhkan kolom tambahan pada tabel users. Jalankan SQL tambahan agar semua field bisa tersimpan.";
    }, [user]);

    const displayEmail = useMemo(
        () =>
            sanitizeText(form.email_kantor) || sanitizeText(user.email) || "-",
        [form.email_kantor, user.email],
    );

    const displayPhoto = useMemo(
        () =>
            removePhotoRequested
                ? ""
                : photoPreview || getProfilePhotoUrl(form.foto_profile),
        [form.foto_profile, photoPreview, removePhotoRequested],
    );

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const resetSelectedPhoto = () => {
        if (photoPreview && photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
        }

        setPhotoFile(null);
        setPhotoPreview("");
        setRemovePhotoRequested(false);

        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleCancel = () => {
        setForm(initialForm);
        resetSelectedPhoto();
        setEditing(false);
        setSubmitError("");
        setFieldErrors({});
    };

    const handlePhotoClick = () => {
        if (!editing || saving) return;
        photoInputRef.current?.click();
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
            setSubmitError("Format foto harus PNG, JPG, atau JPEG.");
            setErrorMessage("Format foto harus PNG, JPG, atau JPEG.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSubmitError("Ukuran foto maksimal 5MB.");
            setErrorMessage("Ukuran foto maksimal 5MB.");
            event.target.value = "";
            return;
        }

        if (photoPreview && photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
        }

        setSubmitError("");
        setFieldErrors((prev) => ({ ...prev, foto_profile: "" }));
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setRemovePhotoRequested(false);
    };

    const handleRemovePhoto = () => {
        if (!editing || saving) return;

        if (photoPreview && photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
        }

        setSubmitError("");
        setFieldErrors((prev) => ({ ...prev, foto_profile: "" }));
        setPhotoFile(null);
        setPhotoPreview("");
        setRemovePhotoRequested(true);
        setForm((prev) => ({ ...prev, foto_profile: "" }));

        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleSave = () => {
        if (saving) return;

        const nextEmail = normalizeEmail(form.email_kantor || user.email);

        if (!safeTrim(form.full_name)) {
            setSubmitError("Nama lengkap wajib diisi.");
            setFieldErrors((prev) => ({
                ...prev,
                full_name: "Nama lengkap wajib diisi.",
            }));
            setErrorMessage("Nama lengkap wajib diisi.");
            return;
        }

        if (!nextEmail) {
            setSubmitError("Email wajib diisi.");
            setFieldErrors((prev) => ({
                ...prev,
                email_kantor: "Email wajib diisi.",
            }));
            setErrorMessage("Email wajib diisi.");
            return;
        }

        if (!isValidEmail(nextEmail)) {
            setSubmitError(
                "Format email tidak valid. Periksa kembali penulisan email.",
            );
            setFieldErrors((prev) => ({
                ...prev,
                email_kantor: "Format email tidak valid.",
            }));
            setErrorMessage("Format email tidak valid.");
            return;
        }

        const payload = new FormData();
        payload.append("full_name", safeTrim(form.full_name));
        payload.append("nip", safeTrim(form.nip));
        payload.append("email_kantor", nextEmail);
        payload.append("nomor_telepon", safeTrim(form.nomor_telepon));
        payload.append("nomor_kantor", safeTrim(form.nomor_kantor));
        payload.append("jabatan", safeTrim(form.jabatan));
        payload.append("unit_kerja", safeTrim(form.unit_kerja));
        payload.append("alamat_kantor", safeTrim(form.alamat_kantor));
        payload.append("remove_photo", removePhotoRequested ? "1" : "0");

        if (photoFile) {
            payload.append("foto_profile", photoFile);
        }

        setSaving(true);
        setSubmitError("");
        setFieldErrors({});

        router.post("/admin/profile", payload, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const freshUser = page?.props?.auth?.user || null;
                const next = freshUser
                    ? buildFormData(freshUser, user)
                    : buildFormData(
                          {
                              ...form,
                              email_kantor: nextEmail,
                              foto_profile: photoPreview || form.foto_profile,
                          },
                          user,
                      );

                setForm(next);
                setInitialForm(next);
                setEditing(false);
                setRemovePhotoRequested(false);
                setPhotoFile(null);

                if (freshUser || removePhotoRequested) {
                    if (photoPreview && photoPreview.startsWith("blob:")) {
                        URL.revokeObjectURL(photoPreview);
                    }
                    setPhotoPreview("");
                }

                if (photoInputRef.current) photoInputRef.current.value = "";

                setSuccessMessage("Profil admin berhasil diperbarui!");
            },
            onError: (errors) => {
                setFieldErrors(errors || {});
                const message = getFirstError(errors);
                setSubmitError(message);
                setErrorMessage(message);
            },
            onFinish: () => {
                setSaving(false);
            },
        });
    };

    const renderField = (
        label,
        field,
        {
            required = false,
            icon = null,
            helper = "",
            textarea = false,
            type = "text",
            placeholder = "",
            full = false,
        } = {},
    ) => {
        const Comp = textarea ? "textarea" : "input";

        return (
            <label className={`apf-field ${full ? "is-full" : ""}`}>
                <span className="apf-label">
                    {label}
                    {required ? <span className="apf-required">*</span> : null}
                </span>

                <span
                    className={`apf-inputWrap ${textarea ? "is-textarea" : ""}`}
                >
                    {icon ? (
                        <span className="apf-inputIcon">{icon}</span>
                    ) : null}
                    <Comp
                        className="apf-input"
                        type={textarea ? undefined : type}
                        value={sanitizeText(form[field])}
                        placeholder={placeholder}
                        readOnly={!editing}
                        disabled={!editing}
                        rows={textarea ? 4 : undefined}
                        onChange={(event) =>
                            handleChange(field, event.target.value)
                        }
                    />
                </span>

                {fieldErrors[field] ? (
                    <span className="apf-errorText">{fieldErrors[field]}</span>
                ) : helper ? (
                    <span className="apf-helper">{helper}</span>
                ) : null}
            </label>
        );
    };

    return (
        <section className="apf-page ad-pagePad">
            <SuccessToast
                message={successMessage}
                onClose={() => setSuccessMessage("")}
            />
            <RejectToast
                message={errorMessage}
                onClose={() => setErrorMessage("")}
            />

            <div className="apf-headRow">
                <button
                    className="apf-backBtn"
                    type="button"
                    onClick={closeProfile}
                    aria-label="Kembali"
                >
                    <AiOutlineArrowLeft />
                </button>

                <div className="apf-headCopy">
                    <h2>Profil Admin</h2>
                    <p>Kelola informasi akun administrator</p>
                </div>

                <div className="apf-headActions">
                    {editing ? (
                        <>
                            <button
                                className="apf-btn apf-btnGhost"
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                <FiX /> Batal
                            </button>
                            <button
                                className="apf-btn apf-btnPrimary"
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <FiSave />{" "}
                                {saving ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </>
                    ) : (
                        <button
                            className="apf-btn apf-btnBlue apf-headEditBtn"
                            type="button"
                            onClick={() => setEditing(true)}
                        >
                            <FiEdit /> Edit Profil
                        </button>
                    )}
                </div>
            </div>

            {submitError ? (
                <div className="apf-alert is-danger">{submitError}</div>
            ) : null}

            {schemaNotice ? (
                <div className="apf-alert is-warning">{schemaNotice}</div>
            ) : null}

            <div className="apf-cardShell">
                <div className="apf-hero">
                    <span className="apf-badge">
                        <BiShield /> Administrator
                    </span>

                    <div className="apf-heroInner">
                        <div
                            className={`apf-avatarEditBox ${editing ? "is-editing" : ""}`}
                        >
                            <div className="apf-avatarWrap">
                                <img
                                    src={displayPhoto || birdIcon}
                                    alt="Foto profil admin"
                                    className="apf-avatar"
                                />
                            </div>

                            {editing ? (
                                <>
                                    <input
                                        ref={photoInputRef}
                                        className="apf-photoInput"
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        onChange={handlePhotoChange}
                                    />
                                    <div className="apf-photoActions">
                                        <button
                                            className="apf-photoBtn"
                                            type="button"
                                            onClick={handlePhotoClick}
                                            disabled={saving}
                                        >
                                            {displayPhoto
                                                ? "Ganti Foto"
                                                : "Tambah Foto"}
                                        </button>

                                        {displayPhoto ? (
                                            <button
                                                className="apf-photoBtn apf-photoRemoveBtn"
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                disabled={saving}
                                            >
                                                Hapus Foto
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="apf-photoHint">
                                        PNG atau JPG maksimal 5MB
                                    </div>
                                    {fieldErrors.foto_profile ? (
                                        <div className="apf-photoHint">
                                            {fieldErrors.foto_profile}
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                        </div>

                        <h3>
                            {sanitizeText(form.full_name) || "Administrator"}
                        </h3>

                        <div className="apf-roleText">
                            {sanitizeText(form.jabatan) ||
                                "Administrator Sistem"}
                        </div>

                        <div className="apf-unitText">
                            {sanitizeText(form.unit_kerja) ||
                                "Kantor Wilayah Kementerian Hukum Riau"}
                        </div>

                        <div className="apf-mailText">
                            <FiMail /> {displayEmail}
                        </div>
                    </div>
                </div>

                <div className="apf-body">
                    <div className="apf-grid">
                        {renderField("Nama Lengkap", "full_name", {
                            required: true,
                            icon: <FiUser />,
                            placeholder: "Masukkan nama lengkap",
                            full: true,
                        })}

                        {renderField("NIP", "nip", {
                            required: true,
                            icon: <BiShield />,
                            helper: "18 digit Nomor Induk Pegawai",
                            placeholder: "Masukkan NIP",
                        })}

                        {renderField("Email", "email_kantor", {
                            required: true,
                            icon: <FiMail />,
                            type: "email",
                            helper: "Email ini digunakan untuk login admin.",
                            placeholder: "Masukkan email",
                        })}

                        {renderField("Nomor Telepon", "nomor_telepon", {
                            required: true,
                            icon: <FiPhone />,
                            placeholder: "Masukkan nomor telepon",
                        })}

                        {renderField("Nomor Kantor", "nomor_kantor", {
                            icon: <FiPhone />,
                            placeholder: "Masukkan nomor kantor",
                        })}

                        {renderField("Jabatan", "jabatan", {
                            required: true,
                            icon: <FiBriefcase />,
                            placeholder: "Masukkan jabatan",
                        })}

                        {renderField("Unit Kerja", "unit_kerja", {
                            required: true,
                            icon: (
                                <span
                                    className="ad-navMaskIcon"
                                    style={{
                                        "--mask-url": `url(${posbankum})`,
                                    }}
                                    aria-hidden="true"
                                />
                            ),
                            placeholder: "Masukkan unit kerja",
                        })}

                        {renderField("Alamat Kantor", "alamat_kantor", {
                            required: true,
                            icon: <FiMapPin />,
                            textarea: true,
                            placeholder: "Masukkan alamat kantor",
                            full: true,
                        })}
                    </div>

                    <div className="apf-infoCard">
                        <IoAlertCircleOutline className="apf-infoIcon" />
                        <div className="apf-infoTextWrap">
                            <div className="apf-infoHead">
                                Informasi Penting
                            </div>
                            <p>
                                Data profil ini digunakan untuk keperluan
                                administrasi sistem. Pastikan semua informasi
                                yang Anda masukkan akurat dan terkini. Perubahan
                                data akan langsung tersimpan dalam sistem.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    );
}

AdminProfile.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        id_user: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        nama_lengkap: PropTypes.string,
        email: PropTypes.string,
        nip: PropTypes.string,
        email_kantor: PropTypes.string,
        nomor_telepon: PropTypes.string,
        nomor_kantor: PropTypes.string,
        jabatan: PropTypes.string,
        unit_kerja: PropTypes.string,
        alamat_kantor: PropTypes.string,
        foto_profile: PropTypes.string,
    }),
    onClose: PropTypes.func,
    onBack: PropTypes.func,
};

AdminProfile.defaultProps = {
    user: {},
    onClose: null,
    onBack: null,
};
