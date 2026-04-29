"use client"
import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { Home, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

// ── GOLF SCORING SYMBOL SYSTEM ──────────────────────────────────────
// Eagle (-2):       Double circle  · gold
// Birdie (-1):      Single circle  · red
// Par   (0):        Plain text     · white
// Bogey (+1):       Single square  · slate
// Double+ (+2):     Double square  · slate
// Triple+ (+3):     Filled square  · dark
// ────────────────────────────────────────────────────────────────────
function ScoreCell({
  score, par, onChange
}: {
  score: number
  par: number
  onChange: (val: number) => void
}) {
  const diff = score > 0 ? score - par : null

  // Outer wrapper styling (the "symbol" layer)
  let wrapClass = "relative flex items-center justify-center"
  let innerClass = ""
  let textClass = "text-sm font-black"

  if (diff === null) {
    // Empty
    innerClass = "w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800"
    textClass = "text-sm font-black text-zinc-700"
  } else if (diff <= -2) {
    // Eagle — double gold circle
    innerClass = "w-11 h-11 rounded-full bg-black border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-[3px] ring-offset-black"
    textClass = "text-sm font-black text-yellow-300"
  } else if (diff === -1) {
    // Birdie — single red circle
    innerClass = "w-11 h-11 rounded-full bg-black border-2 border-red-500"
    textClass = "text-sm font-black text-red-400"
  } else if (diff === 0) {
    // Par — plain
    innerClass = "w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700"
    textClass = "text-sm font-black text-white"
  } else if (diff === 1) {
    // Bogey — single square
    innerClass = "w-11 h-11 rounded-sm bg-black border-2 border-zinc-400"
    textClass = "text-sm font-black text-zinc-300"
  } else if (diff === 2) {
    // Double bogey — double square
    innerClass = "w-11 h-11 rounded-sm bg-black border-2 border-zinc-400 ring-2 ring-zinc-600 ring-offset-[3px] ring-offset-black"
    textClass = "text-sm font-black text-zinc-400"
  } else {
    // Triple+ — filled dark
    innerClass = "w-11 h-11 rounded-sm bg-zinc-800 border-2 border-zinc-600"
    textClass = "text-sm font-black text-zinc-500"
  }

  return (
    <div className={wrapClass}>
      <div className={`${innerClass} flex items-center justify-center`}>
        <input
          type="number"
          value={score || ""}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full h-full text-center bg-transparent outline-none font-black text-sm"
          style={{ color: 'inherit' }}
          min={1}
          max={12}
        />
      </div>
    </div>
  )
}

// ── TO-PAR DISPLAY ──────────────────────────────────────────────────
function ToPar({ raw, par }: { raw: number; par: number }) {
  if (!raw) return <span className="text-zinc-700">—</span>
  const diff = raw - par
  if (diff === 0) return <span className="text-white font-black">E</span>
  if (diff > 0) return <span className="text-rose-400 font-black">+{diff}</span>
  return <span className="text-emerald-400 font-black">{diff}</span>
}

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4) })
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  // Auto-save to Firebase with debounce
  const saveScores = useCallback(
    debounce(async (s: Record<string, number[]>) => {
      setSaveStatus('saving')
      await set(ref(db, 'tournament/scores'), s)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 800),
    []
  )

  const updateScore = (pid: string, holeIdx: number, val: number) => {
    const current = scores[pid] || Array(18).fill(0)
    const updated = [...current]
    updated[holeIdx] = val
    const newScores = { ...scores, [pid]: updated }
    setScores(newScores)
    saveScores(newScores)
  }

  const pars = course.pars || Array(18).fill(4)
  const frontPar = pars.slice(0, 9).reduce((a: number, b: number) => a + b, 0)
  const backPar = pars.slice(9, 18).reduce((a: number, b: number) => a + b, 0)
  const totalPar = frontPar + backPar

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white font-sans uppercase italic">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4 border-b border-zinc-900">
          <Link href="/" className="text-emerald-500 font-black flex items-center gap-2"><Home size={20}/> HUB</Link>
          <h1 className="text-xl font-black text-emerald-400">Live Scorer</h1>
          <div className="w-16"/>
        </div>
        <div className="text-center pt-32 max-w-lg mx-auto px-6">
          <p className="text-5xl mb-4">⛳</p>
          <h1 className="text-3xl font-black text-rose-500 mb-4">NO TEAMS BUILT</h1>
          <p className="text-zinc-500 mb-10 font-black text-sm">Add players to the roster and assign them to teams first.</p>
          <Link href="/setup/roster" className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black hover:bg-emerald-400 transition-colors">
            GO TO ROSTER →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase italic pb-8">

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
          <Link href="/" className="text-emerald-500 font-black flex items-center gap-2 text-sm"><Home size={18}/> HUB</Link>
          <h1 className="text-lg font-black text-white tracking-tighter">LIVE SCORER</h1>
          <div className="flex items-center gap-2 text-xs font-black">
            {saveStatus === 'saving' && <span className="text-zinc-500 animate-pulse">SAVING...</span>}
            {saveStatus === 'saved' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={14}/> SAVED</span>}
            {saveStatus === 'idle' && <span className="text-zinc-700">LIVE</span>}
          </div>
        </div>
      </div>

      {/* SCORING LEGEND */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto border-b border-zinc-900/50">
        {[
          { label: 'EAGLE', cls: 'w-5 h-5 rounded-full border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-[2px] ring-offset-black' },
          { label: 'BIRDIE', cls: 'w-5 h-5 rounded-full border-2 border-red-500' },
          { label: 'PAR', cls: 'w-5 h-5 rounded bg-zinc-800 border border-zinc-600' },
          { label: 'BOGEY', cls: 'w-5 h-5 rounded-sm border-2 border-zinc-400' },
          { label: 'DBL', cls: 'w-5 h-5 rounded-sm border-2 border-zinc-400 ring-2 ring-zinc-600 ring-offset-[2px] ring-offset-black' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 flex-shrink-0">
            <div className={item.cls}/>
            <span className="text-[9px] font-black text-zinc-600 tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-6 space-y-10">
        {teams.map(team => {
          const teamPlayers = (team.playerIds || [])
            .map((pid: string) => players.find(p => p.id === pid))
            .filter(Boolean)

          return (
            <div key={team.id} className="bg-zinc-950 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-2xl">

              {/* Team header */}
              <div className="bg-zinc-900 px-6 py-4 border-b-2 border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-black text-emerald-400 tracking-tight">{team.name}</h2>
                <span className="text-[10px] text-zinc-600 font-black">{teamPlayers.length} PLAYERS</span>
              </div>

              {/* Scorecard */}
              <div className="overflow-x-auto">
                <table className="border-collapse" style={{ minWidth: '780px', width: '100%' }}>
                  <thead>
                    {/* Hole numbers */}
                    <tr className="bg-black">
                      <th className="sticky left-0 bg-black z-20 border-r border-zinc-800 text-left px-4 py-2 text-[10px] text-zinc-600 font-black min-w-[130px]">PLAYER</th>
                      {pars.slice(0, 9).map((p: number, i: number) => (
                        <th key={i} className="px-1 py-2 text-center w-12">
                          <div className="text-[10px] text-zinc-500 font-black">{i + 1}</div>
                          <div className="text-[9px] text-zinc-700 font-black">p{p}</div>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
                        <div className="text-[10px] text-blue-400 font-black">OUT</div>
                        <div className="text-[9px] text-zinc-600 font-black">{frontPar}</div>
                      </th>
                      {pars.slice(9, 18).map((p: number, i: number) => (
                        <th key={i + 9} className="px-1 py-2 text-center w-12">
                          <div className="text-[10px] text-zinc-500 font-black">{i + 10}</div>
                          <div className="text-[9px] text-zinc-700 font-black">p{p}</div>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
                        <div className="text-[10px] text-blue-400 font-black">IN</div>
                        <div className="text-[9px] text-zinc-600 font-black">{backPar}</div>
                      </th>
                      <th className="px-3 py-2 text-center w-20 bg-emerald-950/60 border-l border-zinc-800">
                        <div className="text-[10px] text-emerald-500 font-black">TOT</div>
                        <div className="text-[9px] text-zinc-600 font-black">{totalPar}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.map((p: any) => {
                      const pScores = scores[p.id] || Array(18).fill(0)
                      const f9Raw = pScores.slice(0, 9).reduce((a: number, b: number) => a + (b || 0), 0)
                      const b9Raw = pScores.slice(9, 18).reduce((a: number, b: number) => a + (b || 0), 0)
                      const totRaw = f9Raw + b9Raw
                      const hasAny = pScores.some((s: number) => s > 0)

                      return (
                        <tr key={p.id} className="border-t border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                          {/* Player name + HCP */}
                          <td className="sticky left-0 bg-zinc-950 z-20 border-r border-zinc-800 px-4 py-3">
                            <div className="font-black text-sm text-white leading-tight">{p.name}</div>
                            <div className="text-[9px] text-zinc-600 font-black mt-0.5">HCP {p.handicap || 0}</div>
                          </td>

                          {/* Front 9 */}
                          {pScores.slice(0, 9).map((sc: number, i: number) => (
                            <td key={i} className="px-0.5 py-2 text-center">
                              <ScoreCell
                                score={sc}
                                par={pars[i]}
                                onChange={val => updateScore(p.id, i, val)}
                              />
                            </td>
                          ))}

                          {/* Front 9 total */}
                          <td className="px-2 py-2 text-center bg-zinc-900/50 border-x border-zinc-800">
                            <div className="font-black text-base text-white">{f9Raw || '—'}</div>
                            {hasAny && <div className="text-[10px]"><ToPar raw={f9Raw} par={frontPar}/></div>}
                          </td>

                          {/* Back 9 */}
                          {pScores.slice(9, 18).map((sc: number, i: number) => (
                            <td key={i + 9} className="px-0.5 py-2 text-center">
                              <ScoreCell
                                score={sc}
                                par={pars[i + 9]}
                                onChange={val => updateScore(p.id, i + 9, val)}
                              />
                            </td>
                          ))}

                          {/* Back 9 total */}
                          <td className="px-2 py-2 text-center bg-zinc-900/50 border-x border-zinc-800">
                            <div className="font-black text-base text-white">{b9Raw || '—'}</div>
                            {hasAny && <div className="text-[10px]"><ToPar raw={b9Raw} par={backPar}/></div>}
                          </td>

                          {/* Grand total */}
                          <td className="px-3 py-2 text-center bg-emerald-950/40 border-l border-zinc-800">
                            <div className="font-black text-lg text-white">{totRaw || '—'}</div>
                            {hasAny && <div className="text-sm font-black"><ToPar raw={totRaw} par={totalPar}/></div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}