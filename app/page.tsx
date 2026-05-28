"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { signOut } from '@/lib/auth'
import { db } from '@/lib/firebase'
import { ref, onValue, set, get, push } from 'firebase/database'
import {
 Shield, Zap, Users, BookOpen, ShieldAlert,
 User, Lock, Eye, EyeOff, Archive, RefreshCw, PlayCircle, X,
 Target, DollarSign, Trophy, History, Settings, BarChart3, Activity,
 ChevronRight, Flag
} from 'lucide-react'
import Link from 'next/link'


export default function LandingPage() {
 const { user, role: authRole, loading: authLoading } = useAuth()
 const [role, setRole] = useState<'none' | 'player' | 'admin' | 'master'>('none')
 const [courseName, setCourseName] = useState('')
 const [tripName, setTripName] = useState('')
 const [currentDay, setCurrentDay] = useState('')
 const [isMock, setIsMock] = useState(false)
 const [activeMode, setActiveMode] = useState<string>('')
 const [archiving, setArchiving] = useState(false)
 const [archiveSuccess, setArchiveSuccess] = useState(false)
 const [demoLoading, setDemoLoading] = useState(false)
 const [toast, setToast] = useState('')
 const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000) }
 const BLOCKED_PLAYERS = ['SAM SILVERMAN', 'SAMUEL SILVERMAN']
 const isBlocked = (name: string) => BLOCKED_PLAYERS.some(b => name.trim().toUpperCase().includes(b.toUpperCase()))
 const [globalRoster, setGlobalRoster] = useState<any[]>([])
 const [courseLibrary, setCourseLibrary] = useState<any[]>([])
 const [history, setHistory] = useState<any[]>([])
 const [modal, setModal] = useState<{
 title: string
 body: string
 warning?: string
 confirmLabel: string
 cancelLabel?: string
 danger?: boolean
 onConfirm: () => void
 onCancel?: () => void
 } | null>(null)

 const showModal = (opts: typeof modal) => setModal(opts)
 const closeModal = () => setModal(null)


 // Watch Firebase Auth — auto-login when authenticated
 useEffect(() => {
 if (authLoading) return
 if (authRole === 'master') { setRole('master'); return }
 if (authRole === 'scorer') { setRole('admin'); return }
 // Fall back to session for guests
 const stored = sessionStorage.getItem('role')
 if (stored === 'player') setRole('player')
 }, [authRole, authLoading])

 useEffect(() => {
 // Firebase data
 onValue(ref(db, 'tournament/course'), snap => {
 if (snap.val()?.name) setCourseName(snap.val().name)
 })
 onValue(ref(db, 'tournament/meta'), snap => {
 const m = snap.val() || {}
 setTripName(m.tripName || '')
 setCurrentDay(m.currentDay || '')
 setIsMock(!!m.isMock)
 setActiveMode(m.mode || '')
 })
 // Master data listeners
 onValue(ref(db, 'globalRoster'), snap => {
 if (snap.val()) setGlobalRoster(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
 else setGlobalRoster([])
 })
 onValue(ref(db, 'courseHistory'), snap => {
 if (snap.val()) setCourseLibrary(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
 else setCourseLibrary([])
 })
 onValue(ref(db, 'history'), snap => {
 if (snap.val()) {
 const items = Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})).sort((a:any,b:any)=>Number(b.id)-Number(a.id))
 setHistory(items)
 } else setHistory([])
 })
 }, [])

 const choosePlayer = () => {
 sessionStorage.setItem('role', 'player')
 setRole('player')
 }


 const archiveMatch = () => {
 showModal({
 title: 'Archive Match to History',
 body: 'This saves the current match to History and closes it. All scores, payouts and results will be preserved.',
 confirmLabel: 'Archive & Close',
 cancelLabel: 'Not yet',
 onConfirm: async () => {
 closeModal()
 setArchiving(true)
 try {
 const snap = await get(ref(db, 'tournament'))
 if (snap.exists()) {
 const data = snap.val()
 await set(ref(db, `history/${Date.now()}`), {
 ...data,
 _meta: { mode:'match', dayLabel:'Quick Match', archivedAt:Date.now(), courseName:data.course?.name||'Quick Match' }
 })
 }
 await set(ref(db, 'tournament'), null)
 setArchiveSuccess(true)
 setActiveMode('')
 setTimeout(() => setArchiveSuccess(false), 3000)
 } catch(e) { }
 setArchiving(false)
 },
 onCancel: closeModal
 })
 }

  // ── DEMO ──────────────────────────────────────────────────────────
  const DEMO_HOLES = [
    {par:4,hcp:7},{par:3,hcp:15},{par:5,hcp:3},{par:4,hcp:11},
    {par:4,hcp:1},{par:3,hcp:17},{par:5,hcp:5},{par:4,hcp:9},
    {par:4,hcp:13},{par:4,hcp:4},{par:3,hcp:16},{par:5,hcp:2},
    {par:3,hcp:18},{par:4,hcp:10},{par:4,hcp:6},{par:5,hcp:8},
    {par:3,hcp:14},{par:4,hcp:12}
  ]
  const DEMO_PLAYERS = [
    {name:'JEFF',   handicap:8,  scores:[5,2,4,4,5,4,7,3,4,3,3,3,2,4,5,6,3,5]},
    {name:'MIKE',   handicap:14, scores:[4,4,5,6,5,3,5,6,4,6,4,6,5,5,5,6,3,4]},
    {name:'CARLOS', handicap:5,  scores:[6,3,5,4,5,5,5,3,4,3,3,7,2,5,3,6,3,4]},
    {name:'DAVE',   handicap:18, scores:[5,4,4,5,4,5,5,5,4,6,5,7,4,6,7,6,4,6]},
    {name:'ROSEY',  handicap:10, scores:[6,3,5,4,6,3,4,5,5,4,3,5,2,4,4,6,3,3]},
    {name:'ARI',    handicap:22, scores:[6,4,6,6,4,4,7,6,4,6,5,8,3,7,5,7,5,6]},
    {name:'TONY',   handicap:3,  scores:[5,4,4,2,6,3,4,4,4,5,3,5,4,4,4,6,4,4]},
    {name:'BLAKE',  handicap:16, scores:[4,3,7,4,7,5,7,5,6,4,4,6,4,7,4,7,5,4]},
  ]

  const loadDemo = async () => {
    const metaSnap = await get(ref(db,'tournament/meta'))
    const meta = metaSnap.val()
    if (meta && !meta.isMock && (meta.mode || meta.tripName)) {
      showModal({
        title: '⚠️ Match In Progress',
        body: 'You have a real match currently active. Archive it to History first, or load the demo which will replace it.',
        warning: 'Choosing "Archive & Demo" will save the current match to History first.',
        confirmLabel: 'Archive & Load Demo',
        cancelLabel: 'Cancel — Keep My Match',
        danger: true,
        onConfirm: async () => {
          closeModal()
          const snap = await get(ref(db,'tournament'))
          if (snap.exists()) {
            await set(ref(db,`history/${Date.now()}`), {
              ...snap.val(),
              _meta: { mode:'match', dayLabel:'Quick Match', archivedAt:Date.now(), courseName:snap.val().course?.name||'' }
            })
          }
          setDemoLoading(true)
          await runDemoLoad()
        },
        onCancel: closeModal
      })
      return
    }
    showModal({
      title: 'Load Live Demo?',
      body: 'Loads a sample match with 8 players, 4 teams, and all 4 match types fully scored — great for showing the app to someone new.',
      confirmLabel: 'Load Demo',
      cancelLabel: 'Cancel',
      onConfirm: async () => { closeModal(); setDemoLoading(true); await runDemoLoad() },
      onCancel: closeModal
    })
  }

  const runDemoLoad = async () => {
    // Block if real match is active
    const metaSnap = await get(ref(db,'tournament/meta'))
    const meta = metaSnap.val()
    if (meta && !meta.isMock && (meta.mode || meta.tripName)) {
      showModal({
        title: '⚠️ Match In Progress',
        body: 'You have a real match currently active. Archive it to History first before running the demo.',
        warning: 'Running the demo while a match is active will lose all unarchived scores.',
        confirmLabel: 'Archive & Run Demo',
        cancelLabel: 'Cancel',
        danger: true,
        onConfirm: async () => {
          closeModal()
          const snap = await get(ref(db, 'tournament'))
          if (snap.exists()) {
            await set(ref(db, `history/${Date.now()}`), {
              ...snap.val(),
              _meta: { mode:'match', dayLabel:'Quick Match', archivedAt:Date.now(), courseName:snap.val().course?.name||'' }
            })
          }
          setDemoLoading(true)
          await runDemoLoad()
        },
        onCancel: closeModal
      })
      return
    }
    showModal({
      title: 'Load Demo Match?',
      body: 'This loads a sample match with 8 players, 4 teams, and all 4 match types (1v1, 2v2, Team, Wheel) fully scored. Perfect for showing someone how the app works.',
      warning: 'If a match is in progress it must be archived first. The demo button will warn you.',
      confirmLabel: 'Load Demo',
      cancelLabel: 'Cancel',
      onConfirm: async () => { closeModal(); setDemoLoading(true); await runDemoLoad() },
      onCancel: closeModal
    })
    setDemoLoading(true)
    try {
      await set(ref(db,'tournament'), null)
      await set(ref(db,'tournament/meta'), {isMock:true, mode:'match', currentDay:'Demo Day', totalDays:1})
      await set(ref(db,'tournament/course'), {name:'Rolling Road GC', holes:DEMO_HOLES, pars:DEMO_HOLES.map(h=>h.par)})
      const pidMap: Record<string,string> = {}
      for (const p of DEMO_PLAYERS) {
        const pRef = push(ref(db,'tournament/roster'))
        await set(pRef, {id:pRef.key, name:p.name, handicap:p.handicap})
        pidMap[p.name] = pRef.key!
      }
      for (const p of DEMO_PLAYERS) {
        await set(ref(db,`tournament/scores/${pidMap[p.name]}`), p.scores)
      }
      const teamDefs = [
        {name:'Eagles',  players:['JEFF','CARLOS']},
        {name:'Birdies', players:['MIKE','DAVE']},
        {name:'Aces',    players:['ROSEY','TONY']},
        {name:'Bogeys',  players:['ARI','BLAKE']},
      ]
      for (const t of teamDefs) {
        const tRef = push(ref(db,'tournament/teams'))
        await set(tRef, {id:tRef.key, name:t.name, playerIds:t.players.map(n=>pidMap[n])})
      }
      await set(ref(db,'tournament/format'), {
        name:"Jeff's Blitz",
        par3:[{type:'net'},{type:'net'},{type:'net'}],
        par4:[{type:'net'},{type:'net'}],
        par5:[{type:'net'},{type:'net'}],
      })
      const m1 = push(ref(db,'tournament/matchups'))
      await set(m1, {id:m1.key, type:'PvP', sideA:'JEFF', sideB:'CARLOS', nassau:5, press:5, autoPress:true, birdie:2, eagle:5, scoringType:'NET'})
      const m2 = push(ref(db,'tournament/matchups'))
      await set(m2, {id:m2.key, type:'2v2', sideA:'JEFF', sideA2:'CARLOS', sideB:'MIKE', sideB2:'DAVE', nassau:10, press:10, autoPress:true, birdie:3, eagle:6, scoringType:'NET'})
      const m3 = push(ref(db,'tournament/matchups'))
      await set(m3, {id:m3.key, type:'TvT', sideA:'Eagles', sideB:'Birdies', nassau:20, press:10, autoPress:false, birdie:0, eagle:0, scoringType:'NET'})
      const m4 = push(ref(db,'tournament/matchups'))
      await set(m4, {id:m4.key, type:'Wheel', wheelPlayers:['JEFF','MIKE','ROSEY','TONY'], wheelAmount:10, wheelFormat:'nassau', wheelNassau:10, wheelPress:5, wheelAutoPress:true, scoringType:'NET'})
      await set(ref(db,'tournament/money'), {entryFee:50, skinsAllocation:20})
      setDemoLoading(false)
      sessionStorage.setItem('role','player')
      setRole('player')
    } catch(e) {
      console.error(e)
      setDemoLoading(false)
      showModal({ title:'Demo Failed', body:'Could not load the demo — check your internet connection and try again.', confirmLabel:'OK', onConfirm:closeModal })
    }
  }

  const clearDemo = async () => {
    await set(ref(db,'tournament'), null)
    sessionStorage.removeItem('role')
    setRole('none')
  }


 // ── ROLE SELECTION SCREEN ──────────────────────────────────────
 if (role === 'none') {
 return (
 <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
 <div className="w-full max-w-sm space-y-8">

 {/* Logo */}
 <div className="text-center">
 <h1 className="text-6xl font-black tracking-tighter leading-none mb-1">
 BLITZ <span className="text-emerald-500">BOARD</span>
 </h1>
 <p className="text-zinc-600 text-[10px] font-black tracking-[0.4em]">
 GOLF TOURNAMENT SCORING
 </p>
 <p className="text-zinc-700 text-[10px] font-medium normal-case mt-1">By Jared Friend</p>
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
 </div>
 <Link href="/login"
 className="w-full flex items-center gap-4 bg-zinc-800/40 hover:bg-zinc-800 border-2 border-zinc-700 hover:border-emerald-500 p-5 rounded-[2rem] transition-all group">
 <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
 <Shield size={24} className="text-zinc-500 group-hover:text-emerald-400 transition-colors"/>
 </div>
 <div className="text-left flex-1">
 <div className="text-xl font-black text-zinc-400 group-hover:text-white">Admin Sign In</div>
 <div className="text-[10px] font-black text-zinc-600 tracking-widest normal-case mt-0.5">Sign in with email & password</div>
 </div>
 <ChevronRight size={16} className="text-zinc-600 group-hover:text-emerald-400 transition-colors"/>
 </Link>



 <button onClick={loadDemo} disabled={demoLoading}
 className="w-full flex items-center justify-center gap-2 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-500/50 px-4 py-4 rounded-2xl transition-all group disabled:opacity-50">
 <PlayCircle size={16} className="text-emerald-500 flex-shrink-0"/>
 <span className="font-semibold text-sm text-emerald-500 group-hover:text-emerald-400 transition-colors">
 {demoLoading ? 'Loading demo...' : 'See a Live Demo'}
 </span>
 </button>

 <Link href="/guide"
 className="w-full flex items-center justify-center gap-2 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 px-4 py-3.5 rounded-2xl transition-all group">
 <BookOpen size={14} className="text-zinc-600 group-hover:text-emerald-400 transition-colors"/>
 <span className="font-black text-xs text-zinc-600 group-hover:text-emerald-400 transition-colors tracking-widest">
 EXPLORE HOW BLITZ BOARD WORKS
 </span>
 </Link>
 <p className="text-center text-[9px] text-zinc-700 font-black tracking-widest">
 BLITZ BOARD · {new Date().getFullYear()}
 
 </p>

 </div>

 {/* In-app confirm modal — no popup blockers */}
 {modal && (
 <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/80 backdrop-blur-sm overflow-y-auto">
 <div className="w-full max-w-sm bg-zinc-900 rounded-[2rem] border border-zinc-700 shadow-2xl overflow-hidden">
 <div className="p-6 space-y-3">
 <h2 className="font-bold text-lg text-white">{modal.title}</h2>
 <p className="text-zinc-400 text-sm font-medium normal-case leading-relaxed">{modal.body}</p>
 {modal.warning && (
 <div className={`flex items-start gap-2 rounded-xl p-3 text-xs font-medium normal-case leading-relaxed ${
 modal.danger ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
 }`}>
 <span className="flex-shrink-0">⚠️</span>
 <span>{modal.warning}</span>
 </div>
 )}
 </div>
 <div className="px-6 pb-6 flex flex-col gap-2">
 <button onClick={modal.onConfirm}
 className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-colors ${
 modal.danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'
 }`}>
 {modal.confirmLabel}
 </button>
 {modal.cancelLabel && (
 <button onClick={modal.onCancel || closeModal}
 className="w-full py-3.5 rounded-2xl font-bold text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors">
 {modal.cancelLabel}
 </button>
 )}
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
 { title:"Live Scorer", desc:"Enter hole-by-hole scores", path:"/scorer", icon:<Target className="text-emerald-500"size={28}/>, color:"border-emerald-500/20 hover:border-emerald-500", accent:"text-emerald-400"},
 { title:"Tournament Results", desc:"Leaderboard & team rankings", path:"/results", icon:<Trophy className="text-[#33CCFF]"size={28}/>, color:"border-blue-400/20 hover:border-blue-400", accent:"text-blue-400"},
 { title:"Side Bets & Payouts", desc:"Match payouts & evidence", path:"/payouts", icon:<DollarSign className="text-amber-400"size={28}/>, color:"border-amber-400/20 hover:border-amber-400", accent:"text-amber-400"},
 { title:"History", desc:"Past tournament results", path:"/history", icon:<Archive className="text-blue-400"size={28}/>, color:"border-blue-800/20 hover:border-blue-600", accent:"text-blue-400"},
 ]

 return (
 <div className="min-h-screen bg-zinc-950 text-white font-sans">
 <div className="max-w-2xl mx-auto px-4 py-10">

 {/* Header */}
 <header className="mb-10 border-b-4 border-emerald-500 pb-6">
 <h1 className="text-6xl font-black tracking-tighter leading-none mb-2">
 BLITZ <span className="text-emerald-500 text-4xl">BOARD</span>
 </h1>
 <div className="flex items-center gap-3 text-zinc-500 font-bold text-[10px] tracking-[.3em] flex-wrap">
 {courseName && <><Flag size={11} className="text-emerald-500"/><span>{courseName}</span></>}
 {!isMock && tripName && <><span className="text-zinc-700">·</span><span className="text-zinc-400">{tripName}</span></>}
 {!isMock && currentDay && <><span className="text-zinc-700">·</span><span className="text-blue-400">{currentDay}</span></>}
 {isMock && <span className="text-amber-400">· DEMO</span>}
 </div>
 </header>
 {/* Exit demo banner */}
 {isMock && (
 <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
 <div>
 <p className="text-amber-400 font-bold text-sm">Demo Mode</p>
 <p className="text-zinc-500 text-xs font-medium normal-case">Sample match — 1v1, 2v2, Team, Wheel</p>
 </div>
 <button onClick={clearDemo}
 className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 hover:border-rose-500 text-zinc-400 hover:text-rose-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all">
 <X size={12}/> Exit Demo
 </button>
 </div>
 )}


 {/* Player nav — uniform pill style */}
 <div className="space-y-3 mb-6">
 {playerItems.map(item => (
 <Link key={item.title} href={item.path}
 className={`group w-full bg-zinc-900/40 p-4 rounded-2xl border ${item.color} transition-all active:scale-[0.99] flex items-center gap-4`}>
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 {React.cloneElement(item.icon, { size: 20 })}
 </div>
 <div className="flex-1 min-w-0">
 <h2 className={`text-base font-bold leading-tight group-hover:${item.accent} transition-colors`}>{item.title}</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">{item.desc}</p>
 </div>
 <div className="w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all flex-shrink-0">
 <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors"/>
 </div>
 </Link>
 ))}
 </div>

 {/* Guide + Exit — uniform pill style */}
 <div className="space-y-3">
 <Link href="/guide"
 className="w-full bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center gap-4 group">
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 <BookOpen size={20} className="text-zinc-500 group-hover:text-emerald-400 transition-colors"/>
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-base font-bold leading-tight group-hover:text-emerald-400 transition-colors">How Blitz Board Works</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">Guide, tips & feature walkthrough</p>
 </div>
 <div className="w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-600 transition-all">
 <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors"/>
 </div>
 </Link>
 <button onClick={async () => {
 sessionStorage.removeItem('role')
 if (user) await signOut()
 setRole('none')
 }}
 className="w-full bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center gap-4 group">
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 <RefreshCw size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors"/>
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-base font-bold leading-tight group-hover:text-zinc-300 transition-colors">Exit</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">Return to home screen</p>
 </div>
 </button>
 </div>

 </div>
 </div>
 )
 }

 // ── ADMIN HUB ──────────────────────────────────────────────────
 const adminItems = [
 {
 title:"Tournament Wizard",
 desc:"Full tournament · Multi-day · Skins",
 path:"/setup",
 icon:<ShieldAlert className="text-rose-400"size={28}/>,
 color:"border-rose-500/30 hover:border-rose-500/80",
 accent:"text-rose-400",
 pill: true
 },
 {
 title:"Live Scorer",
 desc:"Enter hole-by-hole scores",
 path:"/scorer",
 icon:<Target className="text-emerald-500"size={28}/>,
 color:"border-emerald-500/20 hover:border-emerald-500",
 accent:"text-emerald-400"
 },
 {
 title:"Tournament Results",
 desc:"Leaderboard & team rankings",
 path:"/results",
 icon:<Trophy className="text-[#33CCFF]"size={28}/>,
 color:"border-blue-400/20 hover:border-blue-400",
 accent:"text-blue-400"
 },
 {
 title:"Side Bets & Payouts",
 desc:"Match payouts & evidence",
 path:"/payouts",
 icon:<DollarSign className="text-amber-400"size={28}/>,
 color:"border-amber-400/20 hover:border-amber-400",
 accent:"text-amber-400"
 },
 {
 title:"History",
 desc:"Past tournament results",
 path:"/history",
 icon:<Archive className="text-blue-400"size={28}/>,
 color:"border-blue-800/20 hover:border-blue-600",
 accent:"text-blue-400"
 },
 {
 title:"Roster Manager",
 desc:"Your permanent player list",
 path:"/roster",
 icon:<Users className="text-emerald-400"size={28}/>,
 color:"border-emerald-800/20 hover:border-emerald-600",
 accent:"text-emerald-400"
 },
 ]

 const setupItem = adminItems[0]
 const mainItems = adminItems.slice(1)

 return (
 <div className="min-h-screen bg-zinc-950 text-white font-sans">
 <div className="max-w-2xl mx-auto px-4 py-10">

 {/* Header */}
 <header className="mb-10 border-b-4 border-emerald-500 pb-6">
 <h1 className="text-6xl font-black tracking-tighter leading-none mb-2">
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
 <h2 className="text-xl font-black leading-tight group-hover:text-rose-400 transition-colors">{setupItem.title}</h2>
 <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{setupItem.desc}</p>
 </div>
 <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all flex-shrink-0">
 <ChevronRight size={16}/>
 </div>
 </Link>

 {/* Quick Match pill */}
 <Link href="/match"
 className={`group w-full bg-zinc-900/40 p-5 rounded-[2rem] border-2 transition-all active:scale-95 flex items-center gap-4 shadow-xl mb-4 relative overflow-hidden ${
 activeMode === 'match' ? 'border-amber-500/60 bg-amber-950/10' : 'border-amber-500/20 hover:border-amber-500'
 }`}>
 <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
 <Zap size={80} className="text-amber-400"/>
 </div>
 <div className="bg-zinc-950 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 <Zap size={22} className="text-amber-400"/>
 </div>
 <div className="relative z-10 flex-1">
 <h2 className="text-xl font-black leading-tight group-hover:text-amber-400 transition-colors">Quick Match</h2>
 <p className="text-[10px] font-bold text-zinc-500 tracking-widest">
 {activeMode === 'match'
 ? <span className="text-amber-400">⚡ MATCH IN PROGRESS · {courseName || 'TAP TO CONTINUE'}</span>
 : 'Casual round · No entry fees · Just bets'
 }
 </p>
 </div>
 <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all flex-shrink-0">
 <ChevronRight size={16}/>
 </div>
 </Link>
 {/* Main items grid */}
 {/* Master Dashboard — only visible to master admin */}
 {role === 'master' && (
 <Link href="/master"
 className="w-full flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/30 hover:border-emerald-500 p-4 rounded-2xl transition-all group mb-3 block">
 <div className="flex items-center gap-3">
 <Shield size={18} className="text-emerald-400"/>
 <div>
 <div className="font-bold text-sm text-emerald-400">⚡ Master Dashboard</div>
 <div className="text-zinc-500 text-[10px] font-medium normal-case">Roster · History · Full control</div>
 </div>
 </div>
 <ChevronRight size={16} className="text-emerald-500"/>
 </Link>
 )}

 <div className="space-y-3 mb-6">
 {mainItems.map(item => (
 <Link key={item.title} href={item.path}
 className={`group w-full bg-zinc-900/40 p-4 rounded-2xl border ${item.color} transition-all active:scale-[0.99] flex items-center gap-4`}>
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 {React.cloneElement(item.icon, { size: 20 })}
 </div>
 <div className="flex-1 min-w-0">
 <h2 className={`text-base font-bold leading-tight group-hover:text-emerald-400 transition-colors`}>{item.title}</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">{item.desc}</p>
 </div>
 <div className="w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all flex-shrink-0">
 <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors"/>
 </div>
 </Link>
 ))}
 </div>

 {/* Guide + Exit — uniform pill style */}
 <div className="space-y-3">
 <Link href="/guide"
 className="w-full bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center gap-4 group">
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 <BookOpen size={20} className="text-zinc-500 group-hover:text-emerald-400 transition-colors"/>
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-base font-bold leading-tight group-hover:text-emerald-400 transition-colors">How Blitz Board Works</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">Guide, tips & feature walkthrough</p>
 </div>
 <div className="w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-600 transition-all">
 <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors"/>
 </div>
 </Link>
 <button onClick={async () => {
 sessionStorage.removeItem('role')
 if (user) await signOut()
 setRole('none')
 }}
 className="w-full bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all flex items-center gap-4 group">
 <div className="bg-zinc-950 w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform">
 <RefreshCw size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors"/>
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-base font-bold leading-tight group-hover:text-zinc-300 transition-colors">Exit</h2>
 <p className="text-xs text-zinc-500 font-medium normal-case mt-0.5">Return to home screen</p>
 </div>
 </button>
 </div>

 </div>
 </div>
 )


}