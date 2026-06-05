import {
    FiBriefcase,
    FiEdit,
    FiSave,
    FiX,
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
    FiEyeOff,
} from "react-icons/fi";
import { BiShield } from "react-icons/bi";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { FiKey } from "react-icons/fi";
import { IoAlertCircleOutline } from "react-icons/io5";
import posbankumIcon from "../../assets/icon.png";

export default function AdminProfile({ user = {}, onClose }) {
    return (
        <div className="apf-modalOverlay">
            <div className="apf-modalBackdrop" onClick={onClose} />

            <div className="apf-cardShell">
                <div className="apf-head">
                    <button
                        type="button"
                        className="apf-backBtn"
                        onClick={onClose}
                    >
                        <AiOutlineArrowLeft />
                        Kembali
                    </button>

                    <div className="apf-headActions">
                        <button type="button" className="apf-btn apf-btnGhost">
                            <FiEdit />
                            Edit Profil
                        </button>

                        <button type="button" className="apf-btn apf-btnPrimary">
                            <FiSave />
                            Simpan
                        </button>
                    </div>
                </div>

                <div className="apf-body">
                    <section className="apf-profileCard">
                        <div className="apf-avatarWrap">
                            <div className="apf-avatar">
                                {user.foto_profile ? (
                                    <img
                                        src={user.foto_profile}
                                        alt={user.nama_lengkap || "Admin"}
                                    />
                                ) : (
                                    <img src={posbankumIcon} alt="" />
                                )}
                            </div>

                            <div className="apf-badge">
                                <BiShield />
                                Admin
                            </div>
                        </div>

                        <div className="apf-profileMain">
                            <h2>{user.nama_lengkap || user.name || "Admin Posbankum"}</h2>
                            <p>{user.email || "-"}</p>
                        </div>
                    </section>

                    <section className="apf-section">
                        <div className="apf-sectionTitle">
                            <FiUser />
                            Informasi Profil
                        </div>

                        <div className="apf-grid">
                            <div className="apf-field">
                                <label>Nama Lengkap</label>
                                <div>
                                    <FiUser />
                                    <span>
                                        {user.nama_lengkap ||
                                            user.name ||
                                            "Admin Posbankum"}
                                    </span>
                                </div>
                            </div>

                            <div className="apf-field">
                                <label>Email</label>
                                <div>
                                    <FiMail />
                                    <span>{user.email || "-"}</span>
                                </div>
                            </div>

                            <div className="apf-field">
                                <label>NIP</label>
                                <div>
                                    <FiBriefcase />
                                    <span>{user.nip || "-"}</span>
                                </div>
                            </div>

                            <div className="apf-field">
                                <label>Nomor Telepon</label>
                                <div>
                                    <FiPhone />
                                    <span>{user.nomor_telepon || "-"}</span>
                                </div>
                            </div>

                            <div className="apf-field">
                                <label>Jabatan</label>
                                <div>
                                    <BiShield />
                                    <span>{user.jabatan || "-"}</span>
                                </div>
                            </div>

                            <div className="apf-field">
                                <label>Alamat Kantor</label>
                                <div>
                                    <FiMapPin />
                                    <span>{user.alamat_kantor || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="apf-section">
                        <div className="apf-sectionTitle">
                            <FiKey />
                            Keamanan Akun
                        </div>

                        <div className="apf-passwordBox">
                            <div>
                                <strong>Ubah Kata Sandi</strong>
                                <p>
                                    Form perubahan password disiapkan untuk tahap
                                    update berikutnya.
                                </p>
                            </div>

                            <button type="button" className="apf-btn apf-btnOrange">
                                <FiEyeOff />
                                Ganti Password
                            </button>
                        </div>

                        <div className="apf-alert">
                            <IoAlertCircleOutline />
                            Data profil ditampilkan dari tabel users.
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
