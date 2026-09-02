import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

function clipboardHtmlToStructuredText(html) {
    if (!html || typeof DOMParser === "undefined") return "";

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
                : new Event("input", { bubbles: true });

        target.dispatchEvent(inputEvent);
    });
}

installStructuredTextareaPaste();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: "#4B5563",
    },
});
