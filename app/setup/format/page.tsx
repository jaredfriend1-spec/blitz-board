"use client"

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, onValue } from 'firebase/database'
import {
  Trophy, Settings, Target, DollarSign, Flag,
  ChevronRight, X, Archive, Loader2, CheckCircle2,
  BookOpen, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

const DAY_LABELS = ['Day 1','Day 2','Day 3','Day 4','Day 5','Final Day']

type ResetLevel = 'none' | 'scores' | 'full'

const RESET_OPTIONS: { value: ResetLevel; label: string; desc: string; color: string }[] = [
  {
    value: 'none',
    label: 'Archive Only',
    desc: 'Save snapshot. Everything stays running — use for reference.',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  },
  {
    value: 'scores',
    label: 'Archive + Clear Scores',
    desc: 'Most common for Day 2. Keeps teams, course, and matchups. Wipes scores only.',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  {
    value: 'full',
    label: 'Archive + Full Reset',
    desc: 'End of trip. Keeps only roster and course.',
    color: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
  },
]

export default function TournamentHub() {
  const [courseName, setCourseName] = useState('No Course Set')
  const [tripName, setTripName] = useState('')
  const [currentDay, setCurrentDay] = useState('')
  const [totalDays, setTotalDays] = useState(1)
  const [hasData, setHasData] = useState(false)
  const [isMock, setIsMock] = useState(false)

  // Close day modal
  const [showClose, setShowClose] = useState(false)
  const [resetLevel, setResetLevel] = useState<ResetLevel>('scores')
  const [closing, setClosing] = useState(false)
  const [closeDone, setCloseDone] = useState(false)
  const [nextDayLabel, setNextDayLabel] = useState('')

  useEffect(() => {
    onValue(ref(db,'tournament/course'), snap => {
      if (snap.val()?.name) setCourseName(snap.val().name)
    })
    onValue(ref(db,'tournament/meta'), snap => {
      const m = snap.val() || {}
      setTripName(m.tripName || '')
      setCurrentDay(m.currentDay || 'Day 1')
      setTotalDays(m.totalDays || 1)
      setIsMock(!!m.isMock)
    })
    onValue(ref(db,'tournament'), snap => setHasData(!!snap.val()))
  }, [])

  const openCloseModal = () => {
    // Calculate next day automatically
    const idx = DAY_LABELS.indexOf(currentDay)
    const next = idx >= 0 && idx < DAY_LABELS.length - 1 ? DAY_LABELS[idx + 1] : 'Final Day'
    setNextDayLabel(next)
    // Default reset level based on whether more days remain
    const moredays = (DAY_LABELS.indexOf(currentDay) + 1) < totalDays
    setResetLevel(moredays ? 'scores' : 'full')
    setCloseDone(false)
    setShowClose(true)
  }

  const executeClose = async () => {
    setClosing(true)
    try {
      // 1. Archive current tournament
      const snap = await get(ref(db,'tournament'))
      if (snap.exists()) {
        await set(ref(db,`history/${Date.now()}`), {
          ...snap.val(),
          _meta: {
            tripName: tripName || 'Unnamed Trip',
            dayLabel: currentDay,
            archivedAt: Date.now(),
            isFinal: resetLevel === 'full',
          }
        })
      }

      // 2. Apply reset and advance day
      const currentIdx = DAY_LABELS.indexOf(currentDay)
      const nextDay = currentIdx >= 0 && currentIdx < DAY_LABELS.length - 1
        ? DAY_LABELS[currentIdx + 1]
        : 'Day 1'

      if (resetLevel === 'scores') {
        await set(ref(db,'tournament/scores'), null)
        await set(ref(db,'tournament/matchups'), null)
        // Advance day automatically — no re-entry needed
        await set(ref(db,'tournament/meta/currentDay'), nextDay)
        await set(ref(db,'tournament/meta/isMock'), false)
      } else if (resetLevel === 'full') {
        const rosterSnap = await get(ref(db,'tournament/roster'))
        const courseSnap = await get(ref(db,'tournament/course'))
        const formatSnap = await get(ref(db,'tournament/format'))
        const metaSnap = await get(ref(db,'tournament/meta'))
        await set(ref(db,'tournament'), null)
        if (rosterSnap.exists()) await set(ref(db,'tournament/roster'), rosterSnap.val())
        if (courseSnap.exists()) await set(ref(db,'tournament/course'), courseSnap.val())
        if (formatSnap.exists()) await set(ref(db,'tournament/format'), formatSnap.val())
        // Preserve trip name and total days, reset current day
        if (metaSnap.exists()) {
          await set(ref(db,'tournament/meta'), {
            tripName: metaSnap.val().tripName,
            totalDays: metaSnap.val().totalDays,
            currentDay: 'Day 1',
            isMock: false,
          })
        }
      } else {
        // Archive only
        await set(ref(db,'tournament/meta/isMock'), false)
      }

      setNextDayLabel(nextDay)
      setCloseDone(true)
    } catch (err) {
      alert('Error during close. Check console.')
      console.error(err)
    } finally {
      setClosing(false)
    }
  }

  const menuItems = [
    { title:"Live Scorer", desc:"Enter hole-by-hole scores for the field", path:"/scorer", icon:<Target className="text-emerald-500" size={32}/>, color:"border-emerald-500/20 hover:border-emerald-500" },
    { title:"Tournament Results", desc:"Leaderboard, Nines, and Team Rankings", path:"/results", icon:<Trophy className="text-[#33CCFF]" size={32}/>, color:"border-blue-400/20 hover:border-blue-400" },
    { title:"Side Bets", desc:"Match payouts and scorecard evidence", path:"/payouts", icon:<DollarSign className="text-amber-400" size={32}/>, color:"border-amber-400/20 hover:border-amber-400" },
    { title:"Setup Center", desc:"Course, Roster, Matchups, and Money", path:"/setup", icon:<Settings className="text-zinc-500" size={32}/>, color:"border-zinc-800 hover:border-zinc-500" },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <div className="max-w-4xl mx-auto py-12">

        {/* HEADER */}
        <header className="mb-16 flex justify-between items-end border-b-4 border-emerald-500 pb-8">
          <div>
            <h1 className="text-7xl font-black italic tracking-tighter leading-none mb-2">
              BLITZ <span className="text-emerald-500 text-5xl">BOARD</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] tracking-[.4em]">
              <Flag size={12} className="text-emerald-500"/>
              <span>{courseName}</span>
              {tripName && <><span className="text-zinc-700">·</span><span className="text-zinc-600">{tripName}</span></>}
              {currentDay && <><span className="text-zinc-700">·</span><span className="text-blue-500">{currentDay}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/guide" className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white transition-all">
              <BookOpen size={14}/> HOW TO
            </Link>
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-zinc-600 mb-1">STATUS</p>
              <p className={`font-black italic flex items-center gap-2 justify-end text-sm ${isMock?'text-amber-400':'text-emerald-500'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isMock?'bg-amber-400':'bg-emerald-500'}`}/>
                {isMock?'MOCK DATA':'LIVE'}
              </p>
            </div>
          </div>
        </header>

        {/* NAV GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {menuItems.map(item => (
            <Link key={item.title} href={item.path}
              className={`group bg-zinc-900/40 p-8 rounded-[2.5rem] border-2 ${item.color} transition-all active:scale-95 flex flex-col justify-between h-64 shadow-2xl relative overflow-hidden`}>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                {React.cloneElement(item.icon, { size: 160 })}
              </div>
              <div className="relative z-10">
                <div className="bg-zinc-950 w-16 h-16 rounded-2xl flex items-center justify-center border border-zinc-800 mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h2 className="text-3xl font-black italic leading-none mb-2 group-hover:text-emerald-400 transition-colors">{item.title}</h2>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest leading-relaxed">{item.desc}</p>
              </div>
              <div className="relative z-10 flex justify-end">
                <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-all">
                  <ChevronRight size={20}/>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CLOSE DAY BUTTON — only when there's live data */}
        {hasData && (
          <button onClick={openCloseModal}
            className="w-full flex items-center justify-between bg-zinc-900/60 border-2 border-zinc-800 hover:border-blue-500/50 p-5 rounded-[2rem] font-black text-zinc-500 hover:text-blue-400 transition-all group shadow-xl">
            <span className="flex items-center gap-3 text-sm">
              <Archive size={20} className="text-blue-400"/>
              {currentDay ? `CLOSE ${currentDay.toUpperCase()} & ARCHIVE` : 'CLOSE DAY / END TOURNAMENT'}
            </span>
            <span className="text-[10px] tracking-widest text-zinc-700 group-hover:text-blue-600">
              → HISTORY
            </span>
          </button>
        )}

        {/* FOOTER */}
        <footer className="mt-12 text-center border-t border-zinc-900 pt-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <Link href="/history" className="text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[.4em] transition-colors">HISTORY</Link>
            <span className="text-zinc-800">·</span>
            <Link href="/guide" className="text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[.4em] transition-colors">HOW TO PLAY</Link>
            <span className="text-zinc-800">·</span>
            <Link href="/setup/admin" className="text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[.4em] transition-colors">ADMIN</Link>
          </div>
          <p className="text-[8px] font-black text-zinc-800 tracking-[.8em] italic">BLITZ BOARD · {new Date().getFullYear()}</p>
        </footer>
      </div>

      {/* ── CLOSE DAY MODAL ── */}
      {showClose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Archive size={20} className="text-blue-400"/>
                <h2 className="font-black text-lg uppercase italic">Close {currentDay}</h2>
              </div>
              {!closing && <button onClick={()=>setShowClose(false)}><X size={20} className="text-zinc-500 hover:text-white transition-colors"/></button>}
            </div>

            <div className="p-6 space-y-5">
              {closeDone ? (
                // ── SUCCESS ──
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto"/>
                  <p className="font-black text-xl text-emerald-400 uppercase italic">
                    {currentDay} ARCHIVED
                  </p>
                  {resetLevel === 'scores' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                      <p className="text-blue-400 font-black text-sm uppercase italic">Now on {nextDayLabel}</p>
                      <p className="text-zinc-500 text-xs font-black normal-case mt-1">
                        Scores and matchups cleared. Teams, course, and format are ready. Set up your {nextDayLabel} matches then go live.
                      </p>
                    </div>
                  )}
                  {resetLevel === 'full' && (
                    <p className="text-zinc-500 text-sm font-black normal-case">
                      Full reset complete. Roster and course preserved. Set up a new trip in the wizard.
                    </p>
                  )}
                  {resetLevel === 'none' && (
                    <p className="text-zinc-500 text-sm font-black normal-case">Archived to History. Everything still running.</p>
                  )}
                  <div className="flex gap-3 mt-6">
                    {resetLevel === 'scores' && (
                      <Link href="/setup/matchups" onClick={()=>setShowClose(false)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-2xl font-black text-sm text-center transition-colors uppercase italic">
                        SET UP {nextDayLabel} MATCHES →
                      </Link>
                    )}
                    {resetLevel !== 'scores' && (
                      <Link href="/history" onClick={()=>setShowClose(false)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-sm text-center transition-colors">
                        VIEW HISTORY
                      </Link>
                    )}
                    <button onClick={()=>setShowClose(false)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-2xl font-black text-sm transition-colors">
                      CLOSE
                    </button>
                  </div>
                </div>

              ) : (
                <>
                  {/* Trip context — read only, no re-entry */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl px-5 py-4">
                    <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">ARCHIVING</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-white">{tripName || 'Unnamed Trip'}</p>
                        <p className="text-zinc-500 text-xs font-black mt-0.5 normal-case">
                          {currentDay} of {totalDays} day{totalDays > 1 ? 's' : ''}
                          {totalDays > 1 && ` → automatically moves to ${nextDayLabel}`}
                        </p>
                      </div>
                      <span className="text-blue-400 font-black text-sm bg-blue-500/20 px-3 py-1.5 rounded-xl">
                        {currentDay}
                      </span>
                    </div>
                  </div>

                  {/* Mock data warning */}
                  {isMock && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                      <AlertTriangle size={14} className="text-amber-400 flex-shrink-0"/>
                      <p className="text-amber-400 text-xs font-black normal-case">This is mock tournament data.</p>
                    </div>
                  )}

                  {/* Reset level */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-2">AFTER ARCHIVING...</label>
                    <div className="space-y-2">
                      {RESET_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={()=>setResetLevel(opt.value)}
                          className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${resetLevel===opt.value?opt.color:'border-zinc-800 bg-black text-zinc-500'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${resetLevel===opt.value?'bg-current border-current':'border-zinc-600'}`}/>
                          <div>
                            <div className="font-black text-sm">{opt.label}</div>
                            <div className="text-[10px] font-black opacity-70 normal-case mt-0.5">{opt.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={executeClose} disabled={closing}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg uppercase italic">
                    {closing
                      ? <><Loader2 size={20} className="animate-spin"/> ARCHIVING...</>
                      : <><Archive size={20}/> ARCHIVE {currentDay.toUpperCase()}</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}