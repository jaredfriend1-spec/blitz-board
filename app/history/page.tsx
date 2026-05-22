"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, set } from 'firebase/database'
import {
 ArrowLeft, Archive, Calendar, Users, Trophy, Zap,
 Trash2, ChevronDown, ChevronUp, Medal, Target,
 Flag, DollarSign, Sword, RefreshCw, Check, FileDown, Loader2
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

 // ── MATCH RESULTS (full payout engine) ──────────────────────────
 const getStrokes = (playerHcp: number, holeIdx: number, baseHcp: number, isGross: boolean) => {
 if (isGross) return 0
 const hcpRating = Number(course.holes?.[holeIdx]?.hcp) || (holeIdx + 1)
 const diff = Math.max(0, playerHcp - baseHcp)
 let s = Math.floor(diff / 18)
 if (hcpRating <= (diff % 18)) s++
 return s
 }

 const runNassauNine = (scA: number[], scB: number[], start: number, end: number, nassau: number, press: number, autoPress: boolean) => {
 let bets = [{ score: 0, pressed: false, isBase: true }]
 const holeWinners: string[] = []
 let totalPresses = 0
 for (let i = start; i <= end; i++) {
 const sa = scA[i], sb = scB[i]
 let winner = '·'
 if (sa > 0 && sb > 0) {
 if (sa < sb) winner = 'A'
 else if (sb < sa) winner = 'B'
 else winner = '½'
 }
 holeWinners.push(winner)
 const delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0
 if (delta !== 0) {
 let newPresses = 0
 bets.forEach(b => {
 b.score += delta
 if (autoPress && Math.abs(b.score) >= 2 && !b.pressed) { b.pressed = true; newPresses++; totalPresses++ }
 })
 for (let p = 0; p < newPresses; p++) bets.push({ score: 0, pressed: false, isBase: false })
 }
 }
 let payA = 0, payB = 0
 bets.forEach(b => {
 const amt = b.isBase ? nassau : press
 if (b.score > 0) payA += amt
 else if (b.score < 0) payB += amt
 })
 return { payA, payB, totalPresses, holeWinners }
 }

 const matchResults = matchups.map(m => {
 let pA: any[] = [], pB: any[] = []
 if (m.type === 'PvP') {
 pA = activePlayers.filter(p => p.name === m.sideA)
 pB = activePlayers.filter(p => p.name === m.sideB)
 } else if (m.type === '2v2') {
 pA = activePlayers.filter(p => p.name === m.sideA || p.name === m.sideA2)
 pB = activePlayers.filter(p => p.name === m.sideB || p.name === m.sideB2)
 } else if (m.type === 'Wheel') {
 // Calculate wheel pair results
 const wp = m.wheelPlayers || []
 const isGrossW = m.scoringType === 'GROSS'
 const wpHcps = isGrossW ? [0] : wp.map((name: string) => {
 const p = activePlayers.find((pl:any) => pl.name === name)
 return Number(p?.handicap) || 0
 })
 const baseHcpW = Math.min(...wpHcps)
 const netScoresW: Record<string, number[]> = {}
 wp.forEach((name: string) => {
 const p = activePlayers.find((pl:any) => pl.name === name)
 if (!p) return
 netScoresW[name] = pars.map((par, i) => {
 const g = scores[p.id]?.[i] || 0
 if (!g) return 0
 const hcpR = Number(course.holes?.[i]?.hcp) || (i+1)
 const diff = Math.max(0, (Number(p.handicap)||0) - baseHcpW)
 let s = Math.floor(diff/18); if (hcpR <= (diff%18)) s++
 return isGrossW ? g : g - s
 })
 })
 const wheelPairs: any[] = []
 const netWinnings: Record<string, number> = {}
 wp.forEach((n: string) => { netWinnings[n] = 0 })
 for (let a = 0; a < wp.length; a++) {
 for (let b = a+1; b < wp.length; b++) {
 const na = wp[a], nb = wp[b]
 let aW = 0, bW = 0
 for (let i = 0; i < 18; i++) {
 const sa = netScoresW[na]?.[i]||0, sb = netScoresW[nb]?.[i]||0
 if (sa>0&&sb>0) { if(sa<sb) aW++; else if(sb<sa) bW++ }
 }
 const amt = m.wheelAmount || 10
 const winner = aW>bW?na:bW>aW?nb:'tie'
 if (winner===na) { netWinnings[na]+=amt; netWinnings[nb]-=amt }
 else if (winner===nb) { netWinnings[nb]+=amt; netWinnings[na]-=amt }
 wheelPairs.push({ playerA:na, playerB:nb, aWins:aW, bWins:bW, winner, amount:amt })
 }
 }
 return { type:'Wheel', id:m.id, wheelPlayers:wp, wheelAmount:m.wheelAmount, scoringType:m.scoringType||'NET', sideA:'Wheel', sideB:'', winner:'', wheelPairs, netWinnings }
 } else {
 pA = activePlayers.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id))
 pB = activePlayers.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id))
 }
 if (pA.length === 0 || pB.length === 0) return null
 const isGross = m.scoringType === 'GROSS'
 const allHcps = isGross ? [0] : [...pA, ...pB].map(p => Number(p.handicap) || 0)
 const baseHcp = Math.min(...allHcps)
 const makeNetScores = (playerList: any[]) => pars.map((par, i) => {
 const valid = playerList.map(p => { const g = scores[p.id]?.[i] || 0; return g > 0 ? g - getStrokes(Number(p.handicap)||0, i, baseHcp, isGross) : 0 }).filter(Boolean)
 return valid.length > 0 ? Math.min(...valid) : 0
 })
 const sA = makeNetScores(pA)
 const sB = makeNetScores(pB)
 const nassau = Number(m.nassau) || 5
 const press = Number(m.press) || 5
 const autoPress = m.autoPress !== false && (m.type === 'PvP' || m.type === '2v2')
 const f9 = runNassauNine(sA, sB, 0, 8, nassau, press, autoPress)
 const b9 = runNassauNine(sA, sB, 9, 17, nassau, press, autoPress)
 // Total 18 winner
 let aWins18 = 0, bWins18 = 0
 for (let i = 0; i < 18; i++) { if(sA[i]>0&&sB[i]>0) { if(sA[i]<sB[i]) aWins18++; else if(sB[i]<sA[i]) bWins18++ } }
 const tot18Pay = aWins18 > bWins18 ? nassau : bWins18 > aWins18 ? -nassau : 0
 const birdieA = pars.map((par,i) => { const bg = Math.min(...pA.map(p=>scores[p.id]?.[i]||99).filter(s=>s<99)); return bg < par ? (bg <= par-2 ? Number(m.eagle||0) : Number(m.birdie||0)) : 0 }).reduce((a,b)=>a+b,0)
 const birdieB = pars.map((par,i) => { const bg = Math.min(...pB.map(p=>scores[p.id]?.[i]||99).filter(s=>s<99)); return bg < par ? (bg <= par-2 ? Number(m.eagle||0) : Number(m.birdie||0)) : 0 }).reduce((a,b)=>a+b,0)
 const net = (f9.payA - f9.payB) + (b9.payA - b9.payB) + tot18Pay + birdieA - birdieB
 const winner = net > 0 ? (m.type==='2v2'?`${m.sideA}+${m.sideA2||''}`:m.sideA) : net < 0 ? (m.type==='2v2'?`${m.sideB}+${m.sideB2||''}`:m.sideB) : 'TIE'
 const sideALabel = m.type==='2v2' ? `${m.sideA} + ${m.sideA2}` : m.sideA
 const sideBLabel = m.type==='2v2' ? `${m.sideB} + ${m.sideB2}` : m.sideB
 return { id: m.id, type: m.type, sideA: sideALabel, sideB: sideBLabel, sA, sB, f9, b9, tot18Pay, birdieA, birdieB, net, winner, nassau, press, autoPress, scoringType: m.scoringType||'NET', pars }
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
 const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null)
 const [exportingId, setExportingId] = useState<string | null>(null)

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


 const exportPDF = (arch: any, recap: any, date: string) => {
 setExportingId(arch.id)

 const isMatch = arch._meta?.mode === 'match'
 const courseTitle = arch.course?.name || 'Blitz Board'
 const subtitle = isMatch ? 'Quick Match' : `${arch._meta?.tripName || ''} · ${arch._meta?.dayLabel || ''}`.trim().replace(/^·\s*/, '')
 const pars: number[] = arch.course?.pars || Array(18).fill(4)
 const scores: Record<string, number[]> = arch.scores || {}

 // Build hole-by-hole scorecard HTML for each match
 const buildScorecardHTML = (m: any) => {
 if (m.type === 'Wheel') {
 const pairs = []
 const wp = m.wheelPlayers || []
 for (let a = 0; a < wp.length; a++) for (let b = a+1; b < wp.length; b++) pairs.push({a:wp[a],b:wp[b]})
 return `<div class="pairs-grid">${pairs.map(p => `<div class="pair-pill">${p.a} <span class="vs">vs</span> ${p.b}</div>`).join('')}</div>`
 }

 const sA = m.sA || []
 const sB = m.sB || []
 const frontWinners = m.f9?.holeWinners || []
 const backWinners = m.b9?.holeWinners || []

 const scoreCell = (s: number, par: number) => {
 if (!s) return '<td class="sc empty">—</td>'
 const d = s - par
 let cls = 'sc'
 if (d <= -2) cls += ' eagle'
 else if (d === -1) cls += ' birdie'
 else if (d === 0) cls += ' par'
 else if (d === 1) cls += ' bogey'
 else cls += ' double'
 return `<td class="${cls}">${s}</td>`
 }

 const nineTable = (start: number, label: string, winners: string[]) => {
 const holes = Array.from({length:9}, (_,i) => start+i)
 const totA = holes.reduce((acc,i) => acc+(sA[i]||0), 0)
 const totB = holes.reduce((acc,i) => acc+(sB[i]||0), 0)
 return `
 <div class="nine-label">${label}</div>
 <table class="scorecard">
 <thead><tr>
 <th class="player-col">Player</th>
 ${holes.map(i => `<th>${i+1}<div class="par-sub">p${pars[i]}</div></th>`).join('')}
 <th class="total-col">${start===0?'OUT':'IN'}</th>
 </tr></thead>
 <tbody>
 <tr class="side-a">
 <td class="player-name">${m.sideA}</td>
 ${holes.map(i => scoreCell(sA[i], pars[i])).join('')}
 <td class="total">${totA||'—'}</td>
 </tr>
 <tr class="side-b">
 <td class="player-name">${m.sideB}</td>
 ${holes.map(i => scoreCell(sB[i], pars[i])).join('')}
 <td class="total">${totB||'—'}</td>
 </tr>
 <tr class="winners-row">
 <td class="player-name" style="color:#555">Hole</td>
 ${winners.map(w => `<td class="hole-winner ${w==='A'?'win-a':w==='B'?'win-b':w==='½'?'tie':''}">${w==='·'?'':w}</td>`).join('')}
 <td></td>
 </tr>
 </tbody>
 </table>`
 }

 const payoutRow = (label: string, pA: number, pB: number) =>
 `<div class="payout-row"><span class="pl">${label}</span><span class="pa">$${pA}</span><span class="sep">·</span><span class="pb">$${pB}</span></div>`

 const result = m.net === 0 ? 'EVEN' : m.net > 0
 ? `${m.sideB} owes <strong>$${Math.abs(m.net)}</strong>`
 : `${m.sideA} owes <strong>$${Math.abs(m.net)}</strong>`

 return `
 ${nineTable(0, 'FRONT 9', frontWinners)}
 ${nineTable(9, 'BACK 9', backWinners)}
 <div class="payout-block">
 ${payoutRow('Front 9', m.f9?.payA||0, m.f9?.payB||0)}
 ${payoutRow('Back 9', m.b9?.payA||0, m.b9?.payB||0)}
 ${payoutRow('Birdies', m.birdieA||0, m.birdieB||0)}
 <div class="match-result">Match Result: ${result}</div>
 </div>`
 }

 const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blitz Board — ${courseTitle} ${date}</title>
<style>
 * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #000; color: #fff; padding: 24px; font-size: 13px; }
 @media print {
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }
 @media print, screen {
 /* Force readable colors for both screen and print */
 }
 /* Override: use light theme for everything so print works */
 body { background: #fff !important; color: #111 !important; }
 .header-bar { background: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom-color: #10b981 !important; }
 .card { background: #fff !important; border-color: #e5e7eb !important; }
 .match-card { background: #fff !important; border-color: #e5e7eb !important; }
 .match-header { background: #f9fafb !important; border-bottom: 1px solid #e5e7eb; }
 .section-title { background: #f9fafb !important; color: #047857 !important; border-bottom-color: #e5e7eb !important; }
 .section-title.amber { color: #b45309 !important; }
 .section-title.blue { color: #1d4ed8 !important; }
 .section-body { background: #fff !important; }
 .leaderboard-row { border-bottom-color: #f3f4f6 !important; }
 .lb-name { color: #111 !important; }
 .lb-hcp { color: #6b7280 !important; }
 .lb-score { color: #111 !important; }
 .lb-pos { color: #6b7280 !important; }
 .lb-pos.gold { color: #d97706 !important; }
 .scorecard th { background: #f9fafb !important; color: #374151 !important; border-bottom-color: #e5e7eb !important; }
 .scorecard td { border-bottom-color: #f3f4f6 !important; color: #111 !important; }
 .scorecard tr:nth-child(even) td { background: #fafafa !important; }
 .par-sub { color: #9ca3af !important; }
 .sc { color: #111 !important; }
 .sc.par { background: #e5e7eb !important; color: #111 !important; }
 .sc.bogey { border-color: #9ca3af !important; color: #374151 !important; background: #fff !important; }
 .sc.double { border-color: #9ca3af !important; color: #374151 !important; background: #f9fafb !important; }
 .sc.birdie { border: 2px solid #dc2626 !important; border-radius: 50% !important; color: #dc2626 !important; background: #fff !important; }
 .sc.eagle { border: 2px solid #d97706 !important; border-radius: 50% !important; outline: 2px solid #d97706 !important; outline-offset: 2px !important; color: #d97706 !important; background: #fff !important; }
 .sc.empty { color: #d1d5db !important; }
 .player-name { color: #111 !important; }
 .side-a .player-name, .side-a .total { color: #059669 !important; }
 .side-b .player-name, .side-b .total { color: #2563eb !important; }
 .side-a-label { color: #059669 !important; }
 .side-b-label { color: #2563eb !important; }
 .hole-winner { color: #6b7280 !important; }
 .win-a { color: #059669 !important; }
 .win-b { color: #2563eb !important; }
 .tie { color: #9ca3af !important; }
 .winners-row td { background: #f9fafb !important; }
 .nine-label { color: #9ca3af !important; }
 .payout-block { background: #f9fafb !important; border-top-color: #e5e7eb !important; }
 .payout-row { color: #374151 !important; }
 .payout-row .pa { color: #059669 !important; }
 .payout-row .pb { color: #2563eb !important; }
 .payout-row .sep { color: #d1d5db !important; }
 .match-result { background: #f3f4f6 !important; color: #111 !important; }
 .skins-grid { background: #fff !important; }
 .skin-cell { border-color: #e5e7eb !important; background: #fff !important; }
 .skin-cell.won { border-color: #10b981 !important; background: #f0fdf4 !important; }
 .skin-hole { color: #9ca3af !important; }
 .skin-name { color: #059669 !important; }
 .skin-empty { color: #e5e7eb !important; }
 .skins-payouts { border-top-color: #e5e7eb !important; }
 .skins-payout-row { border-bottom-color: #f3f4f6 !important; }
 .sp-name { color: #111 !important; }
 .sp-count { color: #6b7280 !important; }
 .sp-amount { color: #059669 !important; }
 .team-row { border-bottom-color: #f3f4f6 !important; }
 .team-name { color: #111 !important; }
 .team-nine { color: #6b7280 !important; }
 .team-total { color: #2563eb !important; }
 .match-sides .vs-sep { color: #9ca3af !important; }
 .badge.net { background: #f0fdf4 !important; color: #059669 !important; }
 .badge.gross { background: #fef2f2 !important; color: #dc2626 !important; }
 .badge.type { background: #f9fafb !important; color: #374151 !important; border-color: #e5e7eb !important; }
 .pair-pill { background: #faf5ff !important; border-color: #c4b5fd !important; color: #7c3aed !important; }
 .pair-pill .vs { color: #9ca3af !important; }
 .wheel-pair-row { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid #f3f4f6; font-size:12px; }
 .wheel-pair-row:last-child { border-bottom:none; }
 .wp-name { flex:1; font-weight:600; color:#374151; }
 .wp-name.win-a { color:#059669; }
 .wp-result { color:#6b7280; font-size:11px; font-weight:600; min-width:40px; text-align:center; }
 .wp-amt { min-width:40px; text-align:right; font-weight:700; color:#059669; font-size:12px; }
 .wheel-net-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
 .wheel-net-cell { border:1px solid #e5e7eb; border-radius:8px; padding:8px; text-align:center; }
 .wheel-net-cell.pos { border-color:#10b981; background:#f0fdf4; }
 .wheel-net-cell.neg { border-color:#ef4444; background:#fef2f2; }
 .wheel-net-cell.even { background:#f9fafb; }
 .wn-name { font-size:11px; color:#6b7280; font-weight:600; margin-bottom:3px; }
 .wn-amt { font-size:15px; font-weight:700; }
 .wheel-net-cell.pos .wn-amt { color:#059669; }
 .wheel-net-cell.neg .wn-amt { color:#dc2626; }
 .wheel-net-cell.even .wn-amt { color:#9ca3af; }
 .footer { color: #9ca3af !important; border-top-color: #e5e7eb !important; }
 @media print {
 .no-print { display: none !important; }
 .card { break-inside: avoid; }
 }
 .header-bar { background: #000; border-bottom: 3px solid #10b981; padding: 20px 0 16px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
 .brand { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
 .brand span { color: #10b981; }
 .header-meta { text-align: right; }
 .header-meta .course { font-size: 16px; font-weight: 700; color: #e5e7eb; }
 .header-meta .sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
 .card { background: #111; border: 1px solid #27272a; border-radius: 16px; margin-bottom: 20px; overflow: hidden; }
 .section-title { font-size: 10px; font-weight: 700; letter-spacing: .15em; color: #10b981; padding: 12px 16px 10px; border-bottom: 1px solid #27272a; text-transform: uppercase; }
 .section-title.amber { color: #f59e0b; }
 .section-title.blue { color: #60a5fa; }
 .section-body { padding: 12px 16px; }

 /* Leaderboard */
 .leaderboard-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 4px; border-bottom: 1px solid #1f1f1f; }
 .leaderboard-row:last-child { border-bottom: none; }
 .lb-pos { width: 28px; font-weight: 700; color: #6b7280; font-size: 13px; }
 .lb-pos.gold { color: #f59e0b; }
 .lb-pos.silver { color: #9ca3af; }
 .lb-name { flex: 1; font-weight: 600; font-size: 14px; }
 .lb-hcp { color: #6b7280; font-size: 11px; margin-left: 8px; }
 .lb-score { font-weight: 700; font-size: 15px; }
 .lb-topar { font-size: 12px; font-weight: 600; margin-left: 10px; min-width: 36px; text-align: right; }
 .lb-topar.under { color: #10b981; }
 .lb-topar.over { color: #ef4444; }
 .lb-topar.even { color: #9ca3af; }

 /* Skins */
 .skins-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; padding: 12px 16px; }
 .skin-cell { border: 1px solid #27272a; border-radius: 8px; padding: 6px 4px; text-align: center; min-height: 52px; }
 .skin-cell.won { border-color: #10b981; background: rgba(16,185,129,.07); }
 .skin-hole { font-size: 9px; color: #4b5563; font-weight: 600; margin-bottom: 3px; }
 .skin-name { font-size: 9px; color: #10b981; font-weight: 700; line-height: 1.2; }
 .skin-empty { font-size: 9px; color: #27272a; }
 .skins-payouts { border-top: 1px solid #27272a; }
 .skins-payout-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid #1a1a1a; }
 .skins-payout-row:last-child { border-bottom: none; }
 .sp-name { font-weight: 600; font-size: 13px; }
 .sp-count { color: #6b7280; font-size: 11px; margin-left: 8px; }
 .sp-amount { font-weight: 700; color: #10b981; font-size: 14px; }

 /* Match cards */
 .match-card { border: 1px solid #27272a; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
 .match-header { background: #1a1a1a; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
 .match-sides { font-weight: 700; font-size: 14px; }
 .match-sides .side-a-label { color: #10b981; }
 .match-sides .side-b-label { color: #60a5fa; }
 .match-sides .vs-sep { color: #4b5563; margin: 0 8px; font-size: 11px; }
 .match-badges { display: flex; gap: 6px; }
 .badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }
 .badge.net { background: rgba(16,185,129,.15); color: #10b981; }
 .badge.gross { background: rgba(239,68,68,.15); color: #ef4444; }
 .badge.type { background: #1f1f1f; color: #9ca3af; border: 1px solid #27272a; }
 .nine-label { font-size: 9px; font-weight: 700; letter-spacing: .12em; color: #6b7280; padding: 8px 14px 4px; text-transform: uppercase; }
 .scorecard { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
 .scorecard th { background: #f9fafb; padding: 5px 2px; text-align: center; font-weight: 700; color: #6b7280; font-size: 10px; border-bottom: 1px solid #e5e7eb; width: 28px; }
 .scorecard th:first-child { text-align: left; padding-left: 10px; width: 110px; }
 .scorecard th:last-child { width: 36px; }
 .scorecard td { padding: 5px 2px; text-align: center; border-bottom: 1px solid #f3f4f6; width: 28px; }
 .scorecard td:first-child { padding-left: 10px; width: 110px; }
 .scorecard td:last-child { width: 36px; }
 .par-sub { font-size: 8px; color: #9ca3af; font-weight: 400; margin-top: 1px; }
 .player-col { width: 110px; }
 .total-col { width: 36px; }
 .player-name { font-weight: 700; font-size: 12px; text-align: left !important; }
 .total { font-weight: 700; font-size: 13px; }
 .side-a .player-name, .side-a .total { color: #10b981; }
 .side-b .player-name, .side-b .total { color: #60a5fa; }
 .winners-row td { padding: 3px; }
 .hole-winner { font-weight: 700; font-size: 11px; }
 .win-a { color: #10b981; }
 .win-b { color: #60a5fa; }
 .tie { color: #6b7280; }
 .sc { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 4px; font-weight: 700; font-size: 11px; }
 .sc.birdie { border: 2px solid #dc2626; border-radius: 50%; color: #ef4444; }
 .sc.eagle { border: 2px solid #d97706; border-radius: 50%; outline: 2px solid #d97706; outline-offset: 2px; color: #f59e0b; }
 .sc.par { background: #1f1f1f; color: #e5e7eb; }
 .sc.bogey { border: 1px solid #4b5563; color: #9ca3af; }
 .sc.double { border: 2px solid #4b5563; color: #6b7280; }
 .sc.empty { color: #374151; }
 .payout-block { background: #0d0d0d; border-top: 1px solid #27272a; padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; }
 .payout-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; }
 .payout-row .pl { flex: 1; }
 .payout-row .pa { color: #10b981; font-weight: 700; }
 .payout-row .sep { color: #374151; }
 .payout-row .pb { color: #60a5fa; font-weight: 700; }
 .match-result { margin-top: 6px; background: #1a1a1a; border-radius: 8px; padding: 8px 12px; font-weight: 700; font-size: 13px; color: #e5e7eb; }
 .pairs-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px; }
 .pair-pill { background: rgba(168,85,247,.12); border: 1px solid rgba(168,85,247,.3); color: #c084fc; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600; }
 .pair-pill .vs { color: #6b7280; margin: 0 4px; }

 /* Team results */
 .team-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #1a1a1a; }
 .team-row:last-child { border-bottom: none; }
 .team-name { font-weight: 700; font-size: 14px; }
 .team-scores { display: flex; gap: 12px; align-items: center; }
 .team-nine { font-size: 11px; color: #6b7280; }
 .team-total { font-weight: 700; font-size: 15px; color: #60a5fa; }

 .print-btn { background: #10b981; color: #000; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; margin-bottom: 24px; }
 .footer { text-align: center; color: #374151; font-size: 10px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #1a1a1a; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">⬇ Save / Print PDF</button>

<div class="header-bar">
 <div class="brand">BLITZ <span>BOARD</span></div>
 <div class="header-meta">
 <div class="course">${courseTitle}</div>
 <div class="sub">${subtitle ? subtitle + ' · ' : ''}${date}</div>
 </div>
</div>

${recap.leaderboard.length > 0 ? `
<div class="card">
 <div class="section-title">Leaderboard — ${recap.fieldSize} Players</div>
 <div class="section-body" style="padding:0">
 ${recap.leaderboard.map((p: any, i: number) => {
 const tp = p.toPar === null ? '—' : p.toPar === 0 ? 'E' : p.toPar > 0 ? `+${p.toPar}` : `${p.toPar}`
 const tpClass = p.toPar === null || p.toPar === 0 ? 'even' : p.toPar < 0 ? 'under' : 'over'
 return `<div class="leaderboard-row">
 <span class="lb-pos ${i===0?'gold':i===1?'silver':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
 <span class="lb-name">${p.name}<span class="lb-hcp">HCP ${p.handicap??0}</span></span>
 <span class="lb-score">${p.tot||'—'}</span>
 <span class="lb-topar ${tpClass}">${tp}</span>
 </div>`
 }).join('')}
 </div>
</div>` : ''}

${recap.skinsLeaders.length > 0 ? `
<div class="card">
 <div class="section-title amber">Skins · Pot $${recap.skinsPot} · $${recap.perSkin}/skin · ${recap.totalSkinsWon} won</div>
 <div class="skins-grid">
 ${recap.skinsMap.map((w: any, i: number) => `
 <div class="skin-cell ${w?'won':''}">
 <div class="skin-hole">H${i+1}</div>
 ${w ? `<div class="skin-name">${w.name}</div>` : '<div class="skin-empty">—</div>'}
 </div>`).join('')}
 </div>
 <div class="skins-payouts">
 ${recap.skinsLeaders.map((p: any) => `
 <div class="skins-payout-row">
 <span class="sp-name">${p.name}<span class="sp-count">${p.count} skin${p.count>1?'s':''}</span></span>
 <span class="sp-amount">$${p.winnings}</span>
 </div>`).join('')}
 </div>
</div>` : ''}

${recap.matchResults.length > 0 ? `
<div class="card">
 <div class="section-title amber">Match Results</div>
 <div class="section-body">
 ${recap.matchResults.filter(Boolean).map((m: any) => `
 <div class="match-card">
 <div class="match-header">
 <div class="match-sides">
 <span class="side-a-label">${m.sideA}</span>
 <span class="vs-sep">VS</span>
 <span class="side-b-label">${m.sideB || ''}</span>
 </div>
 <div class="match-badges">
 <span class="badge ${m.scoringType==='GROSS'?'gross':'net'}">${m.scoringType||'NET'}</span>
 <span class="badge type">${m.type}</span>
 </div>
 </div>
 ${buildScorecardHTML(m)}
 </div>`).join('')}
 </div>
</div>` : ''}

${recap.teamResults.filter((t: any) => t.tot > 0).length > 0 ? `
<div class="card">
 <div class="section-title blue">Team Standings</div>
 <div style="padding:0">
 ${recap.teamResults.filter((t: any) => t.tot > 0).map((t: any, i: number) => `
 <div class="team-row">
 <span class="lb-pos ${i===0?'gold':i===1?'silver':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
 <span class="team-name">${t.name}</span>
 <div class="team-scores">
 <span class="team-nine">F9: ${t.f9}</span>
 <span class="team-nine">B9: ${t.b9}</span>
 <span class="team-total">${t.tot}</span>
 </div>
 </div>`).join('')}
 </div>
</div>` : ''}

<div class="footer">Generated by Blitz Board &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
</body>
</html>`

 const win = window.open('', '_blank')
 if (win) {
 win.document.write(html)
 win.document.close()
 }
 setExportingId(null)
 }


return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans">
 <Link href="/"className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> HUB
 </Link>

 <div className="max-w-5xl mx-auto">
 <div className="flex items-center gap-4 mb-10">
 <Archive size={36} className="text-blue-400"/>
 <div>
 <h1 className="text-4xl font-black tracking-tight">History</h1>
 <p className="text-zinc-600 text-[10px] font-black tracking-widest mt-0.5">{archives.length} ARCHIVED RECORD{archives.length !== 1 ? 'S' : ''}</p>
 </div>
 </div>

 {archives.length === 0 && (
 <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-[2.5rem]">
 <Archive size={48} className="mx-auto mb-4 text-zinc-800"/>
 <p className="text-zinc-600 font-black text-lg">NO HISTORY YET</p>
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
 <div className="flex items-center gap-2 flex-wrap mb-1">
 {(arch._meta?.mode === 'match' || arch.meta?.mode === 'match') && (
 <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[10px] font-black">
 ⚡ QUICK MATCH
 </span>
 )}
 {arch._meta?.tripName && arch._meta?.mode !== 'match' && (
 <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-lg text-[10px] font-black">
 {arch._meta.tripName}
 </span>
 )}
 {arch._meta?.dayLabel && arch._meta?.mode !== 'match' && (
 <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-lg text-[10px] font-black">
 {arch._meta.dayLabel}
 </span>
 )}
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
 <Section title="Full Leaderboard"icon={<Trophy size={14}/>} color="text-yellow-400">
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
 <Section title="Team Best Ball"icon={<Users size={14}/>} color="text-blue-400">
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
 <Section title="Match Results"icon={<Sword size={14}/>} color="text-amber-400">
 <div className="space-y-3">
 {recap.matchResults.map((m: any, i: number) => {
 const matchKey = `${arch.id}-match-${i}`
 const isOpen = expandedMatchKey === matchKey
 const isWheel = m.type === 'Wheel'
 return (
 <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
 {/* Match pill — tap to expand */}
 <button onClick={() => setExpandedMatchKey(isOpen ? null : matchKey)}
 className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`text-[9px] font-black px-2 py-0.5 rounded ${m.scoringType==='GROSS'?'bg-rose-500/20 text-rose-400':'bg-emerald-500/20 text-emerald-400'}`}>{m.scoringType}</span>
 <span className="text-[9px] font-black text-zinc-600">{m.type}</span>
 {!isWheel && <span className={`font-black text-xs ${m.winner==='TIE'?'text-zinc-400':'text-amber-400'}`}>{m.winner==='TIE'?'TIE':`${m.winner} WINS`}</span>}
 {!isWheel && m.net !== 0 && <span className="text-zinc-600 text-[9px] font-black">${Math.abs(m.net)}</span>}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-black text-zinc-600">{isOpen?'▲ HIDE':'▼ DETAILS'}</span>
 </div>
 </button>

 {/* Match summary row */}
 <div className="px-4 pb-3 flex items-center justify-between">
 <span className={`font-black text-sm truncate ${!isWheel&&m.net>0?'text-emerald-400':'text-zinc-400'}`}>{m.sideA}</span>
 {!isWheel && <span className="text-zinc-600 font-black text-xs mx-3">VS</span>}
 {!isWheel && <span className={`font-black text-sm truncate text-right ${m.net<0?'text-emerald-400':'text-zinc-400'}`}>{m.sideB}</span>}
 {isWheel && <span className="text-purple-400 text-[10px] font-black">WHEEL · {(m.wheelPlayers||[]).join(' · ')}</span>}
 </div>

 {/* Expanded scorecard */}
 {isOpen && !isWheel && (
 <div className="border-t border-zinc-800 bg-black/30">
 {/* F9 and B9 mini scorecards */}
 {[{start:0,label:'FRONT 9',nine:m.f9},{start:9,label:'BACK 9',nine:m.b9}].map(({start,label,nine}) => (
 <div key={label} className="overflow-x-auto">
 <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
 <span className="text-[9px] font-black text-zinc-500 tracking-widest">{label}</span>
 {nine.totalPresses > 0 && <span className="ml-2 text-[9px] font-black text-yellow-400">⚡ {nine.totalPresses}× PRESS</span>}
 </div>
 <table className="w-full text-center"style={{minWidth:'480px'}}>
 <thead>
 <tr className="bg-zinc-950">
 <th className="py-1.5 px-3 text-left text-[9px] text-zinc-600 font-black w-24">SIDE</th>
 {Array.from({length:9},(_,i)=>start+i).map(i => (
 <th key={i} className="py-1.5 w-8">
 <div className="text-[9px] text-zinc-500 font-black">{i+1}</div>
 <div className="text-[8px] text-zinc-700 font-black">p{m.pars?.[i]||4}</div>
 </th>
 ))}
 <th className="py-1.5 px-2 text-[9px] text-blue-400 font-black">{start===0?'OUT':'IN'}</th>
 </tr>
 </thead>
 <tbody>
 {[{label:m.sideA,scores:m.sA,color:'text-emerald-400'},{label:m.sideB,scores:m.sB,color:'text-blue-400'}].map(side => {
 const nineScores = (side.scores||[]).slice(start,start+9)
 const total = nineScores.reduce((a:number,b:number)=>a+(b||0),0)
 return (
 <tr key={side.label} className="border-t border-zinc-900">
 <td className={`py-2 px-3 text-left font-black text-[9px] truncate ${side.color}`}>{side.label}</td>
 {nineScores.map((s:number,i:number) => {
 const par = m.pars?.[start+i]||4
 const diff = s>0 ? s-par : null
 let cls = 'w-6 h-6 rounded flex items-center justify-center mx-auto text-[9px] font-black '
 if (diff===null) cls+='text-zinc-700'
 else if (diff<=-2) cls+='rounded-full border border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if (diff===-1) cls+='rounded-full border border-red-500 text-red-400'
 else if (diff===0) cls+='bg-zinc-800 text-white'
 else if (diff===1) cls+='border border-zinc-600 text-zinc-400'
 else cls+='border-2 border-zinc-600 text-zinc-500'
 return <td key={i} className="py-1"><div className={cls}>{s||'—'}</div></td>
 })}
 <td className={`py-2 px-2 font-black text-sm ${side.color}`}>{total||'—'}</td>
 </tr>
 )
 })}
 {/* Hole winners */}
 <tr className="border-t border-zinc-800 bg-zinc-900/40">
 <td className="py-1.5 px-3 text-[9px] font-black text-zinc-600 text-left">HOLE</td>
 {(nine.holeWinners||[]).map((w:string, i:number) => (
 <td key={i} className="py-1 text-center">
 <span className={`text-[9px] font-black ${w==='A'?'text-emerald-400':w==='B'?'text-blue-400':w==='½'?'text-zinc-500':'text-zinc-800'}`}>{w==='·'?'':w}</span>
 </td>
 ))}
 <td/>
 </tr>
 </tbody>
 </table>
 </div>
 ))}
 {/* Payout breakdown */}
 <div className="p-4 grid grid-cols-3 gap-2 border-t border-zinc-800">
 {[
 {label:'FRONT 9',payA:m.f9?.payA||0,payB:m.f9?.payB||0},
 {label:'BACK 9',payA:m.b9?.payA||0,payB:m.b9?.payB||0},
 {label:'BIRDIES',payA:m.birdieA||0,payB:m.birdieB||0},
 ].map(row => (
 <div key={row.label} className="bg-black rounded-xl p-2 text-center">
 <div className="text-zinc-600 text-[8px] font-black mb-1">{row.label}</div>
 <div className="text-[9px] font-black">
 <span className="text-emerald-400">${row.payA}</span>
 <span className="text-zinc-700 mx-1">·</span>
 <span className="text-blue-400">${row.payB}</span>
 </div>
 </div>
 ))}
 </div>
 <div className="px-4 pb-4 flex items-center justify-between bg-zinc-900/40 mx-4 mb-4 rounded-2xl p-3">
 <span className="text-zinc-500 text-[9px] font-black">MATCH RESULT</span>
 <span className={`font-black text-base ${m.net===0?'text-zinc-500':m.net>0?'text-emerald-400':'text-blue-400'}`}>
 {m.net===0?'EVEN':m.net>0?`${m.sideB} OWES $${Math.abs(m.net)}`:`${m.sideA} OWES $${Math.abs(m.net)}`}
 </span>
 </div>
 </div>
 )}

 {/* Wheel expanded */}
 {isOpen && isWheel && (
 <div className="border-t border-zinc-800 p-4 bg-black/20 space-y-3">
 <p className="text-[9px] font-semibold text-zinc-500 tracking-widest">
 WHEEL · {m.scoringType||'NET'} · ${m.wheelAmount}/PAIR · {(m.wheelPlayers||[]).join(' · ')}
 </p>
 {/* Pair results */}
 <div className="space-y-1.5">
 {(m.wheelPairs||[]).map((pair: any, pi: number) => (
 <div key={pi} className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${
 pair.winner==='tie'?'bg-zinc-900 border-zinc-800':'bg-emerald-950/20 border-emerald-500/20'
 }`}>
 <span className={`font-semibold text-sm ${pair.winner===pair.playerA?'text-emerald-400':'text-zinc-400'}`}>{pair.playerA}</span>
 <div className="text-center">
 <div className={`text-xs font-semibold ${pair.winner==='tie'?'text-zinc-500':'text-emerald-400'}`}>
 {pair.winner==='tie'?'TIE':`${pair.aWins}–${pair.bWins}`}
 </div>
 {pair.winner!=='tie' && <div className="text-[9px] text-zinc-500">${pair.amount}</div>}
 </div>
 <span className={`font-semibold text-sm ${pair.winner===pair.playerB?'text-emerald-400':'text-zinc-400'}`}>{pair.playerB}</span>
 </div>
 ))}
 </div>
 {/* Net per player */}
 {m.netWinnings && Object.keys(m.netWinnings).length > 0 && (
 <div>
 <p className="text-[9px] font-semibold text-zinc-600 tracking-widest mb-2">NET PER PLAYER</p>
 <div className="grid grid-cols-2 gap-2">
 {Object.entries(m.netWinnings).map(([name, net]: [string, any]) => (
 <div key={name} className={`rounded-xl p-3 border text-center ${
 net>0?'border-emerald-500/30 bg-emerald-950/20':
 net<0?'border-rose-500/30 bg-rose-950/20':
 'border-zinc-800 bg-zinc-900'
 }`}>
 <div className="text-zinc-400 text-xs font-semibold mb-0.5">{name}</div>
 <div className={`font-bold text-base ${net>0?'text-emerald-400':net<0?'text-rose-400':'text-zinc-500'}`}>
 {net===0?'EVEN':net>0?`+$${net}`:`-$${Math.abs(net)}`}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
 })}
 </div>
 </Section>
 )}

 {/* ── FOOTER: EXPORT + DELETE ── */}
 <div className="px-5 py-4 border-t border-zinc-900 flex items-center justify-between gap-3">
 <p className="text-[9px] text-zinc-600 font-medium">{date}</p>
 <div className="flex items-center gap-2">
 <button
 onClick={() => exportPDF(arch, recap, date)}
 disabled={exportingId === arch.id}
 className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
 >
 {exportingId === arch.id
 ? <><Loader2 size={13} className="animate-spin text-emerald-400"/> Exporting...</>
 : <><FileDown size={13}/> Export PDF</>
 }
 </button>
 <button
 onClick={() => deleteHistory(arch.id)}
 className="text-zinc-700 hover:text-rose-500 transition-colors flex items-center gap-1.5 text-xs font-semibold px-2 py-2"
 >
 <Trash2 size={13}/> Delete
 </button>
 </div>
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