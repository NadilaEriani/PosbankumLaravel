import { MdLocationSearching } from "react-icons/md";
import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import SuccessToast from "../../components/ui/SuccessToast";
import {
    FiFileText,
    FiUpload,
    FiX,
    FiEye,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiMapPin,
    FiInfo,
    FiSave,
    FiTrash2,
} from "react-icons/fi";
import "../../../css/Paralegal/kelolaPosbankum.css";

const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const DOC_TYPES = [
    { key: "sk_posbankum", title: "SK Posbankum", theme: "green" },
    { key: "sk_kadarkum", title: "SK Kadarkum", theme: "orange" },
    { key: "sarpras", title: "Dokumentasi Sapras", theme: "orange" },
];

function formatDateID(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function statusKind(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (["diterima", "disetujui", "approved", "valid"].includes(raw)) return "ok";
    if (["ditolak", "rejected", "tolak"].includes(raw)) return "bad";
    if (["menunggu", "pending", "review", "proses", "diproses", "verifikasi"].includes(raw)) return "wait";
    return "none";
}

function statusLabel(kind) {
    if (kind === "ok") return "Diterima";
    if (kind === "bad") return "Ditolak";
    if (kind === "wait") return "Proses";
    return "Belum";
}

function getDocId(row) {
    return row?.id_data ?? row?.id ?? row?.id_dokumen ?? null;
}

function getFileUrl(row) {
    const raw = String(row?.url || row?.public_url || row?.signedUrl || row?.path_berkas || "").trim();
    if (!raw) return "";
    if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
    if (raw.startsWith("/storage/")) return raw;
    if (raw.startsWith("storage/")) return `/${raw}`;
    return `/storage/${raw.replace(/^public\//, "")}`;
}

function isImage(row) {
    const mime = String(row?.mime_type || "").toLowerCase();
    const name = String(row?.nama_berkas || row?.path_berkas || "").toLowerCase();
    return mime.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
}

function buildOsmEmbed(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return "";
    const d = 0.008;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lo - d},${la - d},${lo + d},${la + d}`)}&layer=mapnik&marker=${encodeURIComponent(`${la},${lo}`)}`;
}

function validateFile(file) {
    if (!file) return "Pilih file dulu.";
    if (!ALLOWED_MIME.has(file.type)) return "Format file harus PDF/JPG/PNG.";
    if (file.size > MAX_FILE) return "Ukuran maksimal 5MB.";
    return "";
}

export default function KelolaPosbankum({ currentPosbankum = {}, documents = [], location = {}, flash = {} }) {
    const [docs, setDocs] = useState(documents || []);
    const [successMessage, setSuccessMessage] = useState(flash?.success || "");
    const [errorMessage, setErrorMessage] = useState("");
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadKey, setUploadKey] = useState("");
    const [uploadTitle, setUploadTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPreview, setSelectedPreview] = useState("");
    const [uploading, setUploading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [editLocOpen, setEditLocOpen] = useState(false);
    const [savingLoc, setSavingLoc] = useState(false);
    const [locDraft, setLocDraft] = useState({
        lat: location?.lat || currentPosbankum?.latitude || currentPosbankum?.lat || "",
        lng: location?.lng || currentPosbankum?.longitude || currentPosbankum?.lng || "",
        alamat: location?.alamat || currentPosbankum?.alamat || "",
    });
    const fileRef = useRef(null);

    useEffect(() => setDocs(documents || []), [documents]);
    useEffect(() => { if (flash?.success) setSuccessMessage(flash.success); }, [flash?.success]);

    const docsByCategory = useMemo(() => {
        const grouped = {};
        for (const row of docs || []) {
            const key = String(row?.kategori || "").toLowerCase();
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        }
        Object.keys(grouped).forEach((key) => {
            grouped[key].sort((a, b) => new Date(b?.tgl_upload || b?.created_at || 0) - new Date(a?.tgl_upload || a?.created_at || 0));
        });
        return grouped;
    }, [docs]);

    const latestByCategory = useMemo(() => {
        const result = {};
        for (const item of DOC_TYPES) {
            result[item.key] = docsByCategory[item.key]?.[0] || null;
        }
        return result;
    }, [docsByCategory]);

    const stats = useMemo(() => {
        let ok = 0, wait = 0, bad = 0;
        for (const item of DOC_TYPES) {
            const kind = statusKind(latestByCategory[item.key]?.status_verifikasi || latestByCategory[item.key]?.status);
            if (kind === "ok") ok += 1;
            else if (kind === "bad") bad += 1;
            else if (kind === "wait") wait += 1;
        }
        return { total: DOC_TYPES.length, ok, wait, bad, none: DOC_TYPES.length - ok - wait - bad };
    }, [latestByCategory]);

    const openUpload = (item) => {
        setErrorMessage("");
        setUploadKey(item.key);
        setUploadTitle(item.title);
        setSelectedFile(null);
        setSelectedPreview("");
        if (fileRef.current) fileRef.current.value = "";
        setUploadOpen(true);
    };

    const closeUpload = () => {
        if (uploading) return;
        if (selectedPreview?.startsWith("blob:")) URL.revokeObjectURL(selectedPreview);
        setUploadOpen(false);
        setSelectedFile(null);
        setSelectedPreview("");
    };

    const handlePickFile = (event) => {
        const file = event.target.files?.[0] || null;
        const message = validateFile(file);
        if (message) {
            setErrorMessage(message);
            return;
        }
        if (selectedPreview?.startsWith("blob:")) URL.revokeObjectURL(selectedPreview);
        setErrorMessage("");
        setSelectedFile(file);
        setSelectedPreview(URL.createObjectURL(file));
    };

    const submitUpload = () => {
        const message = validateFile(selectedFile);
        if (message) {
            setErrorMessage(message);
            return;
        }
        const payload = new FormData();
        payload.append("kategori", uploadKey);
        payload.append("dokumen", selectedFile);
        setUploading(true);
        router.post("/paralegal/kelola-posbankum/dokumen", payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                closeUpload();
                setSuccessMessage("Dokumen berhasil dikirim untuk verifikasi admin.");
            },
            onError: (errors) => setErrorMessage(Object.values(errors || {})[0] || "Gagal mengunggah dokumen."),
            onFinish: () => setUploading(false),
        });
    };

    const confirmDelete = (row) => {
        const id = getDocId(row);
        if (!id || deletingId) return;
        setDeletingId(id);
        router.delete(`/paralegal/kelola-posbankum/dokumen/${id}`, {
            preserveScroll: true,
            onSuccess: () => setSuccessMessage("Dokumen berhasil dihapus."),
            onError: (errors) => setErrorMessage(Object.values(errors || {})[0] || "Gagal menghapus dokumen."),
            onFinish: () => setDeletingId(null),
        });
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setErrorMessage("Browser tidak mendukung geolocation.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocDraft((prev) => ({ ...prev, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })),
            () => setErrorMessage("Gagal mengambil lokasi. Izinkan akses lokasi di browser."),
            { enableHighAccuracy: true },
        );
    };

    const saveLocation = () => {
        setSavingLoc(true);
        router.patch("/paralegal/kelola-posbankum/lokasi", locDraft, {
            preserveScroll: true,
            onSuccess: () => {
                setEditLocOpen(false);
                setSuccessMessage("Lokasi Posbankum berhasil diperbarui.");
            },
            onError: (errors) => setErrorMessage(Object.values(errors || {})[0] || "Gagal menyimpan lokasi."),
            onFinish: () => setSavingLoc(false),
        });
    };

    const mapUrl = buildOsmEmbed(locDraft.lat, locDraft.lng);

    return (
        <div className="kdpRoot">
            <SuccessToast message={successMessage} onClose={() => setSuccessMessage("")} />

            <div className="kpPageHead">
                <div>
                    <h1 className="kpTitle">Kelola Posbankum</h1>
                    <div className="kpTitleUnderline" />
                </div>
            </div>

            {errorMessage ? <div className="kpHint"><FiInfo /><div className="kpHintText">{errorMessage}</div></div> : null}

            <div className="kpStats">
                <div className="kpStatCard stat-total"><div className="kpStatIcon"><FiFileText /></div><div className="kpStatText"><div className="kpStatLabel">Total Dokumen</div><div className="kpStatValue">{stats.total}</div></div></div>
                <div className="kpStatCard stat-ok"><div className="kpStatIcon"><FiCheckCircle /></div><div className="kpStatText"><div className="kpStatLabel">Diterima</div><div className="kpStatValue">{stats.ok}</div></div></div>
                <div className="kpStatCard stat-wait"><div className="kpStatIcon"><FiClock /></div><div className="kpStatText"><div className="kpStatLabel">Proses</div><div className="kpStatValue">{stats.wait}</div></div></div>
                <div className="kpStatCard stat-bad"><div className="kpStatIcon"><FiXCircle /></div><div className="kpStatText"><div className="kpStatLabel">Ditolak</div><div className="kpStatValue">{stats.bad}</div></div></div>
                <div className="kpStatCard stat-none"><div className="kpStatIcon"><FiInfo /></div><div className="kpStatText"><div className="kpStatLabel">Belum Ada</div><div className="kpStatValue">{stats.none}</div></div></div>
            </div>

            <div className="kpToolbarCard">
                <div className="kpToolbarRow">
                    <div>
                        <div className="kpToolbarTitle">Dokumen dan Tagging Area</div>
                        <div className="kpToolbarSub">Unggah dokumen Posbankum dan perbarui lokasi kantor untuk diverifikasi admin.</div>
                    </div>
                    <button className="kpBtnPrimary" type="button" onClick={() => setEditLocOpen(true)}><MdLocationSearching /> Atur Lokasi</button>
                </div>
            </div>

            <div className="kpDocGrid">
                {DOC_TYPES.map((item) => {
                    const row = latestByCategory[item.key];
                    const kind = statusKind(row?.status_verifikasi || row?.status);
                    const url = getFileUrl(row);
                    return (
                        <div className={`kpDocCard doc-${kind}`} key={item.key}>
                            <div className="kpDocTop">
                                <div className="kpDocTitleWrap"><FiFileText /><div className="kpDocTitle">{item.title}</div></div>
                                <span className={`kpStatusPill is-${kind}`}>{statusLabel(kind)}</span>
                            </div>
                            <div className="kpDocMeta">{row ? `Diunggah ${formatDateID(row.tgl_upload || row.created_at)}` : "Belum ada dokumen"}</div>
                            <div className="kpPreview">
                                {row && url ? (
                                    isImage(row) ? <img className="kpPreviewImg" src={url} alt={item.title} /> : <iframe className="kpPreviewPdf" src={`${url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={item.title} />
                                ) : <div className="kpPreviewPh"><FiUpload /> Belum ada file</div>}
                            </div>
                            {row?.catatan_admin ? <div className="kpAdminNote"><div className="kpAdminNoteTitle">Catatan Admin</div><div className="kpAdminNoteText">{row.catatan_admin}</div></div> : null}
                            <div className="kpDocActions">
                                <button className="kpBtnPrimary" type="button" onClick={() => openUpload(item)}><FiUpload /> {row ? "Ganti" : "Upload"}</button>
                                {row ? <button className="kpBtnIcon" type="button" onClick={() => { setDetailRow(row); setDetailOpen(true); }}><FiEye /></button> : null}
                                {row && kind !== "ok" ? <button className="kpBtnIcon" type="button" disabled={deletingId === getDocId(row)} onClick={() => confirmDelete(row)}><FiTrash2 /></button> : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="kpDocCard kpLocationPanel">
                <div className="kpDocTop">
                    <div className="kpDocTitleWrap"><FiMapPin /><div className="kpDocTitle">Lokasi Posbankum</div></div>
                    <span className={`kpStatusPill is-${locDraft.lat && locDraft.lng ? "wait" : "none"}`}>{locDraft.lat && locDraft.lng ? "Tersimpan" : "Belum"}</span>
                </div>
                <div className="kpDocMeta">{locDraft.alamat || currentPosbankum?.alamat || "Alamat belum tersedia"}</div>
                <div className="kpPreview">
                    {mapUrl ? <iframe className="kpMapFrame" src={mapUrl} title="Peta Posbankum" /> : <div className="kpLocMapPh"><FiMapPin /> Koordinat belum tersedia</div>}
                </div>
            </div>

            {uploadOpen && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard">
                        <div className="kpModalHead"><div className="kpModalTitle">Upload {uploadTitle}</div><button className="kpModalClose" type="button" onClick={closeUpload}><FiX /></button></div>
                        <div className="kpModalBody">
                            <label className="kpFileDrop">
                                <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={handlePickFile} />
                                <div><FiUpload className="kpFileDropIcon" /><div>Pilih file PDF/JPG/PNG maksimal 5MB</div>{selectedFile ? <div className="kpFileName">{selectedFile.name}</div> : null}</div>
                            </label>
                            {selectedPreview ? <div className="kpPreview" style={{ padding: "16px 0 0" }}>{selectedFile?.type?.startsWith("image/") ? <img className="kpPreviewImg" src={selectedPreview} alt="Preview" /> : <iframe className="kpPreviewPdf" src={selectedPreview} title="Preview PDF" />}</div> : null}
                        </div>
                        <div className="kpModalFooter"><button className="kpBtnGhost" type="button" onClick={closeUpload}>Batal</button><button className="kpBtnPrimary" type="button" disabled={uploading} onClick={submitUpload}>{uploading ? "Mengunggah..." : "Simpan"}</button></div>
                    </div>
                </div>
            )}

            {editLocOpen && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard">
                        <div className="kpModalHead"><div className="kpModalTitle">Atur Lokasi Posbankum</div><button className="kpModalClose" type="button" onClick={() => setEditLocOpen(false)}><FiX /></button></div>
                        <div className="kpModalBody">
                            <div className="kpField"><label className="kpLabel">Latitude</label><input className="kpInput" value={locDraft.lat} onChange={(e) => setLocDraft((p) => ({ ...p, lat: e.target.value }))} placeholder="Contoh: 0.5071" /></div>
                            <div className="kpField"><label className="kpLabel">Longitude</label><input className="kpInput" value={locDraft.lng} onChange={(e) => setLocDraft((p) => ({ ...p, lng: e.target.value }))} placeholder="Contoh: 101.4478" /></div>
                            <div className="kpField"><label className="kpLabel">Alamat</label><textarea className="kpTextarea" value={locDraft.alamat} onChange={(e) => setLocDraft((p) => ({ ...p, alamat: e.target.value }))} placeholder="Alamat lengkap Posbankum" /></div>
                            <button className="kpBtnPrimary" type="button" onClick={useMyLocation}><MdLocationSearching /> Gunakan Lokasi Saya</button>
                        </div>
                        <div className="kpModalFooter"><button className="kpBtnGhost" type="button" onClick={() => setEditLocOpen(false)}>Batal</button><button className="kpBtnPrimary" type="button" disabled={savingLoc} onClick={saveLocation}><FiSave /> {savingLoc ? "Menyimpan..." : "Simpan"}</button></div>
                    </div>
                </div>
            )}

            {detailOpen && detailRow && (
                <div className="kpModalOverlay" role="dialog" aria-modal="true">
                    <div className="kpModalCard">
                        <div className="kpModalHead"><div className="kpModalTitle">Preview Dokumen</div><button className="kpModalClose" type="button" onClick={() => setDetailOpen(false)}><FiX /></button></div>
                        <div className="kpModalBody">
                            <div className="kpDocMeta">{detailRow.nama_berkas || detailRow.path_berkas || "Dokumen"}</div>
                            <div className="kpPreview">{isImage(detailRow) ? <img className="kpPreviewImg" src={getFileUrl(detailRow)} alt="Dokumen" /> : <iframe className="kpPreviewPdf" style={{ height: 520 }} src={getFileUrl(detailRow)} title="Dokumen" />}</div>
                        </div>
                        <div className="kpModalFooter"><button className="kpBtnPrimary" type="button" onClick={() => setDetailOpen(false)}>Tutup</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
