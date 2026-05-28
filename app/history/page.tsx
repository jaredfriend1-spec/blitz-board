"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
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

 // 9-hole support
 const nineHole: boolean = !!course.nineHole
 const nineHoleStart: string = course.nineHoleStart || 'front'
 const holeOffset: number = nineHole && nineHoleStart === 'back' ? 9 : 0
 const allPars: number[] = course.pars || Array(18).fill(4)
 const pars: number[] = nineHole ? allPars.slice(holeOffset, holeOffset + 9) : allPars
 const totalPar = pars.reduce((a, b) => a + b, 0)

 // Active players — if no teams, all players are active
 const activeIds = new Set<string>()
 teams.forEach(t => (t.playerIds || []).forEach((id: string) => activeIds.add(id)))
 const activePlayers = teams.length > 0
 ? players.filter(p => activeIds.has(p.id))
 : players
 const fieldSize = activePlayers.length

 // Helper: get player's scored holes correctly for 9 or 18
 const getScores = (playerId: string) => {
 const s = scores[playerId] || Array(18).fill(0)
 return nineHole ? s.slice(holeOffset, holeOffset + 9) : s
 }

 // ── INDIVIDUAL LEADERBOARD ────────────────────────────────────────
 const leaderboard = activePlayers.map(p => {
 const s = getScores(p.id)
 const f9 = nineHole
 ? s.reduce((a: number, b: number) => a + (Number(b) || 0), 0)
 : s.slice(0, 9).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
 const b9 = nineHole ? 0 : s.slice(9, 18).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
 const tot = f9 + b9
 const toPar = tot > 0 ? tot - totalPar : null
 const f9Par = nineHole ? totalPar : pars.slice(0, 9).reduce((a, b) => a + b, 0)
 const b9Par = nineHole ? 0 : pars.slice(9, 18).reduce((a, b) => a + b, 0)
 return { ...p, f9, b9, tot, toPar, f9ToPar: f9 > 0 ? f9 - f9Par : null, b9ToPar: b9 > 0 ? b9 - b9Par : null }
 }).sort((a, b) => {
 if (a.tot === 0 && b.tot > 0) return 1
 if (b.tot === 0 && a.tot > 0) return -1
 return a.tot - b.tot
 })

 const f9Winners = leaderboard.filter(p => p.f9 > 0).sort((a, b) => a.f9 - b.f9).slice(0, 3)
 const b9Winners = leaderboard.filter(p => p.b9 > 0).sort((a, b) => a.b9 - b.b9).slice(0, 3)

 // ── SKINS ─────────────────────────────────────────────────────────
 const numHoles = nineHole ? 9 : 18
 const skinsMap: (any | null)[] = Array(numHoles).fill(null)
 const skinsCount: Record<string, number> = {}

 for (let h = 0; h < numHoles; h++) {
 const hIdx = holeOffset + h // actual index in scores array
 const holeScores = activePlayers
 .map(p => ({ id: p.id, name: p.name, s: (scores[p.id] || [])[hIdx] || 0 }))
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
 const perSkinRaw = totalSkinsWon > 0 ? skinsPot / totalSkinsWon : 0
 const perSkin = Math.round(perSkinRaw * 100) / 100

 const skinsLeaders = activePlayers
 .filter(p => skinsCount[p.id] > 0)
 .map(p => ({ name: p.name, count: skinsCount[p.id], winnings: Math.round(skinsCount[p.id] * perSkin * 100) / 100 }))
 .sort((a, b) => b.count - a.count)

 // ── TEAM BEST BALL SCORES ──────────────────────────────────────────
 const teamResults = teams.map(t => {
 const pIds: string[] = t.playerIds || []
 const holeAgg = pars.map((par, i) => {
 const actualIdx = holeOffset + i
 const pScores = pIds
 .map(id => scores[id]?.[actualIdx] || 0)
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
 const g = scores[p.id]?.[holeOffset + i] || 0
 if (!g) return 0
 const hcpR = Number(course.holes?.[holeOffset + i]?.hcp) || (holeOffset + i + 1)
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
 const valid = playerList.map(p => { const g = scores[p.id]?.[holeOffset + i] || 0; return g > 0 ? g - getStrokes(Number(p.handicap)||0, holeOffset + i, baseHcp, isGross) : 0 }).filter(Boolean)
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
 const birdieA = pars.map((par,i) => { const bg = Math.min(...pA.map(p=>scores[p.id]?.[holeOffset+i]||99).filter(s=>s<99)); return bg < par ? (bg <= par-2 ? Number(m.eagle||0) : Number(m.birdie||0)) : 0 }).reduce((a,b)=>a+b,0)
 const birdieB = pars.map((par,i) => { const bg = Math.min(...pB.map(p=>scores[p.id]?.[holeOffset+i]||99).filter(s=>s<99)); return bg < par ? (bg <= par-2 ? Number(m.eagle||0) : Number(m.birdie||0)) : 0 }).reduce((a,b)=>a+b,0)
 const net = (f9.payA - f9.payB) + (b9.payA - b9.payB) + tot18Pay + birdieA - birdieB
 const winner = net > 0 ? (m.type==='2v2'?`${m.sideA}+${m.sideA2||''}`:m.sideA) : net < 0 ? (m.type==='2v2'?`${m.sideB}+${m.sideB2||''}`:m.sideB) : 'TIE'
 const sideALabel = m.type==='2v2' ? `${m.sideA} + ${m.sideA2}` : m.sideA
 const sideBLabel = m.type==='2v2' ? `${m.sideB} + ${m.sideB2}` : m.sideB
 // Individual raw scores for each player (for 2v2 display)
 const pAScores = pA.map((p:any) => ({ id:p.id, name:p.name, handicap:p.handicap, scores: arch.scores?.[p.id] || Array(18).fill(0) }))
 const pBScores = pB.map((p:any) => ({ id:p.id, name:p.name, handicap:p.handicap, scores: arch.scores?.[p.id] || Array(18).fill(0) }))
 return { id: m.id, type: m.type, sideA: sideALabel, sideB: sideBLabel, sA, sB, pAScores, pBScores, f9, b9, tot18Pay, birdieA, birdieB, net, winner, nassau, press, autoPress, scoringType: m.scoringType||'NET', pars }
 }).filter(Boolean)

 return {
 fieldSize, leaderboard, f9Winners, b9Winners,
 skinsMap, skinsLeaders, totalSkinsWon, skinsPot, perSkin,
 teamResults, matchResults, money, nineHole
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
 const { role } = useAuth()
 const sessionRole = typeof window !== 'undefined' ? sessionStorage.getItem('role') : null
 const canDelete = role === 'scorer' || role === 'master' || sessionRole === 'admin' || sessionRole === 'master'
 const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)
 const [deleteInput, setDeleteInput] = useState('')
 const [archives, setArchives] = useState<any[]>([])
 const [expandedId, setExpandedId] = useState<string | null>(null)
 const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null)
 const [exportingId, setExportingId] = useState<string | null>(null)
 const [expandedWheelPairHistKey, setExpandedWheelPairHistKey] = useState<string | null>(null)

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
 if (!canDelete) return
 setDeleteConfirm(id)
 setDeleteInput('')
 }

 const confirmDelete = () => {
 if (deleteInput.toLowerCase() !== 'delete') return
 if (deleteConfirm) {
 set(ref(db, `history/${deleteConfirm}`), null)
 setDeleteConfirm(null)
 setDeleteInput('')
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
<title>Blitz Board Export</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #111; font-size: 11px; max-width: 190mm; margin: 0 auto; }
@media print { .no-print { display:none!important; } }
.print-btn { background:#111; color:#fff; border:none; padding:8px 20px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; margin-bottom:14px; display:block; }
.hdr { background:#111; color:#fff; border-radius:10px; padding:12px 16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.hdr-brand { font-size:20px; font-weight:900; letter-spacing:-0.5px; }
.hdr-brand span { color:#10b981; }
.hdr-right { text-align:right; }
.hdr-course { font-size:13px; font-weight:700; }
.hdr-sub { font-size:10px; color:#9ca3af; margin-top:2px; }
.section { margin-bottom:14px; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; page-break-inside:avoid; }
.sh { padding:7px 12px; font-size:9px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; border-bottom:1px solid #e5e7eb; }
.sh.g { background:#f0fdf4; color:#166534; }
.sh.a { background:#fffbeb; color:#92400e; }
.sh.b { background:#eff6ff; color:#1e40af; }
table.lb { width:100%; border-collapse:collapse; }
table.lb td { padding:5px 10px; border-bottom:1px solid #f3f4f6; font-size:11px; }
table.lb tr:last-child td { border-bottom:none; }
table.lb tr:nth-child(even) td { background:#f9fafb; }
.sk-grid { display:grid; grid-template-columns:repeat(9,1fr); gap:4px; padding:8px 10px; }
.sk { border:1px solid #e5e7eb; border-radius:5px; padding:3px 1px; text-align:center; }
.sk.w { border-color:#10b981; background:#f0fdf4; }
.sk-h { font-size:8px; color:#9ca3af; font-weight:600; }
.sk-n { font-size:8px; color:#059669; font-weight:700; line-height:1.2; }
table.st { width:100%; border-collapse:collapse; }
table.st td { padding:4px 10px; border-bottom:1px solid #f3f4f6; font-size:11px; }
.sc-hdr { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.sc-a { color:#059669; font-weight:700; font-size:12px; }
.sc-b { color:#2563eb; font-weight:700; font-size:12px; }
.sc-sep { color:#9ca3af; margin:0 5px; font-size:10px; }
.badges { display:flex; gap:4px; }
.bdg { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; }
.bdg.net { background:#f0fdf4; color:#059669; }
.bdg.gross { background:#fef2f2; color:#dc2626; }
.bdg.t { background:#f3f4f6; color:#374151; }
.nlbl { font-size:8px; font-weight:700; letter-spacing:.1em; color:#9ca3af; padding:5px 10px 2px; text-transform:uppercase; }
table.sc { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10px; }
table.sc th { background:#f9fafb; text-align:center; padding:3px 1px; font-size:9px; color:#6b7280; font-weight:700; border-bottom:1px solid #e5e7eb; width:17px; }
table.sc th.nc { text-align:left; padding-left:8px; width:90px; }
table.sc th.tc { width:28px; }
table.sc td { text-align:center; padding:3px 1px; border-bottom:1px solid #f9fafb; width:17px; color:#374151; font-weight:600; }
table.sc td.nc { text-align:left; padding-left:8px; width:90px; font-weight:700; font-size:11px; }
table.sc td.tc { width:28px; font-weight:700; font-size:12px; }
.ra td.nc,.ra td.tc { color:#059669; }
.rb td.nc,.rb td.tc { color:#2563eb; }
.rw { background:#f9fafb; }
.rw td { padding:2px 1px; font-size:9px; font-weight:700; }
.wA { color:#059669; } .wB { color:#2563eb; } .wT { color:#9ca3af; }
.pl { font-size:7px; color:#9ca3af; font-weight:400; display:block; }
.sp { display:inline-block; background:#e5e7eb; border-radius:3px; width:15px; height:15px; line-height:15px; font-size:9px; }
.sb { display:inline-block; border:1.5px solid #dc2626; border-radius:50%; width:15px; height:15px; line-height:12px; color:#dc2626; font-size:9px; }
.se { display:inline-block; border:1.5px solid #d97706; border-radius:50%; outline:1.5px solid #d97706; outline-offset:1px; width:15px; height:15px; line-height:12px; color:#d97706; font-size:9px; }
.sg { display:inline-block; border:1px solid #9ca3af; border-radius:2px; width:15px; height:15px; line-height:13px; color:#6b7280; font-size:9px; }
.sd { display:inline-block; border:2px solid #9ca3af; border-radius:2px; width:15px; height:15px; line-height:11px; color:#6b7280; font-size:9px; }
.em { color:#d1d5db; font-size:9px; }
.pr { display:flex; gap:8px; padding:3px 10px; font-size:10px; border-bottom:1px solid #f9fafb; }
.pr:last-child { border-bottom:none; }
.pr .l { flex:1; color:#6b7280; }
.pr .pa { color:#059669; font-weight:700; }
.pr .s { color:#d1d5db; }
.pr .pb { color:#2563eb; font-weight:700; }
.mr { background:#f3f4f6; margin:5px 8px 8px; border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; }
.mr .l { font-size:9px; color:#9ca3af; font-weight:600; }
.mr .v { font-size:13px; font-weight:700; }
.wp { display:flex; align-items:center; padding:4px 10px; border-bottom:1px solid #f9fafb; font-size:10px; gap:6px; }
.wp .na { flex:1; font-weight:600; }
.wp .na.w { color:#059669; }
.wp .rs { color:#6b7280; min-width:36px; text-align:center; font-weight:600; font-size:9px; }
.wp .nb { flex:1; font-weight:600; text-align:right; }
.wp .nb.w { color:#059669; }
.wp .am { min-width:32px; text-align:right; color:#059669; font-weight:700; }
.wng { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; padding:7px 10px; }
.wnc { border:1px solid #e5e7eb; border-radius:6px; padding:5px 4px; text-align:center; }
.wnc.p { border-color:#10b981; background:#f0fdf4; }
.wnc.n { border-color:#ef4444; background:#fef2f2; }
.wnc .nm { font-size:9px; color:#6b7280; font-weight:600; }
.wnc .am { font-size:12px; font-weight:700; }
.wnc.p .am { color:#059669; }
.wnc.n .am { color:#dc2626; }
.wnc .am { color:#9ca3af; }
table.tt { width:100%; border-collapse:collapse; }
table.tt td { padding:5px 10px; border-bottom:1px solid #f3f4f6; font-size:11px; }
table.tt tr:last-child td { border-bottom:none; }
table.tt tr:nth-child(even) td { background:#f9fafb; }
.ftr { text-align:center; color:#9ca3af; font-size:9px; margin-top:14px; padding-top:10px; border-top:1px solid #e5e7eb; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">⬇ Save / Print PDF</button>
<div class="hdr"><div class="hdr-brand">BLITZ <span>BOARD</span></div><div class="hdr-right"><div class="hdr-course">${courseTitle}</div><div class="hdr-sub">${subtitle ? subtitle+' · ' : ''}${date}</div></div></div>

${recap.leaderboard.length > 0 ? '<div class="section"><div class="sh g">Leaderboard · '+recap.fieldSize+' Players</div><table class="lb">'+recap.leaderboard.map((p:any,i:number)=>{const tp=p.toPar===null?'—':p.toPar===0?'E':p.toPar>0?'+'+p.toPar:''+p.toPar;const tc=p.toPar===null||p.toPar===0?'#6b7280':p.toPar<0?'#059669':'#dc2626';const md=i===0?'🥇':i===1?'🥈':i===2?'🥉':''+(i+1);return '<tr><td style="width:28px">'+md+'</td><td><strong>'+p.name+'</strong> <span style="color:#9ca3af;font-size:10px">HCP '+(p.handicap??0)+'</span></td><td style="font-weight:700;text-align:right">'+(p.tot||'—')+'</td><td style="font-weight:700;color:'+tc+';text-align:right;width:36px">'+tp+'</td></tr>'}).join('')+'</table></div>' : ''}

${recap.skinsLeaders.length > 0 ? '<div class="section"><div class="sh a">Skins · Pot $'+recap.skinsPot+' · $'+recap.perSkin+'/skin · '+recap.totalSkinsWon+' won</div><div class="sk-grid">'+recap.skinsMap.map((w:any,i:number)=>'<div class="sk '+(w?'w':'')+'"><div class="sk-h">H'+(i+1)+'</div>'+(w?'<div class="sk-n">'+w.name+'</div>':'<div style="font-size:8px;color:#e5e7eb">—</div>')+'</div>').join('')+'</div><table class="st">'+recap.skinsLeaders.map((p:any)=>'<tr><td style="font-weight:600">'+p.name+'</td><td style="color:#6b7280">'+p.count+' skin'+(p.count>1?'s':'')+'</td><td style="color:#059669;font-weight:700;text-align:right">$'+p.winnings+'</td></tr>').join('')+'</table></div>' : ''}

${recap.matchResults.filter(Boolean).length > 0 ? (()=>{
const sc=(s:number,par:number)=>{if(!s)return '<span class="em">—</span>';const d=s-par;if(d<=-2)return '<span class="se">'+s+'</span>';if(d===-1)return '<span class="sb">'+s+'</span>';if(d===0)return '<span class="sp">'+s+'</span>';if(d===1)return '<span class="sg">'+s+'</span>';return '<span class="sd">'+s+'</span>'}
const nine=(m:any,start:number,lbl:string,ws:string[])=>{const hs=Array.from({length:9},(_,i)=>start+i);const tA=hs.reduce((acc,i)=>acc+(m.sA?.[i]||0),0);const tB=hs.reduce((acc,i)=>acc+(m.sB?.[i]||0),0);return '<div class="nlbl">'+lbl+'</div><table class="sc"><thead><tr><th class="nc">Player</th>'+hs.map(i=>'<th>'+( i+1)+'<span class="pl">p'+(pars[i]||4)+'</span></th>').join('')+'<th class="tc">'+(start===0?'OUT':'IN')+'</th></tr></thead><tbody><tr class="ra"><td class="nc">'+m.sideA+'</td>'+hs.map(i=>'<td>'+sc(m.sA?.[i],pars[i]||4)+'</td>').join('')+'<td class="tc">'+(tA||'—')+'</td></tr><tr class="rb"><td class="nc">'+m.sideB+'</td>'+hs.map(i=>'<td>'+sc(m.sB?.[i],pars[i]||4)+'</td>').join('')+'<td class="tc">'+(tB||'—')+'</td></tr><tr class="rw"><td class="nc" style="color:#9ca3af;font-size:9px">Hole</td>'+ws.map(w=>'<td class="'+(w==='A'?'wA':w==='B'?'wB':'wT')+'">'+(w==='·'||!w?'':w)+'</td>').join('')+'<td></td></tr></tbody></table>'}
return '<div class="section"><div class="sh a">Match Results</div>'+recap.matchResults.filter(Boolean).map((m:any)=>{
if(m.type==='Wheel'){
// Build per-hole net scores for each wheel player
const isGrossW = m.scoringType==='GROSS'
const wp = m.wheelPlayers||[]
const archRoster:any[] = arch.roster ? Object.values(arch.roster) : []
const allWHcps = isGrossW?[0]:wp.map((name:string)=>{const p=archRoster.find((pl:any)=>pl.name===name);return Number(p?.handicap)||0})
const baseWHcp = Math.min(...allWHcps)
const getWStr = (name:string,i:number)=>{if(isGrossW)return 0;const p=archRoster.find((pl:any)=>pl.name===name);const hr=Number(arch.course?.holes?.[i]?.hcp)||(i+1);const diff=Math.max(0,(Number(p?.handicap)||0)-baseWHcp);let s=Math.floor(diff/18);if(hr<=(diff%18))s++;return s}
const wNetScores:Record<string,number[]>={}
wp.forEach((name:string)=>{const p=archRoster.find((pl:any)=>pl.name===name);if(!p)return;wNetScores[name]=(arch.scores?.[p.id]||Array(18).fill(0)).map((g:number,i:number)=>g>0?g-getWStr(name,i):0)})
// Build scorecard for each pair
const pairSCs = (m.wheelPairs||[]).map((pair:any)=>{
const netA=wNetScores[pair.playerA]||Array(18).fill(0)
const netB=wNetScores[pair.playerB]||Array(18).fill(0)
const nineHtml=(start:number,lbl:string)=>{
const hs=Array.from({length:9},(_,i)=>start+i)
const tA=hs.reduce((acc,i)=>acc+(netA[i]||0),0)
const tB=hs.reduce((acc,i)=>acc+(netB[i]||0),0)
const winners=hs.map(i=>{const a=netA[i],b=netB[i];if(!a||!b)return '';return a<b?'A':b<a?'B':'½'})
return '<div class="nlbl">'+lbl+'</div><table class="sc"><thead><tr><th class="nc">Player</th>'+hs.map(i=>'<th>'+(i+1)+'<span class="pl">p'+(pars[i]||4)+'</span></th>').join('')+'<th class="tc">'+(start===0?'OUT':'IN')+'</th></tr></thead><tbody><tr class="ra"><td class="nc">'+pair.playerA+'</td>'+hs.map(i=>'<td>'+sc(netA[i],pars[i]||4)+'</td>').join('')+'<td class="tc">'+(tA||'—')+'</td></tr><tr class="rb"><td class="nc">'+pair.playerB+'</td>'+hs.map(i=>'<td>'+sc(netB[i],pars[i]||4)+'</td>').join('')+'<td class="tc">'+(tB||'—')+'</td></tr><tr class="rw"><td class="nc" style="color:#9ca3af;font-size:9px">Hole</td>'+winners.map(w=>'<td class="'+(w==='A'?'wA':w==='B'?'wB':'wT')+'">'+( w||'')+'</td>').join('')+'<td></td></tr></tbody></table>'
}
const winStr=pair.winner==='tie'?'TIE':(pair.winner===pair.playerA?pair.playerA:pair.playerB)+' wins'
const amtStr=pair.winner==='tie'?'EVEN':'$'+pair.amount
return '<div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid"><div style="background:#faf5ff;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb"><div><span style="color:#7c3aed;font-weight:700">'+pair.playerA+'</span><span style="color:#9ca3af;margin:0 6px;font-size:10px">VS</span><span style="color:#7c3aed;font-weight:700">'+pair.playerB+'</span></div><div style="display:flex;gap:6px;align-items:center"><span style="font-size:10px;font-weight:600;color:'+(pair.winner==='tie'?'#6b7280':'#059669')+'">'+winStr+'</span><span style="font-weight:700;color:#059669;font-size:11px">'+amtStr+'</span></div></div><div style="padding:2px 8px 0">'+nineHtml(0,'FRONT 9')+nineHtml(9,'BACK 9')+'</div></div>'
}).join('')
const ng=Object.entries(m.netWinnings||{}).map(([n,v]:any)=>'<div class="wnc '+(v>0?'p':v<0?'n':'')+'"><div class="nm">'+n+'</div><div class="am">'+(v===0?'EVEN':v>0?'+$'+v:'-$'+Math.abs(v))+'</div></div>').join('')
return '<div style="border-bottom:1px solid #e5e7eb;padding-bottom:4px"><div class="sc-hdr"><span style="color:#7c3aed;font-weight:700;font-size:12px">WHEEL BET</span><div class="badges"><span class="bdg '+(m.scoringType==='GROSS'?'gross':'net')+'">'+(m.scoringType||'NET')+'</span><span class="bdg t">$'+m.wheelAmount+'/pair · '+wp.join(' · ')+'</span></div></div><div style="padding:8px 10px">'+pairSCs+'</div><div style="padding:4px 10px 0"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#6b21a8;margin-bottom:6px;text-transform:uppercase">Net Per Player</div><div class="wng">'+ng+'</div></div></div>'
}
const res=m.net===0?'EVEN':m.net>0?m.sideB+' owes $'+Math.abs(m.net):m.sideA+' owes $'+Math.abs(m.net)
return '<div style="border-bottom:1px solid #e5e7eb"><div class="sc-hdr"><div><span class="sc-a">'+m.sideA+'</span><span class="sc-sep">VS</span><span class="sc-b">'+(m.sideB||'')+'</span></div><div class="badges"><span class="bdg '+(m.scoringType==='GROSS'?'gross':'net')+'">'+(m.scoringType||'NET')+'</span><span class="bdg t">'+m.type+'</span></div></div><div style="padding:4px 8px 0">'+nine(m,0,'FRONT 9',m.f9?.holeWinners||[])+nine(m,9,'BACK 9',m.b9?.holeWinners||[])+'</div><div style="padding:2px 0"><div class="pr"><span class="l">Front 9</span><span class="pa">$'+(m.f9?.payA||0)+'</span><span class="s">·</span><span class="pb">$'+(m.f9?.payB||0)+'</span></div><div class="pr"><span class="l">Back 9</span><span class="pa">$'+(m.b9?.payA||0)+'</span><span class="s">·</span><span class="pb">$'+(m.b9?.payB||0)+'</span></div><div class="pr"><span class="l">Birdies</span><span class="pa">$'+(m.birdieA||0)+'</span><span class="s">·</span><span class="pb">$'+(m.birdieB||0)+'</span></div></div><div class="mr"><span class="l">MATCH RESULT</span><span class="v">'+res+'</span></div></div>'
}).join('')+'</div>'
})() : ''}

${recap.teamResults.filter((t:any)=>t.tot>0).length>0?'<div class="section"><div class="sh b">Team Standings</div><table class="tt">'+recap.teamResults.filter((t:any)=>t.tot>0).map((t:any,i:number)=>{const md=i===0?'🥇':i===1?'🥈':i===2?'🥉':''+(i+1);return '<tr><td style="width:28px">'+md+'</td><td style="font-weight:600">'+t.name+'</td><td style="color:#6b7280">F9: '+t.f9+' &nbsp; B9: '+t.b9+'</td><td style="font-weight:700;color:#2563eb;text-align:right">'+t.tot+'</td></tr>'}).join('')+'</table></div>':''}

<div class="ftr">Generated by Blitz Board · ${new Date().toLocaleDateString()}</div>
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
 PAR {(() => { const ap = arch.course.pars || []; const nh = arch.course.nineHole; const ns = arch.course.nineHoleStart; const off = nh && ns === 'back' ? 9 : 0; return nh ? ap.slice(off, off+9).reduce((a:number,b:number)=>a+b,0) : ap.reduce((a:number,b:number)=>a+b,0) })()}
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
 {recap.skinsMap.slice(0, Math.min(9, recap.skinsMap.length)).map((winner, i) => (
 <div key={i} className={`rounded-xl p-2 text-center border ${winner ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
 <div className="text-[9px] text-zinc-600 font-black">{i + 1}</div>
 <div className={`text-[9px] font-black mt-0.5 leading-tight ${winner ? 'text-emerald-400' : 'text-zinc-800'}`}>
 {winner ? winner.name.split(' ')[0] : '—'}
 </div>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-9 gap-1.5 mb-5">
 {!recap.nineHole && recap.skinsMap.slice(9, 18).map((winner, i) => (
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
 <span className="text-emerald-400 text-base">${Number.isInteger(p.winnings) ? p.winnings : p.winnings.toFixed(2)}</span>
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
 {m.type === '2v2' ? (
 <>
 {/* Side A — individual players */}
 {(m.pAScores||[{label:m.sideA,scores:m.sA}]).map((player:any) => {
 const sc = player.scores || []
 const nineScores = sc.slice(start,start+9)
 const total = nineScores.reduce((a:number,b:number)=>a+(b||0),0)
 return (
 <tr key={player.id||player.label} className="border-t border-zinc-900">
 <td className="py-2 px-3 text-left">
 <div className="text-emerald-400 font-bold text-[11px] truncate">{player.name||player.label}</div>
 {player.handicap!==undefined && <div className="text-zinc-600 text-[9px]">HCP {player.handicap}</div>}
 </td>
 {nineScores.map((s:number,i:number) => {
 const par = m.pars?.[start+i]||4; const diff = s>0?s-par:null
 let cls = 'w-6 h-6 rounded flex items-center justify-center mx-auto text-[9px] font-black '
 if(diff===null)cls+='text-zinc-700'
 else if(diff<=-2)cls+='rounded-full border border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if(diff===-1)cls+='rounded-full border border-red-500 text-red-400'
 else if(diff===0)cls+='bg-zinc-800 text-white'
 else if(diff===1)cls+='border border-zinc-600 text-zinc-400'
 else cls+='border-2 border-zinc-600 text-zinc-500'
 return <td key={i} className="py-1"><div className={cls}>{s||'—'}</div></td>
 })}
 <td className="py-2 px-2 font-black text-sm text-emerald-400">{total||'—'}</td>
 </tr>
 )
 })}
 <tr className="border-t-2 border-emerald-900/50 bg-emerald-950/20">
 <td className="py-1.5 px-3 text-emerald-300 font-black text-[9px] tracking-widest">BEST BALL</td>
 {(m.sA||[]).slice(start,start+9).map((s:number,i:number) => (
 <td key={i} className="py-1 text-center text-[10px] font-black text-emerald-300">{s||'—'}</td>
 ))}
 <td className="py-1.5 px-2 font-black text-sm text-emerald-300">{(m.sA||[]).slice(start,start+9).reduce((a:number,b:number)=>a+(b||0),0)||'—'}</td>
 </tr>
 {/* Side B — individual players */}
 {(m.pBScores||[{label:m.sideB,scores:m.sB}]).map((player:any) => {
 const sc = player.scores || []
 const nineScores = sc.slice(start,start+9)
 const total = nineScores.reduce((a:number,b:number)=>a+(b||0),0)
 return (
 <tr key={player.id||player.label} className="border-t border-zinc-900 bg-white/[0.01]">
 <td className="py-2 px-3 text-left">
 <div className="text-blue-400 font-bold text-[11px] truncate">{player.name||player.label}</div>
 {player.handicap!==undefined && <div className="text-zinc-600 text-[9px]">HCP {player.handicap}</div>}
 </td>
 {nineScores.map((s:number,i:number) => {
 const par = m.pars?.[start+i]||4; const diff = s>0?s-par:null
 let cls = 'w-6 h-6 rounded flex items-center justify-center mx-auto text-[9px] font-black '
 if(diff===null)cls+='text-zinc-700'
 else if(diff<=-2)cls+='rounded-full border border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if(diff===-1)cls+='rounded-full border border-red-500 text-red-400'
 else if(diff===0)cls+='bg-zinc-800 text-white'
 else if(diff===1)cls+='border border-zinc-600 text-zinc-400'
 else cls+='border-2 border-zinc-600 text-zinc-500'
 return <td key={i} className="py-1"><div className={cls}>{s||'—'}</div></td>
 })}
 <td className="py-2 px-2 font-black text-sm text-blue-400">{total||'—'}</td>
 </tr>
 )
 })}
 <tr className="border-t-2 border-blue-900/50 bg-blue-950/20">
 <td className="py-1.5 px-3 text-blue-300 font-black text-[9px] tracking-widest">BEST BALL</td>
 {(m.sB||[]).slice(start,start+9).map((s:number,i:number) => (
 <td key={i} className="py-1 text-center text-[10px] font-black text-blue-300">{s||'—'}</td>
 ))}
 <td className="py-1.5 px-2 font-black text-sm text-blue-300">{(m.sB||[]).slice(start,start+9).reduce((a:number,b:number)=>a+(b||0),0)||'—'}</td>
 </tr>
 </>
 ) : (
 <>
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
 </>
 )}
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
 {/* Pair results — tappable for scorecard */}
 <div className="space-y-1.5">
 {(m.wheelPairs||[]).map((pair: any, pi: number) => {
 const pairKey = `${arch.id}-wheel-${pi}`
 const isPairOpen = expandedWheelPairHistKey === pairKey
 // Build per-hole net scores for this pair from archived data
 const isGross = m.scoringType === 'GROSS'
 const archRosterInline:any[] = arch.roster ? Object.values(arch.roster) : []
 const pAObj = archRosterInline.find((p:any) => p.name === pair.playerA)
 const pBObj = archRosterInline.find((p:any) => p.name === pair.playerB)
 const allHcps = isGross ? [0] : [pAObj,pBObj].filter(Boolean).map((p:any)=>Number(p.handicap)||0)
 const baseHcp = allHcps.length ? Math.min(...allHcps) : 0
 const getStr = (hcp: number, i: number) => {
 if (isGross) return 0
 const hr = Number(arch.course?.holes?.[i]?.hcp) || (i+1)
 const diff = Math.max(0, hcp - baseHcp)
 let s = Math.floor(diff/18); if (hr <= (diff%18)) s++; return s
 }
 const makeNet = (p: any) => {
 if (!p) return Array(18).fill(0)
 const g = (arch.scores?.[p.id]) || Array(18).fill(0)
 return g.map((sc:number,i:number) => sc>0 ? sc - getStr(Number(p.handicap)||0, i) : 0)
 }
 const netA = makeNet(pAObj)
 const netB = makeNet(pBObj)

 return (
 <div key={pi} className={`rounded-2xl border overflow-hidden transition-all ${
 isPairOpen ? 'border-purple-500/50' :
 pair.winner==='tie'?'border-zinc-800':'border-emerald-500/20'
 }`}>
 {/* Pair pill */}
 <button
 onClick={() => setExpandedWheelPairHistKey(isPairOpen ? null : pairKey)}
 className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
 isPairOpen?'bg-purple-950/20':pair.winner==='tie'?'bg-zinc-900 hover:bg-zinc-800':'bg-emerald-950/20 hover:bg-emerald-950/30'
 }`}>
 <span className={`font-semibold text-sm ${pair.winner===pair.playerA?'text-emerald-400':'text-zinc-400'}`}>{pair.playerA}</span>
 <div className="text-center">
 <div className={`text-xs font-semibold ${pair.winner==='tie'?'text-zinc-500':'text-emerald-400'}`}>
 {pair.winner==='tie'?'TIE':`${pair.aWins}–${pair.bWins}`}
 </div>
 {pair.winner!=='tie' && <div className="text-[9px] text-zinc-600">${pair.amount}</div>}
 </div>
 <div className="flex items-center gap-2">
 <span className={`font-semibold text-sm ${pair.winner===pair.playerB?'text-emerald-400':'text-zinc-400'}`}>{pair.playerB}</span>
 <span className="text-[9px] text-purple-400 ml-1">{isPairOpen?'▲':'▼'}</span>
 </div>
 </button>
 {/* Expanded scorecard */}
 {isPairOpen && (
 <div className="border-t border-zinc-800 bg-black/30 overflow-x-auto">
 {[{start:0,label:'FRONT 9'},{start:9,label:'BACK 9'}].map(({start,label}) => (
 <div key={label}>
 <div className="px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800">
 <span className="text-[9px] font-semibold text-zinc-500 tracking-widest">{label}</span>
 </div>
 <table className="w-full text-center" style={{minWidth:'480px',tableLayout:'fixed' as any}}>
 <thead>
 <tr className="bg-zinc-950">
 <th className="py-2 px-2 text-left text-[9px] text-zinc-600 font-semibold" style={{width:'90px'}}>Player</th>
 {Array.from({length:9},(_,i)=>start+i).map(i=>(
 <th key={i} className="py-2 text-[9px] text-zinc-500 font-semibold" style={{width:'18px'}}>
 <div>{i+1}</div><div className="text-[8px] text-zinc-700">p{(arch.course?.pars?.[i])||4}</div>
 </th>
 ))}
 <th className="py-2 text-[9px] font-semibold text-blue-400" style={{width:'28px'}}>{start===0?'OUT':'IN'}</th>
 </tr>
 </thead>
 <tbody>
 {[
 {name:pair.playerA,net:netA,color:'text-emerald-400'},
 {name:pair.playerB,net:netB,color:'text-blue-400'}
 ].map(side => {
 const nineScores = side.net.slice(start,start+9)
 const total = nineScores.reduce((a:number,b:number)=>a+(b||0),0)
 return (
 <tr key={side.name} className="border-t border-zinc-900">
 <td className={`py-2 px-2 text-left font-semibold text-[10px] truncate ${side.color}`}>{side.name}</td>
 {nineScores.map((s:number,i:number) => {
 const par = (arch.course?.pars?.[start+i]) || 4
 const diff = s>0?s-par:null
 let cls = 'w-5 h-5 rounded flex items-center justify-center mx-auto text-[9px] font-semibold '
 if(diff===null) cls+='text-zinc-700'
 else if(diff<=-2) cls+='rounded-full border border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if(diff===-1) cls+='rounded-full border border-red-500 text-red-400'
 else if(diff===0) cls+='bg-zinc-800 text-white'
 else if(diff===1) cls+='border border-zinc-600 text-zinc-400'
 else cls+='border-2 border-zinc-600 text-zinc-500'
 return <td key={i} className="py-1"><div className={cls}>{s||'—'}</div></td>
 })}
 <td className={`py-2 font-bold text-sm ${side.color}`}>{total||'—'}</td>
 </tr>
 )
 })}
 {/* Hole winner row */}
 <tr className="border-t border-zinc-800 bg-zinc-900/40">
 <td className="py-1.5 px-2 text-[9px] font-semibold text-zinc-600 text-left">Hole</td>
 {Array.from({length:9},(_,i)=>start+i).map(i => {
 const na = netA[i], nb = netB[i]
 const w = na>0&&nb>0 ? na<nb?'A':nb<na?'B':'½' : null
 return (
 <td key={i} className="py-1 text-center">
 <span className={`text-[9px] font-semibold ${w==='A'?'text-emerald-400':w==='B'?'text-blue-400':w==='½'?'text-zinc-500':'text-zinc-800'}`}>
 {w||'·'}
 </span>
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