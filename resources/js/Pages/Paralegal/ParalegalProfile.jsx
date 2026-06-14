import { router, usePage } from "@inertiajs/react";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
    FiCheckCircle,
    FiMail,
    FiMapPin,
    FiPhone,
    FiUser,
    FiUsers,
} from "react-icons/fi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import posbankumIcon from "../../assets/icon.png";
import "../../../css/Paralegal/paralegalProfile.css";

function safeText(value, fallback = "-") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function statusLabel(value) {
    const text = String(value || "").trim();
    if (!text) return "Aktif";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function joinLocation(...items) {
    return items
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", ");
}

export default function ParalegalProfile({ profile = {}, onBack }) {
    const { props } = usePage();
    const pageErrors = props.errors || {};
    const flashSuccess = props.flash?.success || "";

    const user = profile?.user || {};
    const posbankum = profile?.posbankum || {};
    const team = Array.isArray(profile?.team) ? profile.team : [];

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nama_lengkap: "",
        nomor_telepon: "",
    });

    useEffect(() => {
        setForm({
            nama_lengkap: safeText(user.name || user.nama_lengkap, ""),
            nomor_telepon: safeText(user.nomor_telepon || user.phone, ""),
        });
    }, [user.name, user.nama_lengkap, user.nomor_telepon, user.phone]);

    const displayName = editing
        ? form.nama_lengkap
        : safeText(user.name || user.nama_lengkap, "Paralegal");
    const displayPhone = editing
        ? form.nomor_telepon
        : safeText(user.nomor_telepon || user.phone, "");

    const firstParalegal = team[0] || {};
    const firstParalegalEmail = safeText(
        firstParalegal.email || firstParalegal.email_akun,
        "",
    );
    const firstParalegalPhone = safeText(
        firstParalegal.phone ||
            firstParalegal.nomor_telepon ||
            firstParalegal.nomor_tlp,
        "",
    );
    const posbankumContactEmail =
        firstParalegalEmail || posbankum.email_akun || posbankum.email;
    const posbankumContactPhone =
        firstParalegalPhone || posbankum.nomor_tlp || posbankum.nomor_telepon;

    const locationText = joinLocation(
        posbankum.kelurahan,
        posbankum.kecamatan,
        posbankum.kabupaten,
    );

    const profileError = useMemo(() => {
        return (
            pageErrors.profile ||
            pageErrors.nama_lengkap ||
            pageErrors.nomor_telepon ||
            ""
        );
    }, [pageErrors]);

    const handleCancel = () => {
        setForm({
            nama_lengkap: safeText(user.name || user.nama_lengkap, ""),
            nomor_telepon: safeText(user.nomor_telepon || user.phone, ""),
        });
        setEditing(false);
    };

    const handleSave = () => {
        if (saving) return;

        router.put(
            "/paralegal/profile",
            {
                nama_lengkap: form.nama_lengkap,
                nomor_telepon: form.nomor_telepon,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => setEditing(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <section className="prfPage">
            <div className="prfHeadRow">
                <button
                    className="prfBackBtn"
                    type="button"
                    onClick={onBack}
                    aria-label="Kembali ke beranda"
                >
                    <AiOutlineArrowLeft />
                </button>

                <div className="prfHeadCopy">
                    <h2>Profil Paralegal</h2>
                    <p>
                        Informasi akun, tim paralegal, dan Posbankum terhubung
                    </p>
                </div>

                <div className="prfHeadActions">
                    {editing ? (
                        <>
                            <button
                                className="prfActionBtn prfActionGhost"
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Batal
                            </button>
                            <button
                                className="prfActionBtn prfActionPrimary"
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </>
                    ) : (
                        <button
                            className="prfActionBtn prfActionBlue"
                            type="button"
                            onClick={() => setEditing(true)}
                        >
                            Edit Profil
                        </button>
                    )}
                </div>
            </div>

            {profileError ? (
                <div className="prfAlert is-danger">{profileError}</div>
            ) : null}

            {flashSuccess && !editing ? (
                <div className="prfAlert is-success">{flashSuccess}</div>
            ) : null}

            <div className="prfLayout">
                <aside className="prfSideCard">
                    <div className="prfAvatarWrap">
                        <FiUser />
                    </div>

                    <div className="prfSideTitle">
                        {safeText(displayName, "Paralegal")}
                    </div>
                    <div className="prfSideSub">Akun Paralegal</div>

                    <div className="prfBadgeRow">
                        <span className="prfBadge is-yellow">
                            {statusLabel(user.status)}
                        </span>
                    </div>

                    <div className="prfSideDivider" />

                    <div className="prfSideMeta">
                        <span>
                            <FiMail /> {safeText(user.email)}
                        </span>
                        <span>
                            <FiPhone /> {safeText(displayPhone)}
                        </span>
                        <span>
                            <FiUsers /> {team.length} Paralegal Terhubung
                        </span>
                    </div>
                </aside>

                <div className="prfMainCard">
                    <section className="prfSection">
                        <div className="prfSectionHead">
                            <div>
                                <div className="prfSectionTitle">
                                    Data Akun Paralegal
                                </div>
                                <div className="prfSectionSub">
                                    Data ini mengikuti akun yang sedang login
                                </div>
                            </div>
                        </div>

                        {editing ? (
                            <div className="prfFormGrid">
                                <label className="prfField">
                                    <span className="prfLabel">
                                        Nama Lengkap
                                    </span>
                                    <span className="prfInputWrap">
                                        <FiUser className="prfInputIcon" />
                                        <input
                                            className="prfInput"
                                            value={form.nama_lengkap}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    nama_lengkap:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Nama lengkap paralegal"
                                        />
                                    </span>
                                </label>

                                <label className="prfField">
                                    <span className="prfLabel">
                                        Nomor Telepon
                                    </span>
                                    <span className="prfInputWrap">
                                        <FiPhone className="prfInputIcon" />
                                        <input
                                            className="prfInput"
                                            value={form.nomor_telepon}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    nomor_telepon:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Nomor telepon paralegal"
                                        />
                                    </span>
                                </label>

                                <div className="prfInfoItem">
                                    <FiMail className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Email Login
                                        </div>
                                        <div className="prfInfoValue">
                                            {safeText(user.email)}
                                        </div>
                                    </div>
                                </div>

                                <div className="prfInfoItem">
                                    <FiCheckCircle className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Status Akun
                                        </div>
                                        <div className="prfInfoValue">
                                            {statusLabel(user.status)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="prfInfoGrid">
                                <div className="prfInfoItem">
                                    <FiUser className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Nama Lengkap
                                        </div>
                                        <div className="prfInfoValue">
                                            {safeText(displayName, "Paralegal")}
                                        </div>
                                    </div>
                                </div>

                                <div className="prfInfoItem">
                                    <FiMail className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Email Login
                                        </div>
                                        <div className="prfInfoValue">
                                            {safeText(user.email)}
                                        </div>
                                    </div>
                                </div>

                                <div className="prfInfoItem">
                                    <FiPhone className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Nomor Telepon
                                        </div>
                                        <div className="prfInfoValue">
                                            {safeText(displayPhone)}
                                        </div>
                                    </div>
                                </div>

                                <div className="prfInfoItem">
                                    <FiCheckCircle className="prfInfoIcon" />
                                    <div>
                                        <div className="prfInfoLabel">
                                            Status Akun
                                        </div>
                                        <div className="prfInfoValue">
                                            {statusLabel(user.status)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="prfSection">
                        <div className="prfSectionHead">
                            <div>
                                <div className="prfSectionTitle">
                                    Informasi Posbankum Terhubung
                                </div>
                                <div className="prfSectionSub">
                                    Posbankum tempat akun paralegal ini
                                    ditugaskan
                                </div>
                            </div>
                        </div>

                        <div className="prfPosCard">
                            <div className="prfPosIconWrap">
                                <span
                                    className="prfPosIcon"
                                    style={{
                                        "--mask-url": `url(${posbankumIcon})`,
                                    }}
                                    aria-hidden="true"
                                />
                            </div>

                            <div className="prfPosBody">
                                <div className="prfPosTitle">
                                    {safeText(
                                        posbankum.nama,
                                        "Posbankum belum terhubung",
                                    )}
                                </div>
                                <div className="prfPosSub">
                                    {locationText || "Wilayah belum tersedia"}
                                </div>

                                <div className="prfPosMetaGrid">
                                    <span>
                                        <FiMapPin />{" "}
                                        {safeText(
                                            posbankum.alamat,
                                            "Alamat belum tersedia",
                                        )}
                                    </span>
                                    <span>
                                        <FiMail />{" "}
                                        {safeText(posbankumContactEmail)}
                                    </span>
                                    <span>
                                        <FiPhone />{" "}
                                        {safeText(posbankumContactPhone)}
                                    </span>
                                    <span>
                                        <FiCheckCircle /> Tagging Area:{" "}
                                        {statusLabel(
                                            posbankum.status_tagging_area,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="prfSection">
                        <div className="prfSectionHead">
                            <div>
                                <div className="prfSectionTitle withIcon">
                                    <FiUsers /> Teman Paralegal
                                </div>
                                <div className="prfSectionSub">
                                    Daftar paralegal yang terhubung pada
                                    Posbankum yang sama
                                </div>
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
                                            item.id || `${item.email}-${index}`
                                        }
                                        className={`prfTeamCard ${item.is_current ? "is-current" : ""}`}
                                    >
                                        <div className="prfTeamAvatar">
                                            <FiUser />
                                        </div>

                                        <div className="prfTeamBody">
                                            <div className="prfTeamTop">
                                                <div className="prfTeamName">
                                                    {safeText(
                                                        item.name || item.nama,
                                                        "Paralegal",
                                                    )}
                                                </div>
                                                {item.is_current ? (
                                                    <span className="prfBadge is-blue">
                                                        Anda
                                                    </span>
                                                ) : item.is_primary ? (
                                                    <span className="prfBadge is-blue">
                                                        Utama
                                                    </span>
                                                ) : (
                                                    <span className="prfBadge is-soft">
                                                        {statusLabel(
                                                            item.status,
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="prfTeamMeta">
                                                <span>
                                                    <FiMail />{" "}
                                                    {safeText(item.email)}
                                                </span>
                                                <span>
                                                    <FiPhone />{" "}
                                                    {safeText(
                                                        item.phone ||
                                                            item.nomor_telepon,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
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
};

ParalegalProfile.defaultProps = {
    profile: {},
    onBack: () => {},
};
