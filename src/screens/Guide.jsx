import { useState, useRef, useEffect } from 'react'
import { IMG } from '../data/mock'

function MapBase({ children }) {
  return (
    <div className="relative w-full h-full vintage-map overflow-hidden grain">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 393 380"
           preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.45 }}>
        <path d="M -10 340 Q 90 315 185 330 T 400 322"
              stroke="#a8c3c9" strokeWidth="20" fill="none" opacity="0.65"/>
        <path d="M -10 340 Q 90 315 185 330 T 400 322"
              stroke="#bcd2d8" strokeWidth="13" fill="none" opacity="0.85"/>
        <g stroke="#cdb893" strokeWidth="1.4" fill="none">
          <path d="M 0 75 Q 100 58 200 82 T 393 76"/>
          <path d="M 0 165 Q 120 148 240 172 T 393 165"/>
          <path d="M 0 255 Q 80 238 180 262 T 393 255"/>
          <path d="M 58 0 L 70 380"/>
          <path d="M 192 0 Q 208 190 196 380"/>
          <path d="M 308 0 L 316 380"/>
        </g>
        <g fill="#c8d3a8" opacity="0.45">
          <ellipse cx="88" cy="58" rx="46" ry="27"/>
          <ellipse cx="294" cy="296" rx="50" ry="32"/>
        </g>
      </svg>
      <div className="absolute hand text-[11px]" style={{ top: 18, left: 30, color: 'var(--sepia-mute)' }}>성수</div>
      <div className="absolute hand text-[11px]" style={{ top: 80, right: 32, color: 'var(--sepia-mute)' }}>한남</div>
      <div className="absolute hand text-[10px]" style={{ top: 208, left: '50%', color: '#6b8a90' }}>한강</div>
      {children}
    </div>
  )
}

function Illust1({ active }) {
  return (
    <MapBase>
      {/* Ripple rings at pin tip */}
      <div className="absolute" style={{ top: '58%', left: '50%' }}>
        <div className="guide-ripple"/>
        <div className="guide-ripple" style={{ animationDelay: '0.9s' }}/>
      </div>
      {/* Polaroid + pin */}
      <div className={`absolute ${active ? 'guide-polaroid-drop' : 'opacity-0'}`}
           style={{ top: '14%', left: '50%' }}>
        <div style={{ transform: 'translateX(-50%) rotate(-3deg)',
                      background: '#FFFDF7', padding: '7px 7px 28px 7px',
                      boxShadow: '0 8px 32px rgba(61,46,31,0.3)', borderRadius: 2,
                      position: 'relative' }}>
          <div style={{ width: 124, height: 124, background: '#d9cdb8', overflow: 'hidden' }}>
            <img src={IMG.cafe} alt=""
                 style={{ width: '100%', height: '100%', objectFit: 'cover',
                          filter: 'sepia(0.3) saturate(0.8) contrast(0.95)' }}/>
          </div>
          <p className="hand text-center mt-1.5 text-[11.5px]" style={{ color: 'var(--sepia-mute)' }}>봄 · 성수</p>
          {/* Pin circle */}
          <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                        width: 17, height: 17, borderRadius: '50%',
                        background: 'var(--terra)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}/>
          {/* Pin triangle */}
          <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                        borderTop: '9px solid var(--terra)' }}/>
        </div>
      </div>
    </MapBase>
  )
}

function Illust2({ active }) {
  const pins = [
    { top: '22%', left: '28%', src: IMG.pf3, photo: IMG.street, delay: '0.5s' },
    { top: '12%', left: '64%', src: IMG.pf2, photo: IMG.window, delay: '0.85s' },
    { top: '56%', left: '44%', src: IMG.pf1, photo: IMG.rain,   delay: '1.2s' },
  ]
  return (
    <MapBase>
      {pins.map((pin, i) => (
        <div key={i}
             className={`absolute ${active ? 'guide-friend-pin' : 'opacity-0'}`}
             style={{ top: pin.top, left: pin.left,
                      animationDelay: active ? pin.delay : undefined }}>
          <div style={{ background: '#FFFDF7', padding: 3, borderRadius: 6,
                        boxShadow: '0 3px 10px rgba(61,46,31,0.25)',
                        transform: 'rotate(3deg)', border: '1.5px solid rgba(61,46,31,0.12)',
                        position: 'relative' }}>
            <img src={pin.photo} alt=""
                 style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover',
                          display: 'block', filter: 'sepia(0.35) saturate(0.75)' }}/>
            <img src={pin.src} alt=""
                 style={{ position: 'absolute', bottom: -3, right: -5, width: 14, height: 14,
                          borderRadius: '50%', border: '1.5px solid #FFFDF7',
                          filter: 'sepia(0.15)' }}/>
          </div>
          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '3px solid transparent', borderRight: '3px solid transparent',
                        borderTop: '5px solid var(--sepia-mute)' }}/>
        </div>
      ))}
      {/* Banner */}
      <div className={`absolute ${active ? 'guide-banner-slide' : 'opacity-0'}`}
           style={{ bottom: 16, left: '50%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                      paddingLeft: 10, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
                      borderRadius: 9999, background: '#C4722A', color: '#FFFDF7',
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      boxShadow: '0 0 14px rgba(212,130,74,0.65), 0 0 28px rgba(212,130,74,0.3)',
                      animation: active ? 'bannerBreathe 3s ease-in-out 0.8s infinite' : 'none' }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
            <span className="animate-ping"
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                           background: 'rgba(255,253,247,0.7)' }}/>
            <span style={{ position: 'relative', display: 'inline-block',
                           width: 8, height: 8, borderRadius: '50%', background: '#FFFDF7' }}/>
          </span>
          근처 친구 순간 3개
        </div>
      </div>
    </MapBase>
  )
}

function Illust3({ active }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center pt-5 overflow-hidden grain"
         style={{ background: 'radial-gradient(ellipse at 50% 10%, #F8EAD3, #ECDDC2 55%, #DDCBA8 100%)' }}>
      {/* Friend info */}
      <div className={`self-start px-5 flex items-center gap-2 ${active ? 'guide-fade-up' : 'opacity-0'}`}
           style={{ animationDelay: active ? '0.2s' : undefined }}>
        <img src={IMG.pf3} alt=""
             style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      filter: 'sepia(0.15)', boxShadow: '0 0 0 1.5px rgba(61,46,31,0.12)' }}/>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sepia)', lineHeight: 1.3 }}>
            준호이가 남긴 순간
          </p>
          <p style={{ fontSize: 10, color: 'var(--sepia-mute)' }}>성수 · 대림창고 · 350m</p>
        </div>
      </div>

      {/* Film photo */}
      <div className={`mt-4 ${active ? 'guide-fade-up' : 'opacity-0'}`}
           style={{ animationDelay: active ? '0.5s' : undefined }}>
        <div style={{ background: '#f5f0e8', padding: 5, borderRadius: 3,
                      boxShadow: '0 6px 24px rgba(61,46,31,0.2)', transform: 'rotate(-0.5deg)' }}>
          <div style={{ width: 148, height: 152, background: '#d9cdb8', overflow: 'hidden' }}>
            <img src={IMG.street} alt=""
                 style={{ width: '100%', height: '100%', objectFit: 'cover',
                          filter: 'sepia(0.25) saturate(0.88) contrast(0.95)' }}/>
          </div>
        </div>
      </div>

      {/* Music player */}
      <div className={`mt-4 ${active ? 'guide-fade-up' : 'opacity-0'}`}
           style={{ width: 'calc(100% - 40px)',
                    animationDelay: active ? '0.8s' : undefined }}>
        <div style={{ borderRadius: 14, background: 'rgba(255,253,247,0.78)',
                      backdropFilter: 'blur(8px)', padding: '9px 12px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.08)' }}>
          <img src={IMG.album2} alt=""
               style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover',
                        filter: 'sepia(0.2)', flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--sepia)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Night Dancer
            </p>
            <p style={{ fontSize: 10, color: 'var(--sepia-mute)' }}>imase</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 16, gap: 2 }}>
            {[...Array(7)].map((_, i) => (
              <span key={i} className="wave-bar"
                    style={{ animationDelay: `${i * 90}ms`, background: 'var(--terra)' }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const CARDS = [
  {
    Illust: Illust1,
    title: '지도에 추억을 박제해요',
    sub: '+ 버튼으로 사진과 음악을\n이 장소에 남겨요',
  },
  {
    Illust: Illust2,
    title: '친구의 순간을 발견해요',
    sub: "'근처 친구 순간' 버튼을 누르면\n이 동네 친구 추억이 나타나요",
  },
  {
    Illust: Illust3,
    title: '그 자리에서만 열려요',
    sub: '친구 추억은 그 장소 근처에\n가야만 볼 수 있어요',
  },
]

export default function Guide({ goRoot }) {
  const [idx, setIdx] = useState(0)
  const [seen, setSeen] = useState([true, false, false])
  const touchStartX = useRef(null)
  const [dragX, setDragX] = useState(0)

  useEffect(() => {
    setSeen(s => {
      if (s[idx]) return s
      const next = [...s]
      next[idx] = true
      return next
    })
  }, [idx])

  function navigate(dir) {
    const next = idx + dir
    if (next < 0 || next >= CARDS.length) return
    setIdx(next)
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchMove(e) {
    if (touchStartX.current === null) return
    setDragX(e.touches[0].clientX - touchStartX.current)
  }
  function onTouchEnd() {
    if (dragX < -50) navigate(1)
    else if (dragX > 50) navigate(-1)
    setDragX(0)
    touchStartX.current = null
  }

  return (
    <div className="page-enter h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-4 pb-1 flex-shrink-0">
        <button onClick={() => goRoot('home')}
                className="tappable text-[13px]"
                style={{ color: 'var(--sepia-mute)' }}>
          건너뛰기
        </button>
      </div>

      {/* Sliding panels */}
      <div className="flex-1 overflow-hidden"
           onTouchStart={onTouchStart}
           onTouchMove={onTouchMove}
           onTouchEnd={onTouchEnd}>
        <div style={{
          display: 'flex',
          height: '100%',
          width: `${CARDS.length * 100}%`,
          transform: `translateX(calc(-${idx * (100 / CARDS.length)}% + ${dragX * 0.45}px))`,
          transition: dragX === 0 ? 'transform 0.38s cubic-bezier(0.4,0,0.2,1)' : 'none',
        }}>
          {CARDS.map((card, i) => (
            <div key={i} style={{ width: `${100 / CARDS.length}%`, height: '100%',
                                  display: 'flex', flexDirection: 'column', flexShrink: 0,
                                  pointerEvents: i === idx ? 'auto' : 'none' }}>
              {/* Illustration — top 60% */}
              <div style={{ height: '60%', flexShrink: 0 }}>
                <card.Illust active={seen[i]}/>
              </div>

              {/* Text — bottom 40% */}
              <div style={{ height: '40%', display: 'flex', flexDirection: 'column',
                            padding: '20px 28px 12px', flexShrink: 0 }}>
                <p className="serif-kr font-extrabold leading-snug"
                   style={{ fontSize: 22, color: 'var(--sepia)' }}>
                  {card.title}
                </p>
                <p className="mt-3 text-[14px] leading-[1.75] whitespace-pre-line"
                   style={{ color: 'var(--sepia-soft)' }}>
                  {card.sub}
                </p>
                {i === CARDS.length - 1 && (
                  <button onClick={() => goRoot('home')}
                          className="tappable mt-auto w-full py-3.5 rounded-full text-[15.5px] font-semibold"
                          style={{ background: 'var(--terra)', color: 'var(--paper)',
                                   boxShadow: '0 8px 20px -8px rgba(212,130,74,0.6)' }}>
                    시작하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 py-3 flex-shrink-0">
        {CARDS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className="tappable rounded-full transition-all duration-300"
                  style={{ width: i === idx ? 20 : 8, height: 8,
                           background: i === idx ? 'var(--terra)' : 'rgba(61,46,31,0.2)' }}/>
        ))}
      </div>
    </div>
  )
}
