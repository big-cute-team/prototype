import Polaroid from '../components/Polaroid'
import { IMG } from '../data/mock'

export default function Onboarding({ go, goRoot }) {
  return (
    <div className="page-enter relative h-full flex flex-col" style={{ background: 'var(--cream)' }}>
      <div className="relative grain" style={{ height: '62%', overflow: 'hidden' }}>
        <div className="absolute inset-0 vintage-map" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 393 530" preserveAspectRatio="none" style={{ opacity: 0.35 }}>
          <g stroke="#9C8770" fill="none" strokeWidth="0.6">
            <path d="M-20 80 Q 100 60 200 100 T 420 90" />
            <path d="M-20 140 Q 120 110 240 150 T 420 140" />
            <path d="M-20 220 Q 80 200 180 230 T 420 220" />
            <path d="M-20 310 Q 140 280 260 320 T 420 320" />
            <path d="M-20 400 Q 100 380 220 410 T 420 410" />
            <path d="M-20 470 Q 150 440 270 470 T 420 470" />
          </g>
          <g stroke="#D4824A" strokeDasharray="3 6" strokeWidth="1.2" fill="none" opacity="0.55">
            <path d="M 60 380 Q 130 300 200 260 T 330 130" />
          </g>
        </svg>
        <div className="absolute top-12 right-6 hand text-[13px]" style={{ color: 'var(--sepia-mute)' }}>N ↑</div>

        <div className="absolute" style={{ top: 70, left: 28 }}>
          <Polaroid src={IMG.cafe} rotate={-9} w={138} h={150} caption="봄 · 성수" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: 'var(--terra)', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }} />
        </div>
        <div className="absolute" style={{ top: 110, right: 22 }}>
          <Polaroid src={IMG.window} rotate={7} w={128} h={140} caption="비 오는 날" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: 'var(--terra)', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }} />
        </div>
        <div className="absolute" style={{ bottom: 30, left: 60 }}>
          <Polaroid src={IMG.beach} rotate={-4} w={150} h={160} caption="안목, 여름" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: 'var(--terra)', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }} />
        </div>
        <div className="absolute" style={{ bottom: 60, right: 30 }}>
          <Polaroid src={IMG.friends} rotate={11} w={120} h={132} caption="우리들" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: 'var(--terra)', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }} />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(180deg, transparent, var(--cream))' }} />
      </div>

      <div className="flex-1 flex flex-col px-8 pt-3 pb-8">
        <p className="serif-kr text-[15px] tracking-wider font-bold" style={{ color: 'var(--terra)' }}>여기서</p>
        <h1 className="serif-kr font-extrabold leading-[1.15] mt-3" style={{ fontSize: 34, color: 'var(--sepia)', letterSpacing: '-0.01em' }}>
          우연히 마주치는<br/>추억
        </h1>
        <p className="mt-5 text-[15px] leading-[1.75]" style={{ color: 'var(--sepia-soft)' }}>
          장소가 기억을 재생합니다.<br/>
          당신의 발걸음이 닿는 곳마다,<br/>
          그때의 우리가 있습니다.
        </p>
        <div className="mt-auto pt-6">
          <button
            onClick={() => goRoot('guide')}
            className="tappable w-full py-4 rounded-full text-[16px] font-semibold tracking-wide"
            style={{ background: 'var(--terra)', color: '#FFFDF7', boxShadow: '0 8px 20px -8px rgba(212,130,74,0.6)' }}
          >
            시작하기
          </button>
          <p className="text-center mt-4 text-[12px]" style={{ color: 'var(--sepia-mute)' }}>
            이미 가입했어요 &nbsp;·&nbsp; 둘러보기
          </p>
        </div>
      </div>
    </div>
  )
}
