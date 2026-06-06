import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import {
    FiSearch,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiEdit2,
    FiTrash2,
    FiPlus,
    FiMail,
    FiMapPin,
    FiFilter,
    FiCheck,
    FiUser,
} from "react-icons/fi";
import posbankumIcon from "../../assets/icon.png";
import SuccessToast from "../../Components/ui/SuccessToast";
import RejectToast from "../../Components/ui/RejectToast";
import DeleteConfirmModal from "../../Components/ui/DeleteConfirmModal";
import "../../../css/manajemenAkun.css";

const PAGE_SIZE = 6;
const EMPTY_LIST = [];

function getFirstError(
    errors,
    fallback = "Terjadi kesalahan. Periksa kembali data yang diisi.",
) {
    if (!errors) return fallback;

    if (typeof errors === "string") return errors;

    const firstValue = Object.values(errors)[0];
    if (Array.isArray(firstValue)) return firstValue[0] || fallback;
    if (typeof firstValue === "string") return firstValue;

    return fallback;
}

function stripPosbankumPrefix(name) {
    const raw = String(name || "").trim();
    return raw.replace(/^posbankum\s+/i, "").trim();
}

function formatPosbankumName(name) {
    const cleanName = stripPosbankumPrefix(name);
    return cleanName ? `Posbankum ${cleanName}` : "-";
}

function cleanText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function sanitizePhoneInput(value) {
    return String(value ?? "")
        .replace(/\D/g, "")
        .slice(0, 15);
}

function isValidOptionalPhone(value) {
    const phone = sanitizePhoneInput(value);

    if (!phone) return true;

    return /^\d{8,15}$/.test(phone);
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function pick(row, keys, fallback = "") {
    for (const key of keys) {
        const value = row?.[key];
        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}

function normalizeRow(row, index = 0) {
    const rawName = pick(
        row,
        ["nama_lengkap", "nama_paralegal", "name", "nama", "nama_user"],
        `Paralegal ${index + 1}`,
    );

    const posbankumName = cleanText(
        pick(
            row,
            ["posbankum_nama", "nama_posbankum", "posbankumName", "posbankum"],
            "",
        ),
    );

    const kabupatenNama = cleanText(
        pick(
            row,
            ["kabupaten_nama", "nama_kabupaten", "kabupaten", "kota"],
            "",
        ),
    );
    const kecamatanNama = cleanText(
        pick(row, ["kecamatan_nama", "nama_kecamatan", "kecamatan"], ""),
    );
    const kelurahanNama = cleanText(
        pick(
            row,
            ["kelurahan_nama", "nama_kelurahan", "kelurahan", "desa"],
            "",
        ),
    );
    const lokasi = cleanText(pick(row, ["lokasi", "alamat", "address"], ""));

    const idPosbankum = cleanText(
        pick(
            row,
            ["id_posbankum", "posbankum_id", "id_pos", "posbankumId"],
            "",
        ),
    );

    return {
        ...row,
        id_user: pick(
            row,
            ["id_user", "user_id", "id_paralegal", "id", "id_posbankum"],
            `local-${index}`,
        ),
        id_posbankum: idPosbankum || `local-posbankum-${index}`,
        nama_lengkap: cleanText(rawName, `Paralegal ${index + 1}`),
        posbankum_nama:
            posbankumName ||
            cleanText(pick(row, ["nama_posbankum"], "")) ||
            cleanText(pick(row, ["nama"], "")),
        id_kabupaten: cleanText(
            pick(row, ["id_kabupaten", "kabupaten_id"], kabupatenNama),
        ),
        id_kecamatan: cleanText(
            pick(row, ["id_kecamatan", "kecamatan_id"], kecamatanNama),
        ),
        id_kelurahan: cleanText(
            pick(row, ["id_kelurahan", "kelurahan_id"], kelurahanNama),
        ),
        kabupaten_nama: kabupatenNama,
        kecamatan_nama: kecamatanNama,
        kelurahan_nama: kelurahanNama,
        lokasi,
        email: cleanText(
            pick(row, ["email", "email_akun", "email_user"], "-"),
            "-",
        ),
        nomor_telepon: cleanText(
            pick(
                row,
                ["nomor_telepon", "nomor_tlp", "no_hp", "telepon", "phone"],
                "-",
            ),
            "-",
        ),
    };
}

function uniqueOptions(rows, valueKey, labelKey) {
    const map = new Map();

    rows.forEach((row) => {
        const label = cleanText(row[labelKey]);
        const value = cleanText(row[valueKey], label);

        if (!label || label === "-") return;
        if (!map.has(String(value))) {
            map.set(String(value), { value, label });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label)),
    );
}

function toOptionRows(rows, valueKeys, labelKeys, extraMapper = null) {
    const map = new Map();

    (rows || []).forEach((row) => {
        const value = cleanText(pick(row, valueKeys, ""));
        const label = cleanText(pick(row, labelKeys, ""));

        if (!value || !label || label === "-") return;
        if (map.has(String(value))) return;

        const base = { value, label };
        map.set(
            String(value),
            extraMapper ? { ...base, ...extraMapper(row) } : base,
        );
    });

    return Array.from(map.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label)),
    );
}

function formatLocation(row) {
    const kelurahan = cleanText(row.kelurahan_nama);
    const kecamatan = cleanText(row.kecamatan_nama);
    const kabupaten = cleanText(row.kabupaten_nama);

    if (kelurahan && kecamatan && kabupaten) {
        return `${kelurahan}, ${kecamatan}, ${kabupaten}`;
    }
    if (kecamatan && kabupaten) return `${kecamatan}, ${kabupaten}`;
    if (kelurahan) return kelurahan;
    if (kecamatan) return kecamatan;
    if (kabupaten) return kabupaten;

    return cleanText(row.lokasi, "-");
}

function KpDropdown({
    value,
    onChange,
    placeholder,
    options,
    disabled = false,
    withIcon = true,
    className = "",
    searchable = true,
    searchPlaceholder = "Cari...",
}) {
    const [open, setOpen] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");
    const wrapRef = useRef(null);

    const safeOptions = useMemo(() => options || [], [options]);

    const isEmptyValue = value === "" || value === null || value === undefined;
    const selectedLabel = !isEmptyValue
        ? safeOptions.find((item) => String(item.value) === String(value))
              ?.label || ""
        : "";

    const filteredOptions = useMemo(() => {
        const search = menuSearch.trim().toLowerCase();
        if (!search) return safeOptions;

        return safeOptions.filter((item) =>
            String(item?.label ?? "")
                .toLowerCase()
                .includes(search),
        );
    }, [safeOptions, menuSearch]);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    useEffect(() => {
        if (!open) setMenuSearch("");
    }, [open]);

    useEffect(() => {
        const onPointerDown = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };

        const onKeyDown = (e) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    return (
        <div
            className={`kpDropdown ${className} ${disabled ? "is-disabled" : ""} ${
                open ? "is-open" : ""
            }`}
            ref={wrapRef}
        >
            <button
                type="button"
                className="kpDropdownBtn"
                onClick={() => !disabled && setOpen((prev) => !prev)}
                disabled={disabled}
                aria-expanded={open}
            >
                {withIcon ? <FiFilter className="kpDropdownIcon" /> : null}
                <span
                    className={`kpDropdownText ${
                        selectedLabel ? "" : "is-placeholder"
                    }`}
                >
                    {selectedLabel || placeholder}
                </span>
                <FiChevronDown
                    className={`kpDropdownChevron ${open ? "is-open" : ""}`}
                />
            </button>

            {open && !disabled ? (
                <div className="kpDropdownMenu" role="listbox">
                    {searchable ? (
                        <div className="kpDropdownSearchBox">
                            <FiSearch className="kpDropdownSearchIcon" />
                            <input
                                className="kpDropdownSearchInput"
                                name={`dropdown_search_${String(
                                    placeholder || "pilihan",
                                )
                                    .replace(/\s+/g, "_")
                                    .toLowerCase()}`}
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                autoFocus
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                            {menuSearch ? (
                                <button
                                    type="button"
                                    className="kpDropdownSearchClear"
                                    onClick={() => setMenuSearch("")}
                                    aria-label="Bersihkan pencarian dropdown"
                                >
                                    <FiX />
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="kpDropdownList">
                        {filteredOptions.length ? (
                            filteredOptions.map((opt) => {
                                const isActive =
                                    String(opt.value) === String(value);

                                return (
                                    <button
                                        key={String(opt.value)}
                                        type="button"
                                        className={`kpDropdownItem ${
                                            isActive ? "is-active" : ""
                                        }`}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                        {isActive ? (
                                            <FiCheck className="kpDropdownCheck" />
                                        ) : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="kpDropdownEmpty">
                                {menuSearch
                                    ? "Data tidak ditemukan"
                                    : "Data belum tersedia"}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function ManajemenAkun({
    rows = EMPTY_LIST,
    paralegalRows = EMPTY_LIST,
    posbankumRows = EMPTY_LIST,
    kabupatenRows = EMPTY_LIST,
    kecamatanRows = EMPTY_LIST,
    kelurahanRows = EMPTY_LIST,
    posbankumMasterRows = EMPTY_LIST,
}) {
    const normalizedSourceRows = useMemo(() => {
        const sourceRows = paralegalRows.length ? paralegalRows : rows;

        return sourceRows.map((row, index) => normalizeRow(row, index));
    }, [rows, paralegalRows]);

    const masterKabupatenOpts = useMemo(
        () =>
            toOptionRows(
                kabupatenRows,
                ["id_kabupaten", "value", "id"],
                ["nama", "label", "kabupaten_nama", "name"],
            ),
        [kabupatenRows],
    );

    const masterKecamatanOpts = useMemo(
        () =>
            toOptionRows(
                kecamatanRows,
                ["id_kecamatan", "value", "id"],
                ["nama", "label", "kecamatan_nama", "name"],
                (row) => ({
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ),
        [kecamatanRows],
    );

    const masterKelurahanOpts = useMemo(
        () =>
            toOptionRows(
                kelurahanRows,
                ["id_kelurahan", "value", "id"],
                ["nama", "label", "kelurahan_nama", "name"],
                (row) => ({
                    id_kecamatan: cleanText(
                        pick(row, ["id_kecamatan", "kecamatan_id"], ""),
                    ),
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ),
        [kelurahanRows],
    );

    const masterPosbankumOpts = useMemo(
        () =>
            toOptionRows(
                posbankumMasterRows.length
                    ? posbankumMasterRows
                    : posbankumRows,
                ["id_posbankum", "posbankum_id", "value", "id"],
                ["nama", "label", "posbankum_nama", "name"],
                (row) => ({
                    id_kelurahan: cleanText(
                        pick(row, ["id_kelurahan", "kelurahan_id"], ""),
                    ),
                    id_kecamatan: cleanText(
                        pick(row, ["id_kecamatan", "kecamatan_id"], ""),
                    ),
                    id_kabupaten: cleanText(
                        pick(row, ["id_kabupaten", "kabupaten_id"], ""),
                    ),
                }),
            ).map((item) => ({
                ...item,
                label: formatPosbankumName(item.label),
            })),
        [posbankumMasterRows, posbankumRows],
    );

    const [localRows, setLocalRows] = useState(normalizedSourceRows);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");

    const [kabupatenId, setKabupatenId] = useState("");
    const [kecamatanId, setKecamatanId] = useState("");

    const [page, setPage] = useState(1);
    const [err, setErr] = useState("");

    const [pageMode, setPageMode] = useState("list");
    const [mode, setMode] = useState("add");
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [rejectMessage, setRejectMessage] = useState("");

    const [fNama, setFNama] = useState("");
    const [fEmail, setFEmail] = useState("");
    const [fTelepon, setFTelepon] = useState("");
    const [fKabupatenId, setFKabupatenId] = useState("");
    const [fKecamatanId, setFKecamatanId] = useState("");
    const [fKelurahanId, setFKelurahanId] = useState("");
    const [fPosbankumId, setFPosbankumId] = useState("");

    useEffect(() => {
        setLocalRows(normalizedSourceRows);
    }, [normalizedSourceRows]);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => window.clearTimeout(t);
    }, [q]);

    const kabupatenOpts = useMemo(() => {
        if (masterKabupatenOpts.length) return masterKabupatenOpts;
        return uniqueOptions(localRows, "id_kabupaten", "kabupaten_nama");
    }, [masterKabupatenOpts, localRows]);

    const kecamatanOpts = useMemo(() => {
        if (masterKecamatanOpts.length) {
            return masterKecamatanOpts.filter(
                (item) =>
                    !kabupatenId ||
                    String(item.id_kabupaten) === String(kabupatenId),
            );
        }

        const baseRows = kabupatenId
            ? localRows.filter(
                  (row) => String(row.id_kabupaten) === String(kabupatenId),
              )
            : localRows;

        return uniqueOptions(baseRows, "id_kecamatan", "kecamatan_nama");
    }, [masterKecamatanOpts, localRows, kabupatenId]);

    const fKecamatanOpts = useMemo(() => {
        if (masterKecamatanOpts.length) {
            return masterKecamatanOpts.filter(
                (item) =>
                    !fKabupatenId ||
                    String(item.id_kabupaten) === String(fKabupatenId),
            );
        }

        const baseRows = fKabupatenId
            ? localRows.filter(
                  (row) => String(row.id_kabupaten) === String(fKabupatenId),
              )
            : localRows;

        return uniqueOptions(baseRows, "id_kecamatan", "kecamatan_nama");
    }, [masterKecamatanOpts, localRows, fKabupatenId]);

    const fKelurahanOpts = useMemo(() => {
        if (masterKelurahanOpts.length) {
            return masterKelurahanOpts.filter((item) => {
                if (
                    fKabupatenId &&
                    item.id_kabupaten &&
                    String(item.id_kabupaten) !== String(fKabupatenId)
                ) {
                    return false;
                }

                if (
                    fKecamatanId &&
                    String(item.id_kecamatan) !== String(fKecamatanId)
                ) {
                    return false;
                }

                return true;
            });
        }

        const baseRows = localRows.filter((row) => {
            if (
                fKabupatenId &&
                String(row.id_kabupaten) !== String(fKabupatenId)
            ) {
                return false;
            }
            if (
                fKecamatanId &&
                String(row.id_kecamatan) !== String(fKecamatanId)
            ) {
                return false;
            }
            return true;
        });

        return uniqueOptions(baseRows, "id_kelurahan", "kelurahan_nama");
    }, [masterKelurahanOpts, localRows, fKabupatenId, fKecamatanId]);

    const fPosbankumOpts = useMemo(() => {
        if (masterPosbankumOpts.length) {
            return masterPosbankumOpts.filter((item) => {
                if (
                    fKabupatenId &&
                    item.id_kabupaten &&
                    String(item.id_kabupaten) !== String(fKabupatenId)
                ) {
                    return false;
                }

                if (
                    fKecamatanId &&
                    item.id_kecamatan &&
                    String(item.id_kecamatan) !== String(fKecamatanId)
                ) {
                    return false;
                }

                if (
                    fKelurahanId &&
                    item.id_kelurahan &&
                    String(item.id_kelurahan) !== String(fKelurahanId)
                ) {
                    return false;
                }

                return true;
            });
        }

        const map = new Map();

        localRows.forEach((row) => {
            if (
                fKabupatenId &&
                String(row.id_kabupaten) !== String(fKabupatenId)
            ) {
                return;
            }
            if (
                fKecamatanId &&
                String(row.id_kecamatan) !== String(fKecamatanId)
            ) {
                return;
            }
            if (
                fKelurahanId &&
                String(row.id_kelurahan) !== String(fKelurahanId)
            ) {
                return;
            }

            const value = cleanText(row.id_posbankum);
            const label = cleanText(row.posbankum_nama);

            if (!value || !label || label === "-") return;
            if (!map.has(String(value))) {
                map.set(String(value), {
                    value,
                    label: formatPosbankumName(label),
                });
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            String(a.label).localeCompare(String(b.label)),
        );
    }, [
        masterPosbankumOpts,
        localRows,
        fKabupatenId,
        fKecamatanId,
        fKelurahanId,
    ]);

    useEffect(() => {
        setKecamatanId("");
    }, [kabupatenId]);

    const selectedKelurahanOption = useMemo(
        () =>
            fKelurahanOpts.find(
                (item) => String(item.value) === String(fKelurahanId),
            ),
        [fKelurahanOpts, fKelurahanId],
    );

    const autoPosbankumOption = useMemo(() => {
        if (!fKelurahanId) return null;

        return (
            fPosbankumOpts.find(
                (item) => String(item.id_kelurahan) === String(fKelurahanId),
            ) ||
            fPosbankumOpts[0] ||
            null
        );
    }, [fPosbankumOpts, fKelurahanId]);

    const autoPosbankumLabel = useMemo(() => {
        if (autoPosbankumOption?.label) return autoPosbankumOption.label;
        if (selectedKelurahanOption?.label) {
            return formatPosbankumName(selectedKelurahanOption.label);
        }

        return "";
    }, [autoPosbankumOption, selectedKelurahanOption]);

    useEffect(() => {
        if (!fKelurahanId) {
            if (fPosbankumId) setFPosbankumId("");
            return;
        }

        const nextPosbankumId = autoPosbankumOption?.value || "";

        if (String(fPosbankumId || "") !== String(nextPosbankumId || "")) {
            setFPosbankumId(nextPosbankumId);
        }
    }, [autoPosbankumOption, fKelurahanId, fPosbankumId]);

    const filteredRows = useMemo(() => {
        const search = debouncedQ.toLowerCase();

        return localRows.filter((row) => {
            if (
                kabupatenId &&
                String(row.id_kabupaten) !== String(kabupatenId)
            ) {
                return false;
            }
            if (
                kecamatanId &&
                String(row.id_kecamatan) !== String(kecamatanId)
            ) {
                return false;
            }

            if (!search) return true;

            return [
                row.nama_lengkap,
                row.email,
                row.nomor_telepon,
                row.posbankum_nama,
                row.kabupaten_nama,
                row.kecamatan_nama,
                row.kelurahan_nama,
                row.lokasi,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [localRows, kabupatenId, kecamatanId, debouncedQ]);

    useEffect(() => {
        setPage(1);
    }, [kabupatenId, kecamatanId, debouncedQ]);

    const total = filteredRows.length;
    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
        [total],
    );

    const safePage = Math.min(page, totalPages);
    const pageRows = filteredRows.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
    );

    const pageNums = useMemo(() => {
        const maxShown = 4;
        const shown = Math.min(totalPages, maxShown);
        return Array.from({ length: shown }, (_, i) => i + 1);
    }, [totalPages]);

    const resetForm = () => {
        setFNama("");
        setFEmail("");
        setFTelepon("");
        setFKabupatenId("");
        setFKecamatanId("");
        setFKelurahanId("");
        setFPosbankumId("");
    };

    const openTambah = () => {
        setErr("");
        setMode("add");
        setEditingId(null);
        resetForm();
        setPageMode("add");
    };

    const openEdit = (row) => {
        setErr("");
        setMode("edit");
        setEditingId(row.id_user);

        setFNama(row.nama_lengkap ?? "");
        setFEmail(row.email === "-" ? "" : (row.email ?? ""));
        setFTelepon(row.nomor_telepon === "-" ? "" : (row.nomor_telepon ?? ""));
        setFKabupatenId(row.id_kabupaten ?? "");
        setFKecamatanId(row.id_kecamatan ?? "");
        setFKelurahanId(row.id_kelurahan ?? "");
        setFPosbankumId(row.id_posbankum ?? "");

        setPageMode("edit");
    };

    const backToList = () => {
        if (saving) return;
        setErr("");
        resetForm();
        setEditingId(null);
        setPageMode("list");
    };

    const handleKabupatenFormChange = (value) => {
        setFKabupatenId(value);
        setFKecamatanId("");
        setFKelurahanId("");
        setFPosbankumId("");
    };

    const handleKecamatanFormChange = (value) => {
        setFKecamatanId(value);
        setFKelurahanId("");
        setFPosbankumId("");
    };

    const handleKelurahanFormChange = (value) => {
        setFKelurahanId(value);

        const nextPosbankum = fPosbankumOpts.find(
            (item) => String(item.id_kelurahan) === String(value),
        );
        setFPosbankumId(nextPosbankum?.value || "");
    };

    const onSimpan = () => {
        if (saving) return;
        setErr("");
        setRejectMessage("");

        const namaParalegal = fNama.trim();
        const emailParalegal = fEmail.trim();
        const nomorTelepon = sanitizePhoneInput(fTelepon);

        if (!namaParalegal) return setErr("Nama paralegal wajib diisi.");
        if (namaParalegal.length < 3) {
            return setErr("Nama paralegal minimal 3 karakter.");
        }
        if (!emailParalegal) return setErr("Email wajib diisi.");
        if (!isValidEmail(emailParalegal)) {
            return setErr("Format email tidak valid.");
        }
        if (!isValidOptionalPhone(nomorTelepon)) {
            return setErr(
                "Nomor telepon hanya boleh berisi angka, minimal 8 digit dan maksimal 15 digit.",
            );
        }
        if (!fKabupatenId) return setErr("Kabupaten wajib dipilih.");
        if (!fKecamatanId) return setErr("Kecamatan wajib dipilih.");
        if (!fKelurahanId) return setErr("Kelurahan wajib dipilih.");

        const payload = {
            nama_lengkap: namaParalegal,
            email: emailParalegal,
            nomor_telepon: nomorTelepon || "",
            id_kabupaten: fKabupatenId,
            id_kecamatan: fKecamatanId,
            id_kelurahan: fKelurahanId,
            id_posbankum: fPosbankumId,
        };

        const url =
            mode === "add"
                ? "/admin/manajemen-akun/paralegal"
                : `/admin/manajemen-akun/paralegal/${editingId}`;

        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onSuccess: () => {
                setSuccessMessage(
                    mode === "add"
                        ? "Data paralegal berhasil disimpan."
                        : "Data paralegal berhasil diperbarui.",
                );
                setErr("");
                resetForm();
                setEditingId(null);
                setPageMode("list");
            },
            onError: (errors) => {
                const message = getFirstError(errors);
                setErr(message);
                setRejectMessage(message);
            },
            onFinish: () => setSaving(false),
        };

        if (mode === "add") {
            router.post(url, payload, options);
        } else {
            router.put(url, payload, options);
        }
    };

    const onHapus = (row) => {
        setErr("");
        setDeleteTarget(row);
    };

    const confirmHapus = () => {
        if (!deleteTarget || deleting) return;

        setErr("");
        setRejectMessage("");

        router.delete(
            `/admin/manajemen-akun/paralegal/${deleteTarget.id_user}`,
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setDeleting(true),
                onSuccess: () => {
                    setSuccessMessage("Akun paralegal berhasil dihapus.");
                    setDeleteTarget(null);
                },
                onError: (errors) => {
                    const message = getFirstError(
                        errors,
                        "Gagal menghapus akun paralegal.",
                    );
                    setErr(message);
                    setRejectMessage(message);
                },
                onFinish: () => setDeleting(false),
            },
        );
    };

    const formTitle = mode === "add" ? "Tambah Paralegal" : "Edit Paralegal";
    const renderFormPage = () => (
        <div className="kpFormPage">
            <div className="kpFormCard">
                <div className="kpFormPageHead">
                    <div>
                        <h2 className="kpFormPageTitle">{formTitle}</h2>
                        <p className="kpFormPageSub">
                            Lengkapi data akun dan wilayah paralegal.
                        </p>
                    </div>
                </div>

                <div className="kpFormPageBody">
                    <div className="kpFormGroup">
                        <label className="kpLabel" htmlFor="nama-paralegal">
                            Nama Paralegal
                        </label>
                        <input
                            id="nama-paralegal"
                            name="paralegal_nama_lengkap_input"
                            className="kpInput"
                            placeholder="Contoh: Siti Aminah"
                            value={fNama}
                            onChange={(e) => setFNama(e.target.value)}
                            maxLength={255}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                    </div>

                    <div className="kpGrid2">
                        <div className="kpFormGroup">
                            <label
                                className="kpLabel"
                                htmlFor="email-paralegal"
                            >
                                Email
                            </label>
                            <input
                                id="email-paralegal"
                                name="paralegal_email_input"
                                type="email"
                                className="kpInput"
                                placeholder="paralegal@gmail.com"
                                value={fEmail}
                                onChange={(e) => setFEmail(e.target.value)}
                                maxLength={255}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label
                                className="kpLabel"
                                htmlFor="telepon-paralegal"
                            >
                                Nomor Telepon (Opsional)
                            </label>
                            <input
                                id="telepon-paralegal"
                                name="paralegal_nomor_telepon_input"
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={15}
                                className="kpInput"
                                placeholder="08xxxxxxxxxx"
                                value={fTelepon}
                                onChange={(e) =>
                                    setFTelepon(
                                        sanitizePhoneInput(e.target.value),
                                    )
                                }
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <div className="kpGrid2">
                        <div className="kpFormGroup">
                            <label className="kpLabel">Kabupaten</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKabupatenId}
                                onChange={handleKabupatenFormChange}
                                placeholder="Pilih Kabupaten"
                                withIcon={false}
                                options={kabupatenOpts}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label className="kpLabel">Kecamatan</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKecamatanId}
                                onChange={handleKecamatanFormChange}
                                placeholder="Pilih Kecamatan"
                                disabled={!fKabupatenId}
                                withIcon={false}
                                options={fKecamatanOpts}
                            />
                        </div>
                    </div>

                    <div className="kpGrid2">
                        <div className="kpFormGroup">
                            <label className="kpLabel">Kelurahan</label>
                            <KpDropdown
                                className="kpFormDropdown"
                                value={fKelurahanId}
                                onChange={handleKelurahanFormChange}
                                placeholder="Pilih Kelurahan"
                                disabled={
                                    !fKecamatanId || !fKelurahanOpts.length
                                }
                                withIcon={false}
                                options={fKelurahanOpts}
                            />
                        </div>

                        <div className="kpFormGroup">
                            <label className="kpLabel">Posbankum</label>
                            <input
                                className="kpInput kpInputReadonly"
                                name="posbankum_display_readonly_input"
                                value={autoPosbankumLabel}
                                placeholder="Mengikuti kelurahan"
                                readOnly
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </div>

                <div className="kpFormPageFoot">
                    <button
                        className="kpBtnGhost"
                        type="button"
                        onClick={backToList}
                        disabled={saving}
                    >
                        Batal
                    </button>
                    <button
                        className="kpBtnPrimary"
                        type="button"
                        onClick={onSimpan}
                        disabled={saving}
                    >
                        {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderListPage = () => (
        <>
            <div className="kpPanel">
                <div className="kpToolbar">
                    <div className="kpSearch">
                        <FiSearch className="kpSearchIco" />
                        <input
                            className="kpSearchInput"
                            name="manajemen_akun_search_input"
                            placeholder="Pencarian..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                        {q ? (
                            <button
                                className="kpClear"
                                type="button"
                                onClick={() => setQ("")}
                                aria-label="Bersihkan pencarian"
                            >
                                <FiX />
                            </button>
                        ) : null}
                    </div>

                    <div className="kpFilters">
                        <KpDropdown
                            className="kpFilterDropdown"
                            value={kabupatenId}
                            onChange={setKabupatenId}
                            placeholder="Pilih Kabupaten"
                            options={[
                                { value: "", label: "Semua" },
                                ...kabupatenOpts,
                            ]}
                        />

                        <KpDropdown
                            className="kpFilterDropdown"
                            value={kecamatanId}
                            onChange={setKecamatanId}
                            placeholder="Pilih Kecamatan"
                            disabled={!kabupatenId}
                            options={[
                                { value: "", label: "Semua" },
                                ...kecamatanOpts,
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="kpTableCard">
                <table className="kpTable">
                    <thead>
                        <tr>
                            <th>Nama Paralegal</th>
                            <th>Email</th>
                            <th>No. Telepon</th>
                            <th>Posbankum</th>
                            <th className="kpActionHead">Aksi</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pageRows.length ? (
                            pageRows.map((r) => (
                                <tr key={r.id_user}>
                                    <td>
                                        <div className="kpPosCell">
                                            <span
                                                className="kpPosIconBox kpUserIconBox"
                                                aria-hidden="true"
                                            >
                                                <FiUser />
                                            </span>
                                            <span className="kpPosName">
                                                {r.nama_lengkap}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="kpInfoCell">
                                            <FiMail />
                                            <span>{r.email ?? "-"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="kpTextCell">
                                            {r.nomor_telepon ?? "-"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="kpInfoCell">
                                            <FiMapPin />
                                            <span>
                                                {r.posbankum_nama
                                                    ? formatPosbankumName(
                                                          r.posbankum_nama,
                                                      )
                                                    : "-"}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="kpActions">
                                            <button
                                                className="kpIcoBtn is-edit"
                                                type="button"
                                                onClick={() => openEdit(r)}
                                                aria-label="Edit"
                                                title="Edit"
                                            >
                                                <FiEdit2 />
                                            </button>

                                            <button
                                                className="kpIcoBtn is-delete"
                                                type="button"
                                                onClick={() => onHapus(r)}
                                                aria-label="Hapus"
                                                title="Hapus"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="kpEmptyCell">
                                    <div className="kpEmptyState">
                                        <div
                                            className="kpEmptyIcon"
                                            aria-hidden="true"
                                        >
                                            <img src={posbankumIcon} alt="" />
                                        </div>
                                        <h2>Tidak Ada Akun Ditemukan</h2>
                                        <p>
                                            Tidak ada akun paralegal yang sesuai
                                            dengan pencarian atau filter yang
                                            dipilih.
                                        </p>
                                        <button
                                            className="kpEmptyBtn"
                                            type="button"
                                            onClick={() => {
                                                setQ("");
                                                setKabupatenId("");
                                                setKecamatanId("");
                                                setPage(1);
                                            }}
                                        >
                                            Reset Filter
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 ? (
                    <div className="kpPager">
                        <button
                            className="kpNavBtn"
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            aria-label="Halaman sebelumnya"
                        >
                            <FiChevronLeft />
                        </button>

                        {pageNums.map((n) => (
                            <button
                                key={n}
                                className={`kpPageBtn ${
                                    safePage === n ? "is-active" : ""
                                }`}
                                type="button"
                                onClick={() => setPage(n)}
                            >
                                {n}
                            </button>
                        ))}

                        <button
                            className="kpNavBtn"
                            type="button"
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={safePage >= totalPages}
                            aria-label="Halaman berikutnya"
                        >
                            <FiChevronRight />
                        </button>
                    </div>
                ) : null}
            </div>
        </>
    );

    return (
        <section className="ad-pagePad">
            <div className="kpShell">
                <div className="ad-pageHeader">
                    <div className="ad-pageTitleWrap">
                        <h1 className="ad-wireTitle">Kelola Posbankum</h1>
                    </div>

                    {pageMode === "list" ? (
                        <button
                            className="kpAddTop"
                            type="button"
                            onClick={openTambah}
                        >
                            <FiPlus />
                            <span>Tambah Paralegal</span>
                        </button>
                    ) : null}
                </div>

                {err ? <div className="kpError">{err}</div> : null}

                {pageMode === "list" ? renderListPage() : renderFormPage()}

                <DeleteConfirmModal
                    open={Boolean(deleteTarget)}
                    title="Hapus Paralegal?"
                    message={
                        deleteTarget
                            ? `Anda yakin ingin menghapus ${deleteTarget.nama_lengkap}? Data yang dihapus tidak dapat dikembalikan.`
                            : ""
                    }
                    confirmText={deleting ? "Menghapus..." : "Hapus"}
                    cancelText="Batal"
                    loading={deleting}
                    onCancel={() => !deleting && setDeleteTarget(null)}
                    onConfirm={confirmHapus}
                />

                <SuccessToast
                    message={successMessage}
                    onClose={() => setSuccessMessage("")}
                />

                <RejectToast
                    message={rejectMessage}
                    onClose={() => setRejectMessage("")}
                />
            </div>
        </section>
    );
}
