"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, set } from 'firebase/database'
import {
  ArrowLeft, Archive, Calendar, Users, Trophy, Zap,
  Trash2, ChevronDown, ChevronUp, Medal, Target,
  Flag, DollarSign, Sword
} from 'lucide-react'
import Link from 'next/link'

// ── FULL RECAP ENGINE ──────────────────────────────────────────────
function buildRecap(arch: any) {
  const players: any[] = arch.roster ? Object.values(arch.roster) : []
  const teams: any[] = arch.teams ? Object.values(arch.teams) : []
  const scores: Record<string, number[]> = arch.scores || {}
  const course = arch.course || { pars: Array(18).fill(4), holes: [] }
  const money = arch.money || { entryFee: 0, skinsAllocation: 0 }
  const matchups: any[] = arch.matchups ? Object.values(arch.matchups) : []
  const pars: number[] = course.pars || Array(18).fill(4)

  // Active players (on a team)
  const activeIds = new Set<string>()
  teams.forEach(t => (t.playerIds || []).forEach((id: string) => activeIds.add(id)))
  const activePlayers = players.filter(p => activeIds.has(p.id))
  const fieldSize = activePlayers.length

  // ── INDIVIDUAL LEADERBOARD ────────────────────────────────────────
  const leaderboard = activePlayers.map(p => {
    const s = scores[p.id] || Array(18).fill(0)
    const f9 = s.slice(0, 9).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
    const b9 = s.slice(9, 18).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
    const tot = f9 + b9
    const totalPar = pars.reduce((a, b) => a + b, 0)
    const toPar = tot > 0 ? tot - totalPar : null
    const f9Par = pars.slice(0, 9).reduce((a, b) => a + b, 0)
    const b9Par = pars.slice(9, 18).reduce((a, b) => a + b, 0)
    return { ...p, f9, b9, tot, toPar, f9ToPar: f9 > 0 ? f9 - f9Par : null, b9ToPar: b9 > 0 ? b9 - b9Par : null }
  }).sort((a, b) => {
    if (a.tot === 0 && b.tot > 0) return 1
    if (b.tot === 0 && a.tot > 0) return -1
    return a.tot - b.tot
  })

  const f9Winners = leaderboard.filter(p => p.f9 > 0).sort((a, b) => a.f9 - b.f9).slice(0, 3)
  const b9Winners = leaderboard.filter(p => p.b9 > 0).sort((a, b) => a.b9 - b.b9).slice(0, 3)

  // ── SKINS ─────────────────────────────────────────────────────────
  const skinsMap: (any | null)[] = Array(18).fill(null)
  const skinsCount: Record<string, number> = {}

  for (let h = 0; h < 18; h++) {
    const holeScores = activePlayers
      .map(p => ({ id: p.id, name: p.name, s: (scores[p.id] || [])[h] || 0 }))
      .filter(x => x.s > 0)
    if (holeScores.length > 0) {
      const min = Math.min(...holeScores.map(x => x.s))
      const winners = holeScores.filter(x => x.s === min)
      if (winners.length === 1) {
        skinsMap[h] = { ...winners[0], par: pars[h] }
        skinsCount[winners[0].id] = (skinsCount[winners[0].id] || 0) + 1
      }
    }
  }

  const totalSkinsWon = Object.values(skinsCount).reduce((a, b) => a + b, 0)
  const skinsPot = fieldSize * (money.skinsAllocation || 0)
  const perSkin = totalSkinsWon > 0 ? Math.round(skinsPot / totalSkinsWon) : 0

  const skinsLeaders = activePlayers
    .filter(p => skinsCount[p.id] > 0)
    .map(p => ({ name: p.name, count: skinsCount[p.id], winnings: skinsCount[p.id] * perSkin }))
    .sort((a, b) => b.count - a.count)

  // ── TEAM BEST BALL SCORES ──────────────────────────────────────────
  const teamResults = teams.map(t => {
    const pIds: string[] = t.playerIds || []
    const holeAgg = pars.map((par, i) => {
      const pScores = pIds
        .map(id => scores[id]?.[i] || 0)
        .filter(s => s > 0)
        .sort((a, b) => a - b)
      if (pScores.length === 0) return 0
      const take = par === 3 ? 3 : 2
      return pScores.slice(0, take).reduce((a, b) => a + b, 0)
    })
    const f9 = holeAgg.slice(0, 9).reduce((a, b) => a + b, 0)
    const b9 = holeAgg.slice(9, 18).reduce((a, b) => a + b, 0)
    return { id: t.id, name: t.name, f9, b9, tot: f9 + b9 }
  }).sort((a, b) => {
    if (a.tot === 0) return 1
    if (b.tot === 0) return -1
    return a.tot - b.tot
  })

  // ── MATCH RESULTS (simplified) ────────────────────────────────────
  const matchResults = matchups.map(m => {
    const pA = m.type === 'PvP'
      ? activePlayers.filter(p => p.name === m.sideA)
      : activePlayers.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id))
    const pB = m.type === 'PvP'
      ? activePlayers.filter(p => p.name === m.sideB)
      : activePlayers.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id))
    if (pA.length === 0 || pB.length === 0) return null

    // Simple net total comparison
    const isGross = m.scoringType === 'GROSS'
    const allHcps = isGross ? [0] : [...pA, ...pB].map(p => Number(p.handicap) || 0)
    const baseHcp = Math.min(...allHcps)

    const netTotal = (playerList: any[]) => {
      return pars.map((par, i) => {
        const hcpRating = Number(course.holes?.[i]?.hcp) || (i + 1)
        const nets = playerList.map(p => {
          const g = scores[p.id]?.[i] || 0
          if (!g) return 0
          const diff = Math.max(0, (Number(p.handicap) || 0) - baseHcp)
          let s = Math.floor(diff / 18)
          if (hcpRating <= (diff % 18)) s++
          return g - s
        }).filter(Boolean)
        if (nets.length === 0) return 0
        if (m.type === 'PvP') return Math.min(...nets)
        const take = par === 3 ? 3 : 2
        return [...nets].sort((a, b) => a - b).slice(0, take).reduce((a, b) => a + b, 0)
      }).reduce((a, b) => a + b, 0)
    }

    const totA = netTotal(pA)
    const totB = netTotal(pB)
    if (!totA || !totB) return null

    const winner = totA < totB ? m.sideA : totB < totA ? m.sideB : 'TIE'
    return { sideA: m.sideA, sideB: m.sideB, totA, totB, winner, type: m.type, scoringType: m.scoringType || 'NET' }
  }).filter(Boolean)

  return {
    fieldSize, leaderboard, f9Winners, b9Winners,
    skinsMap, skinsLeaders, totalSkinsWon, skinsPot, perSkin,
    teamResults, matchResults, money
  }
}

// ── TO-PAR HELPER ──────────────────────────────────────────────────
function ToParBadge({ diff }: { diff: number | null }) {
  if (diff === null) return <span className="text-zinc-700">—</span>
  if (diff === 0) return <span className="text-white font-black text-xs">E</span>
  if (diff > 0) return <span className="text-rose-400 font-black text-xs">+{diff}</span>
  return <span className="text-emerald-400 font-black text-xs">{diff}</span>
}

// ── RANK MEDAL ─────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-black text-sm">🥇</span>
  if (rank === 2) return <span className="text-zinc-400 font-black text-sm">🥈</span>
  if (rank === 3) return <span className="font-black text-sm">🥉</span>
  return <span className="text-zinc-600 font-black text-xs w-5 text-center">{rank}</span>
}

export default function HistoryPage() {
  const [archives, setArchives] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    onValue(ref(db, 'history'), snap => {
      if (snap.val()) {
        const data = Object.entries(snap.val())
          .map(([key, value]: [string, any]) => ({ id: key, ...value }))
          .sort((a, b) => Number(b.id) - Number(a.id))
        setArchives(data)
      } else {
        setArchives([])
      }
    })
  }, [])

  const deleteHistory = (id: string) => {
    const pw = prompt("ENTER ADMIN PASSWORD:")
    if (pw !== "jeff") return alert("ACCESS DENIED")
    if (confirm("PERMANENTLY DELETE THIS TOURNAMENT RECORD?")) {
      set(ref(db, `history/${id}`), null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> HUB
      </Link>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Archive size={36} className="text-blue-400"/>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Tournament History</h1>
            <p className="text-zinc-600 text-[10px] font-black tracking-widest mt-0.5">{archives.length} ARCHIVED TOURNAMENT{archives.length !== 1 ? 'S' : ''}</p>
          </div>
        </div>

        {archives.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-[2.5rem]">
            <Archive size={48} className="mx-auto mb-4 text-zinc-800"/>
            <p className="text-zinc-600 font-black text-lg">NO ARCHIVED TOURNAMENTS</p>
            <p className="text-zinc-700 text-xs font-black mt-2 tracking-widest normal-case">
              Use Admin → Archive to History after each round
            </p>
          </div>
        )}

        <div className="space-y-4 pb-12">
          {archives.map(arch => {
            const recap = buildRecap(arch)
            const isExpanded = expandedId === arch.id
            const date = new Date(Number(arch.id)).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            })
            const topSkin = recap.skinsLeaders[0]
            const f9Win = recap.f9Winners[0]
            const b9Win = recap.b9Winners[0]

            return (
              <div key={arch.id} className={`rounded-[2.5rem] border-2 overflow-hidden shadow-2xl transition-all ${isExpanded ? 'border-blue-500/50' : 'border-zinc-800 hover:border-zinc-700'}`}>

                {/* ── COLLAPSED SUMMARY CARD ── */}
                <div
                  className="p-5 sm:p-7 cursor-pointer bg-zinc-900"
                  onClick={() => setExpandedId(isExpanded ? null : arch.id)}
                >
                  {/* Top row: date + course + expand */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-zinc-500 font-black text-[10px] tracking-widest mb-1">
                        <Calendar size={12}/> {date}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {arch.course?.name || 'TOURNAMENT RECAP'}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-zinc-500 flex items-center gap-1">
                          <Users size={10}/> {recap.fieldSize} PLAYERS
                        </span>
                        {arch.course?.pars && (
                          <span className="text-[10px] font-black text-zinc-600">
                            PAR {arch.course.pars.reduce((a: number, b: number) => a + b, 0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} className="text-zinc-500"/>
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-black/60 rounded-2xl p-3">
                      <div className="text-[9px] font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                        <Trophy size={9}/> F9 LOW
                      </div>
                      <div className="font-black text-sm text-white truncate">{f9Win?.name || '—'}</div>
                      {f9Win && <div className="text-[10px] font-black text-emerald-400">{f9Win.f9}</div>}
                    </div>
                    <div className="bg-black/60 rounded-2xl p-3">
                      <div className="text-[9px] font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                        <Trophy size={9}/> B9 LOW
                      </div>
                      <div className="font-black text-sm text-white truncate">{b9Win?.name || '—'}</div>
                      {b9Win && <div className="text-[10px] font-black text-emerald-400">{b9Win.b9}</div>}
                    </div>
                    <div className="bg-black/60 rounded-2xl p-3">
                      <div className="text-[9px] font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                        <Zap size={9}/> TOP SKIN
                      </div>
                      <div className="font-black text-sm text-white truncate">{topSkin?.name || '—'}</div>
                      {topSkin && <div className="text-[10px] font-black text-emerald-400">${topSkin.winnings}</div>}
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED FULL DASHBOARD ── */}
                {isExpanded && (
                  <div className="bg-black border-t-2 border-zinc-800">

                    {/* ── SECTION: INDIVIDUAL LEADERBOARD ── */}
                    <Section title="Full Leaderboard" icon={<Trophy size={14}/>} color="text-yellow-400">
                      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                        <table className="w-full text-center">
                          <thead className="bg-zinc-950">
                            <tr>
                              <th className="py-3 px-3 text-left text-[10px] text-zinc-600 font-black w-8">#</th>
                              <th className="py-3 px-4 text-left text-[10px] text-zinc-600 font-black">PLAYER</th>
                              <th className="py-3 px-3 text-[10px] text-zinc-600 font-black">F9</th>
                              <th className="py-3 px-3 text-[10px] text-zinc-600 font-black">B9</th>
                              <th className="py-3 px-3 text-[10px] text-zinc-600 font-black">TOT</th>
                              <th className="py-3 px-3 text-[10px] text-zinc-600 font-black">+/-</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recap.leaderboard.filter(p => p.tot > 0).map((p, i) => (
                              <tr key={p.id} className={`border-t border-zinc-900 ${i === 0 ? 'bg-yellow-500/5' : ''}`}>
                                <td className="py-3 px-3 text-left"><RankBadge rank={i + 1}/></td>
                                <td className="py-3 px-4 text-left font-black text-sm text-white">{p.name}</td>
                                <td className="py-3 px-3 font-black text-sm">{p.f9}</td>
                                <td className="py-3 px-3 font-black text-sm">{p.b9}</td>
                                <td className="py-3 px-3 font-black text-base text-white">{p.tot}</td>
                                <td className="py-3 px-3"><ToParBadge diff={p.toPar}/></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Section>

                    {/* ── SECTION: SKINS ── */}
                    {recap.totalSkinsWon > 0 && (
                      <Section title={`Skins · ${recap.totalSkinsWon} Won · $${recap.perSkin}/Skin`} icon={<Zap size={14}/>} color="text-emerald-400">
                        {/* Hole grid */}
                        <div className="grid grid-cols-9 gap-1.5 mb-4">
                          {recap.skinsMap.slice(0, 9).map((winner, i) => (
                            <div key={i} className={`rounded-xl p-2 text-center border ${winner ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
                              <div className="text-[9px] text-zinc-600 font-black">{i + 1}</div>
                              <div className={`text-[9px] font-black mt-0.5 leading-tight ${winner ? 'text-emerald-400' : 'text-zinc-800'}`}>
                                {winner ? winner.name.split(' ')[0] : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-9 gap-1.5 mb-5">
                          {recap.skinsMap.slice(9, 18).map((winner, i) => (
                            <div key={i + 9} className={`rounded-xl p-2 text-center border ${winner ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
                              <div className="text-[9px] text-zinc-600 font-black">{i + 10}</div>
                              <div className={`text-[9px] font-black mt-0.5 leading-tight ${winner ? 'text-emerald-400' : 'text-zinc-800'}`}>
                                {winner ? winner.name.split(' ')[0] : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Skins payout table */}
                        <div className="space-y-2">
                          {recap.skinsLeaders.map(p => (
                            <div key={p.name} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                <Zap size={14} className="text-emerald-500"/>
                                <span className="font-black text-sm text-white">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-black">
                                <span className="text-zinc-500">{p.count} skin{p.count > 1 ? 's' : ''}</span>
                                <span className="text-emerald-400 text-base">${p.winnings}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-between items-center text-[10px] font-black text-zinc-600 px-1">
                          <span>TOTAL SKINS POT</span>
                          <span className="text-zinc-400">${recap.skinsPot}</span>
                        </div>
                      </Section>
                    )}

                    {/* ── SECTION: TEAM RESULTS ── */}
                    {recap.teamResults.filter(t => t.tot > 0).length > 0 && (
                      <Section title="Team Best Ball" icon={<Users size={14}/>} color="text-blue-400">
                        <div className="space-y-2">
                          {recap.teamResults.filter(t => t.tot > 0).map((t, i) => (
                            <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'border-blue-500/40 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                              <div className="flex items-center gap-3">
                                {i === 0 && <Trophy size={16} className="text-yellow-400"/>}
                                {i === 1 && <Medal size={16} className="text-zinc-400"/>}
                                {i > 1 && <span className="w-4 text-center text-zinc-600 font-black text-xs">{i+1}</span>}
                                <span className="font-black text-white">{t.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm font-black">
                                <span className="text-zinc-500">{t.f9} / {t.b9}</span>
                                <span className={`text-lg ${i === 0 ? 'text-blue-300' : 'text-zinc-400'}`}>{t.tot}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* ── SECTION: MATCH RESULTS ── */}
                    {recap.matchResults.length > 0 && (
                      <Section title="Match Results" icon={<Sword size={14}/>} color="text-amber-400">
                        <div className="space-y-3">
                          {recap.matchResults.map((m: any, i: number) => (
                            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${m.scoringType === 'GROSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {m.scoringType}
                                  </span>
                                  <span className="text-[9px] font-black text-zinc-600">{m.type}</span>
                                </div>
                                <span className={`font-black text-sm ${m.winner === 'TIE' ? 'text-zinc-400' : 'text-amber-400'}`}>
                                  {m.winner === 'TIE' ? 'TIE' : `${m.winner} WINS`}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`font-black ${m.winner === m.sideA ? 'text-emerald-400' : 'text-zinc-400'}`}>{m.sideA}</span>
                                <div className="text-center">
                                  <span className="text-zinc-700 font-black text-sm">{m.totA}</span>
                                  <span className="text-zinc-600 font-black text-xs mx-2">vs</span>
                                  <span className="text-zinc-700 font-black text-sm">{m.totB}</span>
                                </div>
                                <span className={`font-black ${m.winner === m.sideB ? 'text-emerald-400' : 'text-zinc-400'}`}>{m.sideB}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* ── FOOTER: DELETE ── */}
                    <div className="px-6 py-5 border-t border-zinc-900 flex justify-between items-center">
                      <p className="text-[9px] text-zinc-700 font-black tracking-widest">
                        {date} · ID {arch.id}
                      </p>
                      <button
                        onClick={() => deleteHistory(arch.id)}
                        className="text-zinc-700 hover:text-rose-500 transition-colors flex items-center gap-2 text-xs font-black"
                      >
                        <Trash2 size={14}/> DELETE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── SECTION WRAPPER ───────────────────────────────────────────────
function Section({ title, icon, color, children }: {
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-zinc-900 px-5 sm:px-7 py-5">
      <h3 className={`font-black text-xs tracking-widest flex items-center gap-2 mb-4 ${color}`}>
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}