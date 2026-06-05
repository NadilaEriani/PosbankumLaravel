import { useMemo, useState } from "react";
import {
    FiSearch,
    FiX,
    FiMapPin,
    FiEye,
    FiUsers,
    FiClock,
    FiAlertCircle,
    FiFilter,
    FiDownload,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";
import icon from "../../assets/icon.png";

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function statusKey(value) {
    const status = normalize(value);

    if (
        status.includes("menunggu") ||
        status.includes("pending") ||
        status.includes("belum")
    ) {
        return "pending";
    }

    if (
        status.includes("tidak") ||
        status.includes("tolak") ||
        status.includes("kurang")
    ) {
        return "incomplete";
    }

    return "active";
}

export default function DataPosbankum({ rows = [] }) {
    const [tab, setTab] = useState("all");
    const [q, setQ] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [previewRow, setPreviewRow] = useState(null);

    const stats = useMemo(() => {
        const result = {
            aktif: 0,
            menunggu: 0,
            tidakLengkap: 0,
        };

        rows.forEach((row) => {
            const key = statusKey(row.status);

            if (key === "pending") result.menunggu += 1;
            else if (key === "incomplete") result.tidakLengkap += 1;
            else result.aktif += 1;
        });

        return result;
    }, [rows]);

    const filteredRows = useMemo(() => {
        const search = normalize(q);

        return rows.filter((row) => {
            const key = statusKey(row.status);

            if (tab === "active" && key !== "active") return false;
            if (tab === "pending" && key !== "pending") return false;
            if (tab === "incomplete" && key !== "incomplete") return false;

            if (!search) return true;

            return [
                row.name,
                row.address,
                row.email,
                row.phone,
                row.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [rows, q, tab]);

    const tabs = [
        { key: "all", label: "Semua", count: rows.length },
        { key: "active", label: "Aktif", count: stats.aktif },
        { key: "pending", label: "Menunggu", count: stats.menunggu },
        { key: "incomplete", label: "Tidak Lengkap", count: stats.tidakLengkap },
    ];

    return (
        <div className="dp">
            <div className="dp-head">
                <div>
                    <div className="dp-title">Data Posbankum</div>
                    <div className="dp-subtitle">
                        Data Posbankum yang terhubung dengan database MySQL.
                    </div>
                </div>

                <button type="button" className="dp-exportBtn">
                    <FiDownload />
                    Export
                </button>
            </div>

            <div className="dp-stats">
                <div className="dp-statCard tone-green">
                    <BsCheck2Circle />
                    <div>
                        <strong>{stats.aktif}</strong>
                        <span>Posbankum Aktif</span>
                    </div>
                </div>

                <div className="dp-statCard tone-orange">
                    <FiClock />
                    <div>
                        <strong>{stats.menunggu}</strong>
                        <span>Menunggu Verifikasi</span>
                    </div>
                </div>

                <div className="dp-statCard tone-red">
                    <AiOutlineCloseCircle />
                    <div>
                        <strong>{stats.tidakLengkap}</strong>
                        <span>Data Tidak Lengkap</span>
                    </div>
                </div>
            </div>

            <div className="dp-toolbar">
                <div className="dp-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Cari data Posbankum..."
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                    />
                    {q ? (
                        <button type="button" onClick={() => setQ("")}>
                            <FiX />
                        </button>
                    ) : null}
                </div>

                <div className="dp-tabs">
                    {tabs.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`dp-tab ${
                                tab === item.key ? "is-active" : ""
                            }`}
                            onClick={() => setTab(item.key)}
                        >
                            <FiFilter />
                            {item.label}
                            <span>{item.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="dp-list">
                {filteredRows.map((row, index) => {
                    const open = expandedId === (row.id || index);

                    return (
                        <div className="dp-card" key={row.id || index}>
                            <div className="dp-cardHead">
                                <div className="dp-posIcon">
                                    <img src={icon} alt="" />
                                </div>

                                <div className="dp-cardMain">
                                    <h3>{row.name}</h3>
                                    <p>
                                        <FiMapPin />
                                        {row.address || "Alamat belum tersedia"}
                                    </p>
                                </div>

                                <span
                                    className={`dp-status ${
                                        statusKey(row.status) === "active"
                                            ? "is-ok"
                                            : statusKey(row.status) ===
                                                "pending"
                                              ? "is-wait"
                                              : "is-no"
                                    }`}
                                >
                                    {row.status || "Aktif"}
                                </span>

                                <button
                                    type="button"
                                    className="dp-cardExpand"
                                    onClick={() =>
                                        setExpandedId(open ? null : row.id || index)
                                    }
                                >
                                    <FiEye />
                                    Detail
                                </button>
                            </div>

                            {open ? (
                                <div className="dp-detail">
                                    <div className="dp-detailGrid">
                                        <div>
                                            <span>Paralegal</span>
                                            <strong>
                                                {row.paralegalCount || 0}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Kegiatan</span>
                                            <strong>
                                                {row.activityCount || 0}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Kasus</span>
                                            <strong>{row.caseCount || 0}</strong>
                                        </div>

                                        <div>
                                            <span>Kontak</span>
                                            <strong>{row.phone || "-"}</strong>
                                        </div>
                                    </div>

                                    <div className="dp-docBox">
                                        <FiUsers />
                                        <div>
                                            <strong>Email Akun</strong>
                                            <p>{row.email || "-"}</p>
                                        </div>

                                        <button
                                            type="button"
                                            className="dp-previewBtn"
                                            onClick={() => setPreviewRow(row)}
                                        >
                                            Lihat Ringkasan
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {filteredRows.length === 0 ? (
                    <div className="dp-empty">
                        <FiAlertCircle />
                        Data Posbankum tidak ditemukan.
                    </div>
                ) : null}
            </div>

            {previewRow ? (
                <div className="dp-modalOverlay">
                    <div
                        className="dp-modalBackdrop"
                        onClick={() => setPreviewRow(null)}
                    />
                    <div className="dp-modalCard">
                        <div className="dp-modalHead">
                            <div>
                                <h3>{previewRow.name}</h3>
                                <p>Ringkasan data Posbankum</p>
                            </div>

                            <button
                                type="button"
                                className="dp-closeInlineBtn"
                                onClick={() => setPreviewRow(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="dp-modalBody">
                            <p>
                                <strong>Alamat:</strong>{" "}
                                {previewRow.address || "-"}
                            </p>
                            <p>
                                <strong>Email:</strong>{" "}
                                {previewRow.email || "-"}
                            </p>
                            <p>
                                <strong>Telepon:</strong>{" "}
                                {previewRow.phone || "-"}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {previewRow.status || "Aktif"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
