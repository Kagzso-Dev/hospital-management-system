import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBot from '../../components/ChatBot';

const STATS = [
  { value: '500+', label: 'Patients Served Daily',  num: 500, suffix: '+' },
  { value: '98%',  label: 'Appointment Accuracy',   num: 98,  suffix: '%' },
  { value: '24/7', label: 'System Availability',    num: null },
  { value: '0s',   label: 'Manual Paperwork',        num: null },
];

function useCountUp(target, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref       = useRef();
  const animated  = useRef(false);
  useEffect(() => {
    if (!target) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animated.current) return;
      animated.current = true;
      const start = performance.now();
      const tick  = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setCount(Math.floor(eased * target));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return [count, ref];
}

function StatCounter({ stat }) {
  const [count, ref] = useCountUp(stat.num, 1400);
  const display = stat.num !== null ? `${count}${stat.suffix}` : stat.value;
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{display}</div>
      <div className="text-xs text-white/65 mt-0.5 leading-tight">{stat.label}</div>
    </div>
  );
}


export default function HeroPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const anim = (delay = 0) =>
    `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`
    + ` delay-[${delay}ms]`;

  return (
    <div className="relative flex flex-col text-white min-h-[calc(100vh-3.5rem)]">

      {/* Hero background — overrides App's back.jpg via DOM order (same z-layer) */}
      <div
        className="bg-zoom fixed inset-0 -z-20"
        style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      />
      {/* Deep gradient overlay — overrides App's plain black/40 */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/95 via-blue-950/93 to-slate-950/96" />

      {/* ── Hero Section ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 pt-12 pb-10 sm:pt-20 sm:pb-14">

        <h1 className={`text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-black leading-[1.08] mb-5 ${anim(80)}`}>
          Delivering Care<br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            with Precision
          </span>
        </h1>

        <p className={`text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed mb-10 ${anim(160)}`}>
          A comprehensive hospital operations platform — from patient arrival to prescription,
          every step is streamlined, trackable, and effortless for your clinical team.
        </p>

        {/* CTA */}
        <div className={`flex flex-col xs:flex-row items-center gap-3 mb-14 ${anim(220)}`}>
          <button
            onClick={() => navigate('/login')}
            className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-bold text-sm sm:text-base shadow-2xl shadow-blue-800/50 hover:shadow-blue-600/50 active:scale-[0.97] transition-all"
          >
            Access Portal
            <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-2xl mb-14 ${anim(280)}`}>
          {STATS.map((s) => <StatCounter key={s.label} stat={s} />)}
        </div>
      </section>


      {/* ── Footer ── */}

      <ChatBot />
    </div>
  );
}
