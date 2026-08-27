import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import QuickActions from "./QuickActions";

export default function ChatMessages({
    messages,
    isLoading,
    onQuickAction,
    onReplay,
}) {
    const bottomRef = useRef(null);
    const isEmpty = messages.length === 0;

    // Auto-scroll ke bawah setiap ada pesan baru
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto overscroll-y-auto flex flex-col relative">
            <div className="max-w-4xl mx-auto pt-6 w-full flex-1 flex flex-col">
                {/* ── Empty state: quick actions + sambutan ── */}
                {isEmpty && (
                    <div className="flex-1 flex flex-col px-1">
                        {/* Sambutan */}
                        <div className="mx-4 mb-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-4 animate-fade-up">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 overflow-hidden border border-primary-100">
                                    <img
                                        src="/assets/burung_serindit.png"
                                        alt="PARIS"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        Selamat datang di Chatbot Posbakum! 👋
                                        Saya siap membantu Anda dengan informasi
                                        seputar layanan bantuan hukum. Silakan
                                        pilih topik di bawah atau ketik
                                        pertanyaan Anda.
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {new Date().toLocaleTimeString(
                                            "id-ID",
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            },
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pb-4">
                            <QuickActions
                                onSelect={onQuickAction}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}

                {/* ── Daftar pesan ── */}
                {!isEmpty && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                onReplay={onReplay}
                            />
                        ))}

                        {/* Typing indicator */}
                        {isLoading && <TypingIndicator />}
                    </div>
                )}

                {/* Anchor untuk auto-scroll */}
                <div ref={bottomRef} className="h-2" />
            </div>
        </div>
    );
}
