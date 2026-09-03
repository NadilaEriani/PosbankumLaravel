import { router, usePage } from "@inertiajs/react";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiCheckCircle,
    FiEdit,
    FiMail,
    FiMapPin,
    FiPhone,
    FiSave,
    FiUser,
    FiUsers,
    FiX,
} from "react-icons/fi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { TbLocation } from "react-icons/tb";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import buildingIcon from "../../assets/icons/building-icon.svg";
import "../../../css/Paralegal/paralegalProfile.css";

function safeText(value, fallback = "-") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function cleanText(value) {
    return String(value ?? "").trim();
}

function formatPhoneDisplay(value) {
    const raw = String(value ?? "").trim();
    if (!raw || raw === "-") return "-";

    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("62") && digits.length > 2) {
        return `+62 ${digits.slice(2)}`;
    }

    return raw;
}

function statusLabel(value) {
    const text = cleanText(value);
    if (!text) return "Aktif";

    const lower = text.toLowerCase();
    if (lower === "aktif") return "Aktif";
    if (lower === "nonaktif") return "Nonaktif";
    if (lower === "disetujui") return "Disetujui";
    if (lower === "ditolak") return "Ditolak";
    if (lower === "menunggu") return "Menunggu";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function taggingStatusLabel(value, latitude, longitude) {
    const hasCoords =
        latitude !== null &&
        latitude !== undefined &&
        longitude !== null &&
        longitude !== undefined &&
        String(latitude).trim() !== "" &&
        String(longitude).trim() !== "" &&
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude));

    if (!hasCoords) return "Belum Ditentukan";

    const text = cleanText(value).toLowerCase();
    if (["disetujui", "diterima", "approved", "valid"].includes(text)) {
        return "Disetujui";
    }
    if (["ditolak", "rejected", "tolak"].includes(text)) return "Ditolak";

    return "Menunggu Verifikasi";
}

function joinLocation(...items) {
    return items.map(cleanText).filter(Boolean).join(", ");
}

function getDateTime(value) {
    if (!value) return Number.MAX_SAFE_INTEGER;

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function getMemberName(item) {
    return safeText(
        item?.name || item?.nama || item?.nama_lengkap || item?.nama_paralegal,
        "Paralegal",
    );
}

function getMemberEmail(item) {
    return safeText(item?.email || item?.email_akun || item?.email_paralegal);
}

function getMemberPhone(item) {
    return safeText(
        item?.phone ||
            item?.nomor_telepon ||
            item?.nomor_tlp ||
            item?.telp ||
            item?.hp ||
            item?.no_hp,
    );
}

export default function ParalegalProfile({
    profile = {},
    onBack = () => {},
    focusTeam = false,
    focusTeamTick = 0,
}) {
    const { props } = usePage();
    const pageErrors = props.errors || {};
    const flash = props.flash || {};
    const teamSectionRef = useRef(null);

    const user = profile?.user || {};
    const posbankum = profile?.posbankum || {};
    const team = Array.isArray(profile?.team) ? profile.team : [];

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nomor_telepon: "",
    });
    const [successToast, setSuccessToast] = useState("");
    const [errorToast, setErrorToast] = useState("");

    const userName = safeText(user.name || user.nama_lengkap, "Paralegal");
    const userEmail = safeText(user.email);
    const userPhone = safeText(user.nomor_telepon || user.phone, "");
    const displayPhone = editing ? form.nomor_telepon : userPhone;

    useEffect(() => {
        setForm({
            nomor_telepon: safeText(user.nomor_telepon || user.phone, ""),
        });
    }, [user.nomor_telepon, user.phone]);

    useEffect(() => {
        if (!focusTeam || !focusTeamTick) return undefined;

        const frame = window.requestAnimationFrame(() => {
            teamSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [focusTeam, focusTeamTick]);

    const profileError = useMemo(() => {
        return (
            pageErrors.profile ||
            pageErrors.nomor_telepon ||
            pageErrors.error ||
            flash.error ||
            flash.reject ||
            ""
        );
    }, [pageErrors, flash.error, flash.reject]);

    useEffect(() => {
        if (profileError) {
            setErrorToast(profileError);
        }
    }, [profileError]);

    const registeredTeam = useMemo(() => {
        return [...team].sort((a, b) => {
            const byDate =
                getDateTime(a?.assigned_at || a?.created_at) -
                getDateTime(b?.assigned_at || b?.created_at);
            if (byDate !== 0) return byDate;
            return String(a?.id || "").localeCompare(String(b?.id || ""));
        });
    }, [team]);

    const firstRegisteredParalegal = registeredTeam[0] || {};
    const posbankumContactEmail = safeText(
        getMemberEmail(firstRegisteredParalegal) !== "-"
            ? getMemberEmail(firstRegisteredParalegal)
            : posbankum.email_akun || posbankum.email,
    );
    const posbankumContactPhone = safeText(
        getMemberPhone(firstRegisteredParalegal) !== "-"
            ? getMemberPhone(firstRegisteredParalegal)
            : posbankum.nomor_tlp || posbankum.nomor_telepon,
    );

    const areaText = joinLocation(
        posbankum.kelurahan,
        posbankum.kecamatan,
        posbankum.kabupaten,
    );
    const posbankumSubtitle = joinLocation(
        posbankum.nama,
        posbankum.kecamatan,
        posbankum.kabupaten,
    );
    const addressText = safeText(
        posbankum.alamat || areaText,
        "Alamat belum tersedia",
    );

    const handleStartEdit = () => {
        setErrorToast("");
        setSuccessToast("");
        setForm({
            nomor_telepon: safeText(user.nomor_telepon || user.phone, ""),
        });
        setEditing(true);
    };

    const handleCancel = () => {
        setForm({
            nomor_telepon: safeText(user.nomor_telepon || user.phone, ""),
        });
        setEditing(false);
        setErrorToast("");
    };

    const handleSave = () => {
        if (saving) return;

        router.put(
            "/paralegal/profile",
            {
                nomor_telepon: cleanText(form.nomor_telepon),
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setSaving(true);
                    setErrorToast("");
                    setSuccessToast("");
                },
                onSuccess: () => {
                    setEditing(false);
                    setSuccessToast("Profil paralegal berhasil diperbarui!");
                },
                onError: (errors) => {
                    setErrorToast(
                        errors.profile ||
                            errors.nomor_telepon ||
                            "Profil paralegal gagal diperbarui.",
                    );
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <section className="prfPage">
            <SuccessToast
                title="Berhasil"
                message={successToast}
                onClose={() => setSuccessToast("")}
            />
            <RejectToast
                message={errorToast}
                onClose={() => setErrorToast("")}
            />

            <div className="prfHeader">
                <div className="prfHeaderLeft">
                    <button
                        className="prfBackBtn"
                        type="button"
                        onClick={onBack}
                        aria-label="Kembali ke beranda"
                    >
                        <AiOutlineArrowLeft />
                    </button>

                    <div className="prfTitleBlock">
                        <div className="prfBreadcrumb">
                            <span>Beranda</span>
                            <span>/</span>
                            <b>Profil Paralegal</b>
                        </div>
                        <h2>Profil Paralegal</h2>
                        <span className="prfTitleLine" />
                    </div>
                </div>

                <div className="prfActions">
                    {editing ? (
                        <>
                            <button
                                className="prfBtn prfBtnLight"
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                <FiX />
                                <span>Batal</span>
                            </button>
                            <button
                                className="prfBtn prfBtnPrimary"
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <FiSave />
                                <span>
                                    {saving ? "Menyimpan..." : "Simpan Profil"}
                                </span>
                            </button>
                        </>
                    ) : (
                        <button
                            className="prfBtn prfBtnPrimary"
                            type="button"
                            onClick={handleStartEdit}
                        >
                            <FiEdit />
                            <span>Edit Profil</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="prfCard">
                {editing ? (
                    <div className="prfEditNotice">
                        <div className="prfEditNoticeIcon">
                            <FiEdit />
                        </div>
                        <div>
                            <div className="prfEditNoticeTitle">
                                Mode edit profil aktif
                            </div>
                            <p>
                                Ubah nomor telepon paralegal, lalu klik Simpan
                                Profil.
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className="prfInfoArea">
                    <section className="prfAccountSection">
                        <div className="prfSectionHead">
                            <div>
                                <h3>Data Akun Paralegal</h3>
                                <p>Data ini mengikuti akun yang sedang login</p>
                            </div>
                        </div>

                        <div className="prfAccountGrid">
                            <div
                                className={`prfAccountBox ${editing ? "is-readonly" : ""}`}
                            >
                                <div className="prfBoxIcon">
                                    <FiUser />
                                </div>
                                <div className="prfBoxBody">
                                    <span>Nama Lengkap</span>
                                    <strong>{userName}</strong>
                                    {editing ? (
                                        <small>Tidak dapat diubah</small>
                                    ) : null}
                                </div>
                            </div>

                            <div
                                className={`prfAccountBox ${editing ? "is-readonly" : ""}`}
                            >
                                <div className="prfBoxIcon">
                                    <FiMail />
                                </div>
                                <div className="prfBoxBody">
                                    <span>Email Login</span>
                                    <strong>{userEmail}</strong>
                                    {editing ? (
                                        <small>Tidak dapat diubah</small>
                                    ) : null}
                                </div>
                            </div>

                            <label
                                className={`prfAccountBox prfPhoneBox ${editing ? "is-active" : ""}`}
                            >
                                <div className="prfBoxIcon">
                                    <FiPhone />
                                </div>
                                <div className="prfBoxBody">
                                    <span>Nomor Telepon</span>
                                    {editing ? (
                                        <input
                                            value={form.nomor_telepon}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    nomor_telepon:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Nomor telepon paralegal"
                                            inputMode="tel"
                                            autoComplete="tel"
                                        />
                                    ) : (
                                        <strong>
                                            {formatPhoneDisplay(displayPhone)}
                                        </strong>
                                    )}
                                </div>
                            </label>

                            <div className="prfAccountBox">
                                <div className="prfBoxIcon">
                                    <FiCheckCircle />
                                </div>
                                <div className="prfBoxBody">
                                    <span>Status Akun</span>
                                    <strong>{statusLabel(user.status)}</strong>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="prfPosSection">
                        <div className="prfSectionHead">
                            <div>
                                <h3>Informasi Posbankum Terhubung</h3>
                                <p>
                                    Posbankum tempat akun paralegal ini
                                    ditugaskan
                                </p>
                            </div>
                        </div>

                        <div className="prfPosBox">
                            <div className="prfPosTop">
                                <div className="prfPosIconBox">
                                    <img
                                        src={buildingIcon}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                </div>
                                <div>
                                    <h4>
                                        {safeText(
                                            posbankum.nama,
                                            "Posbankum belum terhubung",
                                        )}
                                    </h4>
                                    <p>
                                        {posbankumSubtitle ||
                                            areaText ||
                                            "Wilayah belum tersedia"}
                                    </p>
                                </div>
                            </div>

                            <div className="prfPosMeta">
                                <span>
                                    <FiMapPin />
                                    <b>{addressText}</b>
                                </span>
                                <span>
                                    <FiMail />
                                    <b>{posbankumContactEmail}</b>
                                </span>
                                <span>
                                    <FiPhone />
                                    <b>
                                        {formatPhoneDisplay(
                                            posbankumContactPhone,
                                        )}
                                    </b>
                                </span>
                                <span>
                                    <TbLocation />
                                    <b>
                                        Tagging Area:{" "}
                                        {taggingStatusLabel(
                                            posbankum.status_tagging_area,
                                            posbankum.latitude,
                                            posbankum.longitude,
                                        )}
                                    </b>
                                </span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="prfDivider" />

                <section ref={teamSectionRef} className="prfTeamSection">
                    <div className="prfTeamHead">
                        <div>
                            <h3>
                                <FiUsers />
                                <span>Teman Paralegal</span>
                            </h3>
                            <p>
                                Daftar paralegal yang terhubung pada Posbankum
                                yang sama
                            </p>
                        </div>
                        <span className="prfCountBadge">
                            {team.length} Orang
                        </span>
                    </div>

                    {team.length ? (
                        <div className="prfTeamList">
                            {team.map((item, index) => (
                                <div
                                    key={
                                        item.id ||
                                        item.id_user ||
                                        `${item.email}-${index}`
                                    }
                                    className={`prfTeamItem ${item.is_current ? "is-current" : ""}`}
                                >
                                    <div className="prfTeamAvatar">
                                        <FiUser />
                                    </div>

                                    <div className="prfTeamBody">
                                        <div className="prfTeamName">
                                            {getMemberName(item)}
                                        </div>
                                        <div className="prfTeamMeta">
                                            <span>
                                                <FiMail />
                                                {getMemberEmail(item)}
                                            </span>
                                            <span>
                                                <FiPhone />
                                                {formatPhoneDisplay(
                                                    getMemberPhone(item),
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {item.is_current ? (
                                        <span className="prfTeamBadge is-you">
                                            Anda
                                        </span>
                                    ) : (
                                        <span className="prfTeamBadge is-active">
                                            <FiCheckCircle />
                                            {statusLabel(item.status)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="prfEmptyBox">
                            Belum ada data teman paralegal yang terhubung.
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}

ParalegalProfile.propTypes = {
    profile: PropTypes.shape({
        user: PropTypes.object,
        posbankum: PropTypes.object,
        team: PropTypes.array,
    }),
    onBack: PropTypes.func,
    focusTeam: PropTypes.bool,
    focusTeamTick: PropTypes.number,
};
