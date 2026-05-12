import React from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    to: '/reception',
    title: 'Reception',
    subtitle: 'Register patients, book appointments & manage tokens',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-blue-500 to-blue-700',
    hover: 'hover:shadow-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    to: '/doctor',
    title: 'Doctor Panel',
    subtitle: 'View daily queue, consult patients & write prescriptions',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-700',
    hover: 'hover:shadow-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    to: '/admin',
    title: 'Admin Panel',
    subtitle: 'Manage doctor schedules, timetables & availability',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-violet-500 to-violet-700',
    hover: 'hover:shadow-violet-200',
    badge: 'bg-violet-100 text-violet-700',
  },
];

const zoomStyle = `
  @keyframes bgZoom {
    from { transform: scale(1); }
    to   { transform: scale(1.12); }
  }
  .bg-zoom {
    animation: bgZoom 10s ease-in-out infinite alternate;
  }
`;

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <style>{zoomStyle}</style>

      {/* Animated background image — fixed so it fills viewport on all screen sizes */}
      <div
        className="bg-zoom fixed inset-0 -z-20"
        style={{
          backgroundImage: 'url(/back.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'high-quality',
        }}
      />

      {/* Subtle dark overlay */}
      <div className="fixed inset-0 -z-10 bg-black/30" />

      {/* hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white drop-shadow mb-2 sm:mb-3">
            Welcome to Hospital Management
          </h1>
          <p className="text-white/80 text-sm sm:text-lg">Select a section to get started</p>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
          {SECTIONS.map((s) => (
            <button
              key={s.to}
              onClick={() => navigate(s.to)}
              className={`group relative bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg hover:shadow-2xl hover:bg-white/25 ${s.hover} transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] text-left overflow-hidden`}
            >
              {/* top gradient bar */}
              <div className={`h-2 w-full bg-gradient-to-r ${s.color}`} />

              <div className="p-5 sm:p-7 space-y-3 sm:space-y-4">
                {/* icon */}
                <div className={`inline-flex p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                  {s.icon}
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1">{s.title}</h2>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{s.subtitle}</p>
                </div>

                <div className="flex items-center gap-1 text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                  Open
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
