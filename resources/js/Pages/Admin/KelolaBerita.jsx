import { useMemo, useState } from "react";
import { CgImage } from "react-icons/cg";
import {
    FiCalendar,
    FiEdit,
    FiEye,
    FiPlus,
    FiSearch,
    FiTrash2,
    FiUser,
    FiX,
} from "react-icons/fi";

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

function excerptText(value, max = 130) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "Isi berita belum tersedia.";
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

export default function KelolaBerita({ rows = [] }) {
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState(null);

    const filteredRows = useMemo(() => {
        const search = q.trim().toLowerCase();

        if (!search) return rows;

        return rows.filter((item) =>
            [item.title, item.content, item.category, item.author]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search),
        );
    }, [rows, q]);

    return (
        <div className="kb">
            <div className="kb-head">
                <div>
                    <div className="kb-title">Kelola Berita</div>
                    <div className="kb-subtitle">
                        Kelola informasi dan berita Posbankum.
                    </div>
                </div>

                <button type="button" className="kb-addButton">
                    <FiPlus />
                    Tambah Berita
                </button>
            </div>

            <div className="kb-toolbar">
                <div className="kb-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Cari berita..."
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                    />
                    {q ? (
                        <button type="button" onClick={() => setQ("")}>
                            <FiX />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="kb-grid">
                {filteredRows.map((item, index) => (
                    <article className="kb-card" key={item.id || index}>
                        <div
                            className={`kb-image ${
                                item.image ? "has-image" : ""
                            }`}
                        >
                            {item.image ? (
                                <img src={item.image} alt={item.title} />
                            ) : (
                                <CgImage />
                            )}
                        </div>

                        <div className="kb-cardBody">
                            <div className="kb-cardMeta">
                                <span>
                                    <FiCalendar />
                                    {formatDateID(item.date)}
                                </span>

                                <span>
                                    <FiUser />
                                    {item.author || "Admin"}
                                </span>
                            </div>

                            <h3>{item.title}</h3>
                            <p>{excerptText(item.content)}</p>

                            <div className="kb-cardFoot">
                                <span className="kb-badge">
                                    {item.category || "Kegiatan"}
                                </span>

                                <div className="kb-cardActions">
                                    <button
                                        type="button"
                                        className="kb-btnView"
                                        onClick={() => setSelected(item)}
                                    >
                                        <FiEye />
                                    </button>

                                    <button
                                        type="button"
                                        className="kb-btnIcon"
                                    >
                                        <FiEdit />
                                    </button>

                                    <button
                                        type="button"
                                        className="kb-btnDanger"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}

                {filteredRows.length === 0 ? (
                    <div className="kb-empty">Data berita belum tersedia.</div>
                ) : null}
            </div>

            {selected ? (
                <div className="kb-modalOverlay">
                    <div
                        className="kb-modalBackdrop"
                        onClick={() => setSelected(null)}
                    />
                    <div className="kb-modalCard is-detail">
                        <div className="kb-modalHead">
                            <div>
                                <h3>{selected.title}</h3>
                                <p>{formatDateID(selected.date)}</p>
                            </div>

                            <button
                                type="button"
                                className="kb-btnIcon"
                                onClick={() => setSelected(null)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="kb-modalBody">
                            {selected.image ? (
                                <img
                                    src={selected.image}
                                    alt={selected.title}
                                    className="kb-detailImage"
                                />
                            ) : null}

                            <p>{selected.content || "Isi berita belum tersedia."}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
