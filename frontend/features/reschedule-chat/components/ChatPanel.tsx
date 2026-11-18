"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { MessageBubble } from "./MessageBubble";
import { ProposedSlotList } from "./ProposedSlotList";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Loader2 } from "lucide-react";

export function ChatPanel() {
  const {
    messages,
    isTyping,
    isInitializing,
    initError,
    sessionId,
    sessionStatus,
    sendMessage,
  } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, isInitializing]);

  const isLocked =
    !sessionId ||
    isInitializing ||
    sessionStatus === "submitted" ||
    sessionStatus === "closed";
  const canSend = !isLocked && !isTyping && input.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const clientMessageId = crypto.randomUUID();
    sendMessage(input, clientMessageId);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isFirstUserMessage =
    messages.filter((m) => m.role === "user").length === 0;
  const suggestedPrompts = [
    "Bisa pindah besok pagi?",
    "Jadwal sore minggu ini ada?",
    "Batalkan sesi ini saja.",
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-1.5 pb-2">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] ml-2 mt-2">
              <Loader2 className="animate-spin" size={13} />
              Memproses permintaan Anda...
            </div>
          )}

          {isInitializing && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] ml-2 mt-2">
              <Loader2 className="animate-spin" size={13} />
              Menyiapkan sesi chat...
            </div>
          )}

          {initError && (
            <div className="mx-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {initError}
            </div>
          )}

          <ProposedSlotList />
        </div>
      </div>

      {/* Area Komposer (Bawah) */}
      <div className="shrink-0 pt-2 border-t border-[#E2E8F0] bg-popover">
        {isFirstUserMessage && !isLocked && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInput(prompt)}
                className="whitespace-nowrap text-[11px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] px-2.5 py-1 rounded-full hover:bg-[#F1F5F9] transition-colors cursor-pointer">
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              sessionStatus === "submitted"
                ? "Permintaan sudah dikirim ke admin"
                : "Ketik permintaan perubahan jadwal..."
            }
            className="min-h-[42px] max-h-[80px] resize-none bg-[#F8FAFC] text-xs py-2.5"
            disabled={isLocked || isTyping}
          />
          <Button
            className="h-[42px] w-[42px] bg-[#65C466] hover:bg-[#52A353] flex-shrink-0 cursor-pointer"
            onClick={handleSend}
            disabled={!canSend}>
            <SendHorizontal size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
