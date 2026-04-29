"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push, onValue } from 'firebase/database'
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight, Flag, Users,
  DollarSign, Sword, FlaskConical, Loader2, Archive,
  Trash2, Play, ShieldAlert, Eraser, Calendar, Save, Layers,
  RotateCcw, Settings2
} from 'lucide-react'
import Link from 'next/link'

// ── MCC COURSE (from scorecard) ───────────────────────────────────
const MCC_COURSE = {
  name: "MCC",
  holes: [
    {par:5,hcp:15},{par:4,hcp:3},{par:3,hcp:17},{par:4,hcp:7},{par:4,hcp:1},
    {par:3,hcp:9},{par:4,hcp:11},{par:4,hcp:5},{par:5,hcp:13},
    {par:4,hcp:4},{par:3,hcp:8},{par:4,hcp:10},{par:5,hcp:18},{par:3,hcp:14},
    {par:4,hcp:2},{par:4,hcp:16},{par:4,hcp:6},{par:5,hcp:12},
  ],
  pars: [5,4,3,4,4,3,4,4,5, 4,3,4,5,3,4,4,4,5]
}

// ── 12 PLAYERS ────────────────────────────────────────────────────
const ALL_PLAYERS = [
  {name:"JEREMIAS",    handicap:18},
  {name:"DVP",         handicap:22},
  {name:"CRIBBY",      handicap:20},
  {name:"TRANQUILINO", handicap:24},
  {name:"AL",          handicap:8},
  {name:"FREDDY",      handicap:16},
  {name:"SKIP",        handicap:14},
  {name:"STONEY",      handicap:19},
  {name:"MIKE",        handicap:12},
  {name:"CARLOS",      handicap:10},
  {name:"TONY",        handicap:25},
  {name:"DAVE",        handicap:15},
]

// ── REALISTIC SCORES (MCC Par 72) ─────────────────────────────────
// Pars: [5,4,3,4,4,3,4,4,5, 4,3,4,5,3,4,4,4,5]
const ALL_SCORES: Record<string,number[]> = {
  // Team 1 — higher handicappers
  JEREMIAS:    [6,5,4,4,5,4,5,5,5, 5,3,4,5,5,4,3,5,7], // 84
  DVP:         [6,4,6,5,5,4,5,4,6, 6,4,6,6,6,4,3,5,5], // 90
  CRIBBY:      [4,6,5,5,6,4,6,4,5, 5,3,6,4,5,4,4,5,7], // 88
  TRANQUILINO: [6,6,4,4,6,4,5,5,6, 6,4,5,5,5,5,4,4,6], // 90
  // Team 2 — mid-low handicappers
  AL:          [4,6,4,3,6,4,4,4,4, 5,3,4,6,4,5,2,6,6], // 80 (eagle hole 16!)
  FREDDY:      [6,6,4,5,4,4,5,4,5, 4,3,5,6,4,4,3,5,7], // 84
  SKIP:        [5,7,5,4,5,3,5,5,5, 4,3,5,4,5,5,3,6,5], // 84
  STONEY:      [6,6,6,4,4,4,4,5,6, 5,4,4,6,5,4,3,4,5], // 85
  // Team 3 — mixed
  MIKE:        [5,4,4,4,5,3,5,4,5, 4,3,5,5,4,4,4,4,5], // 77
  CARLOS:      [5,4,3,4,5,4,4,4,5, 4,3,4,6,3,4,4,4,5], // 75 (low man)
  TONY:        [7,5,4,6,5,4,6,5,7, 5,4,6,6,5,5,5,5,7], // 97
  DAVE:        [6,5,4,4,5,3,5,5,6, 5,3,5,5,4,5,4,5,6], // 85
}

// ── TEAMS ─────────────────────────────────────────────────────────
const TEAMS_8 = [
  {name:"Team 1", players:["JEREMIAS","DVP","CRIBBY","TRANQUILINO"]},
  {name:"Team 2", players:["AL","FREDDY","SKIP","STONEY"]},
]
const TEAMS_12 = [
  {name:"Team 1", players:["JEREMIAS","DVP","CRIBBY","TRANQUILINO"]},
  {name:"Team 2", players:["AL","FREDDY","SKIP","STONEY"]},
  {name:"Team 3", players:["MIKE","CARLOS","TONY","DAVE"]},
]

// ── MATCHES ───────────────────────────────────────────────────────
const MATCHES_8 = [
  {type:'PvP',sideA:'AL',sideB:'JEREMIAS',nassau:5,press:5,birdie:2,eagle:5,scoringType:'NET',autoPress:true},
  {type:'PvP',sideA:'DVP',sideB:'STONEY',nassau:10,press:10,birdie:3,eagle:6,scoringType:'NET',autoPress:false},
  {type:'TvT',sideA:'Team 1',sideB:'Team 2',nassau:10,press:10,birdie:2,eagle:5,scoringType:'NET',autoPress:false},
]
const MATCHES_12 = [
  {type:'PvP',sideA:'AL',sideB:'MIKE',nassau:5,press:5,birdie:2,eagle:5,scoringType:'NET',autoPress:true},
  {type:'PvP',sideA:'CARLOS',sideB:'FREDDY',nassau:10,press:5,birdie:3,eagle:6,scoringType:'GROSS',autoPress:false},
  {type:'PvP',sideA:'JEREMIAS',sideB:'STONEY',nassau:10,press:10,birdie:2,eagle:5,scoringType:'NET',autoPress:true},
  {type:'TvT',sideA:'Team 1',sideB:'Team 2',nassau:10,press:10,birdie:2,eagle:5,scoringType:'NET',autoPress:false},
  {type:'TvT',sideA:'Team 2',sideB:'Team 3',nassau:10,press:10,birdie:2,eagle:5,scoringType:'NET',autoPress:false},
  {type:'TvT',sideA:'Team 1',sideB:'Team 3',nassau:10,press:10,birdie:2,eagle:5,scoringType:'NET',autoPress:false},
]

// ── FORMATS ───────────────────────────────────────────────────────
const FORMAT_JEFFS_BLITZ = {
  name:"Jeff's Blitz",
  par3:[{type:'net'},{type:'net'},{type:'net'}],
  par4:[{type:'net'},{type:'net'}],
  par5:[{type:'net'},{type:'net'}],
}
const FORMAT_1G_2N = {
  name:"1 Gross + 2 Net",
  par3:[{type:'gross'},{type:'net'},{type:'net'}],
  par4:[{type:'gross'},{type:'net'},{type:'net'}],
  par5:[{type:'gross'},{type:'net'},{type:'net'}],
}

const DAY_LABELS = ['Day 1','Day 2','Day 3','Day 4','Day 5']

export default function AdminWizard() {
  // Firebase state
  const [meta, setMeta] = useState<any>({})
  const [course, setCourse] = useState<any>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [teamsHavePlayers, setTeamsHavePlayers] = useState(false)
  const [moneySet, setMoneySet] = useState(false)
  const [formatName, setFormatName] = useState("Jeff's Blitz")
  const [formatCustom, setFormatCustom] = useState(false)
  const [matchupCount, setMatchupCount] = useState(0)
  const [hasAnyData, setHasAnyData] = useState(false)
  const [archivedDays, setArchivedDays] = useState<string[]>([])

  // Trip editing
  const [editingTrip, setEditingTrip] = useState(false)
  const [tripNameInput, setTripNameInput] = useState('')
  const [totalDaysInput, setTotalDaysInput] = useState(1)

  // Mock config
  const [showMockConfig, setShowMockConfig] = useState(false)
  const [mockDays, setMockDays] = useState(1)
  const [mockPlayers, setMockPlayers] = useState<8|12>(12)
  const [mockFormat, setMockFormat] = useState<'blitz'|'1g2n'>('blitz')

  // Actions
  const [loading, setLoading] = useState<string|null>(null)
  const [actionMsg, setActionMsg] = useState<string|null>(null)
  const [showDestructive, setShowDestructive] = useState(false)
  const [transitioningDay, setTransitioningDay] = useState(false)

  useEffect(() => {
    onValue(ref(db,'tournament/meta'), snap => {
      const m = snap.val() || {}
      setMeta(m)
      setTripNameInput(m.tripName || '')
      setTotalDaysInput(m.totalDays || 1)
    })
    onValue(ref(db,'tournament/course'), snap => setCourse(snap.val()))
    onValue(ref(db,'tournament/roster'), snap => setPlayerCount(snap.val() ? Object.keys(snap.val()).length : 0))
    onValue(ref(db,'tournament/teams'), snap => {
      const t = snap.val()
      if (!t) { setTeamCount(0); setTeamsHavePlayers(false); return }
      const teams = Object.values(t) as any[]
      setTeamCount(teams.length)
      setTeamsHavePlayers(teams.some((tm:any) => (tm.playerIds||[]).length > 0))
    })
    onValue(ref(db,'tournament/money'), snap => setMoneySet(!!(snap.val()?.entryFee > 0)))
    onValue(ref(db,'tournament/format'), snap => {
      if (snap.val()) {
        setFormatCustom(snap.val().name !== "Jeff's Blitz")
        setFormatName(snap.val().name || "Jeff's Blitz")
      }
    })
    onValue(ref(db,'tournament/matchups'), snap => setMatchupCount(snap.val() ? Object.keys(snap.val()).length : 0))
    onValue(ref(db,'tournament'), snap => setHasAnyData(!!snap.val()))
    onValue(ref(db,'history'), snap => {
      if (!snap.val()) { setArchivedDays([]); return }
      const days: string[] = []
      Object.values(snap.val()).forEach((h:any) => { if (h._meta?.dayLabel) days.push(h._meta.dayLabel) })
      setArchivedDays(days)
    })
  }, [])

  const flash = (msg:string) => { setActionMsg(msg); setTimeout(()=>setActionMsg(null), 5000) }

  const saveTripMeta = async () => {
    await set(ref(db,'tournament/meta'), {
      ...meta,
      tripName: tripNameInput.trim(),
      totalDays: totalDaysInput,
      currentDay: meta.currentDay || 'Day 1',
      isMock: meta.isMock || false,
    })
    setEditingTrip(false)
    flash('✓ Trip setup saved.')
  }

  const clearData = async (type:'mock'|'archive') => {
    if (type === 'mock') {
      if (!confirm("CLEAR ALL MOCK DATA?")) return
      setLoading('clear')
      await set(ref(db,'tournament'), null)
      flash("✓ Mock data cleared.")
    } else {
      const pw = prompt("ADMIN PASSWORD:")
      if (pw !== "jeff") return alert("ACCESS DENIED")
      if (!confirm("ARCHIVE current tournament, then wipe everything?")) return
      setLoading('clear')
      const snap = await get(ref(db,'tournament'))
      if (snap.exists()) await set(ref(db,`history/${Date.now()}`), snap.val())
      await set(ref(db,'tournament'), null)
      flash("✓ Archived to History. Ready for fresh setup.")
    }
    setLoading(null)
  }

  const startNextDay = async () => {
    const currentIdx = DAY_LABELS.indexOf(meta.currentDay || 'Day 1')
    const nextDay = DAY_LABELS[Math.min(currentIdx + 1, DAY_LABELS.length - 1)]
    if (!confirm(`CLOSE ${(meta.currentDay||'Day 1').toUpperCase()} AND START ${nextDay.toUpperCase()}?\n\nArchives today and wipes scores + matchups. Teams and course stay.`)) return
    setTransitioningDay(true)
    const snap = await get(ref(db,'tournament'))
    if (snap.exists()) {
      await set(ref(db,`history/${Date.now()}`), {
        ...snap.val(),
        _meta: { tripName: meta.tripName, dayLabel: meta.currentDay, archivedAt: Date.now(), isFinal: false }
      })
    }
    await set(ref(db,'tournament/scores'), null)
    await set(ref(db,'tournament/matchups'), null)
    await set(ref(db,'tournament/meta'), { ...meta, currentDay: nextDay, isMock: false })
    flash(`✓ ${meta.currentDay} archived. Set up matchups for ${nextDay} then go live.`)
    setTransitioningDay(false)
  }

  // ── MOCK LOADER ──────────────────────────────────────────────────
  const loadMock = async () => {
    const formatLabel = mockFormat === 'blitz' ? "Jeff's Blitz" : "1 Gross + 2 Net"
    const teamCount = mockPlayers === 8 ? 2 : 3
    if (!confirm(`LOAD MOCK TOURNAMENT?\n\n• MCC Course\n• ${mockPlayers} players · ${teamCount} teams\n• ${mockDays} day${mockDays>1?'s':''}\n• Format: ${formatLabel}\n\nThis will overwrite all current data.`)) return

    setLoading('mock')
    setShowMockConfig(false)

    // Wipe and set course + meta
    await set(ref(db,'tournament'), null)
    await set(ref(db,'tournament/course'), MCC_COURSE)
    await set(ref(db,'tournament/meta'), {
      isMock: true,
      tripName: `MCC Test · ${formatLabel}`,
      totalDays: mockDays,
      currentDay: 'Day 1',
    })
    await set(ref(db,'tournament/format'), mockFormat === 'blitz' ? FORMAT_JEFFS_BLITZ : FORMAT_1G_2N)

    // Players
    const players = ALL_PLAYERS.slice(0, mockPlayers)
    const teams = mockPlayers === 8 ? TEAMS_8 : TEAMS_12
    const matches = mockPlayers === 8 ? MATCHES_8 : MATCHES_12

    const playerIdMap: Record<string,string> = {}
    for (const p of players) {
      const pRef = push(ref(db,'tournament/roster'))
      await set(pRef, { id: pRef.key, name: p.name, handicap: p.handicap })
      playerIdMap[p.name] = pRef.key!
    }

    // Teams
    for (const t of teams) {
      const tRef = push(ref(db,'tournament/teams'))
      await set(tRef, { id: tRef.key, name: t.name, playerIds: t.players.map(n => playerIdMap[n]) })
    }

    // Scores
    const scoresData: Record<string,number[]> = {}
    for (const p of players) {
      const pid = playerIdMap[p.name]
      if (pid && ALL_SCORES[p.name]) scoresData[pid] = ALL_SCORES[p.name]
    }
    await set(ref(db,'tournament/scores'), scoresData)

    // Matches
    for (const m of matches) {
      const mRef = push(ref(db,'tournament/matchups'))
      await set(mRef, { id: mRef.key, ...m })
    }

    // Money
    await set(ref(db,'tournament/money'), { entryFee: 25, skinsAllocation: 10 })

    // If multi-day, seed Day 1 archive and set to Day 2
    if (mockDays > 1) {
      const snap = await get(ref(db,'tournament'))
      if (snap.exists()) {
        await set(ref(db,`history/${Date.now()}`), {
          ...snap.val(),
          _meta: { tripName: `MCC Test · ${formatLabel}`, dayLabel: 'Day 1', archivedAt: Date.now(), isFinal: false }
        })
      }
      await set(ref(db,'tournament/scores'), null)
      await set(ref(db,'tournament/matchups'), null)
      await set(ref(db,'tournament/meta'), {
        isMock: true,
        tripName: `MCC Test · ${formatLabel}`,
        totalDays: mockDays,
        currentDay: 'Day 2',
      })
      flash(`✓ Mock loaded · ${mockPlayers} players · ${formatLabel} · Day 1 archived · Now on Day 2`)
    } else {
      flash(`✓ Mock loaded · ${mockPlayers} players · ${formatLabel} · Check scorer, payouts, and results`)
    }

    setLoading(null)
  }

  // ── STEP STATUS ──────────────────────────────────────────────────
  const tripReady = !!(meta.tripName && meta.totalDays > 0)
  const courseReady = !!(course?.holes?.length === 18)
  const rosterReady = playerCount > 0 && teamCount > 0 && teamsHavePlayers
  const moneyReady = moneySet
  const matchupsReady = matchupCount > 0
  const stepsComplete = [tripReady,courseReady,rosterReady,moneyReady,matchupsReady].filter(Boolean).length
  const allComplete = tripReady && courseReady && rosterReady && moneyReady && matchupsReady
  const currentDayIdx = DAY_LABELS.indexOf(meta.currentDay || 'Day 1')
  const canGoNextDay = tripReady && (currentDayIdx + 1) < (meta.totalDays || 1)

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase italic">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/setup" className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors">
          <ArrowLeft size={16}/> SETUP
        </Link>
        <span className="font-black text-sm tracking-widest text-zinc-400">TOURNAMENT WIZARD</span>
        <div className="w-20"/>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-3">

        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert size={26} className="text-rose-500"/>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Setup Checklist</h1>
            <p className="text-zinc-600 text-[10px] font-black tracking-widest normal-case">Complete all steps to unlock the scorer</p>
          </div>
        </div>

        {actionMsg && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl text-sm font-black">
            {actionMsg}
          </div>
        )}

        {/* ── ARCHIVE + RESET — TOP ── */}
        {hasAnyData && (
          <div className={`rounded-2xl border-2 p-5 ${meta.isMock ? 'border-amber-500/40 bg-amber-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black tracking-widest text-zinc-500">
                {meta.isMock ? '⚠ MOCK DATA LOADED' : `${meta.tripName ? meta.tripName.toUpperCase() : 'TOURNAMENT'} IN PROGRESS`}
              </p>
              {meta.currentDay && !meta.isMock && (
                <span className="text-[10px] font-black text-blue-400 bg-blue-500/20 px-2 py-1 rounded-lg">{meta.currentDay}</span>
              )}
            </div>
            <button
              onClick={() => clearData(meta.isMock ? 'mock' : 'archive')}
              disabled={loading === 'clear'}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${
                meta.isMock
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-400'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-400'
              }`}
            >
              {loading === 'clear' ? <Loader2 size={12} className="animate-spin"/> : meta.isMock ? <Trash2 size={12}/> : <Archive size={12}/>}
              {meta.isMock ? 'CLEAR MOCK DATA' : 'ARCHIVE + FULL RESET'}
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-700" style={{width:`${(stepsComplete/5)*100}%`}}/>
        </div>
        <div className="flex justify-between text-[9px] font-black text-zinc-600 tracking-widest px-0.5">
          <span>SETUP PROGRESS</span><span>{stepsComplete} / 5 COMPLETE</span>
        </div>

        {/* ── STEP 1: TRIP ── */}
        <StepCard number={1} title="Trip Setup" icon={<Calendar size={18}/>}
          status={tripReady?'complete':'empty'}
          summary={tripReady?`${meta.tripName} · ${meta.totalDays} Day${meta.totalDays>1?'s':''}`:'No trip configured'}
        >
          {editingTrip ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-1.5">TRIP NAME</label>
                <input value={tripNameInput} onChange={e=>setTripNameInput(e.target.value)} className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none text-base transition-colors" placeholder="E.G. CABO 2026"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-1.5">NUMBER OF DAYS</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={()=>setTotalDaysInput(n)} className={`w-11 h-11 rounded-xl font-black text-lg transition-all border-2 ${totalDaysInput===n?'bg-emerald-500 border-emerald-400 text-black':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveTripMeta} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors"><Save size={14}/> SAVE</button>
                <button onClick={()=>setEditingTrip(false)} className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2.5 rounded-xl font-black text-sm transition-colors">CANCEL</button>
              </div>
            </div>
          ) : tripReady ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-black">{meta.tripName}</div>
                  <div className="text-zinc-500 text-[10px] font-black mt-0.5">{meta.totalDays} Day{meta.totalDays>1?'s':''}</div>
                </div>
                <button onClick={()=>setEditingTrip(true)} className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></button>
              </div>
              {meta.totalDays > 1 && (
                <div>
                  <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">TOURNAMENT DAYS</p>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({length:meta.totalDays},(_,i) => {
                      const dayLabel = DAY_LABELS[i]
                      const isArchived = archivedDays.includes(dayLabel)
                      const isCurrent = meta.currentDay === dayLabel
                      return (
                        <div key={i} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-black text-xs ${
                          isArchived ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' :
                          isCurrent ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' :
                          'border-zinc-800 bg-black text-zinc-600'
                        }`}>
                          {isArchived ? <CheckCircle2 size={12}/> : isCurrent ? <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/> : <Circle size={12}/>}
                          {dayLabel}
                          {isCurrent && <span className="text-[9px]">← NOW</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {canGoNextDay && (
                <button onClick={startNextDay} disabled={transitioningDay}
                  className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
                  <span className="flex items-center gap-2">
                    {transitioningDay ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>}
                    CLOSE {meta.currentDay?.toUpperCase()} · START {DAY_LABELS[currentDayIdx+1]?.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-blue-600">ARCHIVES + RESETS SCORES</span>
                </button>
              )}
            </div>
          ) : (
            <button onClick={()=>setEditingTrip(true)} className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Calendar size={14}/> SET UP TRIP</span><ChevronRight size={14}/>
            </button>
          )}
        </StepCard>

        {/* ── STEP 2: COURSE ── */}
        <StepCard number={2} title="Course Setup" icon={<Flag size={18}/>} status={courseReady?'complete':'empty'} summary={courseReady?`${course?.name} · Par ${(course?.pars||[]).reduce((a:number,b:number)=>a+b,0)}`:'No course set'}>
          {courseReady ? (
            <div className="flex items-center justify-between">
              <div><div className="text-white font-black">{course?.name}</div><div className="text-zinc-500 text-[10px] font-black mt-0.5">Par {(course?.pars||[]).reduce((a:number,b:number)=>a+b,0)} · 18 holes</div></div>
              <Link href="/setup/settings" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/settings" className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Flag size={14}/> SET UP COURSE</span><ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 3: ROSTER ── */}
        <StepCard number={3} title="Roster & Teams" icon={<Users size={18}/>} status={rosterReady?'complete':'empty'} summary={playerCount>0?`${playerCount} players · ${teamCount} teams`:'No players yet'}>
          {rosterReady ? (
            <div className="flex items-center justify-between">
              <div><div className="text-white font-black">{playerCount} Players · {teamCount} Teams</div><div className="text-zinc-500 text-[10px] font-black mt-0.5">All players assigned</div></div>
              <Link href="/setup/roster" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/roster" className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Users size={14}/> BUILD ROSTER & TEAMS</span><ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 4: MONEY ── */}
        <StepCard number={4} title="Money & Pots" icon={<DollarSign size={18}/>} status={moneyReady?'complete':'empty'} summary={moneyReady?'Entry fee configured':'Not configured'}>
          {moneyReady ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">Entry fee configured</div>
              <Link href="/setup/money" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/money" className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><DollarSign size={14}/> CONFIGURE MONEY</span><ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 5: FORMAT ── */}
        <StepCard number={5} title="Team Scoring Format" icon={<Layers size={18}/>} status="complete" summary={formatCustom?formatName:"Jeff's Blitz (Default)"}>
          <div className="flex items-center justify-between">
            <div><div className="text-white font-black text-sm">{formatName}</div><div className="text-zinc-500 text-[10px] font-black mt-0.5">{formatCustom?'Custom format':'Default · Best 2 Net (Best 3 on Par 3)'}</div></div>
            <Link href="/setup/format" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">{formatCustom?'EDIT':'CONFIGURE'} <ChevronRight size={14}/></Link>
          </div>
        </StepCard>

        {/* ── STEP 6: MATCHUPS ── */}
        <StepCard number={6} title="Side Bets & Matches" icon={<Sword size={18}/>} status={matchupsReady?'complete':'empty'} summary={matchupsReady?`${matchupCount} match${matchupCount>1?'es':''} configured`:'No matches set up'}>
          {matchupsReady ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">{matchupCount} match{matchupCount>1?'es':''} configured</div>
              <Link href="/setup/matchups" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/matchups" className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Sword size={14}/> SET UP MATCHES</span><ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── GO LIVE ── */}
        <div className={`mt-4 rounded-[2rem] border-2 p-6 transition-all ${allComplete?'bg-emerald-950/40 border-emerald-500/60':'bg-zinc-900/40 border-zinc-800'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${allComplete?'bg-emerald-500 text-black':'bg-zinc-800 text-zinc-600'}`}>
              {allComplete?<Play size={14}/>:'7'}
            </div>
            <div>
              <h3 className={`font-black text-base ${allComplete?'text-emerald-400':'text-zinc-600'}`}>GO LIVE</h3>
              <p className="text-[10px] font-black text-zinc-600 tracking-wider">{allComplete?'All set · Ready to start scoring':'Complete steps 1–6 above'}</p>
            </div>
          </div>
          <Link href="/scorer" className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl ${allComplete?'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20':'bg-zinc-800 text-zinc-600 pointer-events-none'}`}>
            <Play size={22}/> {meta.currentDay?`START ${meta.currentDay.toUpperCase()}`:'START TOURNAMENT'}
          </Link>
        </div>

        {/* ── MOCK GENERATOR ── */}
        <div className="pt-4 border-t border-zinc-900">
          <p className="text-[9px] text-zinc-700 font-black tracking-widest text-center mb-3">TESTING & DEVELOPMENT</p>

          {/* Toggle config */}
          <button
            onClick={() => setShowMockConfig(!showMockConfig)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 py-3 px-5 rounded-2xl font-black text-sm text-zinc-400 hover:text-white flex items-center justify-between transition-all mb-2"
          >
            <span className="flex items-center gap-3"><FlaskConical size={16} className="text-zinc-500"/> LOAD MOCK TOURNAMENT</span>
            <Settings2 size={14} className={`transition-transform ${showMockConfig?'rotate-90':''} text-zinc-600`}/>
          </button>

          {/* Config panel */}
          {showMockConfig && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 mb-2">
              <p className="text-[9px] font-black text-zinc-500 tracking-widest">MCC · CONFIGURE MOCK</p>

              {/* Days */}
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">DAYS</label>
                <div className="flex gap-2">
                  {[1,2,3].map(d => (
                    <button key={d} onClick={()=>setMockDays(d)}
                      className={`flex-1 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${mockDays===d?'bg-emerald-500 border-emerald-400 text-black':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                      {d} {d===1?'Day':'Days'}
                    </button>
                  ))}
                </div>
                {mockDays > 1 && <p className="text-[9px] text-zinc-700 font-black mt-1.5 normal-case">Day 1 will be auto-archived. You'll start on Day 2.</p>}
              </div>

              {/* Players */}
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">FIELD SIZE</label>
                <div className="flex gap-2">
                  <button onClick={()=>setMockPlayers(8)} className={`flex-1 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${mockPlayers===8?'bg-blue-600 border-blue-500 text-white':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    8 Players · 2 Teams
                  </button>
                  <button onClick={()=>setMockPlayers(12)} className={`flex-1 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${mockPlayers===12?'bg-blue-600 border-blue-500 text-white':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    12 Players · 3 Teams
                  </button>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">TEAM FORMAT</label>
                <div className="flex gap-2">
                  <button onClick={()=>setMockFormat('blitz')} className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${mockFormat==='blitz'?'bg-emerald-500 border-emerald-400 text-black':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    ⭐ Jeff's Blitz
                  </button>
                  <button onClick={()=>setMockFormat('1g2n')} className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${mockFormat==='1g2n'?'bg-purple-500 border-purple-400 text-white':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    1 Gross + 2 Net
                  </button>
                </div>
              </div>

              {/* Load button */}
              <button
                onClick={loadMock}
                disabled={loading === 'mock'}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {loading === 'mock' ? <><Loader2 size={18} className="animate-spin"/> LOADING...</> : <><FlaskConical size={18}/> LOAD MOCK</>}
              </button>

              {/* What gets loaded */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black text-zinc-700 tracking-widest">
                <div className="bg-black/50 rounded-lg p-2">MCC COURSE</div>
                <div className="bg-black/50 rounded-lg p-2">{mockPlayers} PLAYERS · {mockPlayers===8?2:3} TEAMS</div>
                <div className="bg-black/50 rounded-lg p-2">FULL 18-HOLE SCORES</div>
                <div className="bg-black/50 rounded-lg p-2">{mockPlayers===8?'3':'6'} MATCHES</div>
              </div>
            </div>
          )}
        </div>

        {/* ── DESTRUCTIVE ── */}
        <div>
          <button onClick={()=>setShowDestructive(!showDestructive)} className="w-full text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[0.3em] py-3 transition-colors">
            {showDestructive?'▲ HIDE':'▼ SHOW'} DESTRUCTIVE COMMANDS
          </button>
          {showDestructive && (
            <div className="space-y-2 pt-1">
              <button onClick={async()=>{const pw=prompt("ADMIN PASSWORD:");if(pw!=="jeff")return alert("ACCESS DENIED");if(!confirm("WIPE SCORES ONLY?"))return;await set(ref(db,'tournament/scores'),null);flash("✓ Scores wiped.")}} className="w-full bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 text-amber-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all">
                <span><Eraser size={12} className="inline mr-2"/>WIPE SCORES ONLY</span>
                <span className="text-amber-800 text-[9px]">KEEPS TEAMS & BETS</span>
              </button>
              <button onClick={async()=>{const pw=prompt("ADMIN PASSWORD:");if(pw!=="jeff")return alert("ACCESS DENIED");if(!confirm("FULL RESET?"))return;await set(ref(db,'tournament/scores'),null);await set(ref(db,'tournament/teams'),null);await set(ref(db,'tournament/matchups'),null);await set(ref(db,'tournament/meta'),null);flash("✓ Full reset.")}} className="w-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 text-rose-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all">
                <span><Trash2 size={12} className="inline mr-2"/>WIPE ALL DATA</span>
                <span className="text-rose-900 text-[9px]">FULL RESET</span>
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[9px] text-zinc-800 font-black tracking-widest pb-8">AUTHORIZED ACCESS ONLY · SENIOR MANAGEMENT CONSOLE</p>
      </div>
    </div>
  )
}

function StepCard({number,title,summary,status,icon,children}:{number:number;title:string;summary:string;status:'complete'|'empty'|'warning';icon:React.ReactNode;children:React.ReactNode}) {
  const isComplete=status==='complete',isWarning=status==='warning'
  return (
    <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${isComplete?'border-emerald-500/40 bg-zinc-950':isWarning?'border-amber-500/40 bg-zinc-950':'border-zinc-800 bg-zinc-950'}`}>
      <div className={`px-5 py-4 flex items-center gap-4 border-b ${isComplete?'border-emerald-500/20':isWarning?'border-amber-500/20':'border-zinc-800'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${isComplete?'bg-emerald-500 text-black':isWarning?'bg-amber-500/30 text-amber-400':'bg-zinc-800 text-zinc-500'}`}>
          {isComplete?<CheckCircle2 size={16}/>:number}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm ${isComplete?'text-emerald-400':isWarning?'text-amber-400':'text-zinc-400'}`}>{title}</div>
          <div className="text-[10px] font-black text-zinc-600 tracking-wider truncate normal-case mt-0.5">{summary}</div>
        </div>
        <div className={`flex-shrink-0 ${isComplete?'text-emerald-500':isWarning?'text-amber-500':'text-zinc-700'}`}>{icon}</div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}