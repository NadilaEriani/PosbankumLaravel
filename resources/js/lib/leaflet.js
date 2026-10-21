// Loader Leaflet (CDN + SRI) dan helper Nominatim untuk komponen peta.
// ponytail: KelolaPosbankum & VerifikasiDataPosbankum masih punya salinan loader sendiri; pindahkan ke sini bila disentuh lagi.

const CSS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
];
const JS_URLS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];
// SRI resmi leaflet 1.9.4 (sama di unpkg & jsDelivr)
const CSS_SRI = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const JS_SRI = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images/";

export const DEFAULT_CENTER = [0.5071, 101.4478]; // Pekanbaru

// Pakai id yang sama dengan halaman lama, jadi Leaflet hanya dimuat sekali
function loadTag(tag, id, urls, sri) {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById(id);
        if (existing?.dataset.loaded === "true") return resolve();

        let index = 0;
        const el = existing || document.createElement(tag);
        el.id = id;
        el.integrity = sri;
        el.crossOrigin = "anonymous";
        const setUrl = () => {
            if (tag === "link") {
                el.rel = "stylesheet";
                el.href = urls[index];
            } else {
                el.async = true;
                el.src = urls[index];
            }
        };
        el.onload = () => {
            el.dataset.loaded = "true";
            resolve();
        };
        el.onerror = () => {
            index += 1;
            if (index < urls.length) setUrl();
            else reject(new Error("Peta gagal dimuat."));
        };
        setUrl();
        if (!existing) (tag === "link" ? document.head : document.body).appendChild(el);
    });
}

export async function ensureLeaflet() {
    if (!window.L?.map) {
        await loadTag("link", "leaflet-css", CSS_URLS, CSS_SRI);
        await loadTag("script", "leaflet-js", JS_URLS, JS_SRI);
    }
    const L = window.L;
    if (!L?.map) throw new Error("Peta tidak tersedia.");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${ICON_BASE}marker-icon-2x.png`,
        iconUrl: `${ICON_BASE}marker-icon.png`,
        shadowUrl: `${ICON_BASE}marker-shadow.png`,
    });
    return L;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = { "Accept-Language": "id-ID,id;q=0.9" };

// "Jalan X, Kelurahan, Kecamatan, Kota, Riau, Sumatera, 28xxx, Indonesia" → buang provinsi/pulau/kodepos/negara
export function ringkasAlamat(displayName) {
    return String(displayName || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !/^(indonesia|riau|sumatera|sumatra|\d{5})$/i.test(s))
        .join(", ");
}

export async function reverseGeocode(lat, lng) {
    const res = await fetch(
        `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: NOMINATIM_HEADERS },
    );
    if (!res.ok) return "";
    return ringkasAlamat((await res.json())?.display_name);
}

export async function searchPlace(query) {
    const res = await fetch(
        `${NOMINATIM}/search?format=jsonv2&countrycodes=id&limit=1&q=${encodeURIComponent(query)}`,
        { headers: NOMINATIM_HEADERS },
    );
    if (!res.ok) return null;
    const hit = (await res.json())?.[0];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), alamat: ringkasAlamat(hit.display_name) } : null;
}

export function googleMapsLink(lat, lng) {
    const la = Number(lat);
    const lo = Number(lng);
    if (lat == null || lng == null || lat === "" || lng === "" || !Number.isFinite(la) || !Number.isFinite(lo)) return "";
    return `https://www.google.com/maps?q=${la},${lo}`;
}
