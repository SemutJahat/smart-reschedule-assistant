import { cn } from "@/lib/utils";
import type { ChatMessage } from "../schemas";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Format jam (misal: "14:30")
  const timeString = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Tampilan khusus untuk pesan sistem (tengah)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-4 py-1.5 rounded-full border border-[#E2E8F0]">
          {message.content}
        </span>
      </div>
    );
  }

  // Tampilan untuk pesan pengguna dan asisten
  return (
    <div
      className={cn(
        "flex w-full my-3",
        isUser ? "justify-end" : "justify-start",
      )}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5 text-sm flex flex-col gap-1",
          isUser
            ? "bg-[#65C466] text-white rounded-2xl rounded-br-sm"
            : "bg-white text-[#1E293B] border border-[#E2E8F0] rounded-2xl rounded-bl-sm shadow-sm",
        )}>
        <span className="leading-relaxed whitespace-pre-wrap">
          {message.content}
        </span>
        {timeString && (
          <span
            className={cn(
              "text-[10px] text-right",
              isUser ? "text-green-100" : "text-[#64748B]",
            )}>
            {timeString}
          </span>
        )}
      </div>
    </div>
  );
}
