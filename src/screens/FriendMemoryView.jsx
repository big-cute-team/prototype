import { useState } from 'react'
import Polaroid from '../components/Polaroid'
import { Ico } from '../components/Icons'
import { formatDate } from '../utils/date'

export default function FriendMemoryView({ params, goBack }) {
  const { memory, locationName } = params
  const [playing, setPlaying] = useState(true)
  const [accepted, setAccepted] = useState(memory.status === 'accepted')
  const [declined, setDeclined] = useState(false)

  return (
    <div className="page-enter relative h-full flex flex-col overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 20%, #F8EAD3, #ECDDC2 60%, #DDCBA8 100%)'
      }}/>
      <div className="absolute inset-0 grain"/>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-2">
        <button onClick={goBack} className="tappable w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,253,247,0.55)', color: 'var(--sepia)' }}>
          <Ico.back width="20" height="20"/>
        </button>
        <p className="hand text-[13px]" style={{ color: 'var(--sepia-mute)' }}>{locationName}</p>
        <div className="w-9"/>
      </div>

      {/* Context */}
      <div className="relative z-10 text-center px-8 pt-5">
        <p className="serif-en text-[13px] tracking-[0.2em] slow-fade" style={{ color: 'var(--terra)', animationDelay: '80ms' }}>
          a memory found here
        </p>
        <p className="mt-1.5 text-[12px] slow-fade" style={{ color: 'var(--sepia-mute)', animationDelay: '250ms' }}>
          {formatDate(memory.date)}
        </p>
      </div>

      {/* Polaroid */}
      <div className="relative z-10 flex flex-col items-center mt-4 px-6">
        <div className="slow-fade" style={{ animationDelay: '500ms' }}>
          <Polaroid src={memory.photo} rotate={-3} w={216} h={242} faded />
          <p className="hand text-center -mt-6 relative ink" style={{ fontSize: 15.5, color: 'var(--sepia)' }}>
            {memory.memo}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 slow-fade" style={{ animationDelay: '800ms' }}>
          <img src={memory.avatar} alt="" className="w-6 h-6 rounded-full" style={{ filter: 'sepia(0.2)' }}/>
          <p className="text-[13px]" style={{ color: 'var(--sepia-soft)' }}>
            <span className="serif-kr" style={{ color: 'var(--sepia)' }}>{memory.friendName}</span>이가 남긴 추억
          </p>
        </div>
      </div>

      {/* Music player */}
      <div className="relative z-10 mt-auto mx-5 mb-3 rounded-2xl p-3.5 flex items-center gap-3 slow-fade"
           style={{ background: 'rgba(255,253,247,0.72)', backdropFilter: 'blur(8px)',
                    boxShadow: '0 8px 24px -10px rgba(61,46,31,0.25)', animationDelay: '1000ms' }}>
        <div className="relative flex-shrink-0">
          <img src={memory.music.album} alt="" className="w-14 h-14 rounded-xl object-cover"
               style={{ filter: 'sepia(0.25) saturate(0.85)' }}/>
          <button onClick={() => setPlaying(p => !p)}
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(61,46,31,0.35)', color: 'var(--paper)' }}>
            {playing ? <Ico.pause width="18" height="18"/> : <Ico.play width="18" height="18"/>}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--sepia)' }}>{memory.music.title}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--sepia-mute)' }}>
            {memory.music.artist} · {memory.friendName}이가 듣던 음악
          </p>
          <div className="flex items-end h-5 mt-1.5">
            {[...Array(13)].map((_, i) => (
              <span key={i} className="wave-bar" style={{
                animationDelay: `${i * 80}ms`,
                animationPlayState: playing ? 'running' : 'paused',
                height: playing ? undefined : 4,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 px-5 pb-6 slow-fade" style={{ animationDelay: '1200ms' }}>
        {accepted ? (
          <div className="py-3.5 rounded-full text-center text-[13px]"
               style={{ background: 'rgba(255,253,247,0.7)', color: 'var(--sepia-mute)',
                        border: '1px solid rgba(61,46,31,0.12)' }}>
            함께한 추억으로 저장됐어요 ✓
          </div>
        ) : declined ? (
          <div className="py-3.5 rounded-full text-center text-[13px]"
               style={{ background: 'rgba(255,253,247,0.7)', color: 'var(--sepia-mute)',
                        border: '1px solid rgba(61,46,31,0.12)' }}>
            나중에 다시 볼 수 있어요
          </div>
        ) : (
          <div className="flex gap-2.5">
            <button
              onClick={() => setDeclined(true)}
              className="tappable flex-1 py-3.5 rounded-full text-[13.5px] font-medium"
              style={{ background: 'var(--paper)', color: 'var(--sepia)', border: '1px solid rgba(61,46,31,0.15)' }}>
              나중에 결정할게요
            </button>
            <button
              onClick={() => setAccepted(true)}
              className="tappable flex-1 py-3.5 rounded-full text-[13.5px] font-semibold"
              style={{ background: 'var(--terra)', color: 'var(--paper)',
                       boxShadow: '0 6px 16px -6px rgba(212,130,74,0.6)' }}>
              맞아, 우리 그랬었지
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
