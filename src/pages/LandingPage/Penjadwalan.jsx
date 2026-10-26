import { useState } from "react";

export default function Penjadwalan() {
  const [activeDate, setActiveDate] = useState(23);

  // Data tiruan untuk slider tanggal
  const dates = [
    { day: "Fri", date: 23 },
    { day: "Sat", date: 24 },
    { day: "Sun", date: 25 },
    { day: "Mon", date: 26 },
    { day: "Tue", date: 27 },
    { day: "Wed", date: 28 },
    { day: "Thu", date: 29 },
    { day: "Fri", date: 30 },
    { day: "Sat", date: 31 },
    { day: "Sun", date: 1 },
    { day: "Mon", date: 2 },
    { day: "Tue", date: 3 },
  ];

  // Data tiruan untuk jadwal
  const schedules = [
    {
      id: 1,
      time: "9:00am",
      duration: "60 mins",
      title: "Suspension Class",
      instructor: "Coach Fika",
      availability: "0 in waitlist",
      status: "waitlist", // waitlist | available
    },
    {
      id: 2,
      time: "12:00pm",
      duration: "60 mins",
      title: "Full Body Workout (Women Only)",
      instructor: "Coach Fika",
      availability: "4 / 10 left",
      status: "available",
    },
  ];

  const schedulesDay2 = [
    {
      id: 3,
      time: "9:30am",
      duration: "60 mins",
      title: "Bubble Butt",
      instructor: "Coach Bayu",
      location: "Gymnasyum Bintaro",
      room: "Gym Lantai 3",
      availability: "10 / 10 left",
      status: "available",
    },
  ];

  return (
    // Background diatur ke clean-bg (abu-abu sangat muda)
    <section id="jadwal" className="py-24 bg-clean-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-deep-slate tracking-tight mb-2">
              Jadwal Latihan
            </h2>
            <div className="flex items-center gap-2 text-lg font-semibold text-muted-gray">
              <span>Oct – Nov 2026</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm font-semibold text-deep-slate">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-pure-white text-xs">
                ✓
              </span>
              Booked
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-pure-white text-xs">
                W
              </span>
              Waitlisted
            </div>
          </div>
        </div>

        {/* Date Slider */}
        <div className="flex gap-4 overflow-x-auto pb-6 mb-6 scrollbar-hide snap-x">
          <button className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-soft-border bg-pure-white text-muted-gray hover:text-primary hover:border-primary transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>

          {dates.map((d, index) => (
            <button
              key={index}
              onClick={() => setActiveDate(d.date)}
              className={`shrink-0 flex flex-col items-center justify-center w-[72px] py-3 rounded-2xl transition-all duration-300 snap-start ${
                activeDate === d.date
                  ? "bg-primary text-pure-white shadow-md transform -translate-y-1"
                  : "bg-pure-white border border-soft-border text-muted-gray hover:border-primary"
              }`}>
              <span
                className={`text-sm font-medium ${activeDate === d.date ? "text-pure-white/90" : ""}`}>
                {d.day}
              </span>
              <span className="text-2xl font-bold">{d.date}</span>
            </button>
          ))}

          <button className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-soft-border bg-pure-white text-muted-gray hover:text-primary hover:border-primary transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-12">
          <select className="px-4 py-3 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary w-full sm:w-auto min-w-[170px] shadow-sm">
            <option>All categories</option>
          </select>
          <select className="px-4 py-3 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary w-full sm:w-auto min-w-[170px] shadow-sm">
            <option>Classes</option>
          </select>
          <select className="px-4 py-3 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary w-full sm:w-auto min-w-[170px] shadow-sm">
            <option>Instructor</option>
            <option>Coach Anke</option>
            <option>Coach Ayu</option>
            <option>Coach Fika</option>
          </select>
          <select className="px-4 py-3 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary w-full sm:w-auto min-w-[170px] shadow-sm">
            <option>Level of difficulty</option>
          </select>
        </div>

        {/* Schedule List Area */}
        <div className="space-y-10">
          {/* Group 1: Today */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h3 className="text-xl font-bold text-deep-slate">
                Today, Fri 23 Oct
              </h3>
              <span className="text-sm font-semibold text-muted-gray bg-soft-border/50 px-3 py-1 rounded-full">
                2 classes
              </span>
            </div>

            <div className="space-y-4">
              {schedules.map((item) => (
                <div
                  key={item.id}
                  className="bg-pure-white border border-soft-border p-6 rounded-3xl flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition-shadow">
                  {/* Time */}
                  <div className="md:w-32 shrink-0">
                    <p className="text-xl font-extrabold text-deep-slate">
                      {item.time}
                    </p>
                    <p className="text-sm font-medium text-muted-gray mt-1">
                      {item.duration}
                    </p>
                  </div>

                  {/* Class Info */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-deep-slate">
                        {item.title}
                      </h4>
                      <svg
                        className="w-4 h-4 text-muted-gray"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p className="text-muted-gray font-medium">
                      {item.instructor}
                    </p>
                  </div>

                  {/* Availability & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:w-auto shrink-0">
                    <p className="text-sm font-semibold text-muted-gray text-left sm:text-right w-24">
                      {item.availability}
                    </p>
                    <button
                      className={`px-8 py-3 rounded-full font-bold transition-colors w-full sm:w-auto ${
                        item.status === "available"
                          ? "bg-deep-slate hover:bg-primary text-pure-white"
                          : "bg-pure-white border-2 border-soft-border text-deep-slate hover:border-deep-slate"
                      }`}>
                      {item.status === "available"
                        ? "Book Now"
                        : "Join Waitlist"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group 2: Tomorrow */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h3 className="text-xl font-bold text-deep-slate">Sat, 24 Oct</h3>
              <span className="text-sm font-semibold text-muted-gray bg-soft-border/50 px-3 py-1 rounded-full">
                1 class
              </span>
            </div>

            <div className="space-y-4">
              {schedulesDay2.map((item) => (
                <div
                  key={item.id}
                  className="bg-pure-white border border-soft-border p-6 rounded-3xl flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition-shadow">
                  <div className="md:w-32 shrink-0">
                    <p className="text-xl font-extrabold text-deep-slate">
                      {item.time}
                    </p>
                    <p className="text-sm font-medium text-muted-gray mt-1">
                      {item.duration}
                    </p>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-deep-slate">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-muted-gray font-medium mb-1">
                      {item.instructor}
                    </p>
                    {item.location && (
                      <p className="text-xs font-semibold text-primary">
                        {item.location} • {item.room}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:w-auto shrink-0">
                    <p className="text-sm font-semibold text-muted-gray text-left sm:text-right w-24">
                      {item.availability}
                    </p>
                    <button className="px-8 py-3 rounded-full font-bold bg-deep-slate hover:bg-primary text-pure-white transition-colors w-full sm:w-auto">
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
