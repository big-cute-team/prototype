import { useState, useRef } from 'react'
import { Ico } from '../components/Icons'
import BottomTabBar from '../components/BottomTabBar'
import { FRIEND_FEED } from '../data/mock'
import { formatDate } from '../utils/date'

function distLabel(d) {
  return d < 1000 ? `${d}m` : `${(d / 1000).toFixed(1)}km`
}

function CardContent({ post }) {
  return (
    <div className="relative h-full w-full flex flex-col justify-center px-5 grain"
         style={{ background: 'radial-gradient(ellipse at 50% 20%, #F8EAD3, #ECDDC2 60%, #DDCBA8 100%)' }}>

      {/* Film photo — large, profile overlaid on top */}
      <div style={{ background: '#f5f0e8', padding: 6, borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(61,46,31,0.2)', transform: 'rotate(-0.5deg)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1.05',
                      background: '#d9cdb8', overflow: 'hidden' }}>
          <img src={post.photo} alt=""
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        filter: 'sepia(0.25) saturate(0.88) contrast(0.95)' }}/>
          {/* Profile gradient overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
                        padding: '10px 12px 28px',
                        background: 'linear-gradient(180deg, rgba(20,12,6,0.62) 0%, transparent 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={post.avatar} alt=""
                   style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            border: '1.5px solid rgba(255,253,247,0.5)',
                            filter: 'sepia(0.1)' }}/>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#FFFDF7', lineHeight: 1.3 }}>
                  {post.friendName}이가 남긴 순간
                </p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,253,247,0.7)' }}>
                  {post.district} · {post.locationName} · {distLabel(post.distance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memo */}
      <p className="hand text-center mt-4 leading-[1.75] px-2"
         style={{ fontSize: 15, color: 'var(--sepia)' }}>
        {post.memo}
      </p>
      <p className="text-center text-[10.5px] mt-1.5" style={{ color: 'var(--sepia-mute)' }}>
        {formatDate(post.date)}
      </p>
    </div>
  )
}

export default function FriendFeed({ go, goRoot, params = {} }) {
  const [currentIdx, setCurrentIdx] = useState(params.startIdx ?? 0)
  const [exitIdx, setExitIdx] = useState(null)
  const [navDir, setNavDir] = useState(null)
  const [liked, setLiked] = useState({})
  const [showComments, setShowComments] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [musicOpacity, setMusicOpacity] = useState(1)
  const animatingRef = useRef(false)

  const touchStartY = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)

  const post = FRIEND_FEED[currentIdx]
  const likeCount = liked[post.id] ? post.likeCount + 1 : post.likeCount

  function navigate(dir) {
    if (animatingRef.current) return
    const next = currentIdx + (dir === 'up' ? 1 : -1)
    if (next < 0 || next >= FRIEND_FEED.length) return

    animatingRef.current = true
    setMusicOpacity(0)
    setExitIdx(currentIdx)
    setNavDir(dir)
    setCurrentIdx(next)

    setTimeout(() => {
      setExitIdx(null)
      setNavDir(null)
      setMusicOpacity(1)
      animatingRef.current = false
    }, 420)
  }

  function onTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchMove(e) {
    if (touchStartY.current === null || animatingRef.current) return
    setDragOffset(e.touches[0].clientY - touchStartY.current)
  }
  function onTouchEnd() {
    if (Math.abs(dragOffset) > 60) {
      navigate(dragOffset < 0 ? 'up' : 'down')
    }
    setDragOffset(0)
    touchStartY.current = null
  }

  return (
    <div className="page-enter h-full flex flex-col"
         style={{ background: '#ECDDC2' }}>

      {/* Top label */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-5 pt-3 pb-1">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b6fb3' }}/>
        <p className="text-[11px]" style={{ color: '#3b6fb3' }}>근처의 순간들</p>
      </div>

      {/* Swipeable card area */}
      <div className="relative flex-1 overflow-hidden"
           onTouchStart={onTouchStart}
           onTouchMove={onTouchMove}
           onTouchEnd={onTouchEnd}>

        {/* Exit card */}
        {exitIdx !== null && (
          <div key={`exit-${exitIdx}`}
               className={`absolute inset-0 ${navDir === 'up' ? 'reel-exit-up' : 'reel-exit-down'}`}>
            <CardContent post={FRIEND_FEED[exitIdx]}/>
          </div>
        )}

        {/* Current card */}
        <div key={`curr-${currentIdx}`}
             className={`absolute inset-0 ${navDir !== null ? (navDir === 'up' ? 'reel-enter-up' : 'reel-enter-down') : ''}`}
             style={dragOffset !== 0 && navDir === null
               ? { transform: `translateY(${dragOffset * 0.3}px)` }
               : undefined}>
          <CardContent post={post}/>
        </div>
      </div>

      {/* Music player — fixed below card area */}
      <div className="flex-shrink-0 mx-4 mb-2"
           style={{ opacity: musicOpacity, transition: 'opacity 0.4s ease' }}>
        <div className="px-3 py-2.5 rounded-2xl flex items-center gap-3"
             style={{ background: 'rgba(255,253,247,0.82)', backdropFilter: 'blur(8px)',
                      boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.08)' }}>
          <img src={post.music.album} alt=""
               className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
               style={{ filter: 'sepia(0.2)' }}/>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--sepia)' }}>
              {post.music.title}
            </p>
            <p className="text-[10.5px] truncate" style={{ color: 'var(--sepia-mute)' }}>
              {post.music.artist}
            </p>
          </div>
          <div className="flex items-end h-5 gap-[2px]">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="wave-bar"
                    style={{ animationDelay: `${i * 90}ms`, background: 'var(--terra)',
                             animationPlayState: playing ? 'running' : 'paused' }}/>
            ))}
          </div>
          <button onClick={() => setPlaying(p => !p)} className="tappable ml-1"
                  style={{ color: 'var(--sepia-soft)' }}>
            {playing ? <Ico.pause width="18" height="18"/> : <Ico.play width="18" height="18"/>}
          </button>
        </div>
      </div>

      {/* Interactions + comment preview */}
      <div className="flex-shrink-0 px-5 pb-2 flex items-center gap-4">
        <button onClick={() => setLiked(l => ({ ...l, [post.id]: !l[post.id] }))}
                className="tappable flex items-center gap-1.5">
          <Ico.heart width="22" height="22"
                     style={{ fill: liked[post.id] ? '#e87c6b' : 'none',
                              stroke: liked[post.id] ? '#e87c6b' : 'var(--sepia-soft)',
                              color: liked[post.id] ? '#e87c6b' : 'var(--sepia-soft)' }}/>
          <span className="text-[13px]" style={{ color: 'var(--sepia-soft)' }}>{likeCount}</span>
        </button>

        <button onClick={() => setShowComments(v => !v)}
                className="tappable flex items-center gap-1.5">
          <Ico.chat width="21" height="21" style={{ color: 'var(--sepia-soft)' }}/>
          <span className="text-[13px]" style={{ color: 'var(--sepia-soft)' }}>
            {post.comments?.length || 0}
          </span>
        </button>

        <button className="tappable">
          <Ico.send width="20" height="20" style={{ color: 'var(--sepia-soft)' }}/>
        </button>

        {/* Comment preview — one line */}
        {post.comments?.length > 0 && (
          <button onClick={() => setShowComments(true)}
                  className="tappable flex-1 min-w-0 text-left">
            <p className="text-[11.5px] truncate" style={{ color: 'var(--sepia-mute)' }}>
              <span style={{ color: 'var(--sepia)', fontWeight: 600 }}>
                {post.comments[0].user}
              </span>
              {' '}{post.comments[0].text}
            </p>
          </button>
        )}
      </div>

      <BottomTabBar active="feed" go={go} goRoot={goRoot}/>

      {/* Comment sheet */}
      {showComments && (
        <>
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }}
               onClick={() => setShowComments(false)}/>
          <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl pt-1 pb-24"
               style={{ background: 'var(--paper)', boxShadow: '0 -4px 24px rgba(61,46,31,0.15)' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-3"
                 style={{ background: 'rgba(61,46,31,0.15)' }}/>
            <p className="text-[13px] font-semibold px-5 mb-3" style={{ color: 'var(--sepia)' }}>댓글</p>
            {post.comments?.length > 0 ? (
              <div className="space-y-3 px-5">
                {post.comments.map((c, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px]"
                         style={{ background: 'var(--cream-deep)', color: 'var(--sepia)' }}>
                      {c.user[0]}
                    </div>
                    <div>
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--sepia)' }}>
                        {c.user}
                      </span>
                      <span className="text-[12px] ml-1.5" style={{ color: 'var(--sepia-soft)' }}>
                        {c.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[13px] py-6" style={{ color: 'var(--sepia-mute)' }}>
                첫 댓글을 남겨보세요
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
