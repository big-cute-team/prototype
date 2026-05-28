import { Ico } from '../components/Icons'
import { NEARBY_MEMORIES } from '../data/mock'
import { formatDate } from '../utils/date'

function DistanceBadge({ distance }) {
  const color = distance < 300 ? 'var(--terra)' : distance < 700 ? 'var(--sepia-soft)' : 'var(--sepia-mute)'
  return (
    <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
      {distance}m
    </span>
  )
}

function TypeBadge({ type, friendName }) {
  if (type === 'mine') return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(212,130,74,0.12)', color: 'var(--terra-deep)' }}>나의 추억</span>
  )
  if (type === 'friend') return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(61,46,31,0.08)', color: 'var(--sepia-soft)' }}>{friendName}</span>
  )
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(61,46,31,0.06)', color: 'var(--sepia-mute)' }}>발견된 추억</span>
  )
}

export default function NearbyMemories({ go, goBack }) {
  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-3 flex-shrink-0">
        <button onClick={goBack} className="tappable w-9 h-9 flex items-center justify-center"
                style={{ color: 'var(--sepia)' }}>
          <Ico.back width="22" height="22"/>
        </button>
        <div>
          <p className="serif-kr text-[16px] font-bold" style={{ color: 'var(--sepia)' }}>내 근처 추억</p>
          <p className="text-[11px]" style={{ color: 'var(--sepia-mute)' }}>현재 위치 반경 1km 이내</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
             style={{ background: 'rgba(59,111,179,0.1)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: '#3b6fb3' }}/>
          <span className="text-[11px]" style={{ color: '#3b6fb3' }}>현재 위치</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-3 pb-8">
        {NEARBY_MEMORIES.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => item.locationId && go('locationDetail', { locationId: item.locationId })}
            className="tappable w-full text-left rounded-2xl overflow-hidden"
            style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.07)',
                     opacity: item.locationId ? 1 : 0.85 }}
          >
            <div className="flex gap-3 p-3.5">
              {/* Distance indicator */}
              <div className="flex flex-col items-center pt-0.5 flex-shrink-0" style={{ width: 36 }}>
                <DistanceBadge distance={item.distance}/>
                {idx < NEARBY_MEMORIES.length - 1 && (
                  <div className="flex-1 mt-1.5 w-px" style={{ background: 'rgba(61,46,31,0.1)', minHeight: 20 }}/>
                )}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden" style={{ background: '#d9cdb8' }}>
                <img src={item.photo} alt="" className="w-full h-full object-cover"
                     style={{ filter: 'sepia(0.3) saturate(0.85) contrast(0.95)' }}/>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--sepia)' }}>
                    {item.district} · {item.locationName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TypeBadge type={item.type} friendName={item.friendName}/>
                  <span className="text-[10.5px]" style={{ color: 'var(--sepia-mute)' }}>
                    {formatDate(item.date)}
                  </span>
                </div>
                <p className="text-[12px] leading-snug"
                   style={{ color: 'var(--sepia-soft)', display: '-webkit-box',
                            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{item.memo}"
                </p>
              </div>

              {item.locationId && (
                <Ico.back width="16" height="16" className="flex-shrink-0 mt-1 rotate-180"
                          style={{ color: 'var(--sepia-mute)' }}/>
              )}
            </div>
          </button>
        ))}

        {/* Empty area hint */}
        <div className="text-center pt-4 pb-2">
          <p className="text-[11.5px]" style={{ color: 'var(--sepia-mute)' }}>
            반경 1km 이내의 추억 {NEARBY_MEMORIES.length}개
          </p>
        </div>
      </div>
    </div>
  )
}
