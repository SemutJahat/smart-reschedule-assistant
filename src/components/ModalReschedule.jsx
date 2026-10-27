import { useState, useEffect, useRef } from "react";

export default function ModalReschedule({
  isOpen,
  onClose,
  classTitle,
  onSubmit,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'typing' | 'negotiating' | 'done'
  const chatEndRef = useRef(null);

  // Inisialisasi percakapan saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: "ai",
          content: `Halo! Saya Asisten Pintar Gymnasyum. Jadwal kelas **${classTitle}** Anda ingin dipindahkan ke tanggal berapa?`,
        },
      ]);
      setStatus("idle");
      setInputValue("");
    }
  }, [isOpen, classTitle]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (!isOpen) return null;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 1. Tambahkan pesan pelanggan
    const userMsg = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setStatus("typing");

    // 2. Simulasi AI berpikir dan mencari jadwal (Mengecek DB Admin di belakang layar)
    setTimeout(() => {
      const aiResponse = {
        role: "ai",
        content:
          "Berdasarkan ketersediaan Coach Fika, jadwal yang Anda minta sudah penuh. Namun, saya menemukan slot kosong terdekat pada **Minggu, 25 Okt 2026 pukul 15:00**.\n\nApakah Anda ingin mengambil jadwal ini?",
      };
      setMessages((prev) => [...prev, aiResponse]);
      setStatus("negotiating"); // Memunculkan tombol persetujuan
    }, 1500);
  };

  const handleAcceptProposal = () => {
    // Pelanggan setuju, tiket diteruskan ke Admin
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Ya, saya ambil jadwal itu." },
    ]);
    setStatus("typing");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Sip! Pengajuan reschedule Anda ke tanggal 25 Okt 2026 telah saya teruskan ke Admin. Silakan pantau statusnya di dasbor Anda.",
        },
      ]);
      setStatus("done");

      // Menutup modal dan mengubah status di JadwalSaya.jsx setelah 2 detik
      setTimeout(() => {
        if (onSubmit) onSubmit();
      }, 2000);
    }, 1000);
  };

  const handleRejectProposal = () => {
    // Pelanggan menolak, negosiasi batal tanpa mengganggu Admin
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Tidak jadi, batalkan saja." },
    ]);
    setStatus("typing");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Baik, pengajuan reschedule telah dibatalkan. Jadwal lama Anda tidak berubah. Ada lagi yang bisa saya bantu?",
        },
      ]);
      setStatus("idle");
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/70 backdrop-blur-sm p-4">
      <div className="bg-clean-bg rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header Chat AI */}
        <div className="bg-pure-white p-5 border-b border-soft-border flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary relative">
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-pure-white rounded-full"></span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-deep-slate leading-tight">
              Asisten Cerdas
            </h2>
            <p className="text-sm font-semibold text-primary">
              Siap membantu Anda
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-10 h-10 bg-clean-bg rounded-full flex items-center justify-center text-muted-gray hover:text-deep-slate hover:bg-soft-border transition-all">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Area Percakapan (Scrollable) */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-deep-slate text-pure-white rounded-br-sm"
                    : "bg-pure-white border border-soft-border text-deep-slate rounded-bl-sm shadow-sm"
                }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Indikator AI Sedang Mengetik */}
          {status === "typing" && (
            <div className="flex justify-start">
              <div className="bg-pure-white border border-soft-border p-4 rounded-2xl rounded-bl-sm shadow-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-muted-gray rounded-full animate-bounce"></span>
                <span
                  className="w-2 h-2 bg-muted-gray rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}></span>
                <span
                  className="w-2 h-2 bg-muted-gray rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Area Input / Negosiasi Action */}
        <div className="p-5 bg-pure-white border-t border-soft-border shrink-0">
          {status === "negotiating" ? (
            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-center text-muted-gray uppercase tracking-wider mb-1">
                Tindakan Diperlukan
              </p>
              <button
                onClick={handleAcceptProposal}
                className="w-full py-3.5 bg-primary hover:bg-opacity-90 text-pure-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2">
                ✅ Ya, Ajukan Jadwal Ini
              </button>
              <button
                onClick={handleRejectProposal}
                className="w-full py-3.5 bg-clean-bg border border-soft-border text-deep-slate hover:bg-soft-border rounded-xl font-bold transition-all">
                ❌ Tidak, Batalkan
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={status === "typing" || status === "done"}
                placeholder="Ketik pesan Anda di sini..."
                className="w-full pl-5 pr-14 py-4 rounded-full border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-deep-slate"
              />
              <button
                type="submit"
                disabled={
                  !inputValue.trim() || status === "typing" || status === "done"
                }
                className="absolute right-2 top-2 bottom-2 w-10 bg-primary hover:bg-opacity-90 disabled:bg-muted-gray text-pure-white rounded-full flex items-center justify-center transition-all shadow-sm">
                <svg
                  className="w-5 h-5 ml-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
