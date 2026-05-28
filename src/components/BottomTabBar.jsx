import { Ico } from './Icons'
import { LOCATIONS } from '../data/mock'

const pendingCount = LOCATIONS.reduce(
  (n, loc) => n + loc.friendMemories.filter(f => f.status === 'pending').length, 0
)

function TabBtn({ active, label, children, onClick }) {
  return (
    <button onClick={onClick} className="tappable flex flex-col items-center gap-0.5 px-3 py-1"
            style={{ color: active ? 'var(--terra)' : 'var(--sepia-mute)' }}>
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

export default function BottomTabBar({ active, go, goRoot }) {
  return (
    <div className="px-4 pb-2 pt-1">
      <div className="flex items-center justify-around rounded-full py-2.5 px-1"
           style={{ background: 'var(--paper)', boxShadow: '0 -2px 12px -6px rgba(61,46,31,0.15)' }}>
        <TabBtn active={active === 'home'} label="지도" onClick={() => goRoot('home')}>
          <Ico.map width="21" height="21"/>
        </TabBtn>
        <TabBtn active={active === 'feed'} label="발자국" onClick={() => goRoot('feed')}>
          <Ico.steps width="20" height="20"/>
        </TabBtn>
        <button
          onClick={() => go('capture')}
          className="tappable -mt-7 w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--terra)', boxShadow: '0 10px 18px -6px rgba(212,130,74,0.6)' }}
        >
          <Ico.plus width="26" height="26" style={{ color: 'var(--paper)' }}/>
        </button>
        <TabBtn active={active === 'accept'} label="알림" onClick={() => goRoot('accept')}>
          <div className="relative">
            <Ico.bell width="21" height="21"/>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full"
                    style={{ background: '#C44A2E' }}/>
            )}
          </div>
        </TabBtn>
        <TabBtn active={active === 'profile'} label="마이" onClick={() => goRoot('profile')}>
          <Ico.user width="21" height="21"/>
        </TabBtn>
      </div>
    </div>
  )
}
