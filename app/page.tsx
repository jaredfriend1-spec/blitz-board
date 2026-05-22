"use client"

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import {
  Trophy, Settings, Target, DollarSign, Flag,
  ChevronRight, History, BookOpen, ShieldAlert,
  User, Users, Lock, Eye, EyeOff, Zap, Archive, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

const ADMIN_PIN = "jeff"

export default function LandingPage() {
  const [role, setRole] = useState<'none' | 'player' | 'admin'>('none')
  const [courseName, setCourseName] = useState('')
  const [tripName, setTripName] = useState('')
  const [currentDay, setCurrentDay] = useState('')
  const [isMock, setIsMock] = useState(false)

  // PIN state
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [showPin, setShowPin] = useState(false)

  useEffect(() => {
    // Check existing session role
    const stored = sessionStorage.getItem('role')
    if (stored === 'admin') setRole('admin')
    else if (stored === 'player') setRole('player')

    // Firebase data
    onValue(ref(db, 'tournament/course'), snap => {
      if (snap.val()?.name) setCourseName(snap.val().name)
    })
    onValue(ref(db, 'tournament/meta'), snap => {
      const m = snap.val() || {}
      setTripName(m.tripName || '')
      setCurrentDay(m.currentDay || '')
      setIsMock(!!m.isMock)
    })
  }, [])

  const choosePlayer = () => {
    sessionStorage.setItem('role', 'player')
    setRole('player')
  }

  const chooseAdmin = () => {
    setShowPinModal(true)
  }

  const submitPin = () => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('role', 'admin')
      setRole('admin')
      setShowPinModal(false)
      setPin('')
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
      setTimeout(() => setPinError(false), 2000)
    }
  }

  // ── ROLE SELECTION SCREEN ──────────────────────────────────────
  if (role === 'none') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans uppercase italic">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo */}
          <div className="text-center">
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-1">
              BLITZ <span className="text-emerald-500">BOARD</span>
            </h1>
            <p className="text-zinc-600 text-[10px] font-black tracking-[0.4em]">
              GOLF TOURNAMENT SCORING
            </p>
          </div>

          {/* Role choice */}
          <div className="space-y-3">
            <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] text-center">WHO ARE YOU?</p>

            <button
              onClick={choosePlayer}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-emerald-500 p-6 rounded-[2rem] font-black flex items-center gap-5 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                <User size={28} className="text-emerald-400"/>
              </div>
              <div className="text-left">
                <div className="text-xl font-black text-white">I'm a Player</div>
                <div className="text-[10px] font-black text-zinc-500 tracking-widest normal-case mt-0.5">
                  View scores, results & payouts
                </div>
              </div>
              <ChevronRight size={20} className="text-zinc-600 ml-auto group-hover:text-emerald-400 transition-colors"/>
            </button>

            <button
              onClick={chooseAdmin}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-rose-500/50 p-6 rounded-[2rem] font-black flex items-center gap-5 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-500/20 transition-colors">
                <ShieldAlert size={28} className="text-rose-400"/>
              </div>
              <div className="text-left">
                <div className="text-xl font-black text-white">I'm the Admin</div>
                <div className="text-[10px] font-black text-zinc-500 tracking-widest normal-case mt-0.5">
                  Setup, manage & configure
                </div>
              </div>
              <Lock size={16} className="text-zinc-600 ml-auto group-hover:text-rose-400 transition-colors"/>
            </button>
          </div>

          <p className="text-center text-[9px] text-zinc-700 font-black tracking-widest">
            BLITZ BOARD · {new Date().getFullYear()}
          </p>
        </div>

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl p-8 space-y-6">
              <div className="text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  pinError ? 'bg-rose-500/20 border-2 border-rose-500/50 animate-bounce' : 'bg-zinc-800 border-2 border-zinc-700'
                }`}>
                  <Lock size={24} className={pinError ? 'text-rose-400' : 'text-zinc-400'}/>
                </div>
                <h2 className="font-black text-xl">Admin Access</h2>
                <p className="text-zinc-600 text-xs font-black normal-case mt-1">Enter your admin PIN</p>
              </div>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitPin()}
                  className={`w-full bg-zinc-800 border-2 p-4 rounded-2xl font-black text-2xl text-center outline-none tracking-[0.5em] ${
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
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-2xl font-black text-sm transition-colors">
                  CANCEL
                </button>
                <button onClick={submitPin}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-2xl font-black text-sm transition-colors">
                  ENTER
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── PLAYER HUB ─────────────────────────────────────────────────
  if (role === 'player') {
    const playerItems = [
      { title:"Live Scorer", desc:"Enter hole-by-hole scores", path:"/scorer", icon:<Target className="text-emerald-500" size={28}/>, color:"border-emerald-500/20 hover:border-emerald-500", accent:"text-emerald-400" },
      { title:"Tournament Results", desc:"Leaderboard & team rankings", path:"/results", icon:<Trophy className="text-[#33CCFF]" size={28}/>, color:"border-blue-400/20 hover:border-blue-400", accent:"text-blue-400" },
      { title:"Side Bets & Payouts", desc:"Match payouts & evidence", path:"/payouts", icon:<DollarSign className="text-amber-400" size={28}/>, color:"border-amber-400/20 hover:border-amber-400", accent:"text-amber-400" },
      { title:"History", desc:"Past tournament results", path:"/history", icon:<Archive className="text-blue-400" size={28}/>, color:"border-blue-800/20 hover:border-blue-600", accent:"text-blue-400" },
    ]

    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans uppercase">
        <div className="max-w-2xl mx-auto px-4 py-10">

          {/* Header */}
          <header className="mb-10 border-b-4 border-emerald-500 pb-6">
            <h1 className="text-6xl font-black italic tracking-tighter leading-none mb-2">
              BLITZ <span className="text-emerald-500 text-4xl">BOARD</span>
            </h1>
            <div className="flex items-center gap-3 text-zinc-500 font-bold text-[10px] tracking-[.3em] flex-wrap">
              {courseName && <><Flag size={11} className="text-emerald-500"/><span>{courseName}</span></>}
              {!isMock && tripName && <><span className="text-zinc-700">·</span><span className="text-zinc-400">{tripName}</span></>}
              {!isMock && currentDay && <><span className="text-zinc-700">·</span><span className="text-blue-400">{currentDay}</span></>}
              {isMock && <span className="text-amber-400">· DEMO</span>}
            </div>
          </header>

          {/* Player nav grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {playerItems.map(item => (
              <Link key={item.title} href={item.path}
                className={`group bg-zinc-900/40 p-6 rounded-[2rem] border-2 ${item.color} transition-all active:scale-95 flex flex-col justify-between min-h-[140px] shadow-xl relative overflow-hidden`}>
                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  {React.cloneElement(item.icon, { size: 100 })}
                </div>
                <div className="relative z-10">
                  <div className="bg-zinc-950 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 mb-4 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h2 className={`text-xl font-black italic leading-tight mb-1 group-hover:${item.accent} transition-colors`}>{item.title}</h2>
                  <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{item.desc}</p>
                </div>
                <div className="relative z-10 flex justify-end mt-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <ChevronRight size={16}/>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Switch role */}
          <div className="flex items-center justify-between text-[10px] font-black text-zinc-700 px-1">
            <span className="tracking-widest">SIGNED IN AS PLAYER</span>
            <button onClick={() => { sessionStorage.removeItem('role'); setRole('none') }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest">
              SWITCH ROLE →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ADMIN HUB ──────────────────────────────────────────────────
  const adminItems = [
    {
      title:"Setup Wizard",
      desc:"Configure tournament · Checklist",
      path:"/setup",
      icon:<ShieldAlert className="text-rose-400" size={28}/>,
      color:"border-rose-500/30 hover:border-rose-500",
      accent:"text-rose-400",
      pill: true
    },
    {
      title:"Live Scorer",
      desc:"Enter hole-by-hole scores",
      path:"/scorer",
      icon:<Target className="text-emerald-500" size={28}/>,
      color:"border-emerald-500/20 hover:border-emerald-500",
      accent:"text-emerald-400"
    },
    {
      title:"Tournament Results",
      desc:"Leaderboard & team rankings",
      path:"/results",
      icon:<Trophy className="text-[#33CCFF]" size={28}/>,
      color:"border-blue-400/20 hover:border-blue-400",
      accent:"text-blue-400"
    },
    {
      title:"Side Bets & Payouts",
      desc:"Match payouts & evidence",
      path:"/payouts",
      icon:<DollarSign className="text-amber-400" size={28}/>,
      color:"border-amber-400/20 hover:border-amber-400",
      accent:"text-amber-400"
    },
    {
      title:"History",
      desc:"Past tournament results",
      path:"/history",
      icon:<Archive className="text-blue-400" size={28}/>,
      color:"border-blue-800/20 hover:border-blue-600",
      accent:"text-blue-400"
    },
  ]

  const setupItem = adminItems[0]
  const mainItems = adminItems.slice(1)

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans uppercase">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <header className="mb-10 border-b-4 border-emerald-500 pb-6">
          <h1 className="text-6xl font-black italic tracking-tighter leading-none mb-2">
            BLITZ <span className="text-emerald-500 text-4xl">BOARD</span>
          </h1>
          <div className="flex items-center gap-3 text-zinc-500 font-bold text-[10px] tracking-[.3em] flex-wrap">
            {courseName && <><Flag size={11} className="text-emerald-500"/><span>{courseName}</span></>}
            {!isMock && tripName && <><span className="text-zinc-700">·</span><span className="text-zinc-400">{tripName}</span></>}
            {!isMock && currentDay && <><span className="text-zinc-700">·</span><span className="text-blue-400">{currentDay}</span></>}
            {isMock && <span className="text-amber-400">· DEMO</span>}
            <span className="text-zinc-700">·</span>
            <span className="text-rose-500 flex items-center gap-1"><ShieldAlert size={10}/> ADMIN</span>
          </div>
        </header>

        {/* Setup pill — full width, above everything else */}
        <Link href={setupItem.path}
          className={`group w-full bg-zinc-900/40 p-5 rounded-[2rem] border-2 ${setupItem.color} transition-all active:scale-95 flex items-center gap-4 shadow-xl mb-4 relative overflow-hidden`}>
          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert size={80} className="text-rose-400"/>
          </div>
          <div className="bg-zinc-950 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
            {setupItem.icon}
          </div>
          <div className="relative z-10 flex-1">
            <h2 className="text-xl font-black italic leading-tight group-hover:text-rose-400 transition-colors">{setupItem.title}</h2>
            <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{setupItem.desc}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all flex-shrink-0">
            <ChevronRight size={16}/>
          </div>
        </Link>

        {/* Quick Match pill */}
        <Link href="/match"
          className="group w-full bg-zinc-900/40 p-5 rounded-[2rem] border-2 border-amber-500/20 hover:border-amber-500 transition-all active:scale-95 flex items-center gap-4 shadow-xl mb-4 relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={80} className="text-amber-400"/>
          </div>
          <div className="bg-zinc-950 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
            <Zap size={22} className="text-amber-400"/>
          </div>
          <div className="relative z-10 flex-1">
            <h2 className="text-xl font-black italic leading-tight group-hover:text-amber-400 transition-colors">Quick Match</h2>
            <p className="text-[10px] font-bold text-zinc-500 tracking-widest">Casual round · No entry fees · Just bets</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all flex-shrink-0">
            <ChevronRight size={16}/>
          </div>
        </Link>

        {/* Main items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {mainItems.map(item => (
            <Link key={item.title} href={item.path}
              className={`group bg-zinc-900/40 p-6 rounded-[2rem] border-2 ${item.color} transition-all active:scale-95 flex flex-col justify-between min-h-[140px] shadow-xl relative overflow-hidden`}>
              <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-10 transition-opacity">
                {React.cloneElement(item.icon, { size: 100 })}
              </div>
              <div className="relative z-10">
                <div className="bg-zinc-950 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 mb-4 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h2 className="text-xl font-black italic leading-tight mb-1 group-hover:text-emerald-400 transition-colors">{item.title}</h2>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{item.desc}</p>
              </div>
              <div className="relative z-10 flex justify-end mt-3">
                <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <ChevronRight size={16}/>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Guide + switch role */}
        <div className="flex items-center justify-between text-[10px] font-black text-zinc-700 px-1">
          <Link href="/guide" className="hover:text-zinc-500 transition-colors tracking-widest flex items-center gap-1">
            <BookOpen size={11}/> HOW TO PLAY
          </Link>
          <button onClick={() => { sessionStorage.removeItem('role'); setRole('none') }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest">
            SWITCH ROLE →
          </button>
        </div>
      </div>
    </div>
  )
}