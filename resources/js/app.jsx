import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";

import burung5 from "./assets/burung5.png";

const appName = "SiBapak";
const DYNAMIC_IMPORT_RELOAD_KEY = "sibapak-dynamic-import-reload-at";
const DYNAMIC_IMPORT_RELOAD_COOLDOWN = 30000;
const SPLASH_VISIBLE_MS = 1850;
const SPLASH_FADE_MS = 450;

function startSplashSound() {
    if (typeof window === "undefined") return () => {};

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return () => {};

    let audioContext;
    let hasPlayed = false;

    try {
        audioContext = new AudioContextClass();
    } catch {
        return () => {};
    }

    const playTone = async () => {
        if (hasPlayed || audioContext.state === "closed") return;

        try {
            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }

            if (audioContext.state !== "running" || hasPlayed) return;

            hasPlayed = true;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const now = audioContext.currentTime;

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(523.25, now);
            oscillator.frequency.exponentialRampToValueAtTime(
                659.25,
                now + 0.18,
            );

            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.025, now + 0.025);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(now);
            oscillator.stop(now + 0.33);
        } catch {
            // Browser dapat memblokir autoplay sebelum ada interaksi pengguna.
        }
    };

    const unlockAudio = () => {
        void playTone();
    };

    void playTone();

    window.addEventListener("pointerdown", unlockAudio, {
        once: true,
        passive: true,
    });

    window.addEventListener("keydown", unlockAudio, {
        once: true,
    });

    return () => {
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);

        if (audioContext.state !== "closed") {
            audioContext.close().catch(() => {});
        }
    };
}

function SplashScreen({ isLeaving }) {
    return (
        <div
            className={`sibapak-splash${isLeaving ? " is-leaving" : ""}`}
            role="status"
            aria-live="polite"
            aria-label="Memuat SiBapak"
        >
            <span
                className="sibapak-splash__dot sibapak-splash__dot--one"
                aria-hidden="true"
            />

            <span
                className="sibapak-splash__dot sibapak-splash__dot--two"
                aria-hidden="true"
            />

            <span
                className="sibapak-splash__dot sibapak-splash__dot--three"
                aria-hidden="true"
            />

            <span
                className="sibapak-splash__dot sibapak-splash__dot--four"
                aria-hidden="true"
            />

            <span
                className="sibapak-splash__dot sibapak-splash__dot--five"
                aria-hidden="true"
            />

            <div className="sibapak-splash__content">
                <div className="sibapak-splash__logo-frame">
                    <img
                        src={burung5}
                        alt="Logo SiBapak"
                        className="sibapak-splash__logo"
                    />
                </div>

                <h1 className="sibapak-splash__title">
                    Si<span>Bapak</span>
                </h1>

                <p className="sibapak-splash__subtitle">
                    POS BANTUAN HUKUM KEMENTERIAN HUKUM RIAU
                </p>
            </div>
        </div>
    );
}

function mountInitialSplash() {
    if (typeof document === "undefined" || !document.body) {
        return {
            markAppReady: () => {},
        };
    }

    const splashHost = document.createElement("div");
    const splashRoot = createRoot(splashHost);
    const stopSplashSound = startSplashSound();

    let appReady = false;
    let minimumTimeElapsed = false;
    let isLeaving = false;
    let isRemoved = false;

    document.body.classList.add("sibapak-splash-open");
    document.body.appendChild(splashHost);

    splashRoot.render(<SplashScreen isLeaving={false} />);

    const removeSplash = () => {
        if (isRemoved) return;

        isRemoved = true;

        splashRoot.unmount();
        splashHost.remove();

        stopSplashSound();

        document.body.classList.remove("sibapak-splash-open");
    };

    const beginLeaving = () => {
        if (!appReady || !minimumTimeElapsed || isLeaving || isRemoved) {
            return;
        }

        isLeaving = true;

        splashRoot.render(<SplashScreen isLeaving />);

        window.setTimeout(removeSplash, SPLASH_FADE_MS);
    };

    window.setTimeout(() => {
        minimumTimeElapsed = true;
        beginLeaving();
    }, SPLASH_VISIBLE_MS);

    return {
        markAppReady: () => {
            appReady = true;
            beginLeaving();
        },
    };
}

function InitialApp({ App, props }) {
    useEffect(() => {
        initialSplash.markAppReady();
    }, []);

    return <App {...props} />;
}

function getDynamicImportErrorMessage(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value?.message === "string") return value.message;

    try {
        return String(value);
    } catch {
        return "";
    }
}

function isDynamicImportFailure(value) {
    const message = getDynamicImportErrorMessage(value).toLowerCase();

    return [
        "failed to fetch dynamically imported module",
        "error loading dynamically imported module",
        "importing a module script failed",
        "failed to load module script",
    ].some((pattern) => message.includes(pattern));
}

function reloadForStaleDynamicImport() {
    if (typeof window === "undefined") return;

    const now = Date.now();
    let lastReloadAt = 0;

    try {
        lastReloadAt = Number(
            window.sessionStorage.getItem(DYNAMIC_IMPORT_RELOAD_KEY) || 0,
        );
    } catch {
        lastReloadAt = 0;
    }

    if (
        Number.isFinite(lastReloadAt) &&
        lastReloadAt > 0 &&
        now - lastReloadAt < DYNAMIC_IMPORT_RELOAD_COOLDOWN
    ) {
        return;
    }

    try {
        window.sessionStorage.setItem(DYNAMIC_IMPORT_RELOAD_KEY, String(now));
    } catch {
        // Jika sessionStorage tidak tersedia, reload tetap dilakukan satu kali.
    }

    window.location.reload();
}

function installDynamicImportRecovery() {
    if (typeof window === "undefined") return;

    window.addEventListener("vite:preloadError", (event) => {
        event.preventDefault();
        reloadForStaleDynamicImport();
    });

    window.addEventListener("unhandledrejection", (event) => {
        if (!isDynamicImportFailure(event.reason)) {
            return;
        }

        event.preventDefault();
        reloadForStaleDynamicImport();
    });

    window.setTimeout(() => {
        try {
            window.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
        } catch {
            // Abaikan jika sessionStorage tidak tersedia.
        }
    }, DYNAMIC_IMPORT_RELOAD_COOLDOWN);
}

function clipboardHtmlToStructuredText(html) {
    if (!html || typeof DOMParser === "undefined") {
        return "";
    }

    const documentFromClipboard = new DOMParser().parseFromString(
        html,
        "text/html",
    );

    const body = documentFromClipboard.body;

    body.querySelectorAll("br").forEach((element) => {
        element.replaceWith(documentFromClipboard.createTextNode("\n"));
    });

    body.querySelectorAll("li").forEach((element) => {
        const parent = element.parentElement;
        const isOrdered = parent?.tagName === "OL";

        let marker = "• ";

        if (isOrdered && parent) {
            const siblings = Array.from(parent.children).filter(
                (child) => child.tagName === "LI",
            );

            marker = `${Math.max(siblings.indexOf(element), 0) + 1}. `;
        }

        element.insertBefore(
            documentFromClipboard.createTextNode(marker),
            element.firstChild,
        );

        element.append(documentFromClipboard.createTextNode("\n"));
    });

    body.querySelectorAll(
        "p,div,section,article,header,footer,h1,h2,h3,h4,h5,h6,tr,blockquote,pre",
    ).forEach((element) => {
        element.append(documentFromClipboard.createTextNode("\n"));
    });

    return String(body.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function installStructuredTextareaPaste() {
    if (typeof document === "undefined") return;

    document.addEventListener("paste", (event) => {
        const target = event.target;

        if (
            !(target instanceof HTMLTextAreaElement) ||
            target.tagName !== "TEXTAREA"
        ) {
            return;
        }

        const clipboardData = event.clipboardData;

        if (!clipboardData) return;

        const html = clipboardData.getData("text/html");

        const plainText = clipboardData.getData("text/plain");

        const structuredText = html
            ? clipboardHtmlToStructuredText(html) || plainText
            : plainText;

        if (!structuredText) return;

        event.preventDefault();

        const start = target.selectionStart ?? target.value.length;

        const end = target.selectionEnd ?? start;

        target.setRangeText(structuredText, start, end, "end");

        const inputEvent =
            typeof InputEvent === "function"
                ? new InputEvent("input", {
                      bubbles: true,
                      inputType: "insertFromPaste",
                      data: structuredText,
                  })
                : new Event("input", {
                      bubbles: true,
                  });

        target.dispatchEvent(inputEvent);
    });
}

installDynamicImportRecovery();
installStructuredTextareaPaste();

const initialSplash = mountInitialSplash();

createInertiaApp({
    title: (title) => (title ? `${appName} - ${title}` : appName),

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        ),

    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<InitialApp App={App} props={props} />);
    },

    progress: {
        color: "#4B5563",
    },
});
