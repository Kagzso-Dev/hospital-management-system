export default function PageSuspense() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-cyan-400 animate-spin" />
        <span className="text-white/40 text-xs tracking-widest uppercase">Loading</span>
      </div>
    </div>
  );
}
