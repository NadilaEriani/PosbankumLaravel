// — Main Chatbot Page ──────────────────────────────────
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

// Components
import { MessageSquare } from "lucide-react";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import VoiceOverlay from "./components/VoiceOverlay";

// Hooks
import { useSpeechToText } from "./hooks/useSpeechToText";
import { useTextToSpeech } from "./hooks/useTextToSpeech";

// Utils
import { sendMessageToWebhook } from "./utils/chatApi";
import {
    getOrCreateSessionId,
    resetSessionId,
    saveChatHistory,
    loadChatHistory,
    clearChatHistory,
} from "./utils/storage";

/** Buat ID unik untuk setiap pesan */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function App() {
    // ── State ──────────────────────────────────────────────────────
    const [messages, setMessages] = useState(() => loadChatHistory());
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [hasVoiceInput, setHasVoiceInput] = useState(false);

    const [isWidgetOpen, setIsWidgetOpen] = useState(false);
    const widgetTouchYRef = useRef(null);

    // Izinkan area chat memakai scroll-nya sendiri. Saat area tersebut sudah
    // mentok (atau gesture berasal dari bagian chatbot yang tidak scrollable),
    // teruskan scroll ke landing page di belakang widget.
    const canNestedElementConsumeScroll = useCallback(
        (target, root, deltaY) => {
            if (!target || !root || !deltaY) return false;

            let node =
                target instanceof Element ? target : target.parentElement;

            while (node && node !== root) {
                const style = window.getComputedStyle(node);
                const overflowY = style.overflowY;
                const isScrollable =
                    /(auto|scroll|overlay)/.test(overflowY) &&
                    node.scrollHeight > node.clientHeight + 1;

                if (isScrollable) {
                    const canScrollUp = node.scrollTop > 1;
                    const canScrollDown =
                        node.scrollTop + node.clientHeight <
                        node.scrollHeight - 1;

                    if (
                        (deltaY < 0 && canScrollUp) ||
                        (deltaY > 0 && canScrollDown)
                    ) {
                        return true;
                    }
                }

                node = node.parentElement;
            }

            return false;
        },
        [],
    );

    const forwardScrollToLandingPage = useCallback((deltaY) => {
        if (!deltaY) return;
        window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
    }, []);

    const handleWidgetWheel = useCallback(
        (event) => {
            if (!isWidgetOpen || isVoiceOpen || !event.deltaY) return;

            if (
                canNestedElementConsumeScroll(
                    event.target,
                    event.currentTarget,
                    event.deltaY,
                )
            ) {
                return;
            }

            if (event.cancelable) event.preventDefault();
            forwardScrollToLandingPage(event.deltaY);
        },
        [
            canNestedElementConsumeScroll,
            forwardScrollToLandingPage,
            isVoiceOpen,
            isWidgetOpen,
        ],
    );

    const handleWidgetTouchStart = useCallback((event) => {
        if (event.touches.length !== 1) {
            widgetTouchYRef.current = null;
            return;
        }

        widgetTouchYRef.current = event.touches[0].clientY;
    }, []);

    const handleWidgetTouchMove = useCallback(
        (event) => {
            if (!isWidgetOpen || isVoiceOpen || event.touches.length !== 1)
                return;

            const currentY = event.touches[0].clientY;
            const previousY = widgetTouchYRef.current;
            widgetTouchYRef.current = currentY;

            if (previousY === null) return;

            const deltaY = previousY - currentY;
            if (!deltaY) return;

            if (
                canNestedElementConsumeScroll(
                    event.target,
                    event.currentTarget,
                    deltaY,
                )
            ) {
                return;
            }

            if (event.cancelable) event.preventDefault();
            forwardScrollToLandingPage(deltaY);
        },
        [
            canNestedElementConsumeScroll,
            forwardScrollToLandingPage,
            isVoiceOpen,
            isWidgetOpen,
        ],
    );

    // Respons aktif untuk ditampilkan di overlay suara
    const activeResponse = useMemo(() => {
        if (isLoading) return "Menyusun jawaban...";
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last?.role === "bot") {
                // Sanitasi tambahan untuk keamanan
                return (
                    (last.text || "").replace(/undefined/gi, "").trim() || ""
                );
            }
        }
        return "";
    }, [messages, isLoading]);

    // ── Hooks ──────────────────────────────────────────────────────
    const {
        isMuted,
        isSpeaking,
        isSupported: isTtsSupported,
        speak,
        stop,
        toggleMute,
    } = useTextToSpeech();

    const handleSttResult = useCallback(
        (transcript) => {
            // Mark voice input started
            setHasVoiceInput(true);

            // Saat speech-to-text selesai → kirim langsung
            if (transcript.trim()) {
                setInputValue(transcript);
                // Kecil delay agar state update
                setTimeout(() => sendMessage(transcript), 100);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sessionId],
    );

    const {
        isListening,
        transcript,
        isSupported: isSttSupported,
        startListening,
        stopListening,
    } = useSpeechToText({ onResult: handleSttResult });

    // ── Derived state: assistant state ────────────────────────────
    const assistantState = isListening
        ? "listening"
        : isSpeaking
          ? "speaking"
          : "idle";

    // ── Persist chat history ───────────────────────────────────────
    useEffect(() => {
        saveChatHistory(messages);
    }, [messages]);

    // ── Kirim pesan ───────────────────────────────────────────────
    const sendMessage = useCallback(
        async (text) => {
            const msg = (text ?? inputValue).trim();
            if (!msg || isLoading) return;

            setInputValue("");
            setIsLoading(true);

            // 1. Tambah bubble user
            const userMsg = {
                id: uid(),
                role: "user",
                text: msg,
                ts: Date.now(),
            };
            setMessages((prev) => [...prev, userMsg]);

            // 2. Minta jawaban dari webhook
            try {
                const reply = await sendMessageToWebhook(msg, sessionId);
                console.log("[DEBUG] Raw reply:", JSON.stringify(reply));

                // 3. Tambah bubble bot
                const botMsg = {
                    id: uid(),
                    role: "bot",
                    text: reply,
                    ts: Date.now(),
                };
                setMessages((prev) => [...prev, botMsg]);

                // 4. TTS — bacakan jika tidak mute
                // if (!isMuted && isTtsSupported) {
                //   speak(reply);
                // }
                if (!isMuted && isTtsSupported) {
                    const cleanText = reply?.replace(/[*_#`~>]/g, "").trim();
                    speak(cleanText);
                }
            } catch (err) {
                console.error("[App] sendMessage error:", err);
                const errMsg = {
                    id: uid(),
                    role: "bot",
                    text: "Maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi.",
                    ts: Date.now(),
                };
                setMessages((prev) => [...prev, errMsg]);
            } finally {
                setIsLoading(false);
            }
        },
        [inputValue, isLoading, sessionId, isMuted, isTtsSupported, speak],
    );

    // ── Hapus riwayat chat ────────────────────────────────────────
    const handleClearChat = useCallback(() => {
        stop();
        setMessages([]);
        setHasVoiceInput(false); // Reset greeting tampilan
        clearChatHistory();
        const newId = resetSessionId();
        setSessionId(newId);
    }, [stop]);

    // ── Mic handler ───────────────────────────────────────────────
    const handleMicClick = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            setIsVoiceOpen(true);
            stop(); // Hentikan TTS sebelum mulai listen
            startListening();
        }
    }, [isListening, startListening, stopListening, stop]);

    // ── Penutupan Overlay Suara ──────────────────────────────────
    const handleCloseVoiceOverlay = useCallback(() => {
        setIsVoiceOpen(false);
        stopListening();
    }, [stopListening]);

    // ── Quick action ──────────────────────────────────────────────
    const handleQuickAction = useCallback(
        (msg) => {
            setIsVoiceOpen(false);
            sendMessage(msg);
        },
        [sendMessage],
    );

    // ── Replay TTS untuk pesan bot tertentu ──────────────────────
    const handleReplay = useCallback(
        (text) => {
            if (!isMuted && isTtsSupported) {
                stop();
                speak(text);
            }
        },
        [isMuted, isTtsSupported, stop, speak],
    );

    // ─────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Tampilan FAB (Floating Action Button) ── */}
            <button
                onClick={() => setIsWidgetOpen(true)}
                className={`
          fixed bottom-4 right-4 md:bottom-8 md:right-8 w-16 h-16
          bg-primary-600 text-white rounded-full flex items-center justify-center
          shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50
          pointer-events-auto ring-4 ring-primary-100
          ${isWidgetOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}
        `}
            >
                <MessageSquare size={28} />
            </button>

            {/* ── Main Chat Container (posisi Widget Lebar/Tengah) ── */}
            <div
                onWheel={handleWidgetWheel}
                onTouchStart={handleWidgetTouchStart}
                onTouchMove={handleWidgetTouchMove}
                className={`
          fixed z-40 transition-all duration-300 ease-in-out flex flex-col bg-white shadow-2xl overflow-clip pointer-events-auto
          ${isWidgetOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-12 pointer-events-none"}
          bottom-0 right-0 w-full h-[100dvh] md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-100px)] md:bottom-8 md:right-8 md:rounded-3xl
        `}
            >
                {/* ── Header ── */}
                <ChatHeader
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    onClearChat={handleClearChat}
                    onClose={() => setIsWidgetOpen(false)}
                />

                {/* ── Main scrollable area ── */}
                <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    onQuickAction={handleQuickAction}
                    onReplay={handleReplay}
                />

                {/* ── Overlay Suara Penuh (Mirip Siri Modal) ── */}
                <VoiceOverlay
                    isOpen={isVoiceOpen}
                    onClose={handleCloseVoiceOverlay}
                    assistantState={assistantState}
                    isListening={isListening}
                    transcript={transcript}
                    hasVoiceInput={hasVoiceInput}
                    isLoading={isLoading}
                    isSttSupported={isSttSupported}
                    onStartListening={handleMicClick}
                    onStopListening={handleMicClick}
                    activeResponse={activeResponse}
                />

                {/* ── Chat Input ── */}
                <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={() => sendMessage()}
                    onMicClick={handleMicClick}
                    isListening={isListening}
                    isLoading={isLoading}
                    isSttSupported={isSttSupported}
                />
            </div>
        </>
    );
}
