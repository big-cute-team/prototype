import Polaroid from '../components/Polaroid'
import BottomTabBar from '../components/BottomTabBar'
import { LOCATIONS, IMG } from '../data/mock'
import { formatDate } from '../utils/date'

const allMyMemories = LOCATIONS
  .flatMap(loc =>
    loc.myMemories.map(m => ({
      ...m,
      locationName: loc.name,
      district: loc.district,
      locationId: loc.id,
    }))
  )
  .sort((a, b) => new Date(b.date) - new Date(a.date))

const totalLocations = LOCATIONS.length

export default function MyProfile({ go, goRoot }) {
  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Profile header */}
      <div className="px-5 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={IMG.pf2} alt="" className="w-16 h-16 rounded-full"
                 style={{ filter: 'sepia(0.15)', boxShadow: '0 0 0 3px var(--paper), 0 0 0 5px var(--terra)' }}/>
          </div>
          <div className="flex-1">
            <p className="serif-kr text-[17px] font-bold" style={{ color: 'var(--sepia)' }}>나예</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--sepia-mute)' }}>
              여기서 사용 중
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-0 mt-4 rounded-2xl overflow-hidden"
             style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.07)' }}>
          {[
            { label: '추억', value: allMyMemories.length + '개' },
            { label: '장소', value: totalLocations + '곳' },
            { label: '친구', value: '3명' },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex-1 text-center py-3"
                 style={{ borderRight: i < 2 ? '1px solid rgba(61,46,31,0.07)' : 'none' }}>
              <p className="serif-kr text-[18px] font-bold" style={{ color: 'var(--sepia)' }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--sepia-mute)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section title */}
      <div className="px-5 pb-2 flex-shrink-0">
        <p className="serif-kr text-[13px] font-bold" style={{ color: 'var(--sepia-soft)' }}>
          내 모든 추억
        </p>
      </div>

      {/* Memory grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          {allMyMemories.map(mem => (
            <button
              key={mem.id}
              onClick={() => go('locationDetail', { locationId: mem.locationId })}
              className="tappable text-left"
            >
              {/* Polaroid card */}
              <div className="rounded-xl overflow-hidden"
                   style={{ background: 'var(--paper)', padding: '7px 7px 28px 7px',
                            boxShadow: '0 2px 10px -4px rgba(61,46,31,0.2), inset 0 0 0 1px rgba(61,46,31,0.04)',
                            transform: `rotate(${mem.id.endsWith('1') ? -1.5 : mem.id.endsWith('2') ? 1 : -0.5}deg)` }}>
                <div className="w-full rounded-[3px] overflow-hidden"
                     style={{ aspectRatio: '1', background: '#d9cdb8' }}>
                  <img src={mem.photo} alt="" className="w-full h-full object-cover"
                       style={{ filter: 'sepia(0.28) saturate(0.85) contrast(0.95)' }}/>
                </div>
                <p className="hand text-center mt-1.5 text-[11px] leading-tight truncate px-1"
                   style={{ color: 'var(--sepia-soft)' }}>
                  {mem.district}
                </p>
              </div>
              {/* Info below card */}
              <div className="mt-1.5 px-1">
                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--sepia)' }}>
                  {mem.locationName}
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--sepia-mute)' }}>
                  {formatDate(mem.date)}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="h-4"/>
      </div>

      <BottomTabBar active="profile" go={go} goRoot={goRoot}/>
    </div>
  )
}
