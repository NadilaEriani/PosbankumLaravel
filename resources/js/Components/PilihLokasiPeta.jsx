import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCrosshair, FiSearch, FiX } from "react-icons/fi";
import {
    DEFAULT_CENTER,
    ensureLeaflet,
    reverseGeocode,
    searchPlace,
} from "../lib/leaflet";

/**
 * Modal pilih titik di peta OSM. Klik peta / geser marker / cari / GPS,
 * lalu "Gunakan lokasi ini" → onPick({ lat, lng, alamat }).
 */
export default function PilihLokasiPeta({ open, initial, onClose, onPick }) {
    const boxRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const urutanRef = useRef(0);
    const [titik, setTitik] = useState(null); // { lat, lng }
    const [alamat, setAlamat] = useState("");
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");

    const pilih = async (lat, lng, alamatSiap) => {
        const t = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
        setTitik(t);
        setError("");
        const L = window.L;
        if (mapRef.current && L) {
            if (markerRef.current) markerRef.current.setLatLng([t.lat, t.lng]);
            else {
                markerRef.current = L.marker([t.lat, t.lng], { draggable: true })
                    .addTo(mapRef.current)
                    .on("dragend", (e) => {
                        const p = e.target.getLatLng();
                        pilih(p.lat, p.lng);
                    });
            }
        }
        const urutan = ++urutanRef.current; // klik cepat: hanya hasil klik terakhir yang dipakai
        if (alamatSiap) {
            setAlamat(alamatSiap);
            setBusy("");
            return;
        }
        setBusy("alamat");
        let hasil = "";
        try {
            hasil = await reverseGeocode(t.lat, t.lng);
        } catch {
            // alamat diisi manual
        }
        if (urutan !== urutanRef.current) return;
        setAlamat(hasil);
        setBusy("");
    };

    // Peta dibuat sekali per buka modal, tidak dibangun ulang tiap titik berubah
    useEffect(() => {
        if (!open) return undefined;
        let batal = false;
        setError("");
        setQuery("");
        const awal =
            initial?.lat != null && initial?.lng != null && initial.lat !== ""
                ? { lat: Number(initial.lat), lng: Number(initial.lng) }
                : null;
        setTitik(null);
        setAlamat("");

        ensureLeaflet()
            .then((L) => {
                if (batal || !boxRef.current) return;
                const map = L.map(boxRef.current).setView(
                    awal ? [awal.lat, awal.lng] : DEFAULT_CENTER,
                    awal ? 16 : 12,
                );
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap",
                }).addTo(map);
                map.on("click", (e) => pilih(e.latlng.lat, e.latlng.lng));
                mapRef.current = map;
                if (awal) pilih(awal.lat, awal.lng, initial.alamat);
                setTimeout(() => map.invalidateSize(), 150);
            })
            .catch((e) => setError(e.message));

        return () => {
            batal = true;
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const cari = async () => {
        if (!query.trim()) return;
        setBusy("cari");
        try {
            const hit = await searchPlace(query.trim());
            if (!hit) {
                setError("Lokasi tidak ditemukan. Coba kata kunci lain atau klik langsung di peta.");
                return;
            }
            mapRef.current?.setView([hit.lat, hit.lng], 17);
            await pilih(hit.lat, hit.lng, hit.alamat);
        } catch {
            setError("Pencarian gagal. Periksa koneksi internet.");
        } finally {
            setBusy("");
        }
    };

    const lokasiSaya = () => {
        if (!navigator.geolocation) {
            setError("Browser tidak mendukung GPS.");
            return;
        }
        setBusy("gps");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setBusy("");
                const { latitude, longitude } = pos.coords;
                mapRef.current?.setView([latitude, longitude], 17);
                pilih(latitude, longitude);
            },
            () => {
                setBusy("");
                setError("Lokasi perangkat tidak bisa dibaca. Izinkan akses lokasi atau pilih manual di peta.");
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    if (!open) return null;

    // Portal ke body: tidak terpotong overflow/z-index form induk
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <strong className="text-base text-gray-800">Pilih Lokasi di Peta</strong>
                    <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Tutup">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {/* Bukan <form>: modal dipakai di dalam form laporan, Enter tidak boleh men-submit form itu */}
                    <div className="flex min-w-0 flex-1 gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    cari();
                                }
                            }}
                            placeholder="Cari nama jalan, tempat, atau kelurahan"
                            className="min-w-0 flex-1 rounded-lg border-gray-300 text-sm"
                        />
                        <button type="button" onClick={cari} disabled={busy === "cari"} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 text-sm text-white disabled:opacity-60">
                            <FiSearch /> {busy === "cari" ? "Mencari..." : "Cari"}
                        </button>
                    </div>
                    <button type="button" onClick={lokasiSaya} disabled={busy === "gps"} className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-60">
                        <FiCrosshair /> {busy === "gps" ? "Membaca GPS..." : "Lokasi saya"}
                    </button>
                </div>

                <p className="px-4 pt-2 text-xs text-gray-500">Klik peta atau geser penanda untuk menentukan titik kejadian.</p>
                {error ? <p className="px-4 pt-1 text-xs text-red-600">{error}</p> : null}

                <div className="px-4 py-3">
                    <div ref={boxRef} className="h-[50vh] min-h-[260px] w-full rounded-lg border" />
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
                    <div className="min-w-0 flex-1 text-sm">
                        {titik ? (
                            <>
                                <div className="text-gray-800">
                                    {busy === "alamat" ? "Mencari alamat..." : alamat.trim() || "Alamat tidak ditemukan, isi manual setelah ini."}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {titik.lat}, {titik.lng}
                                </div>
                            </>
                        ) : (
                            <span className="text-gray-500">Belum ada titik dipilih.</span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={!titik || busy === "alamat"}
                        onClick={() => onPick({ ...titik, alamat: alamat.trim() })}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Gunakan lokasi ini
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
