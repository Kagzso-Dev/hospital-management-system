import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const Ctx = createContext({});
export const useToast = () => useContext(Ctx);

const CONFIG = {
  success: {
    bar: 'bg-green-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bar: 'bg-red-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-blue-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bar: 'bg-amber-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onRemove }) {
  const [show, setShow] = useState(false);
  const cfg = CONFIG[toast.type] || CONFIG.info;

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 10);
    const t2 = setTimeout(() => setShow(false), 3300);
    const t3 = setTimeout(onRemove, 3650);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onRemove]);

  return (
    <div
      style={{ transition: 'all 0.35s cubic-bezier(0.34,1.4,0.64,1)' }}
      className={`flex items-start gap-3 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[260px] max-w-sm
        ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
    >
      {/* left colour bar */}
      <div className={`w-1 self-stretch flex-shrink-0 ${cfg.bar}`} />

      {/* icon */}
      <div className={`mt-3 flex-shrink-0 ${cfg.bar.replace('bg-', 'text-')}`}>
        {cfg.icon}
      </div>

      {/* text */}
      <div className="flex-1 py-3 pr-1 text-sm text-slate-700 leading-snug">
        {toast.message}
      </div>

      {/* close */}
      <button
        onClick={() => { setShow(false); setTimeout(onRemove, 300); }}
        className="mt-2.5 mr-2 flex-shrink-0 text-slate-300 hover:text-slate-500 transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type) => {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx = useMemo(() => ({
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  }), [add]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="fixed top-16 right-4 z-[9997] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
