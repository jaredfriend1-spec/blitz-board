"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push, onValue } from 'firebase/database'
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight, Flag, Users,
  DollarSign, Sword, Target, FlaskConical, Loader2, Archive,
  Trash2, Play, RotateCcw, ShieldAlert, Eraser, Calendar,
  Hash, Save, Layers
} from 'lucide-react'
import Link from 'next/link'

// ── MOCK DATA ─────────────────────────────────────────────────────
const MOCK_COURSE = {
  name: "Richland Golf Club",
  holes: [
    {par:5,hcp:15},{par:4,hcp:3},{par:3,hcp:17},{par:4,hcp:7},{par:4,hcp:1},
    {par:3,hcp:9},{par:4,hcp:11},{par:4,hcp:5},{par:5,hcp:13},{par:4,hcp:4},
    {par:3,hcp:8},{par:4,hcp:10},{par:5,hcp:18},{par:3,hcp:14},{par:4,hcp:2},
    {par:4,hcp:16},{par:4,hcp:6},{par:5,hcp:12},
  ],
  pars: [5,4,3,4,4,3,4,4,5,4,3,4,5,3,4,4,4,5]
}
const MOCK_PLAYERS = [
  {name:"JEREMIAS",handicap:18},{name:"DVP",handicap:22},
  {name:"CRIBBY",handicap:20},{name:"TRANQUILINO",handicap:24},
  {name:"AL",handicap:8},{name:"FREDDY",handicap:16},
  {name:"SKIP",handicap:14},{name:"STONEY",handicap:19},
]
const MOCK_SCORES: Record<string,number[]> = {
  JEREMIAS:[6,5,4,4,5,4,5,5,5,5,3,4,5,5,4,3,5,7],
  DVP:[6,4,6,5,5,4,5,4,6,6,4,6,6,6,4,3,5,5],
  CRIBBY:[4,6,5,5,6,4,6,4,5,5,3,6,4,5,4,4,5,7],
  TRANQUILINO:[6,6,4,4,6,4,5,5,6,6,4,5,5,5,5,4,4,6],
  AL:[4,6,4,3,6,4,4,4,4,5,3,4,6,4,5,2,6,6],
  FREDDY:[6,6,4,5,4,4,5,4,5,4,3,5,6,4,4,3,5,7],
  SKIP:[5,7,5,4,5,3,5,5,5,4,3,5,4,5,5,3,6,5],
  STONEY:[6,6,6,4,4,4,4,5,6,5,4,4,6,5,4,3,4,5],
}
const MOCK_TEAMS = [
  {name:"Team 1",players:["JEREMIAS","DVP","CRIBBY","TRANQUILINO"]},
  {name:"Team 2",players:["AL","FREDDY","SKIP","STONEY"]},
]
// ─────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [1, 2, 3, 4, 5]

export default function AdminWizard() {
  // Live Firebase state
  const [meta, setMeta] = useState<any>({})
  const [course, setCourse] = useState<any>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [teamsHavePlayers, setTeamsHavePlayers] = useState(false)
  const [moneySet, setMoneySet] = useState(false)
  const [formatSet, setFormatSet] = useState(false)
  const [formatName, setFormatName] = useState("Jeff's Blitz")
  const [matchupCount, setMatchupCount] = useState(0)
  const [hasAnyData, setHasAnyData] = useState(false)

  // Trip setup inline edit
  const [editingTrip, setEditingTrip] = useState(false)
  const [tripNameInput, setTripNameInput] = useState('')
  const [totalDaysInput, setTotalDaysInput] = useState(1)

  // Actions
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [showDestructive, setShowDestructive] = useState(false)

  useEffect(() => {
    onValue(ref(db, 'tournament/meta'), snap => {
      const m = snap.val() || {}
      setMeta(m)
      setTripNameInput(m.tripName || '')
      setTotalDaysInput(m.totalDays || 1)
    })
    onValue(ref(db, 'tournament/course'), snap => setCourse(snap.val()))
    onValue(ref(db, 'tournament/roster'), snap => {
      const r = snap.val()
      setPlayerCount(r ? Object.keys(r).length : 0)
    })
    onValue(ref(db, 'tournament/teams'), snap => {
      const t = snap.val()
      if (!t) { setTeamCount(0); setTeamsHavePlayers(false); return }
      const teams = Object.values(t) as any[]
      setTeamCount(teams.length)
      setTeamsHavePlayers(teams.some(tm => (tm.playerIds || []).length > 0))
    })
    onValue(ref(db, 'tournament/money'), snap => setMoneySet(!!(snap.val()?.entryFee > 0)))
    onValue(ref(db, 'tournament/format'), snap => {
      if (snap.val()) {
        setFormatSet(true)
        setFormatName(snap.val().name || "Jeff's Blitz")
      } else {
        setFormatSet(false)
        setFormatName("Jeff's Blitz (Default)")
      }
    })
    onValue(ref(db, 'tournament/matchups'), snap => {
      const m = snap.val()
      setMatchupCount(m ? Object.keys(m).length : 0)
    })
    onValue(ref(db, 'tournament'), snap => setHasAnyData(!!snap.val()))
  }, [])

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 4000)
  }

  const saveTripMeta = async () => {
    await set(ref(db, 'tournament/meta'), {
      ...meta,
      tripName: tripNameInput.trim(),
      totalDays: totalDaysInput,
      currentDay: meta.currentDay || 'Day 1',
      isMock: meta.isMock || false,
    })
    setEditingTrip(false)
    flash('✓ Trip setup saved.')
  }

  const clearData = async (type: 'mock' | 'archive') => {
    if (type === 'mock') {
      if (!confirm("CLEAR ALL MOCK DATA? Starts fresh.")) return
      setLoading(true)
      await set(ref(db, 'tournament'), null)
      flash("✓ Mock data cleared.")
      setLoading(false)
    } else {
      const pw = prompt("ADMIN PASSWORD:")
      if (pw !== "jeff") return alert("ACCESS DENIED")
      if (!confirm("ARCHIVE current tournament to History, then wipe?")) return
      setLoading(true)
      const snap = await get(ref(db, 'tournament'))
      if (snap.exists()) await set(ref(db, `history/${Date.now()}`), snap.val())
      await set(ref(db, 'tournament'), null)
      flash("✓ Archived to History. All data cleared.")
      setLoading(false)
    }
  }

  const loadMock = async () => {
    if (!confirm("LOAD MOCK TOURNAMENT? Overwrites all current data.")) return
    setLoading(true)
    await set(ref(db, 'tournament'), null)
    await set(ref(db, 'tournament/course'), MOCK_COURSE)
    await set(ref(db, 'tournament/meta'), { isMock: true, tripName: 'Richland Test', totalDays: 1, currentDay: 'Day 1' })
    const playerIdMap: Record<string,string> = {}
    for (const p of MOCK_PLAYERS) {
      const pRef = push(ref(db, 'tournament/roster'))
      await set(pRef, { id: pRef.key, name: p.name, handicap: p.handicap })
      playerIdMap[p.name] = pRef.key!
    }
    for (const t of MOCK_TEAMS) {
      const tRef = push(ref(db, 'tournament/teams'))
      await set(tRef, { id: tRef.key, name: t.name, playerIds: t.players.map(n => playerIdMap[n]) })
    }
    const scoresData: Record<string,number[]> = {}
    for (const [name, hs] of Object.entries(MOCK_SCORES)) {
      const pid = playerIdMap[name]
      if (pid) scoresData[pid] = hs
    }
    await set(ref(db, 'tournament/scores'), scoresData)
    const pvpRef = push(ref(db, 'tournament/matchups'))
    await set(pvpRef, { id: pvpRef.key, type: 'PvP', sideA: 'AL', sideB: 'FREDDY', nassau: 5, press: 5, birdie: 2, eagle: 5, scoringType: 'NET', autoPress: true })
    const tvtRef = push(ref(db, 'tournament/matchups'))
    await set(tvtRef, { id: tvtRef.key, type: 'TvT', sideA: 'Team 1', sideB: 'Team 2', nassau: 10, press: 10, birdie: 2, eagle: 5, scoringType: 'NET' })
    await set(ref(db, 'tournament/money'), { entryFee: 25, skinsAllocation: 10 })
    flash("✓ Mock tournament loaded. All views ready to test.")
    setLoading(false)
  }

  // ── STEP STATUS ────────────────────────────────────────────────
  const tripReady = !!(meta.tripName && meta.totalDays > 0)
  const courseReady = !!(course?.holes?.length === 18)
  const rosterReady = playerCount > 0 && teamCount > 0 && teamsHavePlayers
  const moneyReady = moneySet
  const formatReady = true // always ready — defaults to Jeff's Blitz
  const matchupsReady = matchupCount > 0
  const stepsComplete = [tripReady, courseReady, rosterReady, moneyReady, matchupsReady].filter(Boolean).length
  const allComplete = tripReady && courseReady && rosterReady && moneyReady && matchupsReady

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase italic">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/setup" className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors">
          <ArrowLeft size={16}/> SETUP
        </Link>
        <span className="font-black text-sm tracking-widest text-zinc-400">TOURNAMENT WIZARD</span>
        <div className="w-20"/>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-3">

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert size={26} className="text-rose-500"/>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Setup Checklist</h1>
            <p className="text-zinc-600 text-[10px] font-black tracking-widest normal-case">
              Complete all steps to unlock the scorer
            </p>
          </div>
        </div>

        {/* Flash message */}
        {actionMsg && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl text-sm font-black">
            {actionMsg}
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(stepsComplete / 5) * 100}%` }}/>
        </div>
        <div className="flex justify-between text-[9px] font-black text-zinc-600 tracking-widest px-0.5">
          <span>SETUP PROGRESS</span>
          <span>{stepsComplete} / 5 COMPLETE</span>
        </div>

        {/* ── STEP 1: TRIP SETUP ── */}
        <StepCard number={1} title="Trip Setup" icon={<Calendar size={18}/>}
          status={tripReady ? 'complete' : 'empty'}
          summary={tripReady ? `${meta.tripName} · ${meta.totalDays} Day${meta.totalDays > 1 ? 's' : ''}` : 'No trip configured'}
        >
          {editingTrip ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-1.5">TRIP NAME</label>
                <input
                  value={tripNameInput}
                  onChange={e => setTripNameInput(e.target.value)}
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none text-base transition-colors"
                  placeholder="E.G. CABO 2026"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-1.5">NUMBER OF DAYS</label>
                <div className="flex gap-2">
                  {DAY_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setTotalDaysInput(n)}
                      className={`w-11 h-11 rounded-xl font-black text-lg transition-all border-2 ${
                        totalDaysInput === n
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveTripMeta}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Save size={14}/> SAVE
                </button>
                <button
                  onClick={() => setEditingTrip(false)}
                  className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2.5 rounded-xl font-black text-sm transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : tripReady ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black">{meta.tripName}</div>
                <div className="text-zinc-500 text-[10px] font-black mt-0.5">
                  {meta.totalDays} Day{meta.totalDays > 1 ? 's' : ''} · Currently {meta.currentDay || 'Day 1'}
                </div>
              </div>
              <button
                onClick={() => setEditingTrip(true)}
                className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400"
              >
                EDIT <ChevronRight size={14}/>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTrip(true)}
              className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2"><Calendar size={14}/> SET UP TRIP</span>
              <ChevronRight size={14}/>
            </button>
          )}
        </StepCard>

        {/* ── STEP 1b: RESET (inline, subtle) ── */}
        {hasAnyData && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 space-y-2">
            <p className="text-[9px] font-black text-zinc-600 tracking-widest">EXISTING DATA DETECTED</p>
            <div className="flex gap-2">
              {meta.isMock ? (
                <button
                  onClick={() => clearData('mock')}
                  disabled={loading}
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 size={12}/> CLEAR MOCK DATA
                </button>
              ) : (
                <button
                  onClick={() => clearData('archive')}
                  disabled={loading}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Archive size={12}/> ARCHIVE + RESET
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: COURSE ── */}
        <StepCard number={2} title="Course Setup" icon={<Flag size={18}/>}
          status={courseReady ? 'complete' : 'empty'}
          summary={courseReady ? `${course?.name} · Par ${(course?.pars||[]).reduce((a:number,b:number)=>a+b,0)}` : 'No course set'}
        >
          {courseReady ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black">{course?.name}</div>
                <div className="text-zinc-500 text-[10px] font-black mt-0.5">
                  Par {(course?.pars||[]).reduce((a:number,b:number)=>a+b,0)} · 18 holes
                </div>
              </div>
              <Link href="/setup/settings" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/settings" className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Flag size={14}/> SET UP COURSE</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 3: ROSTER ── */}
        <StepCard number={3} title="Roster & Teams" icon={<Users size={18}/>}
          status={rosterReady ? 'complete' : 'empty'}
          summary={playerCount > 0 ? `${playerCount} players · ${teamCount} teams` : 'No players yet'}
        >
          {rosterReady ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black">{playerCount} Players · {teamCount} Teams</div>
                <div className="text-zinc-500 text-[10px] font-black mt-0.5">All players assigned</div>
              </div>
              <Link href="/setup/roster" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/roster" className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Users size={14}/> BUILD ROSTER & TEAMS</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 4: MONEY ── */}
        <StepCard number={4} title="Money & Pots" icon={<DollarSign size={18}/>}
          status={moneyReady ? 'complete' : 'empty'}
          summary={moneyReady ? 'Entry fee configured' : 'Not configured'}
        >
          {moneyReady ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">Entry fee configured</div>
              <Link href="/setup/money" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/money" className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><DollarSign size={14}/> CONFIGURE MONEY</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 5: TEAM FORMAT ── */}
        <StepCard number={5} title="Team Scoring Format" icon={<Layers size={18}/>}
          status="complete"
          summary={formatSet ? formatName : "Jeff's Blitz (Default)"}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-black text-sm">{formatSet ? formatName : "Jeff's Blitz"}</div>
              <div className="text-zinc-500 text-[10px] font-black mt-0.5">
                {formatSet ? 'Custom format active' : 'Default · Best 2 Net (Best 3 on Par 3)'}
              </div>
            </div>
            <Link href="/setup/format" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">
              {formatSet ? 'EDIT' : 'CONFIGURE'} <ChevronRight size={14}/>
            </Link>
          </div>
        </StepCard>

        {/* ── STEP 6: MATCHUPS ── */}
        <StepCard number={6} title="Side Bets & Matches" icon={<Sword size={18}/>}
          status={matchupsReady ? 'complete' : 'empty'}
          summary={matchupsReady ? `${matchupCount} match${matchupCount > 1 ? 'es' : ''} configured` : 'No matches set up'}
        >
          {matchupsReady ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">{matchupCount} match{matchupCount > 1 ? 'es' : ''} configured</div>
              <Link href="/setup/matchups" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">EDIT <ChevronRight size={14}/></Link>
            </div>
          ) : (
            <Link href="/setup/matchups" className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all">
              <span className="flex items-center gap-2"><Sword size={14}/> SET UP MATCHES</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── GO LIVE ── */}
        <div className={`mt-4 rounded-[2rem] border-2 p-6 transition-all ${allComplete ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-zinc-900/40 border-zinc-800'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${allComplete ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-600'}`}>
              {allComplete ? <Play size={14}/> : '7'}
            </div>
            <div>
              <h3 className={`font-black text-base ${allComplete ? 'text-emerald-400' : 'text-zinc-600'}`}>GO LIVE</h3>
              <p className="text-[10px] font-black text-zinc-600 tracking-wider">
                {allComplete ? 'All set · Ready to start scoring' : 'Complete steps 1–6 above'}
              </p>
            </div>
          </div>
          <Link
            href="/scorer"
            className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl ${
              allComplete
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-600 pointer-events-none'
            }`}
          >
            <Play size={22}/> START TOURNAMENT
          </Link>
        </div>

        {/* ── TESTING ── */}
        <div className="pt-4 border-t border-zinc-900">
          <p className="text-[9px] text-zinc-700 font-black tracking-widest text-center mb-3">TESTING & DEVELOPMENT</p>
          <button
            onClick={loadMock}
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 py-3 px-5 rounded-2xl font-black text-sm text-zinc-400 hover:text-white flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-3">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <FlaskConical size={16} className="text-zinc-500"/>}
              LOAD MOCK TOURNAMENT
            </span>
            <span className="text-[9px] text-zinc-600 normal-case font-black">8 players · full scores</span>
          </button>
        </div>

        {/* ── DESTRUCTIVE ── */}
        <div>
          <button
            onClick={() => setShowDestructive(!showDestructive)}
            className="w-full text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[0.3em] py-3 transition-colors"
          >
            {showDestructive ? '▲ HIDE' : '▼ SHOW'} DESTRUCTIVE COMMANDS
          </button>
          {showDestructive && (
            <div className="space-y-2 pt-1">
              <button
                onClick={async () => {
                  const pw = prompt("ADMIN PASSWORD:")
                  if (pw !== "jeff") return alert("ACCESS DENIED")
                  if (!confirm("WIPE SCORES ONLY? Teams and matches stay.")) return
                  await set(ref(db, 'tournament/scores'), null)
                  flash("✓ Scores wiped.")
                }}
                className="w-full bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 text-amber-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all"
              >
                <span><Eraser size={12} className="inline mr-2"/>WIPE SCORES ONLY</span>
                <span className="text-amber-800 text-[9px]">KEEPS TEAMS & BETS</span>
              </button>
              <button
                onClick={async () => {
                  const pw = prompt("ADMIN PASSWORD:")
                  if (pw !== "jeff") return alert("ACCESS DENIED")
                  if (!confirm("FULL RESET: Wipes scores, teams, matchups. Roster stays.")) return
                  await set(ref(db, 'tournament/scores'), null)
                  await set(ref(db, 'tournament/teams'), null)
                  await set(ref(db, 'tournament/matchups'), null)
                  await set(ref(db, 'tournament/meta'), null)
                  flash("✓ Full reset. Roster preserved.")
                }}
                className="w-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 text-rose-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all"
              >
                <span><Trash2 size={12} className="inline mr-2"/>WIPE ALL DATA</span>
                <span className="text-rose-900 text-[9px]">FULL RESET</span>
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[9px] text-zinc-800 font-black tracking-widest pb-8">
          AUTHORIZED ACCESS ONLY · SENIOR MANAGEMENT CONSOLE
        </p>
      </div>
    </div>
  )
}

// ── STEP CARD COMPONENT ───────────────────────────────────────────
type StepStatus = 'complete' | 'empty' | 'warning'

function StepCard({ number, title, summary, status, icon, children }: {
  number: number
  title: string
  summary: string
  status: StepStatus
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const isComplete = status === 'complete'
  const isWarning = status === 'warning'

  return (
    <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${
      isComplete ? 'border-emerald-500/40 bg-zinc-950' :
      isWarning ? 'border-amber-500/40 bg-zinc-950' :
      'border-zinc-800 bg-zinc-950'
    }`}>
      <div className={`px-5 py-4 flex items-center gap-4 border-b ${
        isComplete ? 'border-emerald-500/20' :
        isWarning ? 'border-amber-500/20' :
        'border-zinc-800'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
          isComplete ? 'bg-emerald-500 text-black' :
          isWarning ? 'bg-amber-500/30 text-amber-400' :
          'bg-zinc-800 text-zinc-500'
        }`}>
          {isComplete ? <CheckCircle2 size={16}/> : number}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm ${isComplete ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'}`}>
            {title}
          </div>
          <div className="text-[10px] font-black text-zinc-600 tracking-wider truncate normal-case mt-0.5">
            {summary}
          </div>
        </div>
        <div className={`flex-shrink-0 ${isComplete ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-zinc-700'}`}>
          {icon}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}