import { useState } from 'react'
import Polaroid from '../components/Polaroid'
import { Ico } from '../components/Icons'
import { IMG } from '../data/mock'

function Field({ children }) {
  return (
    <div className="mt-3 rounded-xl px-4 py-3" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.06)' }}>
      {children}
    </div>
  )
}

function MiniMap() {
  return (
    <div className="w-12 h-12 rounded-md overflow-hidden relative" style={{ background: '#e8d9bd' }}>
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <path d="M 0 30 Q 16 25 32 28 T 48 26" stroke="#a8c3c9" strokeWidth="4" fill="none"/>
        <path d="M 0 10 L 48 14 M 8 0 L 12 48 M 30 0 L 34 48" stroke="#cdb893" strokeWidth="0.6" fill="none"/>
      </svg>
      <Ico.pin width="14" height="14" className="absolute top-1/2 left-1/2" style={{ transform: 'translate(-50%, -60%)', color: 'var(--terra)' }}/>
    </div>
  )
}

export default function Capture({ go, goBack, goRoot }) {
  const [memo, setMemo] = useState('')
  const [visibility, setVisibility] = useState('friends')
  const [tags] = useState(['민지', '준호'])

  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      <div className="flex items-center justify-between px-5 pt-2 pb-2">
        <button onClick={goBack} className="tappable w-9 h-9 flex items-center justify-center" style={{ color: 'var(--sepia)' }}>
          <Ico.close width="22" height="22"/>
        </button>
        <p className="serif-kr text-[16px]" style={{ color: 'var(--sepia)' }}>추억 박제하기</p>
        <div className="w-9"/>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">
        <div className="flex justify-center pt-2 pb-4">
          <Polaroid src={IMG.cafe} rotate={-2.5} w={220} h={250} />
        </div>

        <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px rgba(61,46,31,0.06)' }}>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="이 순간을 한 줄로..."
            rows={2}
            className="w-full resize-none bg-transparent outline-none serif-kr text-[15px] leading-[1.6] placeholder:opacity-50"
            style={{ color: 'var(--sepia)' }}
          />
        </div>

        <Field>
          <div className="flex items-center gap-3">
            <span className="text-[16px]">📍</span>
            <div className="flex-1">
              <p className="text-[14px] font-medium" style={{ color: 'var(--sepia)' }}>성수동 · 어니언 카페</p>
              <p className="text-[11.5px]" style={{ color: 'var(--sepia-mute)' }}>서울 성동구 아차산로9길 8</p>
            </div>
            <MiniMap />
          </div>
        </Field>

        <Field>
          <div className="flex items-center gap-3">
            <span className="text-[16px]">📅</span>
            <p className="text-[14px]" style={{ color: 'var(--sepia)' }}>2024년 3월 15일 · 금요일 오후 3:42</p>
          </div>
        </Field>

        <Field>
          <div className="flex items-center gap-3">
            <span className="text-[16px]">🎵</span>
            <img src={IMG.album1} alt="" className="w-11 h-11 rounded-md object-cover" style={{ filter: 'sepia(0.2) saturate(0.9)' }}/>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium truncate" style={{ color: 'var(--sepia)' }}>Blue in Green</p>
              <p className="text-[11.5px]" style={{ color: 'var(--sepia-mute)' }}>Miles Davis · Kind of Blue</p>
            </div>
            <button className="text-[11px] px-2.5 py-1 rounded-full" style={{ color: 'var(--terra)', border: '1px solid var(--terra)' }}>변경</button>
          </div>
        </Field>

        <Field>
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[12px] pt-1" style={{ color: 'var(--sepia-soft)' }}>함께한 사람</span>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: 'var(--cream-deep)', color: 'var(--sepia)' }}>
                  @{t}
                </span>
              ))}
              <button className="text-[12px] w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px dashed var(--sepia-mute)', color: 'var(--sepia-mute)' }}>+</button>
            </div>
          </div>
          {tags.length > 0 && (
            <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: 'var(--sepia-mute)' }}>
              @{tags[0]}를 태그하면 {tags[0]}에게 '함께한 추억' 수락 요청이 가요. 수락하면 {tags[0]}의 지도에도 이 추억이 추가돼요.
            </p>
          )}
        </Field>

        <div className="mt-4">
          <p className="text-[12px] mb-2 px-1" style={{ color: 'var(--sepia-soft)' }}>공개 범위</p>
          <div className="flex gap-1.5 p-1 rounded-full mb-2" style={{ background: 'var(--paper)' }}>
            {[
              ['only', '나만 보기'],
              ['friends', '친구 공개'],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setVisibility(k)}
                className="tappable flex-1 text-[12px] py-2 rounded-full font-medium transition-colors"
                style={{
                  background: visibility === k ? 'var(--terra)' : 'transparent',
                  color: visibility === k ? 'var(--paper)' : 'var(--sepia-soft)',
                }}>
                {l}
              </button>
            ))}
          </div>
          <p className="text-[11px] px-1 leading-relaxed" style={{ color: 'var(--sepia-mute)' }}>
            {visibility === 'only'
              ? '나만 볼 수 있어요. 내 지도에만 표시됩니다.'
              : '친구들이 이 장소 근처에 있을 때 발자국 탭에 노출돼요.'}
          </p>
        </div>
      </div>

      <div className="px-6 pt-2 pb-6" style={{ background: 'linear-gradient(180deg, transparent, var(--cream) 40%)' }}>
        <button onClick={() => goRoot('home')} className="tappable w-full py-4 rounded-full text-[15.5px] font-semibold"
          style={{ background: 'var(--terra)', color: 'var(--paper)', boxShadow: '0 8px 20px -8px rgba(212,130,74,0.6)' }}>
          이 장소에 박제하기
        </button>
      </div>
    </div>
  )
}
