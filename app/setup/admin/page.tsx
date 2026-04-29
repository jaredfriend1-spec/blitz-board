"use client"
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push } from 'firebase/database'
import { ArrowLeft, Trash2, Archive, ShieldAlert, History, Eraser, FlaskConical, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── MOCK TOURNAMENT DATA ───────────────────────────────────────────
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
  pars: [5,4,3,4,4,3,4,4,5, 4,3,4,5,3,4,4,4,5]
}

const MOCK_PLAYERS = [
  { name: "JEREMIAS", handicap: 18 },
  { name: "DVP",      handicap: 22 },
  { name: "CRIBBY",   handicap: 20 },
  { name: "TRANQUILINO", handicap: 24 },
  { name: "AL",       handicap: 8 },
  { name: "FREDDY",   handicap: 16 },
  { name: "SKIP",     handicap: 14 },
  { name: "STONEY",   handicap: 19 },
]

// Realistic scores — each row is 18 holes for each player
const MOCK_SCORES: Record<string, number[]> = {
  JEREMIAS:    [6,5,4,4,5,4,5,5,5, 5,3,4,5,5,4,3,5,7],
  DVP:         [6,4,6,5,5,4,5,4,6, 6,4,6,6,6,4,3,5,5],
  CRIBBY:      [4,6,5,5,6,4,6,4,5, 5,3,6,4,5,4,4,5,7],
  TRANQUILINO: [6,6,4,4,6,4,5,5,6, 6,4,5,5,5,5,4,4,6],
  AL:          [4,6,4,3,6,4,4,4,4, 5,3,4,6,4,5,2,6,6],
  FREDDY:      [6,6,4,5,4,4,5,4,5, 4,3,5,6,4,4,3,5,7],
  SKIP:        [5,7,5,4,5,3,5,5,5, 4,3,5,4,5,5,3,6,5],
  STONEY:      [6,6,6,4,4,4,4,5,6, 5,4,4,6,5,4,3,4,5],
}

const MOCK_TEAMS = [
  { name: "Team 1", players: ["JEREMIAS", "DVP", "CRIBBY", "TRANQUILINO"] },
  { name: "Team 2", players: ["AL", "FREDDY", "SKIP", "STONEY"] },
]

// ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [mockSuccess, setMockSuccess] = useState(false)

  const runAction = async (type: 'WIPE_SCORES' | 'WIPE_ALL' | 'ARCHIVE') => {
    const pw = prompt(`ENTER ADMIN PASSWORD TO ${type.replace('_', ' ')}:`)
    if (pw !== "jeff") return alert("ACCESS DENIED")

    if (type === 'WIPE_SCORES') {
      if (confirm("CLEANING SCOREBOARD: This will zero out all scores but keep teams and matches. Proceed?")) {
        await set(ref(db, 'tournament/scores'), null)
        alert("LIVE SCORING WIPED.")
      }
    } else if (type === 'WIPE_ALL') {
      if (confirm("FULL SYSTEM RESET: This will wipe scores, teams, and all side bets. Roster will remain. Proceed?")) {
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
        alert("TOURNAMENT SNAPSHOT PUSHED TO HISTORY.")
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
      // 1. Save course
      await set(ref(db, 'tournament/course'), MOCK_COURSE)

      // 2. Create players in roster, capture their generated IDs
      await set(ref(db, 'tournament/roster'), null) // clear first
      const playerIdMap: Record<string, string> = {}
      for (const p of MOCK_PLAYERS) {
        const pRef = push(ref(db, 'tournament/roster'))
        await set(pRef, { id: pRef.key, name: p.name, handicap: p.handicap })
        playerIdMap[p.name] = pRef.key!
      }

      // 3. Create teams with player IDs
      await set(ref(db, 'tournament/teams'), null)
      for (const t of MOCK_TEAMS) {
        const tRef = push(ref(db, 'tournament/teams'))
        await set(tRef, {
          id: tRef.key,
          name: t.name,
          playerIds: t.players.map(name => playerIdMap[name])
        })
      }

      // 4. Seed scores keyed by player ID
      const scoresData: Record<string, number[]> = {}
      for (const [name, holeScores] of Object.entries(MOCK_SCORES)) {
        const pid = playerIdMap[name]
        if (pid) scoresData[pid] = holeScores
      }
      await set(ref(db, 'tournament/scores'), scoresData)

      // 5. Create matchups — 1v1 and TvT
      await set(ref(db, 'tournament/matchups'), null)

      // PvP: AL vs FREDDY
      const pvpRef = push(ref(db, 'tournament/matchups'))
      await set(pvpRef, {
        id: pvpRef.key,
        type: 'PvP',
        sideA: 'AL',
        sideB: 'FREDDY',
        nassau: 5,
        press: 5,
        birdie: 2,
        eagle: 5,
        scoringType: 'NET',
      })

      // TvT: Team 1 vs Team 2
      const tvtRef = push(ref(db, 'tournament/matchups'))
      await set(tvtRef, {
        id: tvtRef.key,
        type: 'TvT',
        sideA: 'Team 1',
        sideB: 'Team 2',
        nassau: 10,
        press: 10,
        birdie: 2,
        eagle: 5,
        scoringType: 'NET',
      })

      // 6. Set money config
      await set(ref(db, 'tournament/money'), {
        entryFee: 25,
        skinsAllocation: 10,
      })

      setMockSuccess(true)
      setTimeout(() => setMockSuccess(false), 5000)
    } catch (err) {
      console.error(err)
      alert("ERROR LOADING MOCK DATA. Check console.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18} /> BACK TO SETUP
      </Link>

      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 text-rose-500 mb-8 font-black italic text-4xl tracking-tighter uppercase">
          <ShieldAlert size={40} />
          <h1>Admin Control</h1>
        </div>

        {/* ── MOCK TOURNAMENT LOADER ── */}
        <div className="bg-zinc-900 border-2 border-emerald-500/40 rounded-[2rem] p-6 space-y-4">
          <div>
            <h2 className="font-black text-emerald-400 text-sm tracking-widest flex items-center gap-2 mb-1">
              <FlaskConical size={16}/> MOCK TOURNAMENT
            </h2>
            <p className="text-zinc-600 text-[10px] font-black tracking-wider leading-relaxed normal-case">
              Seeds 8 players, 2 teams, full 18-hole scores, 1v1 + TvT matchups, and course data. Use this to test any view without manual entry.
            </p>
          </div>

          {mockSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-3 rounded-xl text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={14}/> MOCK DATA LOADED · ALL VIEWS ARE READY
            </div>
          )}

          <button
            onClick={loadMockTournament}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading
              ? <><Loader2 size={20} className="animate-spin"/> LOADING DATA...</>
              : <><FlaskConical size={20}/> LOAD MOCK TOURNAMENT</>
            }
          </button>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-zinc-600 tracking-widest text-center">
            <div className="bg-black/50 rounded-lg p-2">8 PLAYERS · 2 TEAMS</div>
            <div className="bg-black/50 rounded-lg p-2">FULL 18-HOLE SCORES</div>
            <div className="bg-black/50 rounded-lg p-2">1V1 + TvT MATCHUPS</div>
            <div className="bg-black/50 rounded-lg p-2">RICHLAND GC COURSE</div>
          </div>
        </div>

        {/* ── ARCHIVE & VIEW ── */}
        <div className="space-y-4">
          <button
            onClick={() => runAction('ARCHIVE')}
            className="w-full bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] flex items-center justify-center gap-4 font-black hover:border-blue-500 text-blue-500 shadow-xl uppercase transition-all"
          >
            <Archive size={20} /> PUSH TO HISTORY
          </button>

          <Link
            href="/history"
            className="w-full bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-center gap-4 font-black hover:border-emerald-500 text-emerald-500 shadow-xl uppercase transition-all"
          >
            <History size={20} /> VIEW PAST ARCHIVES
          </Link>
        </div>

        {/* ── DESTRUCTIVE ACTIONS ── */}
        <div className="space-y-4 pt-8 border-t-2 border-zinc-900">
          <h2 className="text-[10px] text-zinc-600 font-black tracking-[0.2em] text-center mb-4">DESTRUCTIVE COMMANDS</h2>

          <button
            onClick={() => runAction('WIPE_SCORES')}
            className="w-full bg-amber-500/10 border-2 border-amber-500/30 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-amber-500 hover:bg-amber-500 hover:text-black shadow-xl uppercase transition-all"
          >
            <Eraser size={24} /> Wipe Live Scoring
          </button>

          <button
            onClick={() => runAction('WIPE_ALL')}
            className="w-full bg-rose-500/10 border-2 border-rose-500/30 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-rose-500 hover:bg-rose-500 hover:text-black shadow-xl uppercase transition-all"
          >
            <Trash2 size={24} /> Wipe All Tournament Data
          </button>
        </div>

        <p className="text-center text-[10px] text-zinc-800 font-black tracking-widest mt-12">
          AUTHORIZED ACCESS ONLY • SENIOR MANAGEMENT CONSOLE
        </p>
      </div>
    </div>
  )
}