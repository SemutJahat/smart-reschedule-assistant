import { useState, useEffect } from "react";

export default function ScrollButton() {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Munculkan panah atas jika sudah tidak di paling atas (lewat 100px)
      setShowUp(window.scrollY > 100);

      // Sembunyikan panah bawah jika sudah mencapai akhir halaman
      const isBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 50;
      setShowDown(!isBottom);
    };

    window.addEventListener("scroll", handleScroll);
    // Panggil sekali saat pertama render
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollStep = (direction) => {
    const step = window.innerHeight * 1.1;
    window.scrollBy({
      top: direction === "up" ? -step : step,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
      {/* Tombol Ke Atas */}
      <button
        onClick={() => scrollStep("up")}
        className={`bg-primary hover:bg-opacity-90 text-pure-white p-3.5 rounded-full shadow-lg transition-all duration-300 ${
          showUp
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Scroll ke atas">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M5 15l7-7 7 7"></path>
        </svg>
      </button>

      {/* Tombol Ke Bawah */}
      <button
        onClick={() => scrollStep("down")}
        className={`bg-primary hover:bg-opacity-90 text-pure-white p-3.5 rounded-full shadow-lg transition-all duration-300 ${
          showDown
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
        aria-label="Scroll ke bawah">
        <svg
          className="w-6 h-6 rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M5 15l7-7 7 7"></path>
        </svg>
      </button>
    </div>
  );
}
