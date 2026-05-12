import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageLoader() {
  const { pathname } = useLocation();
  const [width, setWidth]     = useState(0);
  const [visible, setVisible] = useState(false);
  const prev   = useRef(pathname);
  const timers = useRef([]);

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;

    timers.current.forEach(clearTimeout);
    setVisible(true);
    setWidth(0);

    timers.current = [
      setTimeout(() => setWidth(75),  10),
      setTimeout(() => setWidth(100), 260),
      setTimeout(() => setVisible(false), 500),
      setTimeout(() => setWidth(0),   680),
    ];

    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px]">
      <div
        style={{
          width: `${width}%`,
          opacity: visible ? 1 : 0,
          transition: width === 0
            ? 'none'
            : width < 100
            ? 'width 250ms cubic-bezier(0.4,0,0.2,1), opacity 150ms'
            : 'width 160ms ease-out, opacity 180ms 320ms',
        }}
        className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 relative"
      >
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_8px_3px_rgba(34,211,238,0.8)]" />
      </div>
    </div>
  );
}
