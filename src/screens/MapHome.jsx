import { useState } from 'react'
import { Ico } from '../components/Icons'
import BottomTabBar from '../components/BottomTabBar'
import { LOCATIONS, FRIEND_FEED } from '../data/mock'

function MemoryPin({ location, onTap }) {
  const { top, left } = location.mapPos
  const thumb = location.myMemories[0].photo
  const totalCount = location.myMemories.length
  const sharedMemories = location.friendMemories.filter(f => f.status === 'accepted')

  return (
    <button
      onClick={onTap}
      className="absolute -translate-x-1/2 -translate-y-full tappable"
      style={{ top, left }}
    >
      <div className="relative">
        <div className="w-10 h-10 p-[3px] rounded-[7px] rotate-[-5deg]"
             style={{ background: 'var(--paper)', boxShadow: '0 4px 10px -2px rgba(61,46,31,0.35)' }}>
          <img src={thumb} alt="" className="w-full h-full object-cover rounded-[4px]"
               style={{ filter: 'sepia(0.3) saturate(0.85) contrast(0.95)' }}/>
        </div>
        {totalCount > 1 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--sepia)', color: 'var(--paper)' }}>
            {totalCount}
          </span>
        )}
        {sharedMemories.length > 0 && (
          <div className="absolute -bottom-0.5 -right-2 flex">
            {sharedMemories.slice(0, 2).map((m, i) => (
              <img key={m.id} src={m.avatar} alt="" className="w-4 h-4 rounded-full border"
                   style={{ marginLeft: i > 0 ? -4 : 0, borderColor: 'var(--paper)',
                            filter: 'sepia(0.15)', zIndex: i }}/>
            ))}
          </div>
        )}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
             style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                      borderTop: '8px solid var(--terra)' }}/>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
             style={{ background: 'var(--terra)' }}/>
      </div>
    </button>
  )
}

function FriendMemoryPin({ post, feedIndex, onTap, animDelay }) {
  const { top, left } = post.mapPos

  return (
    <button
      onClick={onTap}
      className="absolute -translate-x-1/2 -translate-y-full tappable friend-pin-enter"
      style={{ top, left, animationDelay: `${animDelay}ms` }}
    >
      <div className="relative">
        <div className="w-9 h-9 p-[3px] rounded-[7px] rotate-[3deg]"
             style={{ background: 'var(--paper)',
                      boxShadow: '0 4px 10px -2px rgba(61,46,31,0.3)',
                      border: '1.5px solid rgba(61,46,31,0.15)' }}>
          <img src={post.photo} alt="" className="w-full h-full object-cover rounded-[4px]"
               style={{ filter: 'sepia(0.4) saturate(0.7) contrast(0.9)' }}/>
        </div>
        {/* Friend avatar overlay */}
        <img src={post.avatar} alt="" className="absolute -bottom-1 -left-1.5 w-4 h-4 rounded-full border"
             style={{ borderColor: 'var(--paper)', filter: 'sepia(0.15)' }}/>
        {/* Pin triangle — sepia color */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
             style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
                      borderTop: '7px solid var(--sepia-mute)' }}/>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
             style={{ background: 'var(--sepia-mute)' }}/>
      </div>
    </button>
  )
}

export default function MapHome({ go, goRoot }) {
  const [showFriendPins, setShowFriendPins] = useState(false)
  const nearbyCount = FRIEND_FEED.length

  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3 z-20 relative flex-shrink-0">
        <p className="serif-kr text-[22px] font-bold" style={{ color: 'var(--terra)' }}>여기서</p>
        <button onClick={() => go('nearby')}
                className="tappable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(255,253,247,0.85)', color: 'var(--sepia)',
                         boxShadow: '0 2px 8px -3px rgba(61,46,31,0.2)',
                         border: '1px solid rgba(61,46,31,0.1)' }}>
          <Ico.compass width="14" height="14" style={{ color: 'var(--terra)' }}/>
          내 근처
        </button>
      </div>

      {/* Map */}
      <div className="relative flex-1 mx-4 mb-2 rounded-2xl overflow-hidden grain"
           style={{ background: '#e8d9bd', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.08)' }}>
        <div className="absolute inset-0 vintage-map"/>

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 600"
             preserveAspectRatio="xMidYMid slice">
          <path d="M -20 380 Q 80 340 160 360 T 380 320" stroke="#a8c3c9" strokeWidth="22" fill="none" opacity="0.7"/>
          <path d="M -20 380 Q 80 340 160 360 T 380 320" stroke="#bcd2d8" strokeWidth="14" fill="none" opacity="0.9"/>
          <g stroke="#cdb893" strokeWidth="2" fill="none" opacity="0.7">
            <path d="M 0 120 L 360 140"/><path d="M 60 0 L 80 600"/>
            <path d="M 200 0 Q 220 200 200 400 T 240 600"/>
            <path d="M 0 240 Q 120 250 220 220 T 360 230"/>
            <path d="M 0 500 L 360 500"/><path d="M 280 0 L 300 600"/>
          </g>
          <g stroke="#b89a6d" strokeWidth="0.8" fill="none" opacity="0.4">
            <path d="M 30 60 L 360 80"/><path d="M 0 180 L 360 200"/>
            <path d="M 0 300 L 360 290"/><path d="M 0 460 L 360 470"/>
            <path d="M 140 0 L 160 600"/><path d="M 330 0 L 340 600"/>
          </g>
          <g fill="#c8d3a8" opacity="0.55">
            <ellipse cx="120" cy="100" rx="55" ry="32"/>
            <ellipse cx="290" cy="450" rx="48" ry="38"/>
          </g>
        </svg>

        <div className="absolute hand text-[12px]" style={{ top: 30, left: 32, color: 'var(--sepia-mute)' }}>성수</div>
        <div className="absolute hand text-[12px]" style={{ top: 120, right: 28, color: 'var(--sepia-mute)' }}>한남</div>
        <div className="absolute hand text-[12px]" style={{ top: 380, left: 50, color: 'var(--sepia-mute)' }}>망원</div>
        <div className="absolute hand text-[11px]" style={{ top: 220, left: '52%', color: '#6b8a90' }}>한강</div>

        {/* My memory pins */}
        {LOCATIONS.map(loc => (
          <MemoryPin key={loc.id} location={loc}
                     onTap={() => go('locationDetail', { locationId: loc.id })}/>
        ))}

        {/* Friend memory pins (overlay when toggled) */}
        {showFriendPins && FRIEND_FEED.map((post, i) => (
          <FriendMemoryPin
            key={post.id}
            post={post}
            feedIndex={i}
            animDelay={i * 100}
            onTap={() => goRoot('feed', { startIdx: i })}
          />
        ))}

        {/* Current location dot */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: '70%', left: '36%' }}>
          <div className="w-3 h-3 rounded-full"
               style={{ background: '#3b6fb3',
                        boxShadow: '0 0 0 4px rgba(59,111,179,0.25), 0 0 0 1.5px white' }}/>
        </div>

        {/* Bottom legend + toggle banner */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full text-[10.5px]"
               style={{ background: 'rgba(255,253,247,0.85)', color: 'var(--sepia-soft)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--terra)' }}/>내 추억
            </span>
            {showFriendPins && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--sepia-mute)' }}/>친구 순간
              </span>
            )}
          </div>

          {/* Friend pin toggle banner */}
          {!showFriendPins ? (
            <button
              onClick={() => setShowFriendPins(true)}
              className="tappable banner-breathe flex items-center gap-2 rounded-full font-semibold relative"
              style={{
                background: '#C4722A',
                color: 'var(--paper)',
                fontSize: 11,
                paddingLeft: 10, paddingRight: 14,
                paddingTop: 7, paddingBottom: 7,
              }}>
              {/* Overlapping friend avatars */}
              <div className="flex items-center flex-shrink-0" style={{ marginRight: 2 }}>
                <img src={FRIEND_FEED[0].avatar} alt=""
                     style={{ width: 28, height: 28, borderRadius: '50%',
                               border: '2px solid rgba(255,253,247,0.9)',
                               filter: 'sepia(0.15)', flexShrink: 0 }}/>
                <img src={FRIEND_FEED[1].avatar} alt=""
                     style={{ width: 28, height: 28, borderRadius: '50%',
                               border: '2px solid rgba(255,253,247,0.9)',
                               filter: 'sepia(0.15)', flexShrink: 0,
                               marginLeft: -8 }}/>
              </div>
              {/* Ping dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: 'rgba(255,253,247,0.7)' }}/>
                <span className="relative inline-flex rounded-full h-2 w-2"
                      style={{ background: 'var(--paper)' }}/>
              </span>
              근처 친구 순간 {nearbyCount}개
            </button>
          ) : (
            <button
              onClick={() => setShowFriendPins(false)}
              className="tappable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-medium"
              style={{
                background: 'rgba(61,46,31,0.75)',
                color: 'var(--paper)',
                boxShadow: '0 4px 12px -4px rgba(61,46,31,0.4)',
              }}>
              <Ico.steps width="12" height="12"/>
              친구 순간 보는 중 ✕
            </button>
          )}
        </div>
      </div>

      <BottomTabBar active="home" go={go} goRoot={goRoot}/>
    </div>
  )
}
