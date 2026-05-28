"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import Link from 'next/link'
import { ArrowLeft, Users, Flag, Swords, DollarSign, ShieldAlert, Archive, ChevronRight, CheckCircle2, Circle, Play, Layers, Lock, Eye, EyeOff } from 'lucide-react'

export default function SetupCenter() {
  const { role, loading } = useAuth()
  const unlocked = role === 'scorer' || role === 'master'

  // Live status for quick access dots
  const [courseReady, setCourseReady] = useState(false)
  const [rosterReady, setRosterReady] = useState(false)
  const [moneyReady, setMoneyReady] = useState(false)
  const [matchupsReady, setMatchupsReady] = useState(false)
  const [tripReady, setTripReady] = useState(false)
  const [stepsComplete, setStepsComplete] = useState(0)

  // Check session — stays unlocked for the browser session
  useEffect(() => {
    const stored = sessionStorage.getItem('setup-unlocked')
    if (stored === 'true') setUnlocked(true)
  }, [])

  useEffect(() => {
    if (!unlocked) return
    onValue(ref(db,'tournament/course'), snap => setCourseReady(!!(snap.val()?.holes?.length === 18)))
    onValue(ref(db,'tournament/meta'), snap => { const m = snap.val(); setTripReady(!!(m?.tripName && m?.totalDays > 0)) })
    onValue(ref(db,'tournament/teams'), snap => {
      const t = snap.val()
      setRosterReady(!!(t && Object.values(t).some((tm:any) => (tm.playerIds||[]).length > 0)))
    })
    onValue(ref(db,'tournament/money'), snap => setMoneyReady(!!(snap.val()?.entryFee > 0)))
    onValue(ref(db,'tournament/matchups'), snap => setMatchupsReady(!!(snap.val() && Object.keys(snap.val()).length > 0)))
  }, [unlocked])

  useEffect(() => {
    setStepsComplete([tripReady,courseReady,rosterReady,moneyReady,matchupsReady].filter(Boolean).length)
  }, [tripReady,courseReady,rosterReady,moneyReady,matchupsReady])

  const allDone = stepsComplete === 5

  const quickLinks = [
    { title:"Trip & Days", icon:<Flag size={20}/>, href:"/setup/admin", done:tripReady, color:"text-zinc-400" },
    { title:"Course Setup", icon:<Flag size={20}/>, href:"/setup/settings", done:courseReady, color:"text-emerald-500" },
    { title:"Roster & Teams", icon:<Users size={20}/>, href:"/setup/roster", done:rosterReady, color:"text-blue-400" },
    { title:"Money & Pots", icon:<DollarSign size={20}/>, href:"/setup/money", done:moneyReady, color:"text-yellow-400" },
    { title:"Team Format", icon:<Layers size={20}/>, href:"/setup/format", done:true, color:"text-purple-400" },
    { title:"Side Bets", icon:<Swords size={20}/>, href:"/setup/matchups", done:matchupsReady, color:"text-amber-400" },
  ]

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading...</div>
    </div>
  )

  if (!unlocked) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-zinc-500 font-semibold text-sm mb-4">Sign in required</p>
        <a href="/login" className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm">Sign In</a>
      </div>
    </div>
  )

    return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans uppercase italic">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center text-emerald-400 mb-8 font-black text-sm hover:text-emerald-300 transition-colors">
          <ArrowLeft size={18} className="mr-2"/> HUB
        </Link>

        <h1 className="text-4xl font-black text-white mb-8 tracking-tighter">Setup Center</h1>

        {/* WIZARD HERO */}
        <Link href="/setup/admin" className="block mb-6">
          <div className={`rounded-[2.5rem] border-2 p-6 sm:p-8 transition-all shadow-2xl group ${allDone?'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400':'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${allDone?'bg-emerald-500':'bg-zinc-800'}`}>
                  <ShieldAlert size={24} className={allDone?'text-black':'text-zinc-400'}/>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Tournament Wizard</h2>
                  <p className="text-[10px] font-black text-zinc-500 tracking-widest mt-0.5">
                    {allDone?'ALL STEPS COMPLETE · READY TO PLAY':'STEP-BY-STEP SETUP CHECKLIST'}
                  </p>
                </div>
              </div>
              <ChevronRight size={24} className={`mt-1 transition-transform group-hover:translate-x-1 ${allDone?'text-emerald-400':'text-zinc-600'}`}/>
            </div>
            <div className="bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${allDone?'bg-emerald-400':'bg-zinc-500'}`} style={{width:`${(stepsComplete/5)*100}%`}}/>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[tripReady,courseReady,rosterReady,moneyReady,matchupsReady].map((done,i) => (
                  <div key={i} className={done?'text-emerald-400':'text-zinc-700'}>
                    {done?<CheckCircle2 size={16}/>:<Circle size={16}/>}
                  </div>
                ))}
                <span className="text-xs font-black text-zinc-500 ml-1">{stepsComplete}/5 DONE</span>
              </div>
              {allDone && <span className="text-[10px] font-black text-emerald-400 tracking-widest flex items-center gap-1"><Play size={10}/> START TOURNAMENT</span>}
            </div>
          </div>
        </Link>

        {/* QUICK ACCESS GRID */}
        <p className="text-[9px] font-black text-zinc-600 tracking-[0.3em] mb-3 px-1">QUICK ACCESS</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {quickLinks.map(item => (
            <Link key={item.title} href={item.href}>
              <div className={`bg-zinc-900 border-2 p-5 rounded-[1.5rem] hover:border-zinc-600 transition-all group h-full flex flex-col justify-between ${item.done?'border-zinc-700':'border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={item.color}>{item.icon}</span>
                  {item.done?<CheckCircle2 size={14} className="text-emerald-500"/>:<Circle size={14} className="text-zinc-700"/>}
                </div>
                <div>
                  <p className="font-black text-sm text-white leading-tight">{item.title}</p>
                  <p className={`text-[9px] font-black mt-1 tracking-wider ${item.done?'text-emerald-600':'text-zinc-600'}`}>
                    {item.title==='Team Format'?"JEFF'S BLITZ DEFAULT":item.done?'CONFIGURED ✓':'NOT SET'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/history" className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl font-black text-sm text-zinc-400 hover:text-white transition-all">
          <span className="flex items-center gap-3"><Archive size={16} className="text-blue-400"/> View Tournament History</span>
          <ChevronRight size={16} className="text-zinc-700"/>
        </Link>
      </div>
    </div>
  )
}