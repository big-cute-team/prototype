import { useState } from 'react'
import Polaroid from '../components/Polaroid'
import { Ico } from '../components/Icons'
import { IMG } from '../data/mock'

export default function Discover({ goBack }) {
  const [playing, setPlaying] = useState(true)

  return (
    <div className="page-enter relative h-full flex flex-col overflow-hidden" style={{ background: '#F0E6D4' }}>
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 20%, #F8EAD3, #ECDDC2 60%, #DDCBA8 100%)'
      }}/>
      <div className="absolute inset-0 grain"/>

      <div className="relative z-10 flex justify-end px-5 pt-2">
        <button onClick={goBack} className="tappable w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,253,247,0.55)', color: 'var(--sepia)' }}>
          <Ico.close width="20" height="20"/>
        </button>
      </div>

      <div className="relative z-10 text-center px-8 pt-4">
        <p className="serif-en text-[14px] tracking-[0.2em] slow-fade" style={{ color: 'var(--terra)', animationDelay: '100ms' }}>
          a memory found here
        </p>
        <h2 className="serif-kr font-bold mt-2 leading-[1.3] slow-fade" style={{ fontSize: 22, color: 'var(--sepia)', animationDelay: '350ms' }}>
          이곳에서 발견된 추억
        </h2>
        <p className="mt-2 text-[12.5px] slow-fade" style={{ color: 'var(--sepia-soft)', animationDelay: '650ms' }}>
          2년 전 봄, 같은 자리에서
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center mt-6 px-6">
        <div className="slow-fade" style={{ animationDelay: '900ms' }}>
          <Polaroid src={IMG.rain} rotate={-3} w={236} h={262} faded />
          <p className="hand text-center -mt-7 relative ink" style={{ fontSize: 17, color: 'var(--sepia)' }}>
            오늘 비 와서 그런가 더 좋다
          </p>
        </div>

        <div className="flex items-center gap-2 mt-5 slow-fade" style={{ animationDelay: '1200ms' }}>
          <img src={IMG.pf1} alt="" className="w-6 h-6 rounded-full" style={{ filter: 'sepia(0.2)' }}/>
          <p className="text-[13px]" style={{ color: 'var(--sepia-soft)' }}>
            <span className="serif-kr" style={{ color: 'var(--sepia)' }}>지원</span>이가 남긴 추억
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-auto mx-5 mb-3 rounded-2xl p-3.5 slow-fade flex items-center gap-3"
           style={{ background: 'rgba(255,253,247,0.7)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px -10px rgba(61,46,31,0.25)', animationDelay: '1500ms' }}>
        <div className="relative">
          <img src={IMG.album2} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ filter: 'sepia(0.25) saturate(0.85)' }}/>
          <button onClick={() => setPlaying(p => !p)} className="absolute inset-0 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(61,46,31,0.35)', color: 'var(--paper)' }}>
            {playing ? <Ico.pause width="20" height="20"/> : <Ico.play width="20" height="20"/>}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium truncate" style={{ color: 'var(--sepia)' }}>비도 오고 그래서</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--sepia-mute)' }}>헤이즈 · 지원이가 이 자리에서 듣던 음악</p>
          <div className="flex items-end h-6 mt-1.5">
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
              <span key={i} className="wave-bar" style={{
                animationDelay: `${i * 80}ms`,
                animationPlayState: playing ? 'running' : 'paused',
                height: playing ? undefined : 4,
              }}/>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pb-6 flex gap-2.5 slow-fade" style={{ animationDelay: '1700ms' }}>
        <button className="tappable flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 text-[13.5px] font-medium"
          style={{ background: 'var(--paper)', color: 'var(--sepia)', border: '1px solid rgba(61,46,31,0.15)' }}>
          <Ico.heart width="16" height="16" style={{ color: 'var(--terra)' }}/>
          마음 남기기
        </button>
        <button className="tappable flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 text-[13.5px] font-medium"
          style={{ background: 'var(--terra)', color: 'var(--paper)' }}>
          <Ico.reply width="16" height="16"/>
          지원에게 답장
        </button>
      </div>
    </div>
  )
}
