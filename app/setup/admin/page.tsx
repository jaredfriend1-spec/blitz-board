"use client"
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push } from 'firebase/database'
import { ArrowLeft, Trash2, Archive, ShieldAlert, History, Eraser, FlaskConical, CheckCircle2, Loader2, Target, Flag, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ─── MOCK DATA ───────────────────────────────────────────────────────
const MOCK_COURSE = {
  name: "Richland Golf Club",
  holes: [
    { par: 5, hcp: 15 }, { par: 4, hcp: 3 }, { par: 3, hcp: 17 },
    { par: 4, hcp: 7 },  { par: 4, hcp: 1 }, { par: 3, hcp: 9 },
    { par: 4, hcp: 11 }, { par: 4, hcp: 5 }, { par: 5, hcp: 13 },
    { par: 4, hcp: 4 },  { par: 3, hcp: 8 }, { par: 4, hcp: 10 },
    { par: 5, hcp: 18 }, { par: 3, hcp: 14 }, { par: 4, hcp: 2 },
    { par: 4, hcp: 16 }, { par: 4, hcp: 6 }, { par: 5, hcp: 12 },
  ],
  pars: [5,4,3,4,4,3,4,4,5,4,3,4,5,3,4,4,4,5]
}
const MOCK_PLAYERS = [
  { name: "JEREMIAS", handicap: 18 }, { name: "DVP", handicap: 22 },
  { name: "CRIBBY", handicap: 20 },   { name: "TRANQUILINO", handicap: 24 },
  { name: "AL", handicap: 8 },        { name: "FREDDY", handicap: 16 },
  { name: "SKIP", handicap: 14 },     { name: "STONEY", handicap: 19 },
]
const MOCK_SCORES: Record<string, number[]> = {
  JEREMIAS:    [6,5,4,4,5,4,5,5,5,5,3,4,5,5,4,3,5,7],
  DVP:         [6,4,6,5,5,4,5,4,6,6,4,6,6,6,4,3,5,5],
  CRIBBY:      [4,6,5,5,6,4,6,4,5,5,3,6,4,5,4,4,5,7],
  TRANQUILINO: [6,6,4,4,6,4,5,5,6,6,4,5,5,5,5,4,4,6],
  AL:          [4,6,4,3,6,4,4,4,4,5,3,4,6,4,5,2,6,6],
  FREDDY:      [6,6,4,5,4,4,5,4,5,4,3,5,6,4,4,3,5,7],
  SKIP:        [5,7,5,4,5,3,5,5,5,4,3,5,4,5,5,3,6,5],
  STONEY:      [6,6,6,4,4,4,4,5,6,5,4,4,6,5,4,3,4,5],
}
const MOCK_TEAMS = [
  { name: "Team 1", players: ["JEREMIAS","DVP","CRIBBY","TRANQUILINO"] },
  { name: "Team 2", players: ["AL","FREDDY","SKIP","STONEY"] },
]
// ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [mockSuccess, setMockSuccess] = useState(false)

  const runAction = async (type: 'WIPE_SCORES' | 'WIPE_ALL' | 'ARCHIVE') => {
    const pw = prompt(`ENTER ADMIN PASSWORD TO ${type.replace('_', ' ')}:`)
    if (pw !== "jeff") return alert("ACCESS DENIED")

    if (type === 'WIPE_SCORES') {
      if (confirm("CLEANING SCOREBOARD: Zero out all scores but keep teams and matches. Proceed?")) {
        await set(ref(db, 'tournament/scores'), null)
        alert("LIVE SCORING WIPED.")
      }
    } else if (type === 'WIPE_ALL') {
      if (confirm("FULL SYSTEM RESET: Wipes scores, teams, and all side bets. Roster stays. Proceed?")) {
        await set(ref(db, 'tournament/scores'), null)
        await set(ref(db, 'tournament/teams'), null)
        await set(ref(db, 'tournament/matchups'), null)
        alert("ALL TOURNAMENT DATA WIPED.")
      }
    } else if (type === 'ARCHIVE') {
      const snap = await get(ref(db, 'tournament'))
      if (snap.exists()) {
        const id = Date.now()
        await set(ref(db, `history/${id}`), snap.val())
        alert("TOURNAMENT ARCHIVED TO HISTORY.")
      } else {
        alert("ERROR: NO DATA FOUND TO ARCHIVE.")
      }
    }
  }

  const loadMockTournament = async () => {
    if (!confirm("LOAD MOCK TOURNAMENT? This will overwrite all current tournament data.")) return
    setLoading(true)
    setMockSuccess(false)
    try {
      await set(ref(db, 'tournament/course'), MOCK_COURSE)
      await set(ref(db, 'tournament/roster'), null)
      const playerIdMap: Record<string, string> = {}
      for (const p of MOCK_PLAYERS) {
        const pRef = push(ref(db, 'tournament/roster'))
        await set(pRef, { id: pRef.key, name: p.name, handicap: p.handicap })
        playerIdMap[p.name] = pRef.key!
      }
      await set(ref(db, 'tournament/teams'), null)
      for (const t of MOCK_TEAMS) {
        const tRef = push(ref(db, 'tournament/teams'))
        await set(tRef, { id: tRef.key, name: t.name, playerIds: t.players.map(n => playerIdMap[n]) })
      }
      const scoresData: Record<string, number[]> = {}
      for (const [name, holeScores] of Object.entries(MOCK_SCORES)) {
        const pid = playerIdMap[name]
        if (pid) scoresData[pid] = holeScores
      }
      await set(ref(db, 'tournament/scores'), scoresData)
      await set(ref(db, 'tournament/matchups'), null)
      const pvpRef = push(ref(db, 'tournament/matchups'))
      await set(pvpRef, { id: pvpRef.key, type: 'PvP', sideA: 'AL', sideB: 'FREDDY', nassau: 5, press: 5, birdie: 2, eagle: 5, scoringType: 'NET' })
      const tvtRef = push(ref(db, 'tournament/matchups'))
      await set(tvtRef, { id: tvtRef.key, type: 'TvT', sideA: 'Team 1', sideB: 'Team 2', nassau: 10, press: 10, birdie: 2, eagle: 5, scoringType: 'NET' })
      await set(ref(db, 'tournament/money'), { entryFee: 25, skinsAllocation: 10 })
      setMockSuccess(true)
      setTimeout(() => setMockSuccess(false), 6000)
    } catch (err) {
      alert("ERROR LOADING MOCK DATA. Check console.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-10 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18} /> BACK TO SETUP
      </Link>

      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 text-rose-500 mb-10 font-black italic text-4xl tracking-tighter">
          <ShieldAlert size={36} />
          <h1>Admin</h1>
        </div>

        <div className="space-y-3">

          {/* ── PHASE 1: BEFORE THE ROUND ── */}
          <div className="text-[9px] font-black text-zinc-600 tracking-[0.3em] px-1 pt-2">
            PHASE 1 · BEFORE THE ROUND
          </div>

          <div className="bg-zinc-900 border-2 border-emerald-500/30 rounded-[2rem] p-5 space-y-3">
            <p className="text-zinc-500 text-[10px] font-black tracking-wider normal-case leading-relaxed">
              No real data yet? Load a full mock tournament to test any view instantly.
            </p>

            {mockSuccess && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-3 rounded-xl text-xs font-black flex items-center gap-2">
                <CheckCircle2 size={14}/> LOADED · GO CHECK SCORER, RESULTS & PAYOUTS
              </div>
            )}

            <button
              onClick={loadMockTournament}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin"/> LOADING...</>
                : <><FlaskConical size={18}/> LOAD MOCK TOURNAMENT</>
              }
            </button>

            <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-zinc-600 tracking-widest text-center">
              <div className="bg-black/50 rounded-lg py-1.5">8 PLAYERS · 2 TEAMS</div>
              <div className="bg-black/50 rounded-lg py-1.5">FULL 18-HOLE SCORES</div>
              <div className="bg-black/50 rounded-lg py-1.5">1V1 + TVT MATCHUPS</div>
              <div className="bg-black/50 rounded-lg py-1.5">RICHLAND GC COURSE</div>
            </div>
          </div>

          <Link
            href="/setup"
            className="w-full bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-500 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-zinc-400 hover:text-white transition-all"
          >
            <span className="flex items-center gap-3"><Flag size={16} className="text-zinc-500"/> SET UP REAL TOURNAMENT</span>
            <ChevronRight size={16} className="text-zinc-600"/>
          </Link>

          {/* ── PHASE 2: DURING THE ROUND ── */}
          <div className="text-[9px] font-black text-zinc-600 tracking-[0.3em] px-1 pt-4">
            PHASE 2 · DURING THE ROUND
          </div>

          <Link
            href="/scorer"
            className="w-full bg-zinc-900 border-2 border-zinc-700 hover:border-emerald-500 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-zinc-400 hover:text-emerald-400 transition-all"
          >
            <span className="flex items-center gap-3"><Target size={16} className="text-emerald-500"/> OPEN LIVE SCORER</span>
            <ChevronRight size={16} className="text-zinc-600"/>
          </Link>

          {/* ── PHASE 3: AFTER THE ROUND ── */}
          <div className="text-[9px] font-black text-zinc-600 tracking-[0.3em] px-1 pt-4">
            PHASE 3 · AFTER THE ROUND
          </div>

          <button
            onClick={() => runAction('ARCHIVE')}
            className="w-full bg-zinc-900 border-2 border-zinc-700 hover:border-blue-500 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-zinc-400 hover:text-blue-400 transition-all"
          >
            <span className="flex items-center gap-3"><Archive size={16} className="text-blue-500"/> ARCHIVE TO HISTORY</span>
            <ChevronRight size={16} className="text-zinc-600"/>
          </button>

          <Link
            href="/history"
            className="w-full bg-zinc-900 border-2 border-zinc-700 hover:border-blue-500 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-zinc-400 hover:text-blue-400 transition-all"
          >
            <span className="flex items-center gap-3"><History size={16} className="text-blue-400"/> VIEW HISTORY</span>
            <ChevronRight size={16} className="text-zinc-600"/>
          </Link>

          {/* ── RESET ── */}
          <div className="text-[9px] font-black text-zinc-600 tracking-[0.3em] px-1 pt-4">
            RESET · START FRESH
          </div>

          <button
            onClick={() => runAction('WIPE_SCORES')}
            className="w-full bg-amber-500/10 border-2 border-amber-500/20 hover:border-amber-500 hover:bg-amber-500/20 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-amber-500 transition-all"
          >
            <span className="flex items-center gap-3"><Eraser size={16}/> WIPE SCORES ONLY</span>
            <span className="text-[9px] text-amber-600 tracking-wider">KEEPS TEAMS & BETS</span>
          </button>

          <button
            onClick={() => runAction('WIPE_ALL')}
            className="w-full bg-rose-500/10 border-2 border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/20 p-4 rounded-2xl flex items-center justify-between font-black text-sm text-rose-500 transition-all"
          >
            <span className="flex items-center gap-3"><Trash2 size={16}/> WIPE ALL DATA</span>
            <span className="text-[9px] text-rose-700 tracking-wider">FULL RESET</span>
          </button>

        </div>

        <p className="text-center text-[9px] text-zinc-800 font-black tracking-widest mt-10">
          AUTHORIZED ACCESS ONLY · SENIOR MANAGEMENT CONSOLE
        </p>
      </div>
    </div>
  )
}