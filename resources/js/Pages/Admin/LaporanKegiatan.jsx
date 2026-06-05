import { useMemo, useState } from "react";
import {
    FiSearch,
    FiX,
    FiCalendar,
    FiMapPin,
    FiEye,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiUsers,
    FiThumbsUp,
    FiThumbsDown,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";

const PAGE_SIZE = 6;

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function uiStatusKey(statusDb) {
    const status = normalize(statusDb);

    if (
        [
            "diterima",
            "disetujui",
            "approve",
            "approved",
            "valid",
            "selesai",
        ].includes(status)
    ) {
        return "approved";
    }

    if (["ditolak", "tolak", "reject", "rejected"].includes(status)) {
        return "rejected";
    }

    return "pending";
}

function formatDateID(value) {
    if (!value) return "-";

    try {
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }).format(new Date(value));
    } catch {
        return "-";
    }
}

export default function LaporanKegiatan({ rows = [] }) {
    const [q, setQ] = useState("");
    const [tab, setTab] = useState("all");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const stats = useMemo(() => {
        const base = { total: rows.length, pending: 0, approved: 0, rejected: 0 };

        rows.forEach((row) => {
            const key = uiStatusKey(row.status);
            base[key] += 1;
        });

        return base;
    }, [rows]);

    const filteredRows = useMemo(() => {
        const search = normalize(q);

        return rows.filter((row) => {
            const key = uiStatusKey(row.status);

            if (tab !== "all" && key !== tab) return false;

            if (!search) return true;

            return [
                row.title,
                row.description,
                row.location,
                row.category,
                row.posbankumName,
                row.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [rows, q, tab]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredRows.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const tabs = [
        { key: "all", label: "Semua", count: stats.total },
        { key: "pending", label: "Menunggu", count: stats.pending },
        { key: "approved", label: "Disetujui", count: stats.approved },
        { key: "rejected", label: "Ditolak", count: stats.rejected },
    ];

    return (
        <div className="rk">
            <div className="rk-head">
                <div>
                    <div className="rk-title">Laporan Kegiatan</div>
                    <div className="rk-subtitle">
                        Pantau dan verifikasi laporan kegiatan Posbankum.
                    </div>
                </div>
            </div>

            <div className="rk-stats">
                <div className="rk-stat is-total">
                    <FiCalendar />
                    <div>
                        <strong>{stats.total}</strong>
                        <span>Total Kegiatan</span>
                    </div>
                </div>

                <div className="rk-stat is-pending">
                    <FiClock />
                    <div>
                        <strong>{stats.pending}</strong>
                        <span>Menunggu</span>
                    </div>
                </div>

                <div className="rk-stat is-approved">
                    <BsCheck2Circle />
                    <div>
                        <strong>{stats.approved}</strong>
                        <span>Disetujui</span>
                    </div>
                </div>

                <div className="rk-stat is-rejected">
                    <AiOutlineCloseCircle />
                    <div>
                        <strong>{stats.rejected}</strong>
                        <span>Ditolak</span>
                    </div>
                </div>
            </div>

            <div className="rk-toolbar">
                <div className="rk-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Cari laporan kegiatan..."
                        value={q}
                        onChange={(event) => {
                            setQ(event.target.value);
                            setPage(1);
                        }}
                    />
                    {q ? (
                        <button type="button" onClick={() => setQ("")}>
                            <FiX />
                        </button>
                    ) : null}
                </div>

                <div className="rk-tabs">
                    {tabs.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`rk-tab ${
                                tab === item.key ? "is-active" : ""
                            }`}
                            onClick={() => {
                                setTab(item.key);
                                setPage(1);
                            }}
                        >
                            {item.label}
                            <span>{item.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="rk-cardGrid">
                {pageRows.map((item, index) => {
                    const status = uiStatusKey(item.status);

                    return (
                        <article
                            className="rk-activityCard"
                            key={item.id || index}
                        >
                            <div className="rk-cardBody">
                                <div className="rk-cardTop">
                                    <span
                                        className={`rk-status is-${status}`}
                                    >
                                        {item.status || "Menunggu"}
                                    </span>
                                    <span>
                                        <FiCalendar />
                                        {formatDateID(item.date)}
                                    </span>
                                </div>

                                <h3>{item.title}</h3>
                                <p>{item.description}</p>

                                <div className="rk-meta">
                                    <span>
                                        <FiMapPin />
                                        {item.location || "-"}
                                    </span>
                                    <span>
                                        <FiUsers />
                                        {item.participants || 0} peserta
                                    </span>
                                </div>

                                <div className="rk-actions">
                                    <button
                                        type="button"
                                        className="rk-actionBtn"
                                        onClick={() => setSelected(item)}
                                    >
                                        <FiEye />
                                        Detail
                                    </button>

                                    <button
                                        type="button"
                                        className="rk-actionBtn is-approve"
                                    >
                                        <FiThumbsUp />
                                        Setujui
                                    </button>

                                    <button
                                        type="button"
                                        className="rk-actionBtn is-reject"
                                    >
                                        <FiThumbsDown />
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}

                {pageRows.length === 0 ? (
                    <div className="rk-empty">Laporan kegiatan belum tersedia.</div>
                ) : null}
            </div>

            <div className="rk-pager">
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                    <FiChevronLeft />
                    Sebelumnya
                </button>

                <span>
                    Halaman {currentPage} dari {totalPages}
                </span>

                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                    }
                >
                    Berikutnya
                    <FiChevronRight />
                </button>
            </div>

            {selected ? (
                <div className="rk-modalOverlay">
                    <div
                        className="rk-modalBackdrop"
                        onClick={() => setSelected(null)}
                    />
                    <div className="rk-modalCard">
                        <div className="rk-modalHead">
                            <div>
                                <h3>{selected.title}</h3>
                                <p>{selected.posbankumName || "-"}</p>
                            </div>

                            <button
                                type="button"
                                className="rk-modalClose"
                                onClick={() => setSelected(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="rk-modalBody">
                            <p>{selected.description}</p>
                            <p>
                                <strong>Lokasi:</strong>{" "}
                                {selected.location || "-"}
                            </p>
                            <p>
                                <strong>Tanggal:</strong>{" "}
                                {formatDateID(selected.date)}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {selected.status || "Menunggu"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
