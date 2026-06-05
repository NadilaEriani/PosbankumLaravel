import { useMemo, useState } from "react";
import {
    FiSearch,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiEye,
    FiFileText,
    FiFilter,
    FiClock,
    FiDownload,
    FiMapPin,
    FiInfo,
    FiSave,
} from "react-icons/fi";
import { BsCheck2Circle } from "react-icons/bs";
import { AiOutlineCloseCircle } from "react-icons/ai";

const PAGE_SIZE = 9;

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function statusKey(value) {
    const status = normalize(value);

    if (
        status.includes("verif") ||
        status.includes("setuju") ||
        status.includes("aktif")
    ) {
        return "ok";
    }

    if (
        status.includes("tolak") ||
        status.includes("tidak") ||
        status.includes("kurang")
    ) {
        return "no";
    }

    return "wait";
}

export default function VerifikasiDataPosbankum({ rows = [] }) {
    const [q, setQ] = useState("");
    const [tab, setTab] = useState("all");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const stats = useMemo(() => {
        const result = { all: rows.length, wait: 0, ok: 0, no: 0 };

        rows.forEach((row) => {
            result[statusKey(row.status)] += 1;
        });

        return result;
    }, [rows]);

    const filteredRows = useMemo(() => {
        const search = normalize(q);

        return rows.filter((row) => {
            const key = statusKey(row.status);

            if (tab !== "all" && key !== tab) return false;

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

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredRows.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const tabs = [
        { key: "all", label: "Semua", count: stats.all },
        { key: "wait", label: "Menunggu", count: stats.wait },
        { key: "ok", label: "Terverifikasi", count: stats.ok },
        { key: "no", label: "Ditolak", count: stats.no },
    ];

    return (
        <div className="vd">
            <div className="vd-head">
                <div>
                    <div className="vd-title">
                        Verifikasi Data Posbankum
                    </div>
                    <div className="vd-subtitle">
                        Periksa status dan kelengkapan data Posbankum.
                    </div>
                </div>
            </div>

            <div className="vd-toolbar">
                <div className="vd-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Cari data verifikasi..."
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

                <div className="vd-tabs">
                    {tabs.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`vd-tab ${
                                tab === item.key ? "is-active" : ""
                            }`}
                            onClick={() => {
                                setTab(item.key);
                                setPage(1);
                            }}
                        >
                            <FiFilter />
                            {item.label}
                            <span>{item.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="vd-grid">
                {pageRows.map((item, index) => {
                    const key = statusKey(item.status);

                    return (
                        <article className="vd-card" key={item.id || index}>
                            <div className="vd-cardHead">
                                <div className={`vd-statusIcon is-${key}`}>
                                    {key === "ok" ? (
                                        <BsCheck2Circle />
                                    ) : key === "no" ? (
                                        <AiOutlineCloseCircle />
                                    ) : (
                                        <FiClock />
                                    )}
                                </div>

                                <div>
                                    <h3>{item.name}</h3>
                                    <p>
                                        <FiMapPin />
                                        {item.address || "Alamat belum tersedia"}
                                    </p>
                                </div>
                            </div>

                            <div className="vd-cardMeta">
                                <span>
                                    <FiFileText />
                                    Status: {item.status || "Menunggu"}
                                </span>
                                <span>
                                    <FiInfo />
                                    Paralegal: {item.paralegalCount || 0}
                                </span>
                            </div>

                            <div className="vd-cardActions">
                                <button
                                    type="button"
                                    className="vd-actionBtn"
                                    onClick={() => setSelected(item)}
                                >
                                    <FiEye />
                                    Detail
                                </button>

                                <button
                                    type="button"
                                    className="vd-actionBtn is-approve"
                                >
                                    <FiSave />
                                    Verifikasi
                                </button>

                                <button
                                    type="button"
                                    className="vd-actionBtn is-download"
                                >
                                    <FiDownload />
                                    Berkas
                                </button>
                            </div>
                        </article>
                    );
                })}

                {pageRows.length === 0 ? (
                    <div className="vd-empty">
                        Data verifikasi belum tersedia.
                    </div>
                ) : null}
            </div>

            <div className="vd-pager">
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
                <div className="vd-modalOverlay">
                    <div
                        className="vd-modalBackdrop"
                        onClick={() => setSelected(null)}
                    />
                    <div className="vd-modalCard">
                        <div className="vd-modalHead">
                            <div>
                                <h3>{selected.name}</h3>
                                <p>Detail verifikasi data</p>
                            </div>

                            <button
                                type="button"
                                className="vd-modalClose"
                                onClick={() => setSelected(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="vd-modalBody">
                            <p>
                                <strong>Alamat:</strong>{" "}
                                {selected.address || "-"}
                            </p>
                            <p>
                                <strong>Email:</strong>{" "}
                                {selected.email || "-"}
                            </p>
                            <p>
                                <strong>Telepon:</strong>{" "}
                                {selected.phone || "-"}
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
