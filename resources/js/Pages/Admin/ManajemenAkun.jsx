import { useMemo, useState } from "react";
import {
    FiSearch,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiEdit2,
    FiTrash2,
    FiPlus,
    FiMail,
    FiMapPin,
    FiEye,
    FiFilter,
    FiAlertTriangle,
} from "react-icons/fi";
import posbankumIcon from "../../assets/icon.png";

const PAGE_SIZE = 6;

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function formatRole(value) {
    const role = String(value || "").trim();
    if (!role) return "-";
    return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function ManajemenAkun({ rows = [], posbankumRows = [] }) {
    const [q, setQ] = useState("");
    const [role, setRole] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const filteredRows = useMemo(() => {
        const search = normalize(q);

        return rows.filter((row) => {
            if (role && row.role !== role) return false;

            if (!search) return true;

            return [
                row.name,
                row.email,
                row.role,
                row.status,
                row.posbankumName,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [rows, q, role]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredRows.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const roles = [
        { value: "", label: "Semua Role" },
        { value: "admin", label: "Admin" },
        { value: "paralegal", label: "Paralegal" },
        { value: "warga", label: "Warga" },
    ];

    return (
        <div className="kp">
            <div className="kpHead">
                <div>
                    <div className="kpTitle">Manajemen Akun</div>
                    <div className="kpSubtitle">
                        Kelola akun admin, paralegal, dan warga.
                    </div>
                </div>

                <button type="button" className="kpAddTop">
                    <FiPlus />
                    Tambah Akun
                </button>
            </div>

            <div className="kpToolbar">
                <div className="kpSearch">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Cari akun..."
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

                <div className="kpFilterList">
                    {roles.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={`kpFilterBtn ${
                                role === item.value ? "is-active" : ""
                            }`}
                            onClick={() => {
                                setRole(item.value);
                                setPage(1);
                            }}
                        >
                            <FiFilter />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="kpTableWrap">
                <table className="kpTable">
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Posbankum</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pageRows.map((row, index) => (
                            <tr key={row.id || row.email || index}>
                                <td>
                                    <div className="kpUserCell">
                                        <div className="kpUserAvatar">
                                            <img src={posbankumIcon} alt="" />
                                        </div>
                                        <div>
                                            <strong>{row.name || "-"}</strong>
                                            <span>{row.phone || ""}</span>
                                        </div>
                                    </div>
                                </td>

                                <td>
                                    <span className="kpEmail">
                                        <FiMail />
                                        {row.email || "-"}
                                    </span>
                                </td>

                                <td>{formatRole(row.role)}</td>

                                <td>
                                    <span className="kpPos">
                                        <FiMapPin />
                                        {row.posbankumName || "-"}
                                    </span>
                                </td>

                                <td>
                                    <span
                                        className={`kpStatus ${
                                            row.status === "aktif"
                                                ? "is-active"
                                                : ""
                                        }`}
                                    >
                                        {row.status || "-"}
                                    </span>
                                </td>

                                <td>
                                    <div className="kpActions">
                                        <button
                                            type="button"
                                            className="kpBtnGhost"
                                            onClick={() => setSelected(row)}
                                        >
                                            <FiEye />
                                        </button>

                                        <button
                                            type="button"
                                            className="kpBtnGhost is-edit"
                                        >
                                            <FiEdit2 />
                                        </button>

                                        <button
                                            type="button"
                                            className="kpBtnGhost is-delete"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="kpEmpty">
                                        Data akun belum tersedia.
                                    </div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            <div className="kpPager">
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
                <div className="kpModalOverlay">
                    <div
                        className="kpModalBackdrop"
                        onClick={() => setSelected(null)}
                    />
                    <div className="kpDetailModal">
                        <div className="kpModalHead">
                            <div>
                                <h3>{selected.name}</h3>
                                <p>{selected.email}</p>
                            </div>

                            <button
                                type="button"
                                className="kpBtnGhost"
                                onClick={() => setSelected(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kpModalBody">
                            <p>
                                <strong>Role:</strong>{" "}
                                {formatRole(selected.role)}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {selected.status || "-"}
                            </p>
                            <p>
                                <strong>Posbankum:</strong>{" "}
                                {selected.posbankumName || "-"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {posbankumRows.length === 0 ? (
                <div className="kpHint">
                    <FiAlertTriangle />
                    Data Posbankum belum tersedia untuk relasi akun.
                </div>
            ) : null}
        </div>
    );
}
