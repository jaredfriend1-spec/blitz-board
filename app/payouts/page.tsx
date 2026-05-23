"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Zap, ZapOff, DollarSign, Target, RefreshCw, Archive } from 'lucide-react'
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


// ── WHEEL MATCH CALCULATOR ────────────────────────────────────────
function calculateWheel(
 wheelPlayers: string[],
 players: any[],
 scores: Record<string, number[]>,
 course: any,
 scoringType: string,
 wheelAmount: number,
 wheelFormat: string = 'straight',
 wheelNassau: number = 5,
 wheelPress: number = 5,
 wheelAutoPress: boolean = true,
) {
 const isGross = scoringType === 'GROSS'
 const resolved = wheelPlayers.map(name => players.find(p => p.name === name)).filter(Boolean)
 if (resolved.length !== 4) return null

 const allHcps = isGross ? [0] : resolved.map(p => Number(p.handicap) || 0)
 const baseHcp = Math.min(...allHcps)

 const getStrokes = (playerHcp: number, holeIdx: number) => {
 if (isGross) return 0
 const hcpRating = Number(course.holes?.[holeIdx]?.hcp) || (holeIdx + 1)
 const diff = Math.max(0, playerHcp - baseHcp)
 let s = Math.floor(diff / 18)
 if (hcpRating <= (diff % 18)) s++
 return s
 }

 const playerNetScores = resolved.map(p => {
 const gross = scores[p.id] || Array(18).fill(0)
 return gross.map((g: number, i: number) => g > 0 ? g - getStrokes(Number(p.handicap)||0, i) : 0)
 })

 const pairs: {a:number, b:number}[] = []
 for (let a = 0; a < 4; a++)
 for (let b = a+1; b < 4; b++)
 pairs.push({a, b})

 const netWinnings = [0, 0, 0, 0]

 const runNine = (scA: number[], scB: number[], start: number, end: number, nassau: number, press: number, autoPress: boolean) => {
 let bets = [{score:0, pressed:false, isBase:true}]
 let totalPresses = 0
 const pressHoles: number[] = [] // which holes (relative 0-8) fired a press
 for (let i = start; i <= end; i++) {
 const sa = scA[i], sb = scB[i]
 if (sa === 0 || sb === 0) continue
 const delta = sa < sb ? 1 : sb < sa ? -1 : 0
 if (delta !== 0) {
 let newPressCount = 0
 bets.forEach(b => {
 b.score += delta
 if (autoPress && Math.abs(b.score) >= 2 && !b.pressed) {
 b.pressed = true
 newPressCount++
 totalPresses++
 pressHoles.push(i - start) // relative hole index 0-8
 }
 })
 for (let p = 0; p < newPressCount; p++) {
 bets.push({ score: 0, pressed: false, isBase: false })
 }
 }
 }
 let payA = 0, payB = 0
 bets.forEach(b => {
 const amt = b.isBase ? nassau : press
 if (b.score > 0) payA += amt
 else if (b.score < 0) payB += amt
 })
 const holeWinners: string[] = []
 for (let i = start; i <= end; i++) {
 const sa = scA[i], sb = scB[i]
 if (!sa || !sb) { holeWinners.push('·'); continue }
 holeWinners.push(sa < sb ? 'A' : sb < sa ? 'B' : '½')
 }
 return {payA, payB, totalPresses, holeWinners, pressHoles}
 }

 const pairResults = pairs.map(({a, b}) => {
 const scA = playerNetScores[a]
 const scB = playerNetScores[b]

 if (wheelFormat === 'nassau') {
 // Run F9, B9, Total as separate bets
 const f9 = runNine(scA, scB, 0, 8, wheelNassau, wheelPress, wheelAutoPress)
 const b9 = runNine(scA, scB, 9, 17, wheelNassau, wheelPress, wheelAutoPress)
 // Total 18
 let aTotal = 0, bTotal = 0
 for (let i = 0; i < 18; i++) {
 const sa = scA[i], sb = scB[i]
 if (sa === 0 || sb === 0) continue
 if (sa < sb) aTotal++
 else if (sb < sa) bTotal++
 }
 const totalWinner = aTotal > bTotal ? 'A' : bTotal > aTotal ? 'B' : 'T'
 const totalPay = totalWinner === 'A' ? wheelNassau : totalWinner === 'B' ? -wheelNassau : 0
 const pairNetA = (f9.payA - f9.payB) + (b9.payA - b9.payB) + totalPay
 netWinnings[a] += pairNetA
 netWinnings[b] -= pairNetA
 return {
 playerA: resolved[a].name,
 playerB: resolved[b].name,
 format: 'nassau',
 f9: {payA: f9.payA, payB: f9.payB, holeWinners: f9.holeWinners, totalPresses: f9.totalPresses, pressHoles: f9.pressHoles},
 b9: {payA: b9.payA, payB: b9.payB, holeWinners: b9.holeWinners, totalPresses: b9.totalPresses, pressHoles: b9.pressHoles},
 totalWinner,
 nassau: wheelNassau,
 pairNetA,
 }
 } else {
 // Straight 18
 let aWins = 0, bWins = 0
 const holeWinnersS: string[] = []
 for (let i = 0; i < 18; i++) {
 const sa = scA[i], sb = scB[i]
 if (sa === 0 || sb === 0) { holeWinnersS.push('·'); continue }
 if (sa < sb) { aWins++; holeWinnersS.push('A') }
 else if (sb < sa) { bWins++; holeWinnersS.push('B') }
 else holeWinnersS.push('½')
 }
 const winner = aWins > bWins ? a : bWins > aWins ? b : -1
 if (winner === a) { netWinnings[a] += wheelAmount; netWinnings[b] -= wheelAmount }
 else if (winner === b) { netWinnings[b] += wheelAmount; netWinnings[a] -= wheelAmount }
 return {
 playerA: resolved[a].name, playerB: resolved[b].name,
 format: 'straight', aWins, bWins, holeWinners: holeWinnersS,
 winner: winner === -1 ? 'tie' : resolved[winner].name,
 amount: wheelAmount
 }
 }
 })

 return {
 players: resolved.map((p, i) => ({ name: p.name, net: netWinnings[i] })),
 pairs: pairResults,
 format: wheelFormat,
 }
}

export default function PayoutsPage() {
 const [scores, setScores] = useState<Record<string, number[]>>({})
 const [expandedWheelPair, setExpandedWheelPair] = useState<string|null>(null)
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
 <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
 <Link href="/"className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> HUB
 </Link>

 <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
 <div className="flex items-center gap-4">
 <DollarSign size={36} className="text-emerald-500"/>
 <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">Match Payouts</h1>
 </div>
 {activeMode === 'match' && !isMock && (
 <button onClick={archiveMatch} disabled={archiving}
 className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all text-zinc-400 hover:text-emerald-400">
 <Archive size={15}/>
 {archiving ? 'Archiving...' : 'Archive Match'}
 </button>
 )}
 </div>
 {archiveSuccess && (
 <div className="max-w-4xl mx-auto mb-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
 <Archive size={14}/> Match archived to History
 </div>
 )}

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
 // ── WHEEL MATCH RENDERING ──
 if (m.type === 'Wheel') {
 const wheelRes = calculateWheel(
 m.wheelPlayers || [],
 players, scores, course,
 m.scoringType || 'NET',
 m.wheelAmount || 10,
 m.wheelFormat || 'straight',
 m.wheelNassau || 5,
 m.wheelPress || 5,
 m.wheelAutoPress !== false,
 )
 if (!wheelRes) return null
 return (
 <div key={m.id} className="bg-zinc-950 rounded-[3rem] border-2 border-purple-500/40 shadow-2xl overflow-hidden">
 <div className="p-6 sm:p-8 border-b-2 border-zinc-900">
 <div className="flex items-center gap-3 mb-3">
 <RefreshCw size={24} className="text-purple-400"/>
 <h2 className="text-2xl font-black text-purple-400">WHEEL BET</h2>
 </div>
 <div className="flex flex-wrap gap-2 mb-2">
 {(m.wheelPlayers||[]).map((p:string) => (
 <span key={p} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-xl text-xs font-black">{p}</span>
 ))}
 <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-xl text-xs font-black">{m.wheelFormat==='nassau'?`N:$${m.wheelNassau}`:`$${m.wheelAmount}`}/PAIR · {m.scoringType||'NET'} · {m.wheelFormat==='nassau'?'NASSAU':'STRAIGHT 18'}</span>
 </div>
 </div>

 {/* Pair results */}
 <div className="p-6 sm:p-8">
 <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-4">
 PAIR RESULTS — TAP TO SEE SCORECARD
 </p>
 <div className="space-y-3 mb-6">
 {wheelRes.pairs.map((pair: any, i: number) => {
 const isNassau = pair.format === 'nassau'
 const aNet = isNassau ? pair.pairNetA : (pair.winner===pair.playerA?pair.amount:pair.winner==='tie'?0:-pair.amount)
 const pairKey = `${m.id}-${i}`
 const isExpanded = expandedWheelPair === pairKey

 // Build per-hole data for this pair
 const pA = players.find(p => p.name === pair.playerA)
 const pB = players.find(p => p.name === pair.playerB)
 const allHcps = m.scoringType==='GROSS' ? [0] : [pA,pB].filter(Boolean).map((p:any)=>Number(p.handicap)||0)
 const baseHcp = Math.min(...allHcps)
 const getStrokes = (playerHcp: number, holeIdx: number) => {
 if (m.scoringType==='GROSS') return 0
 const hcpRating = Number(course.holes?.[holeIdx]?.hcp) || (holeIdx+1)
 const diff = Math.max(0, playerHcp - baseHcp)
 let s = Math.floor(diff/18)
 if (hcpRating <= (diff%18)) s++
 return s
 }
 const pars = course.pars || Array(18).fill(4)
 const makeHoleData = (p: any) => {
 if (!p) return Array(18).fill({gross:0,net:0,strokes:0})
 const g = scores[p.id] || Array(18).fill(0)
 return g.map((gross:number, i:number) => {
 const strokes = getStrokes(Number(p.handicap)||0, i)
 return { gross, net: gross>0 ? gross-strokes : 0, strokes }
 })
 }
 const holeDataA = pA ? makeHoleData(pA) : null
 const holeDataB = pB ? makeHoleData(pB) : null

 return (
 <div key={i} className={`rounded-2xl border overflow-hidden transition-all ${
 isExpanded ? 'border-purple-500/60' :
 isNassau ? (pair.pairNetA > 0 ? 'border-emerald-500/30' : pair.pairNetA < 0 ? 'border-blue-500/30' : 'border-zinc-800')
 : pair.winner==='tie' ? 'border-zinc-800' : pair.winner===pair.playerA ? 'border-emerald-500/30' : 'border-blue-500/30'
 }`}>
 {/* Pair pill — always visible, tap to expand */}
 <button
 onClick={() => setExpandedWheelPair(isExpanded ? null : pairKey)}
 className={`w-full p-4 flex items-center justify-between transition-all ${
 isExpanded ? 'bg-purple-950/20' :
 isNassau ? (pair.pairNetA > 0 ? 'bg-emerald-950/20' : pair.pairNetA < 0 ? 'bg-blue-950/20' : 'bg-zinc-900')
 : pair.winner==='tie' ? 'bg-zinc-900' : pair.winner===pair.playerA ? 'bg-emerald-950/20' : 'bg-blue-950/20'
 } hover:opacity-90`}
 >
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <span className={`font-black text-sm truncate ${aNet>0?'text-emerald-400':aNet<0?'text-zinc-400':'text-zinc-300'}`}>
 {pair.playerA}
 </span>
 <span className={`font-black text-sm flex-shrink-0 ${aNet===0?'text-zinc-500':aNet>0?'text-emerald-400':'text-blue-400'}`}>
 {aNet===0?'EVEN':aNet>0?`+$${aNet}`:`-$${Math.abs(aNet)}`}
 </span>
 <span className={`font-black text-sm truncate text-right ${aNet<0?'text-emerald-400':aNet>0?'text-zinc-400':'text-zinc-300'}`}>
 {pair.playerB}
 </span>
 </div>
 <div className="flex items-center gap-2 ml-3 flex-shrink-0">
 {!isNassau && (
 <span className="text-[9px] font-black text-zinc-600">
 {pair.aWins}–{pair.bWins}
 </span>
 )}
 {isNassau && (
 <span className="text-[9px] font-black text-zinc-600">
 F:{pair.f9.payA>pair.f9.payB?'A':pair.f9.payB>pair.f9.payA?'B':'T'} B:{pair.b9.payA>pair.b9.payB?'A':pair.b9.payB>pair.b9.payA?'B':'T'}
 </span>
 )}
 <span className="text-[9px] font-black text-purple-400">
 {isExpanded ? '▲' : '▼ CARD'}
 </span>
 </div>
 </button>

 {/* Expanded scorecard */}
 {isExpanded && holeDataA && holeDataB && (
 <div className="border-t border-purple-500/20 bg-black overflow-x-auto">
 {[{start:0,label:'FRONT 9'},{start:9,label:'BACK 9'}].map(({start,label}) => (
 <div key={label} className="mb-1">
 <div className="px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800">
 <span className="text-[9px] font-black text-zinc-600 tracking-widest">{label}</span>
 </div>
 <table className="w-full text-center"style={{minWidth:'520px'}}>
 <thead>
 <tr className="bg-zinc-950">
 <th className="py-2 px-3 text-left text-[10px] text-zinc-600 font-black w-28">PLAYER</th>
 {Array.from({length:9},(_,i)=>start+i).map(i=>(
 <th key={i} className="py-2 px-0.5 w-9">
 <div className="text-[10px] text-zinc-500 font-black">{i+1}</div>
 <div className="text-[9px] text-zinc-700 font-black">p{pars[i]}</div>
 </th>
 ))}
 <th className="py-2 px-2 text-[10px] text-zinc-500 font-black">{start===0?'OUT':'IN'}</th>
 </tr>
 </thead>
 <tbody>
 {[{player:pA,data:holeDataA,color:'text-emerald-400'},{player:pB,data:holeDataB,color:'text-blue-400'}].map(({player,data,color})=>(
 <tr key={(player as any)?.id} className="border-t border-zinc-900">
 <td className={`py-2 px-3 text-left font-black text-xs truncate ${color}`}>{(player as any)?.name}</td>
 {Array.from({length:9},(_,i)=>start+i).map(i=>{
 const h = (data as any[])[i]
 const diff = h.net > 0 ? h.net - pars[i] : null
 let cellClass = 'w-8 h-8 rounded flex items-center justify-center mx-auto text-xs font-black'
 if (diff === null) cellClass += ' text-zinc-700'
 else if (diff <= -2) cellClass += ' rounded-full border-2 border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if (diff === -1) cellClass += ' rounded-full border-2 border-red-500 text-red-400'
 else if (diff === 0) cellClass += ' bg-zinc-800 text-white'
 else if (diff === 1) cellClass += ' border border-zinc-500 text-zinc-300'
 else cellClass += ' border-2 border-zinc-500 text-zinc-400'
 return (
 <td key={i} className="py-1.5 px-0.5">
 <div className={cellClass}>{h.net||'—'}</div>
 {h.strokes > 0 && (
 <div className="flex justify-center mt-0.5 gap-px">
 {Array.from({length:Math.min(h.strokes,3)}).map((_,si)=>(
 <div key={si} className="w-1 h-1 bg-yellow-500 rounded-full"/>
 ))}
 </div>
 )}
 </td>
 )
 })}
 <td className={`py-2 px-2 font-black text-sm ${color}`}>
 {Array.from({length:9},(_,i)=>start+i).reduce((acc,i)=>acc+((data as any[])[i].net||0),0)||'—'}
 </td>
 </tr>
 ))}
 {/* Hole winner row with press + birdie indicators */}
 <tr className="border-t border-zinc-800 bg-zinc-900/40">
 <td className="py-1.5 px-3 text-[10px] font-semibold text-zinc-600 text-left">HOLE</td>
 {Array.from({length:9},(_,i)=>start+i).map(i=>{
 const na = (holeDataA as any[])[i].net
 const nb = (holeDataB as any[])[i].net
 const ga = (holeDataA as any[])[i].gross
 const gb = (holeDataB as any[])[i].gross
 const par = pars[start+i] || 4
 const winner = na>0&&nb>0 ? na<nb?'A':nb<na?'B':'T' : null
 const aBirdie = ga>0 && ga < par
 const bBirdie = gb>0 && gb < par
 const nineKey = start===0?'f9':'b9'
 const pressedHere = isNassau && ((pair as any)[nineKey]?.pressHoles||[]).includes(i)
 return (
 <td key={i} className="py-1 px-0.5 text-center">
 {pressedHere && (
 <div className="flex justify-center mb-0.5">
 <Zap size={9} className="text-yellow-400"/>
 </div>
 )}
 <span className={`text-xs font-semibold block ${
 winner==='A'?'text-emerald-400':winner==='B'?'text-blue-400':winner==='T'?'text-zinc-500':'text-zinc-800'
 }`}>
 {winner==='T'?'½':winner||'·'}
 </span>
 {(aBirdie||bBirdie) && (
 <div className="flex justify-center gap-px mt-0.5">
 {aBirdie && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>}
 {bBirdie && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"/>}
 </div>
 )}
 </td>
 )
 })}
 <td/>
 </tr>
 </tbody>
 </table>
 </div>
 ))}
 </div>
 )}
 </div>
 )
 })}
 </div>

 {/* Net per player */}
 <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">NET RESULT PER PLAYER</p>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {wheelRes.players.map(p => (
 <div key={p.name} className={`rounded-2xl p-4 border text-center ${
 p.net > 0 ? 'bg-emerald-950/40 border-emerald-500/40' :
 p.net < 0 ? 'bg-rose-950/40 border-rose-500/40' :
 'bg-zinc-900 border-zinc-800'
 }`}>
 <div className="font-black text-xs text-zinc-400 mb-1">{p.name}</div>
 <div className={`font-black text-2xl ${p.net>0?'text-emerald-400':p.net<0?'text-rose-400':'text-zinc-500'}`}>
 {p.net>0?'+':''}{p.net===0?'EVEN':`$${Math.abs(p.net)}`}
 </div>
 {p.net !== 0 && (
 <div className="text-[9px] font-black text-zinc-600 mt-1 normal-case">
 {p.net > 0 ? 'collect' : 'owes'}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 )
 }

 // ── REGULAR MATCH RENDERING ──
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
 <div className="text-zinc-500 font-black text-xs tracking-widest">MATCH RESULT</div>
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