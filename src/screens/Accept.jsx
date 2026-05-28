import { useState } from 'react'
import { Ico } from '../components/Icons'
import BottomTabBar from '../components/BottomTabBar'
import { LOCATIONS } from '../data/mock'
import { formatDate } from '../utils/date'

const pendingItems = LOCATIONS.flatMap(loc =>
  loc.friendMemories
    .filter(f => f.status === 'pending')
    .map(f => ({ ...f, locationName: loc.name, district: loc.district, locationId: loc.id }))
)

export default function Accept({ go, goBack, goRoot }) {
  const [accepted, setAccepted] = useState({})
  const [dismissed, setDismissed] = useState({})

  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
        <p className="serif-kr text-[17px] font-bold" style={{ color: 'var(--sepia)' }}>알림</p>
        {pendingItems.filter(i => !accepted[i.id] && !dismissed[i.id]).length > 0 && (
          <span className="text-[11px] px-2 py-1 rounded-full"
                style={{ background: 'rgba(212,130,74,0.12)', color: 'var(--terra-deep)' }}>
            수락 대기 {pendingItems.filter(i => !accepted[i.id] && !dismissed[i.id]).length}개
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-3 pb-4">
        {pendingItems.map(item => {
          if (dismissed[item.id]) return null

          return (
            <div key={item.id} className="rounded-2xl overflow-hidden"
                 style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.08)' }}>
              {/* Sender info */}
              <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <img src={item.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0"
                     style={{ filter: 'sepia(0.18)' }}/>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] leading-snug" style={{ color: 'var(--sepia)' }}>
                    <span className="serif-kr font-bold">{item.friendName}</span>이가
                    {' '}<span style={{ color: 'var(--terra-deep)' }}>{item.district} · {item.locationName}</span>{' '}
                    추억에 나를 태그했어요
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--sepia-mute)' }}>
                    {formatDate(item.date)}
                  </p>
                </div>
              </div>

              {/* Photo + memo */}
              <div className="flex gap-3 px-4 pb-3">
                <div style={{ background: '#f5f0e8', padding: '4px', borderRadius: 2,
                              boxShadow: '0 2px 8px -3px rgba(61,46,31,0.2)',
                              transform: 'rotate(-1.5deg)', flexShrink: 0 }}>
                  <div className="overflow-hidden" style={{ width: 80, height: 84, background: '#d9cdb8' }}>
                    <img src={item.photo} alt="" className="w-full h-full object-cover"
                         style={{ filter: 'sepia(0.28) saturate(0.85) contrast(0.95)' }}/>
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="hand text-[14.5px] leading-[1.65]" style={{ color: 'var(--sepia)' }}>
                    {item.memo}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className="mx-4 mb-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed text-center"
                   style={{ background: 'var(--cream-deep)', color: 'var(--sepia-soft)' }}>
                수락하면 이 추억이{' '}
                <span style={{ color: 'var(--terra-deep)', fontWeight: 600 }}>내 지도에 핀</span>으로 추가돼요
              </div>

              {/* Actions */}
              {accepted[item.id] ? (
                <div className="px-4 pb-4">
                  <div className="py-3 rounded-full text-center text-[13px]"
                       style={{ background: 'var(--cream-deep)', color: 'var(--sepia-mute)' }}>
                    내 지도에 추가됐어요 ✓
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => setDismissed(d => ({ ...d, [item.id]: true }))}
                    className="tappable flex-1 py-3 rounded-full text-[13px] font-medium"
                    style={{ background: 'var(--cream-deep)', color: 'var(--sepia-soft)' }}>
                    나중에
                  </button>
                  <button
                    onClick={() => setAccepted(a => ({ ...a, [item.id]: true }))}
                    className="tappable flex-[1.8] py-3 rounded-full text-[13px] font-semibold"
                    style={{ background: 'var(--terra)', color: 'var(--paper)',
                             boxShadow: '0 6px 14px -6px rgba(212,130,74,0.5)' }}>
                    수락 (내 지도에 추가)
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {pendingItems.filter(i => !accepted[i.id] && !dismissed[i.id]).length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <p className="text-[38px] mb-4">🌿</p>
            <p className="serif-kr text-[15px]" style={{ color: 'var(--sepia-soft)' }}>새 알림이 없어요</p>
          </div>
        )}
      </div>

      <BottomTabBar active="accept" go={go} goRoot={goRoot}/>
    </div>
  )
}
