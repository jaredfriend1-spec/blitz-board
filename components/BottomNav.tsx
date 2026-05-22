"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, Trophy, DollarSign, History, Settings, Lock, X, Eye, EyeOff, ShieldAlert } from 'lucide-react'

const ADMIN_PIN = "jeff"

export default function BottomNav() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [showPin, setShowPin] = useState(false)

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('role') === 'admin')
  }, [])

  // Don't show on the landing page itself
  if (pathname === '/') return null

  const submitPin = () => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('role', 'admin')
      setIsAdmin(true)
      setShowPinModal(false)
      setPin('')
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
      setTimeout(() => setPinError(false), 2000)
    }
  }

  const playerLinks = [
    { href: '/', icon: <Home size={20}/>, label: 'Home' },
    { href: '/scorer', icon: <Target size={20}/>, label: 'Scorer' },
    { href: '/payouts', icon: <DollarSign size={20}/>, label: 'Payouts' },
    { href: '/results', icon: <Trophy size={20}/>, label: 'Results' },
    { href: '/history', icon: <History size={20}/>, label: 'History' },
  ]

  const adminLinks = [
    { href: '/', icon: <Home size={20}/>, label: 'Home' },
    { href: '/scorer', icon: <Target size={20}/>, label: 'Scorer' },
    { href: '/payouts', icon: <DollarSign size={20}/>, label: 'Payouts' },
    { href: '/results', icon: <Trophy size={20}/>, label: 'Results' },
    { href: '/setup', icon: <Settings size={20}/>, label: 'Setup' },
  ]

  const links = isAdmin ? adminLinks : playerLinks

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
                isActive(link.href)
                  ? link.href === '/setup'
                    ? 'text-rose-400 bg-rose-500/10'
                    : 'text-emerald-400 bg-emerald-500/10'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}>
              {link.icon}
              <span className="text-[9px] font-black tracking-wider uppercase">{link.label}</span>
            </Link>
          ))}

          {/* Admin toggle button */}
          {!isAdmin ? (
            <button
              onClick={() => setShowPinModal(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-zinc-700 hover:text-zinc-500 transition-all min-w-[56px]"
            >
              <Lock size={20}/>
              <span className="text-[9px] font-black tracking-wider uppercase">Admin</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sessionStorage.setItem('role', 'player')
                setIsAdmin(false)
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-rose-500/60 hover:text-rose-400 transition-all min-w-[56px]"
            >
              <ShieldAlert size={20}/>
              <span className="text-[9px] font-black tracking-wider uppercase">Admin</span>
            </button>
          )}
        </div>
      </nav>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl p-8 space-y-6">
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
                pinError ? 'bg-rose-500/20 border-2 border-rose-500/50 animate-bounce' : 'bg-zinc-800 border-2 border-zinc-700'
              }`}>
                <Lock size={24} className={pinError ? 'text-rose-400' : 'text-zinc-400'}/>
              </div>
              <h2 className="font-black text-xl uppercase italic">Admin Access</h2>
              <p className="text-zinc-600 text-xs font-black normal-case mt-1">Enter admin PIN</p>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitPin()}
                className={`w-full bg-zinc-800 border-2 p-4 rounded-2xl font-black text-2xl text-center outline-none tracking-[0.5em] transition-all ${
                  pinError ? 'border-rose-500 text-rose-400' : 'border-zinc-700 focus:border-emerald-500 text-white'
                }`}
                placeholder="····"
                autoFocus
              />
              <button onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                {showPin ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {pinError && <p className="text-rose-400 text-xs font-black text-center tracking-widest">INCORRECT PIN</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowPinModal(false); setPin(''); setPinError(false) }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-2xl font-black text-sm transition-colors uppercase italic">
                Cancel
              </button>
              <button onClick={submitPin}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-2xl font-black text-sm transition-colors uppercase italic">
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}