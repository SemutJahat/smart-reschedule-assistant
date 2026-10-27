import { useState } from "react";

export default function Event() {
  const [activeTab, setActiveTab] = useState("All");

  const eventData = [
    {
      id: 1,
      title: "UNLEASH YOUR FEET: Rediscover Your Natural Strength",
      price: "From Rp 0",
      datetime: "Sat, 24 Oct 2026 • 2pm - 4pm",
      image: "/bg-gymnasyum.webp", // Placeholder gambar
    },
    // Anda bisa menambahkan data event lain di sini nantinya
  ];

  return (
    <section id="event" className="py-24 bg-clean-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Tabs */}
        <div className="flex gap-8 border-b border-soft-border mb-8">
          <button
            onClick={() => setActiveTab("All")}
            className={`pb-4 font-semibold text-lg transition-colors relative ${
              activeTab === "All"
                ? "text-deep-slate"
                : "text-muted-gray hover:text-deep-slate"
            }`}>
            All
            {activeTab === "All" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-deep-slate"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("Sharing")}
            className={`pb-4 font-semibold text-lg transition-colors relative ${
              activeTab === "Sharing"
                ? "text-deep-slate"
                : "text-muted-gray hover:text-deep-slate"
            }`}>
            Gymnasyum Sharing Session
            {activeTab === "Sharing" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-deep-slate"></span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 justify-start md:justify-center mb-12">
          <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-auto min-w-[160px]">
            <option>All locations</option>
          </select>
          <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-auto min-w-[160px]">
            <option>All Levels</option>
          </select>
          <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-auto min-w-[160px]">
            <option>Price Range</option>
          </select>
          <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-auto min-w-[160px]">
            <option>Sort By</option>
          </select>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {eventData.map((event) => (
            <div
              key={event.id}
              className="bg-pure-white rounded-3xl overflow-hidden shadow-sm border border-soft-border flex flex-col hover:shadow-md transition-shadow">
              <div className="h-48 w-full">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-deep-slate leading-snug mb-4">
                  {event.title}
                </h3>

                <div className="mb-4">
                  <p className="font-bold text-deep-slate">{event.price}</p>
                  <p className="text-sm text-muted-gray underline cursor-pointer mt-1">
                    Show all prices
                  </p>
                </div>

                <hr className="border-soft-border mb-4" />

                <div className="flex items-start gap-3 text-sm font-semibold text-deep-slate mb-8 flex-grow">
                  <svg
                    className="w-5 h-5 text-muted-gray shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span>{event.datetime}</span>
                </div>

                <button className="w-full bg-deep-slate hover:bg-primary text-pure-white py-3.5 rounded-full font-semibold transition-colors">
                  Buy ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
