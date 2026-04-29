"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push, onValue } from 'firebase/database'
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight, Flag, Users,
  DollarSign, Sword, Target, FlaskConical, Loader2, AlertTriangle,
  Archive, Trash2, Play, RotateCcw, ShieldAlert
} from 'lucide-react'
import Link from 'next/link'

// ── MOCK DATA ─────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────

type StepStatus = 'complete' | 'warning' | 'empty'

interface TournamentState {
  isMock: boolean
  hasAnyData: boolean
  course: any
  playerCount: number
  teamCount: number
  teamsHavePlayers: boolean
  moneySet: boolean
  matchupCount: number
}

export default function AdminWizard() {
  const [state, setState] = useState<TournamentState>({
    isMock: false, hasAnyData: false, course: null,
    playerCount: 0, teamCount: 0, teamsHavePlayers: false,
    moneySet: false, matchupCount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [showDestructive, setShowDestructive] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)

  useEffect(() => {
    // Watch all relevant Firebase nodes
    const unsubs: (() => void)[] = []

    let s = { ...state }

    unsubs.push(onValue(ref(db, 'tournament/meta'), snap => {
      s = { ...s, isMock: snap.val()?.isMock === true }
      setState(prev => ({ ...prev, isMock: snap.val()?.isMock === true }))
    }))

    unsubs.push(onValue(ref(db, 'tournament/course'), snap => {
      const c = snap.val()
      setState(prev => ({ ...prev, course: c || null }))
    }))

    unsubs.push(onValue(ref(db, 'tournament/roster'), snap => {
      const r = snap.val()
      const count = r ? Object.keys(r).length : 0
      setState(prev => ({ ...prev, playerCount: count }))
    }))

    unsubs.push(onValue(ref(db, 'tournament/teams'), snap => {
      const t = snap.val()
      if (!t) { setState(prev => ({ ...prev, teamCount: 0, teamsHavePlayers: false })); return }
      const teams = Object.values(t) as any[]
      const hasPlayers = teams.some(tm => (tm.playerIds || []).length > 0)
      setState(prev => ({ ...prev, teamCount: teams.length, teamsHavePlayers: hasPlayers }))
    }))

    unsubs.push(onValue(ref(db, 'tournament/money'), snap => {
      const m = snap.val()
      setState(prev => ({ ...prev, moneySet: !!(m?.entryFee > 0) }))
    }))

    unsubs.push(onValue(ref(db, 'tournament/matchups'), snap => {
      const m = snap.val()
      const count = m ? Object.keys(m).length : 0
      setState(prev => ({ ...prev, matchupCount: count }))
    }))

    // Check if any tournament data exists at all
    unsubs.push(onValue(ref(db, 'tournament'), snap => {
      setState(prev => ({ ...prev, hasAnyData: !!snap.val() }))
    }))

    return () => {} // Firebase onValue cleans up on component unmount
  }, [])

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 4000)
  }

  const clearMockData = async () => {
    if (!confirm("CLEAR ALL MOCK DATA? This will wipe the entire tournament node and start fresh.")) return
    setLoading(true)
    await set(ref(db, 'tournament'), null)
    flash("✓ Mock data cleared. Start building your tournament below.")
    setLoading(false)
  }

  const archiveAndReset = async () => {
    const pw = prompt("ENTER ADMIN PASSWORD TO ARCHIVE AND RESET:")
    if (pw !== "jeff") return alert("ACCESS DENIED")
    if (!confirm("ARCHIVE current tournament to History, then wipe all tournament data?")) return
    setLoading(true)
    const snap = await get(ref(db, 'tournament'))
    if (snap.exists()) {
      await set(ref(db, `history/${Date.now()}`), snap.val())
    }
    await set(ref(db, 'tournament'), null)
    flash("✓ Tournament archived to History. All data cleared.")
    setLoading(false)
  }

  const loadMock = async () => {
    if (!confirm("LOAD MOCK TOURNAMENT? Overwrites all current data.")) return
    setLoading(true)
    await set(ref(db, 'tournament'), null)
    await set(ref(db, 'tournament/course'), MOCK_COURSE)
    await set(ref(db, 'tournament/meta'), { isMock: true })
    await set(ref(db, 'tournament/roster'), null)
    const playerIdMap: Record<string, string> = {}
    for (const p of MOCK_PLAYERS) {
      const pRef = push(ref(db, 'tournament/roster'))
      await set(pRef, { id: pRef.key, name: p.name, handicap: p.handicap })
      playerIdMap[p.name] = pRef.key!
    }
    for (const t of MOCK_TEAMS) {
      const tRef = push(ref(db, 'tournament/teams'))
      await set(tRef, { id: tRef.key, name: t.name, playerIds: t.players.map(n => playerIdMap[n]) })
    }
    const scoresData: Record<string, number[]> = {}
    for (const [name, hs] of Object.entries(MOCK_SCORES)) {
      const pid = playerIdMap[name]
      if (pid) scoresData[pid] = hs
    }
    await set(ref(db, 'tournament/scores'), scoresData)
    const pvpRef = push(ref(db, 'tournament/matchups'))
    await set(pvpRef, { id: pvpRef.key, type: 'PvP', sideA: 'AL', sideB: 'FREDDY', nassau: 5, press: 5, birdie: 2, eagle: 5, scoringType: 'NET' })
    const tvtRef = push(ref(db, 'tournament/matchups'))
    await set(tvtRef, { id: tvtRef.key, type: 'TvT', sideA: 'Team 1', sideB: 'Team 2', nassau: 10, press: 10, birdie: 2, eagle: 5, scoringType: 'NET' })
    await set(ref(db, 'tournament/money'), { entryFee: 25, skinsAllocation: 10 })
    flash("✓ Mock tournament loaded. All views are ready to test.")
    setLoading(false)
  }

  // ── STEP COMPLETION LOGIC ──────────────────────────────────────────
  const step1Status: StepStatus = state.hasAnyData ? (state.isMock ? 'warning' : 'warning') : 'complete'
  const step2Status: StepStatus = state.course?.holes?.length === 18 ? 'complete' : 'empty'
  const step3Status: StepStatus = (state.playerCount > 0 && state.teamCount > 0 && state.teamsHavePlayers) ? 'complete' : 'empty'
  const step4Status: StepStatus = state.moneySet ? 'complete' : 'empty'
  const step5Status: StepStatus = state.matchupCount > 0 ? 'complete' : 'empty'
  const allComplete = step2Status === 'complete' && step3Status === 'complete' && step4Status === 'complete' && step5Status === 'complete'

  // ── STEP SUMMARIES ─────────────────────────────────────────────────
  const step1Summary = !state.hasAnyData
    ? "No existing data — ready to set up"
    : state.isMock
    ? `⚠ Mock tournament data is loaded`
    : `⚠ Real tournament data exists`

  const step2Summary = state.course?.name
    ? `${state.course.name} · Par ${(state.course.pars || []).reduce((a: number, b: number) => a + b, 0)}`
    : "No course configured"

  const step3Summary = state.playerCount > 0
    ? `${state.playerCount} players · ${state.teamCount} teams`
    : "No players or teams yet"

  const step4Summary = state.moneySet ? "Entry fee configured" : "Not configured"

  const step5Summary = state.matchupCount > 0
    ? `${state.matchupCount} match${state.matchupCount > 1 ? 'es' : ''} set up`
    : "No matches configured"

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase italic">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/setup" className="text-emerald-500 font-black flex items-center gap-2 text-sm">
          <ArrowLeft size={16}/> SETUP
        </Link>
        <span className="font-black text-sm tracking-widest text-zinc-400">TOURNAMENT WIZARD</span>
        <div className="w-16"/>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-3">

        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert size={28} className="text-rose-500"/>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Setup Checklist</h1>
            <p className="text-zinc-600 text-[10px] font-black tracking-widest normal-case">
              Complete all 5 steps to unlock the scorer
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
        {(() => {
          const done = [step2Status, step3Status, step4Status, step5Status].filter(s => s === 'complete').length
          const pct = Math.round((done / 4) * 100)
          return (
            <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          )
        })()}
        <div className="flex justify-between text-[9px] font-black text-zinc-600 tracking-widest px-0.5">
          <span>SETUP PROGRESS</span>
          <span>{[step2Status, step3Status, step4Status, step5Status].filter(s => s === 'complete').length} / 4 COMPLETE</span>
        </div>

        {/* ── STEP 1: RESET / CLEAR ── */}
        <StepCard
          number={1}
          title="Clear & Reset"
          summary={step1Summary}
          status={step1Status}
          icon={<RotateCcw size={20}/>}
          statusOverride={!state.hasAnyData ? 'complete' : 'warning'}
        >
          {!state.hasAnyData ? (
            <p className="text-emerald-400 text-xs font-black">✓ Nothing to clear — ready to go</p>
          ) : (
            <div className="space-y-2">
              {state.isMock && (
                <button
                  onClick={clearMockData}
                  disabled={loading}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2"><Trash2 size={14}/> CLEAR MOCK DATA</span>
                  <span className="text-[9px] text-amber-600">STARTS FRESH</span>
                </button>
              )}
              {!state.isMock && (
                <button
                  onClick={archiveAndReset}
                  disabled={loading}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/40 text-blue-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2"><Archive size={14}/> ARCHIVE + RESET</span>
                  <span className="text-[9px] text-blue-600">SAVES TO HISTORY</span>
                </button>
              )}
            </div>
          )}
        </StepCard>

        {/* ── STEP 2: COURSE ── */}
        <StepCard
          number={2}
          title="Course Setup"
          summary={step2Summary}
          status={step2Status}
          icon={<Flag size={20}/>}
        >
          {state.course?.name ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black">{state.course.name}</div>
                <div className="text-zinc-500 text-[10px] font-black mt-0.5">
                  Par {(state.course.pars || []).reduce((a:number,b:number) => a+b, 0)} · 18 holes configured
                </div>
              </div>
              <Link href="/setup/settings" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">
                EDIT <ChevronRight size={14}/>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs font-black normal-case">Choose an option to get started:</p>
              <Link
                href="/setup/settings"
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2"><Flag size={14}/> SET UP COURSE</span>
                <ChevronRight size={14}/>
              </Link>
            </div>
          )}
        </StepCard>

        {/* ── STEP 3: ROSTER & TEAMS ── */}
        <StepCard
          number={3}
          title="Roster & Teams"
          summary={step3Summary}
          status={step3Status}
          icon={<Users size={20}/>}
        >
          {step3Status === 'complete' ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black">{state.playerCount} Players · {state.teamCount} Teams</div>
                <div className="text-zinc-500 text-[10px] font-black mt-0.5">All players assigned to teams</div>
              </div>
              <Link href="/setup/roster" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">
                EDIT <ChevronRight size={14}/>
              </Link>
            </div>
          ) : (
            <Link
              href="/setup/roster"
              className="w-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/40 text-blue-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2"><Users size={14}/> BUILD ROSTER & TEAMS</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 4: MONEY ── */}
        <StepCard
          number={4}
          title="Money & Pots"
          summary={step4Summary}
          status={step4Status}
          icon={<DollarSign size={20}/>}
        >
          {step4Status === 'complete' ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">Entry fee configured</div>
              <Link href="/setup/money" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">
                EDIT <ChevronRight size={14}/>
              </Link>
            </div>
          ) : (
            <Link
              href="/setup/money"
              className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2"><DollarSign size={14}/> CONFIGURE MONEY</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── STEP 5: MATCHUPS ── */}
        <StepCard
          number={5}
          title="Side Bets & Matches"
          summary={step5Summary}
          status={step5Status}
          icon={<Sword size={20}/>}
        >
          {step5Status === 'complete' ? (
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-sm">{state.matchupCount} match{state.matchupCount > 1 ? 'es' : ''} configured</div>
              <Link href="/setup/matchups" className="text-emerald-500 text-xs font-black flex items-center gap-1 hover:text-emerald-400">
                EDIT <ChevronRight size={14}/>
              </Link>
            </div>
          ) : (
            <Link
              href="/setup/matchups"
              className="w-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-400 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2"><Sword size={14}/> SET UP MATCHES</span>
              <ChevronRight size={14}/>
            </Link>
          )}
        </StepCard>

        {/* ── GO LIVE ── */}
        <div className={`mt-6 rounded-[2rem] border-2 p-6 transition-all ${allComplete ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-zinc-900/40 border-zinc-800'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${allComplete ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-600'}`}>6</div>
            <div>
              <h3 className={`font-black text-base ${allComplete ? 'text-emerald-400' : 'text-zinc-600'}`}>GO LIVE</h3>
              <p className="text-[10px] font-black text-zinc-600 tracking-wider">
                {allComplete ? 'Everything is set · Ready to start scoring' : 'Complete all steps above first'}
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

        {/* ── DIVIDER ── */}
        <div className="pt-6 border-t border-zinc-900">
          <p className="text-[9px] text-zinc-700 font-black tracking-widest text-center mb-4">TESTING & DEVELOPMENT</p>

          <button
            onClick={loadMock}
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 py-4 px-5 rounded-2xl font-black text-sm text-zinc-400 hover:text-white flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-3">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <FlaskConical size={16} className="text-zinc-500"/>}
              LOAD MOCK TOURNAMENT
            </span>
            <span className="text-[9px] text-zinc-600 normal-case font-black tracking-wider">8 players · full scores</span>
          </button>
        </div>

        {/* ── DANGER ZONE ── */}
        <div className="pt-2">
          <button
            onClick={() => setShowDestructive(!showDestructive)}
            className="w-full text-[9px] font-black text-zinc-700 hover:text-zinc-500 tracking-[0.3em] py-3 transition-colors"
          >
            {showDestructive ? '▲ HIDE' : '▼ SHOW'} DESTRUCTIVE COMMANDS
          </button>

          {showDestructive && (
            <div className="space-y-2 pt-2">
              <button
                onClick={async () => {
                  const pw = prompt("ADMIN PASSWORD:")
                  if (pw !== "jeff") return alert("ACCESS DENIED")
                  if (!confirm("WIPE SCORES ONLY? Teams and matches stay.")) return
                  await set(ref(db, 'tournament/scores'), null)
                  flash("✓ Scores wiped. Teams and matches intact.")
                }}
                className="w-full bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 text-amber-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all"
              >
                <span>WIPE LIVE SCORES ONLY</span>
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
                  flash("✓ Full reset complete. Roster preserved.")
                }}
                className="w-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 text-rose-600 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-between transition-all"
              >
                <span>WIPE ALL TOURNAMENT DATA</span>
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

// ── REUSABLE STEP CARD COMPONENT ──────────────────────────────────────
function StepCard({
  number, title, summary, status, icon, children, statusOverride
}: {
  number: number
  title: string
  summary: string
  status: StepStatus
  icon: React.ReactNode
  children: React.ReactNode
  statusOverride?: StepStatus
}) {
  const s = statusOverride ?? status
  const isComplete = s === 'complete'
  const isWarning = s === 'warning'

  return (
    <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${
      isComplete ? 'border-emerald-500/40 bg-zinc-950' :
      isWarning ? 'border-amber-500/40 bg-zinc-950' :
      'border-zinc-800 bg-zinc-950'
    }`}>
      {/* Step header */}
      <div className={`px-5 py-4 flex items-center gap-4 border-b ${
        isComplete ? 'border-emerald-500/20' :
        isWarning ? 'border-amber-500/20' :
        'border-zinc-800'
      }`}>
        {/* Number badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
          isComplete ? 'bg-emerald-500 text-black' :
          isWarning ? 'bg-amber-500/30 text-amber-400' :
          'bg-zinc-800 text-zinc-500'
        }`}>
          {isComplete ? <CheckCircle2 size={16}/> : number}
        </div>

        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm ${isComplete ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'}`}>
            {title}
          </div>
          <div className="text-[10px] font-black text-zinc-600 tracking-wider truncate normal-case mt-0.5">
            {summary}
          </div>
        </div>

        {/* Status icon */}
        <div className={`flex-shrink-0 ${isComplete ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-zinc-700'}`}>
          {icon}
        </div>
      </div>

      {/* Step body */}
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  )
}