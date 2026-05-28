import { useState } from 'react'
import Polaroid from '../components/Polaroid'
import { Ico } from '../components/Icons'
import { LOCATIONS } from '../data/mock'
import { formatDate, formatDateFull } from '../utils/date'

function MemoryCard({ mem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="tappable w-full text-left rounded-2xl overflow-hidden"
      style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.07)' }}
    >
      {/* Date header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5"
           style={{ borderBottom: '1px solid rgba(61,46,31,0.06)' }}>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--terra)' }}/>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--sepia)' }}>
          {formatDateFull(mem.date)}
        </p>
        {mem.type === 'shared' && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(212,130,74,0.1)', color: 'var(--terra-deep)' }}>
            @{mem.sharedWith}와 함께
          </span>
        )}
        {mem.type !== 'shared' && (
          <Ico.back width="14" height="14" className="ml-auto flex-shrink-0"
                    style={{ color: 'var(--sepia-mute)', transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)',
                             transition: 'transform 200ms ease' }}/>
        )}
      </div>

      {/* Content row */}
      <div className="flex gap-3 px-4 py-3">
        {/* Film-style photo */}
        <div className="flex-shrink-0"
             style={{ background: '#f5f0e8', padding: '4px',
                      borderRadius: 2, boxShadow: '0 2px 8px -3px rgba(61,46,31,0.25)',
                      transform: `rotate(${mem.type === 'shared' ? '1.5' : '-2'}deg)`, width: 76 }}>
          <div className="overflow-hidden" style={{ width: 68, height: 72, background: '#d9cdb8' }}>
            <img src={mem.photo} alt="" className="w-full h-full object-cover"
                 style={{ filter: 'sepia(0.3) saturate(0.85) contrast(0.95)' }}/>
          </div>
        </div>

        {/* Text info */}
        <div className="flex-1 min-w-0 py-0.5">
          {mem.type === 'shared' && mem.avatar && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <img src={mem.avatar} alt="" className="w-5 h-5 rounded-full" style={{ filter: 'sepia(0.15)' }}/>
              <p className="text-[11px]" style={{ color: 'var(--sepia-mute)' }}>
                {mem.friendName}이가 남긴 추억
              </p>
            </div>
          )}
          <p className="serif-kr text-[13px] leading-[1.7]"
             style={{ color: 'var(--sepia)',
                      display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {mem.memo}
          </p>

          {/* Music */}
          <div className="flex items-center gap-1.5 mt-2">
            <img src={mem.music.album} alt="" className="w-5 h-5 rounded flex-shrink-0 object-cover"
                 style={{ filter: 'sepia(0.2)' }}/>
            <p className="text-[11px] truncate" style={{ color: 'var(--sepia-mute)' }}>
              {mem.music.title} · {mem.music.artist}
            </p>
          </div>

          {/* With tags (mine only) */}
          {mem.type === 'mine' && mem.with?.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {mem.with.map(name => (
                <span key={name} className="text-[10.5px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--cream-deep)', color: 'var(--sepia-soft)' }}>
                  @{name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded: full photo */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 flex justify-center"
             style={{ borderTop: '1px solid rgba(61,46,31,0.06)' }}>
          <Polaroid src={mem.photo} rotate={-2} w={220} h={246}/>
        </div>
      )}
    </button>
  )
}

export default function LocationDetail({ params, go, goBack }) {
  const location = LOCATIONS.find(l => l.id === params.locationId)

  if (!location) return null

  const allMemories = [
    ...location.myMemories.map(m => ({ ...m, type: 'mine' })),
    ...location.friendMemories
      .filter(f => f.status === 'accepted')
      .map(f => ({ ...f, type: 'shared', sharedWith: f.friendName })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-3 flex-shrink-0">
        <button onClick={goBack} className="tappable w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{ color: 'var(--sepia)' }}>
          <Ico.back width="22" height="22"/>
        </button>
        <div className="flex-1 min-w-0">
          <p className="serif-kr text-[16px] font-bold leading-tight truncate" style={{ color: 'var(--sepia)' }}>
            {location.name}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--sepia-mute)' }}>
            {location.district} · {location.address}
          </p>
        </div>
        <button
          onClick={() => go('capture')}
          className="tappable flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px]"
          style={{ background: 'var(--terra)', color: 'var(--paper)' }}>
          <Ico.plus width="14" height="14"/>
          박제
        </button>
      </div>

      {/* Memory count */}
      <div className="flex items-center gap-2 px-5 mb-3 flex-shrink-0">
        <p className="text-[11.5px]" style={{ color: 'var(--sepia-mute)' }}>
          {allMemories.length}개의 추억 · 최신순
        </p>
        {allMemories.filter(m => m.type === 'shared').length > 0 && (
          <span className="text-[10.5px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(212,130,74,0.1)', color: 'var(--terra-deep)' }}>
            함께한 추억 {allMemories.filter(m => m.type === 'shared').length}개 포함
          </span>
        )}
      </div>

      {/* Unified memory list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-3 pb-8">
        {allMemories.map(mem => (
          <MemoryCard key={mem.id} mem={mem}/>
        ))}
        {allMemories.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <p className="text-[38px] mb-4">📷</p>
            <p className="serif-kr text-[15px]" style={{ color: 'var(--sepia-soft)' }}>
              아직 이곳의 추억이 없어요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
