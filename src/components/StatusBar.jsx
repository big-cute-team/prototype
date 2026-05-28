export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3 pb-1 text-[14px] font-semibold" style={{ color: 'var(--sepia)' }}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none"><path d="M1 7.5L1 9.5M5 5.5L5 9.5M9 3.5L9 9.5M13 1.5L13 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M7.5 2C9.7 2 11.7 2.85 13.2 4.3M4 5.5C5 4.5 6.2 4 7.5 4C8.8 4 10 4.5 11 5.5M7.5 7.5L7.5 7.5M1.8 1.5C3.4 0.5 5.4 0 7.5 0C9.6 0 11.6 0.5 13.2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="15" height="7" rx="1" fill="currentColor"/><rect x="21" y="4" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
      </div>
    </div>
  )
}

export function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1">
      <div className="w-32 h-[5px] rounded-full" style={{ background: 'var(--sepia)', opacity: 0.35 }} />
    </div>
  )
}
