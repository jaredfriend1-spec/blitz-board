"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Zap, ZapOff, DollarSign, Target, Settings } from 'lucide-react'
import Link from 'next/link'

// ── TYPES ──────────────────────────────────────────────────────────
type BallType = 'net' | 'gross'
type Ball = { type: BallType }
type FormatSpec = { par3: Ball[]; par4: Ball[]; par5: Ball[]; name: string }

const JEFFS_BLITZ: FormatSpec = {
  name: "Jeff's Blitz",
  par3: [{type:'net'},{type:'net'},{type:'net'}],
  par4: [{type:'net'},{type:'net'}],
  par5: [{type:'net'},{type:'net'}],
}

// ── OPTIMAL BALL ASSIGNMENT (for TvT) ─────────────────────────────
type PlayerHoleScore = { gross: number; net: number; idx: number }

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, k-1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ]
}

function getBestTeamScore(players: PlayerHoleScore[], balls: Ball[]): number {
  const available = players.filter(p => p.gross > 0)
  const ballCount = balls.length
  const grossCount = balls.filter(b => b.type === 'gross').length
  if (available.length < ballCount) return 0
  let best = Infinity
  for (const subset of combinations(available, ballCount)) {
    for (const grossSubset of combinations(subset, grossCount)) {
      const grossIdxSet = new Set(grossSubset.map(p => p.idx))
      const netSubset = subset.filter(p => !grossIdxSet.has(p.idx))
      const total = grossSubset.reduce((sum, p) => sum + p.gross, 0) + netSubset.reduce((sum, p) => sum + p.net, 0)
      if (total < best) best = total
    }
  }
  return best === Infinity ? 0 : best
}

export default function PayoutsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [course, setCourse] = useState<any>({
    pars: Array(18).fill(4),
    holes: Array.from({length:18}, (_, i) => ({ par:4, hcp:i+1 }))
  })
  const [format, setFormat] = useState<FormatSpec>(JEFFS_BLITZ)

  useEffect(() => {
    onValue(ref(db,'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db,'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db,'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db,'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db,'tournament/course'), snap => snap.val() && setCourse(snap.val()))
    onValue(ref(db,'tournament/format'), snap => { if (snap.val()) setFormat(snap.val()); else setFormat(JEFFS_BLITZ) })
  }, [])

  const calculateMatch = (m: any) => {
    // ── RESOLVE PLAYERS PER SIDE ──────────────────────────────────
    let pA: any[] = []
    let pB: any[] = []

    if (m.type === 'PvP') {
      pA = players.filter(p => p.name === m.sideA)
      pB = players.filter(p => p.name === m.sideB)
    } else if (m.type === '2v2') {
      pA = players.filter(p => p.name === m.sideA || p.name === m.sideA2)
      pB = players.filter(p => p.name === m.sideB || p.name === m.sideB2)
    } else {
      // TvT
      pA = players.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id))
      pB = players.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id))
    }

    if (pA.length === 0 || pB.length === 0) return null

    const isGross = m.scoringType === 'GROSS'
    const useAutoPress = m.autoPress !== false
    const allHcps = isGross ? [0] : [...pA, ...pB].map(p => Number(p.handicap) || 0)
    const baseHcp = Math.min(...allHcps)

    const getStrokes = (playerHcp: number, holeIdx: number) => {
      if (isGross) return 0
      const hcpRating = Number(course.holes?.[holeIdx]?.hcp) || (holeIdx + 1)
      const diff = Math.max(0, playerHcp - baseHcp)
      let s = Math.floor(diff / 18)
      if (hcpRating <= (diff % 18)) s++
      return s
    }

    const sA_final = Array(18).fill(0)
    const sB_final = Array(18).fill(0)
    const sA_dots = Array(18).fill(0)
    const sB_dots = Array(18).fill(0)
    const holeBonus: ({ side: 'A'|'B'; type: 'birdie'|'eagle' } | null)[] = Array(18).fill(null)
    let birdieA = 0, birdieB = 0

    for (let i = 0; i < 18; i++) {
      const par = course.pars[i] || 4

      const makeScores = (playerList: any[]): PlayerHoleScore[] =>
        playerList.map((p, idx) => {
          const g = scores[p.id]?.[i] || 0
          const strokes = getStrokes(Number(p.handicap) || 0, i)
          return { gross: g, net: g > 0 ? g - strokes : 0, idx }
        })

      const scoresA = makeScores(pA)
      const scoresB = makeScores(pB)

      if (m.type === 'PvP' || m.type === '2v2') {
        // Best 1 score per side (lowest net — or gross if isGross)
        const validA = scoresA.filter(x => x.gross > 0)
        const validB = scoresB.filter(x => x.gross > 0)
        if (validA.length > 0) sA_final[i] = Math.min(...validA.map(x => isGross ? x.gross : x.net))
        if (validB.length > 0) sB_final[i] = Math.min(...validB.map(x => isGross ? x.gross : x.net))

        // Birdie/eagle on best gross of the side
        const bgA = validA.length > 0 ? Math.min(...validA.map(x => x.gross)) : 0
        const bgB = validB.length > 0 ? Math.min(...validB.map(x => x.gross)) : 0
        if (bgA > 0 && bgA < par) {
          const isEagle = bgA <= par - 2
          birdieA += isEagle ? (Number(m.eagle) || Number(m.birdie)*2) : Number(m.birdie || 0)
          holeBonus[i] = { side: 'A', type: isEagle ? 'eagle' : 'birdie' }
        }
        if (bgB > 0 && bgB < par) {
          const isEagle = bgB <= par - 2
          birdieB += isEagle ? (Number(m.eagle) || Number(m.birdie)*2) : Number(m.birdie || 0)
          if (!holeBonus[i] || (holeBonus[i]?.type === 'birdie' && isEagle)) {
            holeBonus[i] = { side: 'B', type: isEagle ? 'eagle' : 'birdie' }
          }
        }
      } else {
        // TvT — use configured format engine
        const parKey = `par${par}` as 'par3'|'par4'|'par5'
        const balls: Ball[] = format[parKey] || JEFFS_BLITZ[parKey]
        const scoreA = getBestTeamScore(scoresA, balls)
        const scoreB = getBestTeamScore(scoresB, balls)
        if (scoreA > 0) sA_final[i] = scoreA
        if (scoreB > 0) sB_final[i] = scoreB

        const bgA = scoresA.filter(x => x.gross > 0).reduce((min, x) => Math.min(min, x.gross), Infinity)
        const bgB = scoresB.filter(x => x.gross > 0).reduce((min, x) => Math.min(min, x.gross), Infinity)
        if (bgA < Infinity && bgA < par) {
          const isEagle = bgA <= par - 2
          birdieA += isEagle ? (Number(m.eagle) || Number(m.birdie)*2) : Number(m.birdie || 0)
          holeBonus[i] = { side: 'A', type: isEagle ? 'eagle' : 'birdie' }
        }
        if (bgB < Infinity && bgB < par) {
          const isEagle = bgB <= par - 2
          birdieB += isEagle ? (Number(m.eagle) || Number(m.birdie)*2) : Number(m.birdie || 0)
          if (!holeBonus[i] || (holeBonus[i]?.type === 'birdie' && isEagle)) {
            holeBonus[i] = { side: 'B', type: isEagle ? 'eagle' : 'birdie' }
          }
        }
      }

      sA_dots[i] = Math.max(0, ...pA.map(p => getStrokes(Number(p.handicap)||0, i)))
      sB_dots[i] = Math.max(0, ...pB.map(p => getStrokes(Number(p.handicap)||0, i)))
    }

    // ── PRESS ENGINE — PvP and 2v2 use auto-press, TvT doesn't ────
    const isPvPLike = m.type === 'PvP' || m.type === '2v2'

    const runNine = (start: number, end: number) => {
      let bets = [{ score: 0, pressed: false, isBase: true }]
      let holeResults: any[] = []
      let totalP = 0

      for (let i = start; i <= end; i++) {
        let winner = null, newP = 0
        if (sA_final[i] > 0 && sB_final[i] > 0) {
          if (sA_final[i] < sB_final[i]) winner = 'A'
          else if (sB_final[i] < sA_final[i]) winner = 'B'
          else winner = 'T'
        }
        const delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0
        if (delta !== 0) {
          bets.forEach(b => {
            b.score += delta
            if (isPvPLike && useAutoPress && Math.abs(b.score) >= 2 && !b.pressed) {
              b.pressed = true; newP++; totalP++
            }
          })
          if (isPvPLike && useAutoPress) {
            for (let p = 0; p < newP; p++) bets.push({ score: 0, pressed: false, isBase: false })
          }
        }
        holeResults.push({ winner, newP, bonus: holeBonus[i] })
      }

      let payA = 0, payB = 0
      bets.forEach(b => {
        const amt = b.isBase ? Number(m.nassau||0) : Number(m.press||0)
        if (b.score > 0) payA += amt
        else if (b.score < 0) payB += amt
      })
      return { holeResults, payoutA: payA, payoutB: payB, totalPresses: totalP }
    }

    const f9 = runNine(0, 8)
    const b9 = runNine(9, 17)
    const strokesA = Math.max(0, ...pA.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)))
    const strokesB = Math.max(0, ...pB.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)))
    const net = (f9.payoutA + b9.payoutA + birdieA) - (f9.payoutB + b9.payoutB + birdieB)

    return { sA_net: sA_final, sB_net: sB_final, sA_dots, sB_dots, holeBonus, strokesA, strokesB, f9, b9, birdieA, birdieB, net, useAutoPress, isPvPLike }
  }

  const renderDots = (count: number) => {
    if (!count || count <= 0) return null
    return (
      <div className="flex justify-center mt-0.5 gap-[2px]">
        {Array.from({length: Math.min(count, 3)}).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 bg-yellow-500 rounded-full"/>
        ))}
      </div>
    )
  }

  const renderNine = (res: any, m: any, start: number, label: string) => {
    const holes = Array.from({length:9}, (_,i) => start+i)
    const holeResults = start === 0 ? res.f9.holeResults : res.b9.holeResults
    const pars = course.pars || Array(18).fill(4)
    const sideALabel = m.type === '2v2' ? `${m.sideA} + ${m.sideA2}` : m.sideA
    const sideBLabel = m.type === '2v2' ? `${m.sideB} + ${m.sideB2}` : m.sideB

    return (
      <div className="mb-5">
        <div className="text-[10px] font-black text-zinc-600 tracking-widest mb-2 px-1">{label}</div>
        <div className="bg-black rounded-2xl border border-zinc-900 overflow-hidden">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-zinc-950">
                <th className="py-3 px-4 text-left text-xs text-zinc-600 font-black w-32">PLAYER</th>
                {holes.map(i => (
                  <th key={i} className="py-3 px-1 w-10">
                    <div className="text-sm text-zinc-500 font-black">{i+1}</div>
                    <div className="text-[9px] text-zinc-700 font-black">p{pars[i]}</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-sm text-zinc-500 font-black">{start===0?'OUT':'IN'}</th>
              </tr>
            </thead>
            <tbody>
              {/* Side A */}
              <tr className="border-t border-zinc-900">
                <td className="py-3 px-4 text-left text-emerald-400 font-black text-xs truncate max-w-[8rem]">{sideALabel}</td>
                {holes.map(i => (
                  <td key={i} className="py-2 px-0.5">
                    <div className="text-base font-black text-white">{res.sA_net[i] || <span className="text-zinc-700">—</span>}</div>
                    {renderDots(res.sA_dots[i])}
                  </td>
                ))}
                <td className="py-3 px-3 font-black text-emerald-400 text-base">
                  {holes.reduce((acc,i)=>acc+(res.sA_net[i]||0),0)||'—'}
                </td>
              </tr>
              {/* Side B */}
              <tr className="border-t border-zinc-900 bg-white/[0.02]">
                <td className="py-3 px-4 text-left text-blue-400 font-black text-xs truncate max-w-[8rem]">{sideBLabel}</td>
                {holes.map(i => (
                  <td key={i} className="py-2 px-0.5">
                    <div className="text-base font-black text-white">{res.sB_net[i] || <span className="text-zinc-700">—</span>}</div>
                    {renderDots(res.sB_dots[i])}
                  </td>
                ))}
                <td className="py-3 px-3 font-black text-blue-400 text-base">
                  {holes.reduce((acc,i)=>acc+(res.sB_net[i]||0),0)||'—'}
                </td>
              </tr>
              {/* Winner row */}
              <tr className="border-t-2 border-zinc-800 bg-zinc-900/60">
                <td className="py-2 px-4 text-left text-zinc-600 font-black text-[10px]">HOLE</td>
                {holeResults.map((h: any, idx: number) => (
                  <td key={idx} className="py-2 px-0.5 relative">
                    <div className={`text-sm font-black ${
                      h.winner==='A'?'text-emerald-400':h.winner==='B'?'text-blue-400':h.winner==='T'?'text-zinc-500':'text-zinc-800'
                    }`}>
                      {h.winner==='T'?'½':h.winner||'·'}
                    </div>
                    {h.newP > 0 && (
                      <div className="absolute top-0.5 right-0.5">
                        <Zap size={9} className="text-yellow-400"/>
                      </div>
                    )}
                    {h.bonus && (
                      <div className="flex justify-center mt-0.5">
                        {h.bonus.type==='eagle'
                          ? <span title={`Eagle — ${h.bonus.side==='A'?sideALabel:sideBLabel}`} className="text-yellow-400 text-[10px] leading-none">★</span>
                          : <div title={`Birdie — ${h.bonus.side==='A'?sideALabel:sideBLabel}`} className={`w-2 h-2 rounded-full ${h.bonus.side==='A'?'bg-emerald-500':'bg-blue-500'}`}/>
                        }
                      </div>
                    )}
                  </td>
                ))}
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> HUB
      </Link>

      <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <DollarSign size={36} className="text-emerald-500"/>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">Match Payouts</h1>
        </div>
        <Link href="/setup/format"
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-xl text-xs font-black text-zinc-400 hover:text-white transition-all">
          <Settings size={14}/> FORMAT: {format.name}
        </Link>
      </div>

      {/* Legend */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-5 flex-wrap text-[10px] font-black text-zinc-600 tracking-widest">
        <span className="flex items-center gap-1.5"><Zap size={12} className="text-yellow-400"/> PRESS</span>
        <span className="flex items-center gap-1.5"><span className="text-yellow-400 text-sm leading-none">★</span> EAGLE</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> BIRDIE (A)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/> BIRDIE (B)</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"/> HCP STROKE</span>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        {matches.map(m => {
          const res = calculateMatch(m)
          if (!res) return null

          const sideALabel = m.type === '2v2' ? `${m.sideA} + ${m.sideA2}` : m.sideA
          const sideBLabel = m.type === '2v2' ? `${m.sideB} + ${m.sideB2}` : m.sideB

          return (
            <div key={m.id} className="bg-zinc-950 rounded-[3rem] border-2 border-zinc-800 shadow-2xl overflow-hidden">
              {/* Match header */}
              <div className="p-6 sm:p-8 border-b-2 border-zinc-900">
                <h2 className="text-xl sm:text-2xl font-black mb-3">
                  <span className="text-emerald-400">{sideALabel}</span>
                  <span className="text-zinc-600 mx-3 text-lg">VS</span>
                  <span className="text-blue-400">{sideBLabel}</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-400">{m.type}</span>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${m.scoringType==='GROSS'?'bg-rose-500/20 text-rose-400':'bg-emerald-500/20 text-emerald-400'}`}>
                    {m.scoringType||'NET'}
                  </span>
                  {res.isPvPLike && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${res.useAutoPress?'bg-yellow-500/20 text-yellow-400':'bg-zinc-800 text-zinc-500'}`}>
                      {res.useAutoPress?<Zap size={10}/>:<ZapOff size={10}/>}
                      {res.useAutoPress?'AUTO-PRESS':'NO PRESS'}
                    </span>
                  )}
                  {res.strokesA > 0 && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-[10px] font-black">{m.sideA} +{res.strokesA}</span>}
                  {res.strokesB > 0 && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-[10px] font-black">{m.sideB} +{res.strokesB}</span>}
                  <span className="bg-zinc-900 px-2 py-1 rounded-lg text-[10px] font-black text-zinc-400">Nassau ${m.nassau}</span>
                  <span className="bg-zinc-900 px-2 py-1 rounded-lg text-[10px] font-black text-blue-400">Bird ${m.birdie} · Eagle ${m.eagle||(m.birdie*2)||0}</span>
                </div>
              </div>

              {/* Scorecards */}
              <div className="p-4 sm:p-8">
                {renderNine(res, m, 0, 'FRONT 9')}
                {renderNine(res, m, 9, 'BACK 9')}
              </div>

              {/* Payout breakdown */}
              <div className="px-4 sm:px-8 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="text-zinc-500 text-xs font-black tracking-widest mb-2">FRONT 9 {res.f9.totalPresses>0?`· ${res.f9.totalPresses}× PRESS`:''}</div>
                  <div className="font-black text-lg">
                    <span className="text-emerald-400">${res.f9.payoutA}</span>
                    <span className="text-zinc-700 mx-2 text-sm">to</span>
                    <span className="text-blue-400">${res.f9.payoutB}</span>
                  </div>
                </div>
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="text-zinc-500 text-xs font-black tracking-widest mb-2">BACK 9 {res.b9.totalPresses>0?`· ${res.b9.totalPresses}× PRESS`:''}</div>
                  <div className="font-black text-lg">
                    <span className="text-emerald-400">${res.b9.payoutA}</span>
                    <span className="text-zinc-700 mx-2 text-sm">to</span>
                    <span className="text-blue-400">${res.b9.payoutB}</span>
                  </div>
                </div>
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-black tracking-widest mb-2"><Target size={12}/> BIRDIE POOL</div>
                  <div className="font-black text-lg">
                    <span className="text-emerald-400">${res.birdieA}</span>
                    <span className="text-zinc-700 mx-2 text-sm">to</span>
                    <span className="text-blue-400">${res.birdieB}</span>
                  </div>
                </div>
              </div>

              {/* Net result */}
              <div className="mx-4 sm:mx-8 mb-8 flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-6 sm:p-8 rounded-3xl gap-4">
                <div className="text-zinc-500 font-black text-xs tracking-widest">MATCH NET</div>
                <div className="text-4xl sm:text-5xl font-black">
                  {res.net > 0
                    ? <span className="text-emerald-400">{sideBLabel} OWES ${res.net}</span>
                    : res.net < 0
                    ? <span className="text-blue-400">{sideALabel} OWES ${Math.abs(res.net)}</span>
                    : <span className="text-zinc-500">EVEN</span>
                  }
                </div>
              </div>
            </div>
          )
        })}

        {matches.length === 0 && (
          <div className="text-center py-24 text-zinc-700 font-black">
            <DollarSign size={48} className="mx-auto mb-4 opacity-20"/>
            <p>NO MATCHES CONFIGURED</p>
            <p className="text-xs mt-2 tracking-widest">SET UP MATCHUPS IN SETUP CENTER</p>
          </div>
        )}
      </div>
    </div>
  )
}