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
 return { type: 'Wheel', id: m.id, wheelPlayers: m.wheelPlayers, wheelAmount: m.wheelAmount, scoringType: m.scoringType || 'NET', wheelFormat: m.wheelFormat || 'straight', wheelNassau: m.wheelNassau, wheelPress: m.wheelPress, wheelAutoPress: m.wheelAutoPress, sideA: 'Wheel', sideB: '', winner: '' }
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

 
 const exportPDF = async (arch: any, recap: any, date: string) => {
 setExportingId(arch.id)
 try {
 const { jsPDF } = await import('jspdf')
 const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
 const isMatch = arch._meta?.mode === 'match'
 const courseTitle = arch.course?.name || 'Blitz Board'
 const subtitle = isMatch ? 'Quick Match' : `${arch._meta?.tripName || ''} · ${arch._meta?.dayLabel || ''}`
 const W = 210; const margin = 14

 // Header
 doc.setFillColor(0, 0, 0)
 doc.rect(0, 0, W, 26, 'F')
 doc.setTextColor(16, 185, 129)
 doc.setFontSize(20)
 doc.setFont('helvetica', 'bold')
 doc.text('BLITZ BOARD', margin, 13)
 doc.setFontSize(9)
 doc.setTextColor(160, 160, 160)
 doc.setFont('helvetica', 'normal')
 doc.text(courseTitle, margin, 20)
 doc.text(subtitle, W - margin, 20, { align: 'right' })
 doc.setTextColor(80, 80, 80)
 doc.text(date, W - margin, 25, { align: 'right' })

 let y = 32

 const secHead = (label: string, rgb: [number,number,number] = [16,185,129]) => {
 if (y > 262) { doc.addPage(); y = 14 }
 doc.setFillColor(...rgb)
 doc.rect(margin, y, W - margin*2, 7, 'F')
 doc.setTextColor(0)
 doc.setFontSize(8)
 doc.setFont('helvetica', 'bold')
 doc.text(label, margin + 2, y + 5)
 y += 10
 doc.setTextColor(220, 220, 220)
 }

 const dataRow = (left: string, right: string, alt = false) => {
 if (y > 272) { doc.addPage(); y = 14 }
 if (alt) { doc.setFillColor(20, 20, 20); doc.rect(margin, y, W - margin*2, 7, 'F') }
 doc.setFontSize(8.5)
 doc.setFont('helvetica', 'normal')
 doc.setTextColor(190, 190, 190)
 doc.text(left, margin + 2, y + 5)
 doc.setTextColor(255, 255, 255)
 doc.setFont('helvetica', 'bold')
 doc.text(right, W - margin - 2, y + 5, { align: 'right' })
 y += 7
 }

 // Leaderboard
 if (recap.leaderboard.length > 0) {
 secHead('LEADERBOARD')
 recap.leaderboard.slice(0, 12).forEach((p: any, i: number) => {
 const tp = p.toPar === null ? '—' : p.toPar === 0 ? 'E' : p.toPar > 0 ? `+${p.toPar}` : `${p.toPar}`
 dataRow(`${i+1}.  ${p.name}   HCP ${p.handicap ?? 0}`, `${p.tot || '—'}  (${tp})`, i%2===0)
 })
 y += 3
 }

 // Skins
 if (recap.skinsLeaders.length > 0) {
 secHead('SKINS PAYOUTS', [245, 158, 11])
 doc.setTextColor(130,130,130); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
 doc.text(`Pot $${recap.skinsPot} · ${recap.totalSkinsWon} won · $${recap.perSkin}/skin`, margin+2, y)
 y += 7
 recap.skinsLeaders.forEach((p: any, i: number) => {
 dataRow(p.name, `${p.count} skin${p.count>1?'s':''} → $${p.winnings}`, i%2===0)
 })
 y += 3
 }

 // Match Results
 if (recap.matchResults.length > 0) {
 secHead('MATCH RESULTS', [245, 158, 11])
 recap.matchResults.forEach((m: any, i: number) => {
 if (!m) return
 if (m.type === 'Wheel') {
 dataRow('Wheel Bet', (m.wheelPlayers||[]).join(' · '), i%2===0)
 } else {
 const res = m.net === 0 ? 'EVEN' : m.net > 0 ? `${m.sideB} owes $${Math.abs(m.net)}` : `${m.sideA} owes $${Math.abs(m.net)}`
 dataRow(`${m.sideA} vs ${m.sideB} (${m.type} · ${m.scoringType||'NET'})`, res, i%2===0)
 }
 })
 y += 3
 }

 // Team Results
 const validTeams = recap.teamResults.filter((t: any) => t.tot > 0)
 if (validTeams.length > 0) {
 secHead('TEAM STANDINGS', [59, 130, 246])
 validTeams.forEach((t: any, i: number) => {
 dataRow(`${i+1}.  ${t.name}`, `F9: ${t.f9}  B9: ${t.b9}  Total: ${t.tot}`, i%2===0)
 })
 }

 // Page footer
 const pages = (doc as any).internal.getNumberOfPages()
 for (let i = 1; i <= pages; i++) {
 doc.setPage(i)
 doc.setFontSize(7); doc.setTextColor(70,70,70)
 doc.text('Generated by Blitz Board', margin, 293)
 doc.text(`Page ${i} of ${pages}`, W-margin, 293, { align: 'right' })
 }

 const fname = `${courseTitle.replace(/[^a-z0-9]/gi,'_')}_${date.replace(/[^a-z0-9]/gi,'_')}.pdf`
 doc.save(fname)
 } catch(e) {
 console.error(e)
 alert('PDF export failed')
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
 <div className="border-t border-zinc-800 p-4 bg-black/20">
 <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-3">WHEEL PAIRS · {(m.wheelPlayers||[]).join(' · ')}</p>
 <div className="space-y-2">
 {(()=>{
 const wp = m.wheelPlayers||[]
 const pairs = []
 for(let a=0;a<wp.length;a++) for(let b=a+1;b<wp.length;b++) pairs.push({a:wp[a],b:wp[b]})
 return pairs.map((pair,pi) => (
 <div key={pi} className="flex items-center justify-between bg-black rounded-xl px-4 py-2.5 border border-zinc-800">
 <span className="text-purple-400 font-black text-xs">{pair.a}</span>
 <span className="text-zinc-600 font-black text-[9px]">vs</span>
 <span className="text-purple-400 font-black text-xs">{pair.b}</span>
 </div>
 ))
 })()}
 </div>
 <p className="text-zinc-700 text-[9px] font-black normal-case mt-3">Full wheel scorecard available in current payouts page for active matches.</p>
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