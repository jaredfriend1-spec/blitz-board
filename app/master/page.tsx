"use client"
import { useState, useEffect, useMemo } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, set, push, remove, get } from 'firebase/database'
import Link from 'next/link'
import {
  Shield, Users, BookOpen, History, Settings, BarChart3,
  Trash2, Plus, Edit3, Check, X, ChevronDown, ChevronRight,
  Database, Zap, DollarSign, Trophy, Flag, RefreshCw,
  Lock, Eye, EyeOff, LogOut, Download, Archive, Target,
  AlertTriangle, Activity, Clock, Hash
} from 'lucide-react'

const MASTER_PIN = "jared2025"

// ── SECTION WRAPPER ────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{icon}</span>
          <span className="font-bold text-sm text-white">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-zinc-500"/> : <ChevronRight size={16} className="text-zinc-500"/>}
      </button>
      {open && <div className="border-t border-zinc-800">{children}</div>}
    </div>
  )
}

// ── STAT CARD ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-emerald-400' }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-600 text-[10px] font-semibold tracking-widest mb-1">{label}</p>
      <p className={`font-black text-2xl ${color}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs font-medium normal-case mt-1">{sub}</p>}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════
// ⚡ ANALYTICS ENGINE — computes everything from history archive
// ════════════════════════════════════════════════════════════════════

function computeAnalytics(history: any[]) {
  if (!history.length) return null

  // ── Per-player accumulators ──────────────────────────────────────
  const players: Record<string, {
    name: string
    rounds: number
    grossScores: number[]
    netScores: number[]
    f9Scores: number[]
    b9Scores: number[]
    matchWins: number; matchLosses: number; matchTies: number
    moneyWon: number; moneyLost: number
    skinsWon: number; skinsMoney: number
    birdies: number; eagles: number; pars: number; bogeys: number; doubles: number
    handicaps: number[]
    nassauWins: number; nassauLosses: number
    wheelWins: number; wheelLosses: number
    pvpWins: number; pvpLosses: number
    tvtWins: number; tvtLosses: number
    pressWins: number; pressLosses: number
    f9Wins: number; f9Losses: number
    b9Wins: number; b9Losses: number
    overallWins: number; overallLosses: number
    courses: Record<string, number[]>
    roundDates: number[]
    bestRound: number; wouldRound: number
    partnerships: Record<string, { wins: number; losses: number }>
    opponents: Record<string, { wins: number; losses: number; moneyWon: number }>
    skinsPerRound: number[]
    holeScores: number[][]  // per hole, all scores
  }> = {}

  const getP = (name: string) => {
    if (!players[name]) players[name] = {
      name, rounds: 0, grossScores: [], netScores: [], f9Scores: [], b9Scores: [],
      matchWins: 0, matchLosses: 0, matchTies: 0,
      moneyWon: 0, moneyLost: 0, skinsWon: 0, skinsMoney: 0,
      birdies: 0, eagles: 0, pars: 0, bogeys: 0, doubles: 0,
      handicaps: [], nassauWins: 0, nassauLosses: 0,
      wheelWins: 0, wheelLosses: 0, pvpWins: 0, pvpLosses: 0,
      tvtWins: 0, tvtLosses: 0, pressWins: 0, pressLosses: 0,
      f9Wins: 0, f9Losses: 0, b9Wins: 0, b9Losses: 0,
      overallWins: 0, overallLosses: 0,
      courses: {}, roundDates: [], bestRound: 999, wouldRound: 0,
      partnerships: {}, opponents: {},
      skinsPerRound: [], holeScores: Array.from({length:18},()=>[])
    }
    return players[name]
  }

  // ── Process each archived match ──────────────────────────────────
  history.forEach(arch => {
    const roster: any[] = arch.roster ? Object.values(arch.roster) : []
    const scores: Record<string, number[]> = arch.scores || {}
    const matchups: any[] = arch.matchups ? Object.values(arch.matchups) : []
    const pars: number[] = arch.course?.pars || Array(18).fill(4)
    const courseName: string = arch.course?.name || 'Unknown'
    const money = arch.money || {}
    const skinsAlloc = Number(money.skinsAllocation) || 0
    const entryFee = Number(money.entryFee) || 0
    const archDate = Number(arch.id) || 0
    const nineHole = !!arch.course?.nineHole
    const holeOffset = nineHole && arch.course?.nineHoleStart === 'back' ? 9 : 0
    const numHoles = nineHole ? 9 : 18
    const totalPar = pars.slice(holeOffset, holeOffset + numHoles).reduce((a,b)=>a+b,0)

    // ── Scoring stats per player ────────────────────────────────────
    roster.forEach((rp: any) => {
      const p = getP(rp.name)
      const sc = scores[rp.id] || []
      const holeScores = sc.slice(holeOffset, holeOffset + numHoles).map(Number).filter(s => s > 0)
      if (holeScores.length < numHoles * 0.5) return // skip incomplete rounds

      p.rounds++
      p.roundDates.push(archDate)
      if (rp.handicap) p.handicaps.push(Number(rp.handicap))
      if (!p.courses[courseName]) p.courses[courseName] = []
      const gross = holeScores.reduce((a,b)=>a+b,0)
      p.grossScores.push(gross)
      p.courses[courseName].push(gross)
      if (gross < p.bestRound) p.bestRound = gross
      if (gross > p.wouldRound) p.wouldRound = gross

      // F9 / B9
      const f9 = holeScores.slice(0,9).reduce((a,b)=>a+b,0)
      const b9 = nineHole ? 0 : holeScores.slice(9,18).reduce((a,b)=>a+b,0)
      p.f9Scores.push(f9)
      if (!nineHole) p.b9Scores.push(b9)

      // Per-hole scoring category
      holeScores.forEach((s, i) => {
        const par = pars[holeOffset + i] || 4
        const diff = s - par
        if (diff <= -2) p.eagles++
        else if (diff === -1) p.birdies++
        else if (diff === 0) p.pars++
        else if (diff === 1) p.bogeys++
        else p.doubles++
        p.holeScores[holeOffset + i].push(s)
      })
    })

    // ── Skins ────────────────────────────────────────────────────────
    if (skinsAlloc > 0) {
      const skinsCounts: Record<string, number> = {}
      for (let h = 0; h < numHoles; h++) {
        const hIdx = holeOffset + h
        const hScores = roster.map(rp => ({
          id: rp.id, name: rp.name, s: Number(scores[rp.id]?.[hIdx]) || 0
        })).filter(x => x.s > 0)
        if (!hScores.length) continue
        const min = Math.min(...hScores.map(x=>x.s))
        const winners = hScores.filter(x => x.s === min)
        if (winners.length === 1) {
          skinsCounts[winners[0].name] = (skinsCounts[winners[0].name] || 0) + 1
        }
      }
      const totalSkins = Object.values(skinsCounts).reduce((a,b)=>a+b,0)
      const pot = skinsAlloc * roster.length
      const perSkin = totalSkins > 0 ? pot / totalSkins : 0
      Object.entries(skinsCounts).forEach(([name, count]) => {
        const p = getP(name)
        p.skinsWon += count
        p.skinsMoney += count * perSkin
        p.skinsPerRound.push(count)
      })
      roster.forEach(rp => {
        if (!skinsCounts[rp.name]) getP(rp.name).skinsPerRound.push(0)
      })
    }

    // ── Match results ────────────────────────────────────────────────
    matchups.forEach((m: any) => {
      const type = m.type || 'PvP'
      const nassau = Number(m.nassau) || 0
      const overall = Number(m.overall) || 0
      const press = Number(m.press) || 0

      // Get all players on each side
      let sideANames: string[] = []
      let sideBNames: string[] = []

      if (type === 'PvP') {
        sideANames = [m.sideA].filter(Boolean)
        sideBNames = [m.sideB].filter(Boolean)
      } else if (type === '2v2') {
        sideANames = [m.sideA, m.sideA2].filter(Boolean)
        sideBNames = [m.sideB, m.sideB2].filter(Boolean)
      } else if (type === 'TvT') {
        const tA = arch.teams ? Object.values(arch.teams).find((t:any) => t.name === m.sideA) as any : null
        const tB = arch.teams ? Object.values(arch.teams).find((t:any) => t.name === m.sideB) as any : null
        if (tA?.playerIds) sideANames = roster.filter(rp => tA.playerIds.includes(rp.id)).map((rp:any)=>rp.name)
        if (tB?.playerIds) sideBNames = roster.filter(rp => tB.playerIds.includes(rp.id)).map((rp:any)=>rp.name)
      } else if (type === 'Wheel') {
        const wp: string[] = m.wheelPlayers || []
        const wAmount = Number(m.wheelAmount) || 0
        // Track wheel individually — pairs
        for (let a = 0; a < wp.length; a++) {
          for (let b = a+1; b < wp.length; b++) {
            const pa = getP(wp[a]); const pb = getP(wp[b])
            pa.wheelWins += 0.5; pb.wheelWins += 0.5 // placeholder - computed below
          }
        }
        return // wheel handled separately below
      }

      if (!sideANames.length || !sideBNames.length) return

      // Simple net calculation from scores
      const baseHcp = Math.min(...[...sideANames, ...sideBNames].map(n => {
        const rp = roster.find((r:any) => r.name === n)
        return Number(rp?.handicap) || 0
      }))

      // Calculate best ball scores for each side
      const getSideScore = (names: string[]) => {
        const holeCount = nineHole ? 9 : 18
        let total = 0
        for (let h = 0; h < holeCount; h++) {
          const hIdx = holeOffset + h
          const bestNet = Math.min(...names.map(n => {
            const rp = roster.find((r:any) => r.name === n)
            const g = Number(scores[rp?.id]?.[hIdx]) || 0
            if (!g) return 999
            const hcpR = Number(arch.course?.holes?.[hIdx]?.hcp) || (hIdx + 1)
            const diff = Math.max(0, (Number(rp?.handicap)||0) - baseHcp)
            let strokes = Math.floor(diff/18)
            if (hcpR <= (diff%18)) strokes++
            return g - strokes
          }))
          if (bestNet < 999) total += bestNet
        }
        return total
      }

      const sAScore = getSideScore(sideANames)
      const sBScore = getSideScore(sideBNames)
      const aWon = sAScore < sBScore
      const bWon = sBScore < sAScore
      const tied = sAScore === sBScore

      // Approximate payout
      const betAmount = type === 'PvP' || type === '2v2' ? nassau * 3 + overall : nassau * 3
      const won = aWon ? betAmount : bWon ? -betAmount : 0

      sideANames.forEach(n => {
        const p = getP(n)
        if (aWon) { p.matchWins++; p.moneyWon += betAmount }
        else if (bWon) { p.matchLosses++; p.moneyLost += betAmount }
        else { p.matchTies++ }
        // Track by format
        if (type === 'Nassau' || nassau > 0) { if (aWon) p.nassauWins++; else if (bWon) p.nassauLosses++ }
        if (type === 'PvP') { if (aWon) p.pvpWins++; else if (bWon) p.pvpLosses++ }
        if (type === '2v2' || type === 'TvT') { if (aWon) p.tvtWins++; else if (bWon) p.tvtLosses++ }
        // Track partnerships
        sideANames.filter(nn=>nn!==n).forEach(partner => {
          if (!p.partnerships[partner]) p.partnerships[partner] = {wins:0,losses:0}
          if (aWon) p.partnerships[partner].wins++
          else if (bWon) p.partnerships[partner].losses++
        })
        // Track opponents
        sideBNames.forEach(opp => {
          if (!p.opponents[opp]) p.opponents[opp] = {wins:0,losses:0,moneyWon:0}
          if (aWon) { p.opponents[opp].wins++; p.opponents[opp].moneyWon += betAmount / sideANames.length }
          else if (bWon) { p.opponents[opp].losses++; p.opponents[opp].moneyWon -= betAmount / sideANames.length }
        })
      })
      sideBNames.forEach(n => {
        const p = getP(n)
        if (bWon) { p.matchWins++; p.moneyWon += betAmount }
        else if (aWon) { p.matchLosses++; p.moneyLost += betAmount }
        else { p.matchTies++ }
        if (type === 'PvP') { if (bWon) p.pvpWins++; else if (aWon) p.pvpLosses++ }
        if (type === '2v2' || type === 'TvT') { if (bWon) p.tvtWins++; else if (aWon) p.tvtLosses++ }
        sideANames.forEach(opp => {
          if (!p.opponents[opp]) p.opponents[opp] = {wins:0,losses:0,moneyWon:0}
          if (bWon) { p.opponents[opp].wins++; p.opponents[opp].moneyWon += betAmount / sideBNames.length }
          else if (aWon) { p.opponents[opp].losses++; p.opponents[opp].moneyWon -= betAmount / sideBNames.length }
        })
      })
    })
  })

  // ── Computed summaries ───────────────────────────────────────────
  const playerList = Object.values(players)
    .filter(p => p.rounds >= 1)
    .sort((a, b) => b.rounds - a.rounds)

  const totalRounds = history.length
  const totalMoneyTracked = playerList.reduce((sum, p) => sum + p.moneyWon, 0)

  // Group money leaderboard
  const moneyLeaderboard = [...playerList]
    .sort((a,b) => (b.moneyWon - b.moneyLost) - (a.moneyWon - a.moneyLost))

  // Scoring leaderboard
  const scoringLeaderboard = [...playerList]
    .filter(p => p.grossScores.length >= 2)
    .sort((a,b) => {
      const avgA = a.grossScores.reduce((s,n)=>s+n,0)/a.grossScores.length
      const avgB = b.grossScores.reduce((s,n)=>s+n,0)/b.grossScores.length
      return avgA - avgB
    })

  // Win rate leaderboard
  const winRateLeaderboard = [...playerList]
    .filter(p => p.matchWins + p.matchLosses >= 3)
    .sort((a,b) => {
      const wrA = a.matchWins / (a.matchWins + a.matchLosses + 0.001)
      const wrB = b.matchWins / (b.matchWins + b.matchLosses + 0.001)
      return wrB - wrA
    })

  // Skins leaderboard
  const skinsLeaderboard = [...playerList]
    .filter(p => p.skinsWon > 0)
    .sort((a,b) => b.skinsMoney - a.skinsMoney)

  // Handicap trend per player
  const handicapTrends = playerList.map(p => ({
    name: p.name,
    current: p.handicaps[p.handicaps.length-1] || 0,
    first: p.handicaps[0] || 0,
    trend: p.handicaps.length > 1 ? (p.handicaps[p.handicaps.length-1] - p.handicaps[0]) : 0
  })).sort((a,b) => a.current - b.current)

  // Sandbagging index — how often player beats their handicap
  const sandbagIndex = playerList
    .filter(p => p.grossScores.length >= 3 && p.handicaps.length)
    .map(p => {
      const avgGross = p.grossScores.reduce((s,n)=>s+n,0)/p.grossScores.length
      const avgHcp = p.handicaps.reduce((s,n)=>s+n,0)/p.handicaps.length
      const expectedNet = avgGross - avgHcp
      return { name: p.name, avgGross: Math.round(avgGross*10)/10, avgHcp: Math.round(avgHcp*10)/10, expectedNet: Math.round(expectedNet*10)/10, sandbag: Math.round((avgHcp - (avgGross - 72))*10)/10 }
    }).sort((a,b) => b.sandbag - a.sandbag)

  // Consistency (std dev)
  const consistency = playerList
    .filter(p => p.grossScores.length >= 3)
    .map(p => {
      const avg = p.grossScores.reduce((s,n)=>s+n,0)/p.grossScores.length
      const variance = p.grossScores.reduce((s,n)=>s+(n-avg)**2,0)/p.grossScores.length
      return { name: p.name, stdDev: Math.round(Math.sqrt(variance)*10)/10, avg: Math.round(avg*10)/10, best: p.bestRound, worst: p.wouldRound }
    }).sort((a,b) => a.stdDev - b.stdDev)

  // Best partnerships
  const partnerships: {names:string, wins:number, losses:number, rate:number}[] = []
  playerList.forEach(p => {
    Object.entries(p.partnerships).forEach(([partner, record]) => {
      const key = [p.name, partner].sort().join(' + ')
      if (!partnerships.find(pp => pp.names === key)) {
        const total = record.wins + record.losses
        partnerships.push({ names: key, wins: record.wins, losses: record.losses, rate: total > 0 ? Math.round(record.wins/total*100) : 0 })
      }
    })
  })
  partnerships.sort((a,b) => b.wins - a.wins)

  // Head to head
  const h2h: {matchup:string, playerA:string, playerB:string, winsA:number, winsB:number, moneyA:number}[] = []
  playerList.forEach(p => {
    Object.entries(p.opponents).forEach(([opp, record]) => {
      const key = [p.name, opp].sort().join(' vs ')
      if (!h2h.find(x => x.matchup === key)) {
        const oppRecord = players[opp]?.opponents[p.name] || {wins:0,losses:0,moneyWon:0}
        h2h.push({ matchup: key, playerA: p.name, playerB: opp, winsA: record.wins, winsB: oppRecord.wins, moneyA: Math.round(record.moneyWon) })
      }
    })
  })
  h2h.sort((a,b) => (b.winsA+b.winsB) - (a.winsA+a.winsB))

  // Score trends (last 8 rounds for chart)
  const scoreTrends = playerList.slice(0,6).map(p => ({
    name: p.name,
    scores: p.grossScores.slice(-8)
  }))

  // Group badges
  const badges: Record<string,string[]> = {}
  if (moneyLeaderboard[0]) badges[moneyLeaderboard[0].name] = [...(badges[moneyLeaderboard[0].name]||[]), '💰 Top Earner']
  if (scoringLeaderboard[0]) badges[scoringLeaderboard[0].name] = [...(badges[scoringLeaderboard[0].name]||[]), '🏆 Low Scorer']
  if (winRateLeaderboard[0]) badges[winRateLeaderboard[0].name] = [...(badges[winRateLeaderboard[0].name]||[]), '⚡ Win Machine']
  if (skinsLeaderboard[0]) badges[skinsLeaderboard[0].name] = [...(badges[skinsLeaderboard[0].name]||[]), '🦴 Skin King']
  const biggest = moneyLeaderboard[moneyLeaderboard.length-1]
  if (biggest) badges[biggest.name] = [...(badges[biggest.name]||[]), '📉 Biggest Loser']
  if (consistency[consistency.length-1]) badges[consistency[consistency.length-1].name] = [...(badges[consistency[consistency.length-1].name]||[]), '🎢 Wild Card']
  if (consistency[0]) badges[consistency[0].name] = [...(badges[consistency[0].name]||[]), '🎯 Mr. Consistent']
  if (sandbagIndex[0] && sandbagIndex[0].sandbag > 2) badges[sandbagIndex[0].name] = [...(badges[sandbagIndex[0].name]||[]), '🐟 Sandbagger']

  return { playerList, totalRounds, totalMoneyTracked, moneyLeaderboard, scoringLeaderboard, winRateLeaderboard, skinsLeaderboard, handicapTrends, sandbagIndex, consistency, partnerships, h2h, scoreTrends, badges }
}



// ════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS DASHBOARD COMPONENT
// ════════════════════════════════════════════════════════════════════

function MiniBar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SparkLine({ scores, color = '#10b981' }: { scores: number[]; color?: string }) {
  if (!scores.length) return <span className="text-zinc-700 text-xs">No data</span>
  const min = Math.min(...scores); const max = Math.max(...scores)
  const range = max - min || 1
  const w = 80; const h = 28
  const pts = scores.map((s, i) => `${(i / (scores.length - 1)) * w},${h - ((s - min) / range) * h}`)
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={Number(pts[pts.length-1]?.split(',')[0])} cy={Number(pts[pts.length-1]?.split(',')[1])} r="2.5" fill={color}/>
    </svg>
  )
}

function WinLossBadge({ wins, losses, ties = 0 }: { wins: number; losses: number; ties?: number }) {
  const total = wins + losses + ties
  const rate = total > 0 ? Math.round(wins / total * 100) : 0
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-emerald-400 font-black text-sm">{wins}W</span>
      <span className="text-zinc-600 text-xs">·</span>
      <span className="text-rose-400 font-black text-sm">{losses}L</span>
      {ties > 0 && <><span className="text-zinc-600 text-xs">·</span><span className="text-zinc-500 font-black text-sm">{ties}T</span></>}
      <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-lg ${rate >= 60 ? 'bg-emerald-500/20 text-emerald-400' : rate >= 40 ? 'bg-zinc-700 text-zinc-400' : 'bg-rose-500/20 text-rose-400'}`}>{rate}%</span>
    </div>
  )
}

function MoneyBadge({ amount }: { amount: number }) {
  const pos = amount >= 0
  return (
    <span className={`font-black text-sm ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
      {pos ? '+' : '-'}${Math.abs(Math.round(amount))}
    </span>
  )
}

function AnalyticsSection({ title, icon, children, accent = 'emerald', defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen)
  const colors: Record<string,string> = {
    emerald: 'text-emerald-400 border-emerald-500/20',
    yellow: 'text-yellow-400 border-yellow-500/20',
    blue: 'text-blue-400 border-blue-500/20',
    purple: 'text-purple-400 border-purple-500/20',
    rose: 'text-rose-400 border-rose-500/20',
    orange: 'text-orange-400 border-orange-500/20',
    teal: 'text-teal-400 border-teal-500/20',
  }
  const c = colors[accent] || colors.emerald
  return (
    <div className={`border ${c.split(' ')[1]} bg-zinc-950/60 rounded-2xl overflow-hidden`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className={c.split(' ')[0]}>{icon}</span>
          <span className="font-black text-sm text-white tracking-tight">{title}</span>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={14} className="text-zinc-500"/>
        </div>
      </button>
      {open && <div className="border-t border-zinc-800/60">{children}</div>}
    </div>
  )
}

function AnalyticsDashboard({ history }: { history: any[] }) {
  const data = useMemo(() => computeAnalytics(history), [history])
  if (!data || !data.playerList.length) {
    return (
      <div className="p-8 text-center">
        <BarChart3 size={32} className="text-zinc-700 mx-auto mb-3"/>
        <p className="text-zinc-600 font-semibold text-sm">No match history yet</p>
        <p className="text-zinc-700 text-xs font-medium normal-case mt-1">Archive some matches to unlock analytics</p>
      </div>
    )
  }

  const { playerList, totalRounds, moneyLeaderboard, scoringLeaderboard, winRateLeaderboard, skinsLeaderboard, handicapTrends, sandbagIndex, consistency, partnerships, h2h, scoreTrends, badges } = data
  const maxRounds = Math.max(...playerList.map(p => p.rounds))
  const maxMoney = Math.max(...moneyLeaderboard.map(p => Math.abs(p.moneyWon - p.moneyLost)))

  return (
    <div className="p-4 space-y-3">

      {/* ── PLAYER BADGES ── */}
      {Object.keys(badges).length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-yellow-400 text-[10px] font-black tracking-widest mb-3">🏅 GROUP AWARDS</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(badges).flatMap(([name, bs]) => bs.map(b => (
              <div key={`${name}-${b}`} className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold">{b}</span>
                <span className="text-zinc-500 text-[10px] ml-1.5">· {name.split(' ')[0]}</span>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* ── MONEY LEADERBOARD ── */}
      <AnalyticsSection title="💰 Money Leaderboard" icon={<DollarSign size={15}/>} accent="yellow" defaultOpen={true}>
        <div className="p-4 space-y-3">
          {moneyLeaderboard.map((p, i) => {
            const net = p.moneyWon - p.moneyLost
            const maxAbs = Math.max(...moneyLeaderboard.map(x => Math.abs(x.moneyWon - x.moneyLost)))
            return (
              <div key={p.name} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black w-5 ${i===0?'text-yellow-400':i===1?'text-zinc-400':i===2?'text-amber-600':'text-zinc-700'}`}>#{i+1}</span>
                  <span className="flex-1 font-bold text-sm text-white">{p.name}</span>
                  <MoneyBadge amount={net}/>
                  <SparkLine scores={p.grossScores.slice(-6)} color={net >= 0 ? '#10b981' : '#f43f5e'}/>
                </div>
                <div className="pl-8">
                  <MiniBar value={Math.abs(net)} max={maxAbs} color={net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}/>
                  <div className="flex gap-3 mt-1">
                    <span className="text-zinc-600 text-[10px]">Won ${Math.round(p.moneyWon)} · Lost ${Math.round(p.moneyLost)}</span>
                    <span className="text-zinc-700 text-[10px]">+${Math.round(p.skinsMoney)} skins</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </AnalyticsSection>

      {/* ── MATCH WIN/LOSS ── */}
      <AnalyticsSection title="⚡ Match Records" icon={<Trophy size={15}/>} accent="emerald">
        <div className="p-4 space-y-3">
          {winRateLeaderboard.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <span className="text-zinc-700 text-[10px] font-black w-5">#{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{p.name}</div>
                <WinLossBadge wins={p.matchWins} losses={p.matchLosses} ties={p.matchTies}/>
              </div>
              <div className="text-right">
                <div className="text-zinc-500 text-[9px] font-semibold tracking-wider">BY FORMAT</div>
                <div className="text-zinc-600 text-[10px] font-medium normal-case mt-0.5">
                  1v1: {p.pvpWins}W/{p.pvpLosses}L · 2v2: {p.tvtWins}W/{p.tvtLosses}L
                </div>
              </div>
            </div>
          ))}
        </div>
      </AnalyticsSection>

      {/* ── SCORING STATS ── */}
      <AnalyticsSection title="🏌️ Scoring Averages" icon={<Target size={15}/>} accent="blue">
        <div className="p-4 space-y-3">
          {scoringLeaderboard.map((p, i) => {
            const avg = p.grossScores.length ? Math.round(p.grossScores.reduce((s,n)=>s+n,0)/p.grossScores.length*10)/10 : 0
            const f9avg = p.f9Scores.length ? Math.round(p.f9Scores.reduce((s,n)=>s+n,0)/p.f9Scores.length*10)/10 : 0
            const b9avg = p.b9Scores.length ? Math.round(p.b9Scores.reduce((s,n)=>s+n,0)/p.b9Scores.length*10)/10 : 0
            const totalHoles = p.birdies + p.eagles + p.pars + p.bogeys + p.doubles
            return (
              <div key={p.name} className="bg-zinc-900/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 text-[10px] font-black">#{i+1}</span>
                    <span className="font-bold text-sm">{p.name}</span>
                    {badges[p.name]?.map(b => <span key={b} className="text-[9px]">{b.split(' ')[0]}</span>)}
                  </div>
                  <div className="text-right">
                    <span className="text-blue-400 font-black text-xl">{avg}</span>
                    <span className="text-zinc-600 text-[10px] ml-1">avg</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {label:'F9', val:f9avg, color:'text-emerald-400'},
                    {label:'B9', val:b9avg, color:'text-blue-400'},
                    {label:'BEST', val:p.bestRound, color:'text-yellow-400'},
                    {label:'RNDS', val:p.rounds, color:'text-zinc-400'},
                  ].map(s => (
                    <div key={s.label} className="bg-zinc-950 rounded-xl p-2 text-center">
                      <div className={`font-black text-base ${s.color}`}>{s.val || '—'}</div>
                      <div className="text-zinc-700 text-[9px] font-semibold">{s.label}</div>
                    </div>
                  ))}
                </div>
                {totalHoles > 0 && (
                  <div className="space-y-1">
                    <p className="text-zinc-600 text-[9px] font-semibold tracking-widest">SCORING BREAKDOWN</p>
                    <div className="flex gap-1 h-4">
                      {[
                        {count:p.eagles, color:'bg-yellow-400', label:'Eagle'},
                        {count:p.birdies, color:'bg-red-500', label:'Birdie'},
                        {count:p.pars, color:'bg-emerald-700', label:'Par'},
                        {count:p.bogeys, color:'bg-zinc-600', label:'Bogey'},
                        {count:p.doubles, color:'bg-zinc-800', label:'2+'},
                      ].map(seg => seg.count > 0 && (
                        <div key={seg.label} title={`${seg.label}: ${seg.count}`}
                          className={`${seg.color} rounded h-full transition-all`}
                          style={{flex: seg.count}}/>
                      ))}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {p.eagles>0 && <span className="text-yellow-400 text-[10px] font-bold">🦅 {p.eagles}</span>}
                      <span className="text-red-400 text-[10px] font-bold">🐦 {p.birdies}</span>
                      <span className="text-emerald-600 text-[10px] font-bold">⬜ {p.pars}</span>
                      <span className="text-zinc-500 text-[10px] font-bold">+1: {p.bogeys}</span>
                      <span className="text-zinc-700 text-[10px] font-bold">+2+: {p.doubles}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </AnalyticsSection>

      {/* ── SKINS ── */}
      <AnalyticsSection title="🦴 Skins Kings" icon={<Zap size={15}/>} accent="purple">
        <div className="p-4 space-y-3">
          {skinsLeaderboard.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No skins data yet</p>}
          {skinsLeaderboard.map((p, i) => {
            const avgPerRound = p.skinsPerRound.length ? Math.round(p.skinsPerRound.reduce((a,b)=>a+b,0)/p.skinsPerRound.length*10)/10 : 0
            return (
              <div key={p.name} className="flex items-center gap-4 bg-zinc-900/60 rounded-xl px-4 py-3">
                <span className={`text-lg ${i===0?'text-yellow-400':i===1?'text-zinc-300':i===2?'text-amber-600':'text-zinc-600'}`}>
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':'💀'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-zinc-600 text-[10px] font-medium normal-case">{p.skinsWon} skins · {avgPerRound}/round avg</div>
                </div>
                <div className="text-right">
                  <div className="text-purple-400 font-black text-base">${Math.round(p.skinsMoney)}</div>
                  <div className="text-zinc-600 text-[10px]">total</div>
                </div>
              </div>
            )
          })}
        </div>
      </AnalyticsSection>

      {/* ── HEAD TO HEAD ── */}
      <AnalyticsSection title="🥊 Head to Head Records" icon={<Users size={15}/>} accent="orange">
        <div className="p-4 space-y-2">
          {h2h.slice(0,10).map(match => (
            <div key={match.matchup} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-xs truncate ${match.winsA > match.winsB ? 'text-emerald-400' : 'text-zinc-400'}`}>{match.playerA.split(' ')[0]}</span>
                  <span className="text-zinc-700 text-[10px]">vs</span>
                  <span className={`font-bold text-xs truncate ${match.winsB > match.winsA ? 'text-emerald-400' : 'text-zinc-400'}`}>{match.playerB.split(' ')[0]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm ${match.winsA > match.winsB ? 'text-emerald-400' : 'text-zinc-500'}`}>{match.winsA}</span>
                <span className="text-zinc-700 text-xs">—</span>
                <span className={`font-black text-sm ${match.winsB > match.winsA ? 'text-emerald-400' : 'text-zinc-500'}`}>{match.winsB}</span>
              </div>
              <MoneyBadge amount={match.moneyA}/>
            </div>
          ))}
        </div>
      </AnalyticsSection>

      {/* ── BEST PARTNERSHIPS ── */}
      <AnalyticsSection title="🤝 Best Partnerships" icon={<Users size={15}/>} accent="teal">
        <div className="p-4 space-y-2">
          {partnerships.slice(0,8).map((p, i) => (
            <div key={p.names} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <span className="text-zinc-600 text-[10px] font-black w-5">#{i+1}</span>
              <div className="flex-1">
                <div className="font-bold text-xs text-white">{p.names}</div>
                <WinLossBadge wins={p.wins} losses={p.losses}/>
              </div>
              <div className={`text-lg font-black px-2 py-1 rounded-lg text-sm ${p.rate >= 60 ? 'bg-emerald-500/20 text-emerald-400' : p.rate >= 40 ? 'bg-zinc-700 text-zinc-300' : 'bg-rose-500/20 text-rose-400'}`}>
                {p.rate}%
              </div>
            </div>
          ))}
        </div>
      </AnalyticsSection>

      {/* ── HANDICAP ANALYSIS ── */}
      <AnalyticsSection title="📐 Handicap Analysis" icon={<Hash size={15}/>} accent="blue">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest">CURRENT HANDICAPS</p>
            {handicapTrends.map(p => (
              <div key={p.name} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-2.5">
                <span className="flex-1 font-semibold text-sm">{p.name}</span>
                <span className="text-blue-400 font-black text-base">{p.current}</span>
                {p.trend !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${p.trend < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {p.trend > 0 ? '+' : ''}{Math.round(p.trend*10)/10}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </AnalyticsSection>

      {/* ── SANDBAG INDEX ── */}
      <AnalyticsSection title="🐟 Handicap Integrity Index" icon={<AlertTriangle size={15}/>} accent="rose">
        <div className="p-4 space-y-3">
          <p className="text-zinc-600 text-xs font-medium normal-case leading-relaxed">
            Higher = plays better than handicap suggests. Possible sandbagger alert 👀
          </p>
          {sandbagIndex.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <span className="text-zinc-600 text-[10px] font-black w-5">#{i+1}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-zinc-600 text-[10px] font-medium normal-case">HCP {p.avgHcp} · Avg gross {p.avgGross}</div>
              </div>
              <div className={`text-sm font-black px-2 py-1 rounded-lg ${p.sandbag > 3 ? 'bg-rose-500/20 text-rose-400' : p.sandbag > 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                {p.sandbag > 0 ? '+' : ''}{p.sandbag}
                {p.sandbag > 3 ? ' 🐟' : ''}
              </div>
            </div>
          ))}
        </div>
      </AnalyticsSection>

      {/* ── CONSISTENCY ── */}
      <AnalyticsSection title="🎯 Consistency Index" icon={<Activity size={15}/>} accent="emerald">
        <div className="p-4 space-y-2">
          <p className="text-zinc-600 text-xs font-medium normal-case">Lower std deviation = more consistent player</p>
          {consistency.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <span className={`text-[10px] font-black w-5 ${i===0?'text-emerald-400':'text-zinc-600'}`}>#{i+1}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-zinc-600 text-[10px] font-medium normal-case">Best {p.best} · Worst {p.worst} · Avg {p.avg}</div>
              </div>
              <div className="text-right">
                <div className={`font-black text-sm ${p.stdDev < 3 ? 'text-emerald-400' : p.stdDev < 5 ? 'text-yellow-400' : 'text-rose-400'}`}>±{p.stdDev}</div>
                <div className="text-zinc-700 text-[9px]">std dev</div>
              </div>
            </div>
          ))}
        </div>
      </AnalyticsSection>

      {/* ── SCORING TRENDS ── */}
      <AnalyticsSection title="📈 Score Trends (Last 8 Rounds)" icon={<BarChart3 size={15}/>} accent="blue">
        <div className="p-4 space-y-3">
          {scoreTrends.filter(p => p.scores.length >= 2).map(p => {
            const avg = Math.round(p.scores.reduce((a,b)=>a+b,0)/p.scores.length)
            const trend = p.scores.length >= 2 ? p.scores[p.scores.length-1] - p.scores[0] : 0
            return (
              <div key={p.name} className="flex items-center gap-4 bg-zinc-900/60 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className="text-zinc-600 text-[10px] font-medium normal-case">avg {avg} · {p.scores.length} rounds</div>
                </div>
                <SparkLine scores={p.scores} color={trend < 0 ? '#10b981' : trend > 0 ? '#f43f5e' : '#6b7280'}/>
                <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${trend < 0 ? 'bg-emerald-500/20 text-emerald-400' : trend > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  {trend > 0 ? '+' : ''}{trend !== 0 ? trend : '→'}
                </div>
              </div>
            )
          })}
        </div>
      </AnalyticsSection>

    </div>
  )
}


export default function MasterPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // Auto-authenticate if already logged in as master from home screen
    if (typeof window !== 'undefined' && sessionStorage.getItem('role') === 'master') {
      setAuthed(true)
    }
  }, [])
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState(false)

  // Data
  const [history, setHistory] = useState<any[]>([])
  const [globalRoster, setGlobalRoster] = useState<any[]>([])
  const [courseLibrary, setCourseLibrary] = useState<any[]>([])
  const [activeTournament, setActiveTournament] = useState<any>(null)
  const [savedFormats, setSavedFormats] = useState<any[]>([])

  // Edit states
  const [editingPlayer, setEditingPlayer] = useState<string|null>(null)
  const [editName, setEditName] = useState('')
  const [editHcp, setEditHcp] = useState(0)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerHcp, setNewPlayerHcp] = useState(0)
  const [addingPlayer, setAddingPlayer] = useState(false)

  const [editingCourse, setEditingCourse] = useState<string|null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  const [jeffPin, setJeffPin] = useState('jeff')
  const [editingJeffPin, setEditingJeffPin] = useState(false)
  const [newJeffPin, setNewJeffPin] = useState('')

  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{id:string,label:string,path:string}|null>(null)

  useEffect(() => {
    if (!authed) return
    onValue(ref(db,'history'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val())
          .map(([k,v]:any) => ({ id:k, ...v }))
          .sort((a,b) => Number(b.id) - Number(a.id))
        setHistory(items)
      } else setHistory([])
    })
    onValue(ref(db,'globalRoster'), snap => {
      if (snap.val()) setGlobalRoster(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setGlobalRoster([])
    })
    onValue(ref(db,'courseHistory'), snap => {
      if (snap.val()) setCourseLibrary(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setCourseLibrary([])
    })
    onValue(ref(db,'tournament'), snap => setActiveTournament(snap.val()))
    onValue(ref(db,'savedFormats'), snap => {
      if (snap.val()) setSavedFormats(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setSavedFormats([])
    })
  }, [authed])

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000) }

  const tryPin = () => {
    if (pin === MASTER_PIN) { setAuthed(true); setPinError(false) }
    else { setPinError(true); setPin('') }
  }

  // ── STATS ────────────────────────────────────────────────────────
  const totalRounds = history.length
  const allPlayers: Record<string,{name:string,rounds:number,skins:number,totalScore:number,holes:number}> = {}
  history.forEach(arch => {
    const roster = arch.roster ? Object.values(arch.roster) as any[] : []
    const scores = arch.scores || {}
    const pars = arch.course?.pars || Array(18).fill(4)
    const totalPar = pars.reduce((a:number,b:number)=>a+b,0)
    roster.forEach((p:any) => {
      if (!allPlayers[p.name]) allPlayers[p.name] = {name:p.name,rounds:0,skins:0,totalScore:0,holes:0}
      allPlayers[p.name].rounds++
      const s = scores[p.id] || []
      const tot = s.reduce((a:number,b:number)=>a+(Number(b)||0),0)
      if (tot > 0) { allPlayers[p.name].totalScore += tot; allPlayers[p.name].holes += 18 }
    })
  })
  const playerStats = Object.values(allPlayers).sort((a,b)=>b.rounds-a.rounds)
  const totalMoneyTracked = history.reduce((acc,arch) => {
    const money = arch.money || {}
    return acc + (money.entryFee||0) * (arch.roster ? Object.keys(arch.roster).length : 0)
  },0)
  const mostActivePlayer = playerStats[0]

  // ── LOGIN SCREEN ─────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-4">
              <Shield size={28} className="text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-white">Master Admin</h1>
            <p className="text-zinc-600 text-sm font-medium normal-case mt-1">Blitz Board Command Center</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(false) }}
                onKeyDown={e => e.key==='Enter' && tryPin()}
                placeholder="Enter master PIN"
                className={`w-full bg-black border ${pinError?'border-rose-500':'border-zinc-700'} focus:border-emerald-500 p-4 rounded-xl font-mono text-white text-lg outline-none text-center tracking-widest`}
                autoFocus
              />
              <button onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                {showPin ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {pinError && <p className="text-rose-400 text-xs font-semibold text-center">Incorrect PIN</p>}
            <button onClick={tryPin}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black text-sm transition-colors">
              Enter
            </button>
          </div>
          <Link href="/" className="block text-center text-zinc-700 hover:text-zinc-500 text-xs font-medium mt-6 transition-colors">
            ← Back to app
          </Link>
        </div>
      </div>
    )
  }

  // ── MAIN DASHBOARD ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-emerald-400"/>
          <div>
            <h1 className="font-black text-sm text-white">MASTER ADMIN</h1>
            <p className="text-zinc-600 text-[10px] font-medium">Blitz Board Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors">
            ← App
          </Link>
          <button onClick={() => setAuthed(false)}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-rose-400 text-xs font-semibold transition-colors">
            <LogOut size={14}/> Lock
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl">
          {toast}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle size={20} className="text-rose-400 flex-shrink-0"/>
                <h2 className="font-bold text-white">Confirm Delete</h2>
              </div>
              <p className="text-zinc-400 text-sm font-medium normal-case">Delete <span className="text-white font-semibold">"{confirmDelete.label}"</span>? This cannot be undone.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors">
                Cancel
              </button>
              <button onClick={async () => {
                await set(ref(db, confirmDelete.path), null)
                showToast('Deleted')
                setConfirmDelete(null)
              }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── AT A GLANCE ── */}
        <Section title="At a Glance" icon={<BarChart3 size={16}/>}>
          <div className="p-4 grid grid-cols-2 gap-3">
            <StatCard label="TOTAL ROUNDS" value={totalRounds} sub="All time"/>
            <StatCard label="MONEY TRACKED" value={`$${totalMoneyTracked.toLocaleString()}`} sub="Entry fees" color="text-yellow-400"/>
            <StatCard label="MOST ACTIVE" value={mostActivePlayer?.name||'—'} sub={`${mostActivePlayer?.rounds||0} rounds`} color="text-blue-400"/>
            <StatCard label="COURSE LIBRARY" value={courseLibrary.length} sub="Saved courses" color="text-purple-400"/>
            <StatCard label="ROSTER SIZE" value={globalRoster.length} sub="Global players" color="text-orange-400"/>
            <StatCard label="HISTORY RECORDS" value={history.length} sub="Archived matches" color="text-pink-400"/>
          </div>
        </Section>

        {/* ── PLAYER STATS ── */}
        <Section title="Player Stats" icon={<Trophy size={16}/>} defaultOpen={false}>
          <div className="p-4">
            <div className="space-y-2">
              {playerStats.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-600 text-xs font-black w-5">{i+1}</span>
                    <div>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-zinc-600 text-xs font-medium normal-case">{p.rounds} round{p.rounds!==1?'s':''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-sm">
                      {p.holes > 0 ? (p.totalScore/p.holes*18).toFixed(1) : '—'}
                    </div>
                    <div className="text-zinc-600 text-[10px]">avg score</div>
                  </div>
                </div>
              ))}
              {playerStats.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No match history yet</p>}
            </div>
          </div>
        </Section>

        {/* ── GLOBAL ROSTER ── */}
        <Section title={`Global Roster (${globalRoster.length})`} icon={<Users size={16}/>}>
          <div className="p-4 space-y-3">
            {/* Add new player */}
            {addingPlayer ? (
              <div className="flex gap-2 items-center">
                <input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value.toUpperCase())}
                  placeholder="NAME" autoFocus
                  className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-bold text-sm outline-none"/>
                <input type="number" value={newPlayerHcp} onChange={e=>setNewPlayerHcp(Number(e.target.value))}
                  className="w-16 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-bold text-sm outline-none text-center"
                  placeholder="HCP"/>
                <button onClick={async()=>{
                  if(!newPlayerName.trim())return
                  const r=push(ref(db,'globalRoster'))
                  await set(r,{id:r.key,name:newPlayerName.trim(),handicap:newPlayerHcp})
                  setNewPlayerName('');setNewPlayerHcp(0);setAddingPlayer(false)
                  showToast('✓ Player added')
                }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                <button onClick={()=>setAddingPlayer(false)} className="text-zinc-600 px-2 py-2.5"><X size={14}/></button>
              </div>
            ) : (
              <button onClick={()=>setAddingPlayer(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-2.5 rounded-xl font-semibold text-sm transition-all">
                <Plus size={14}/> Add Player
              </button>
            )}
            {/* Player list */}
            <div className="space-y-2">
              {globalRoster.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5">
                  {editingPlayer === p.id ? (
                    <>
                      <input value={editName} onChange={e=>setEditName(e.target.value.toUpperCase())} autoFocus
                        className="flex-1 bg-black border border-emerald-500 px-2 py-1 rounded-lg font-bold text-sm outline-none"/>
                      <input type="number" value={editHcp} onChange={e=>setEditHcp(Number(e.target.value))}
                        className="w-14 bg-black border border-zinc-700 px-2 py-1 rounded-lg font-bold text-sm text-center outline-none"/>
                      <button onClick={async()=>{
                        await set(ref(db,`globalRoster/${p.id}`),{id:p.id,name:editName.trim(),handicap:editHcp})
                        setEditingPlayer(null);showToast('✓ Updated')
                      }} className="text-emerald-400"><Check size={14}/></button>
                      <button onClick={()=>setEditingPlayer(null)} className="text-zinc-600"><X size={14}/></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-semibold text-sm">{p.name}</span>
                      <span className="text-zinc-500 text-xs font-semibold">HCP {p.handicap||0}</span>
                      <button onClick={()=>{setEditingPlayer(p.id);setEditName(p.name);setEditHcp(p.handicap||0)}}
                        className="text-zinc-600 hover:text-emerald-400 transition-colors"><Edit3 size={13}/></button>
                      <button onClick={()=>setConfirmDelete({id:p.id,label:p.name,path:`globalRoster/${p.id}`})}
                        className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                    </>
                  )}
                </div>
              ))}
              {globalRoster.length===0 && <p className="text-zinc-600 text-xs text-center py-2">No players in roster</p>}
            </div>
          </div>
        </Section>

        {/* ── COURSE LIBRARY ── */}
        <Section title={`Course Library (${courseLibrary.length})`} icon={<Flag size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-3">
            {addingCourse ? (
              <div className="flex gap-2">
                <input value={newCourseName} onChange={e=>setNewCourseName(e.target.value)} placeholder="Course name" autoFocus
                  className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none"/>
                <button onClick={async()=>{
                  if(!newCourseName.trim())return
                  const r=push(ref(db,'courseHistory'))
                  await set(r,{id:r.key,name:newCourseName.trim(),holes:Array.from({length:18},(_,i)=>({par:4,hcp:i+1})),pars:Array(18).fill(4)})
                  setNewCourseName('');setAddingCourse(false);showToast('✓ Course added')
                }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                <button onClick={()=>setAddingCourse(false)} className="text-zinc-600 px-2"><X size={14}/></button>
              </div>
            ) : (
              <button onClick={()=>setAddingCourse(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-2.5 rounded-xl font-semibold text-sm transition-all">
                <Plus size={14}/> Add Course
              </button>
            )}
            <div className="space-y-2">
              {courseLibrary.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <Flag size={13} className="text-zinc-600 flex-shrink-0"/>
                  <span className="flex-1 font-semibold text-sm">{c.name}</span>
                  <span className="text-zinc-600 text-xs">18 holes</span>
                  <button onClick={()=>setConfirmDelete({id:c.id,label:c.name,path:`courseHistory/${c.id}`})}
                    className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                </div>
              ))}
              {courseLibrary.length===0 && <p className="text-zinc-600 text-xs text-center py-2">No courses saved</p>}
            </div>
          </div>
        </Section>

        {/* ── ACTIVE MATCH ── */}
        <Section title="Active Match" icon={<Activity size={16}/>} defaultOpen={false}>
          <div className="p-4">
            {activeTournament?.meta ? (
              <div className="space-y-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">COURSE</span>
                    <span className="font-bold text-sm">{activeTournament.course?.name||'—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">MODE</span>
                    <span className="font-bold text-sm capitalize">{activeTournament.meta?.mode||'—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">PLAYERS</span>
                    <span className="font-bold text-sm">{activeTournament.roster?Object.keys(activeTournament.roster).length:0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">MATCHES</span>
                    <span className="font-bold text-sm">{activeTournament.matchups?Object.keys(activeTournament.matchups).length:0}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={async()=>{
                    const snap = await get(ref(db,'tournament'))
                    if(snap.exists()){
                      await set(ref(db,`history/${Date.now()}`),{
                        ...snap.val(),
                        _meta:{mode:'match',dayLabel:'Quick Match',archivedAt:Date.now(),courseName:snap.val().course?.name||''}
                      })
                      await set(ref(db,'tournament'),null)
                      showToast('✓ Archived to history')
                    }
                  }} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors">
                    <Archive size={14}/> Archive
                  </button>
                  <button onClick={()=>setConfirmDelete({id:'active',label:'the active match',path:'tournament'})}
                    className="flex items-center justify-center gap-2 bg-transparent hover:bg-rose-950/20 border border-zinc-700 hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 py-3 rounded-xl font-bold text-sm transition-colors">
                    <Trash2 size={14}/> Wipe
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm text-center py-4 font-medium">No active match</p>
            )}
          </div>
        </Section>

        {/* ── FULL HISTORY ── */}
        <Section title={`Full History (${history.length})`} icon={<History size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-2">
            {history.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No archived matches</p>}
            {history.map(arch => {
              const meta = arch._meta || {}
              const date = new Date(Number(arch.id)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
              const players = arch.roster ? Object.keys(arch.roster).length : 0
              const course = arch.course?.name || meta.courseName || '—'
              return (
                <div key={arch.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{course}</div>
                    <div className="text-zinc-600 text-xs font-medium normal-case">{date} · {players} players</div>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${meta.mode==='match'?'bg-amber-500/20 text-amber-400':'bg-blue-500/20 text-blue-400'}`}>
                    {meta.mode==='match'?'MATCH':'TOURNAMENT'}
                  </span>
                  <button onClick={()=>setConfirmDelete({id:arch.id,label:course+' ('+date+')',path:`history/${arch.id}`})}
                    className="text-zinc-700 hover:text-rose-400 transition-colors flex-shrink-0"><Trash2 size={13}/></button>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── APP SETTINGS ── */}
        <Section title="App Settings" icon={<Settings size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-4">
            {/* Jeff's PIN */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">JEFF'S ADMIN PIN</p>
              {editingJeffPin ? (
                <div className="flex gap-2">
                  <input value={newJeffPin} onChange={e=>setNewJeffPin(e.target.value)} placeholder="New PIN" autoFocus
                    className="flex-1 bg-black border border-emerald-500 px-3 py-2.5 rounded-xl font-mono font-bold text-sm outline-none tracking-widest"/>
                  <button onClick={async()=>{
                    // Note: PIN is hardcoded in landing-page.tsx as ADMIN_PIN constant
                    // This is a visual reminder only - actual change requires code update
                    showToast("Update ADMIN_PIN in landing-page.tsx to: "+newJeffPin)
                    setEditingJeffPin(false)
                  }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                  <button onClick={()=>setEditingJeffPin(false)} className="text-zinc-600 px-2"><X size={14}/></button>
                </div>
              ) : (
                <button onClick={()=>{setEditingJeffPin(true);setNewJeffPin('')}}
                  className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-zinc-600 px-4 py-3 rounded-xl transition-colors">
                  <span className="font-mono font-bold text-sm text-zinc-400">••••••</span>
                  <span className="text-zinc-600 text-xs font-semibold flex items-center gap-1"><Edit3 size={12}/> Change</span>
                </button>
              )}
            </div>

            {/* Saved formats */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">SAVED FORMATS ({savedFormats.length})</p>
              <div className="space-y-2">
                {savedFormats.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5">
                    <span className="font-semibold text-sm">{f.name}</span>
                    <button onClick={()=>setConfirmDelete({id:f.id,label:f.name,path:`savedFormats/${f.id}`})}
                      className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                  </div>
                ))}
                {savedFormats.length===0 && <p className="text-zinc-600 text-xs">No saved formats</p>}
              </div>
            </div>

            {/* Danger zone */}
            <div className="border border-rose-500/20 rounded-xl p-4 space-y-2">
              <p className="text-rose-400 text-[10px] font-black tracking-widest mb-3">DANGER ZONE</p>
              <button onClick={()=>setConfirmDelete({id:'demo',label:'demo/mock tournament data',path:'tournament'})}
                className="w-full flex items-center justify-between bg-transparent hover:bg-rose-950/10 border border-zinc-800 hover:border-rose-500/30 px-4 py-3 rounded-xl transition-all">
                <span className="text-zinc-400 text-sm font-semibold">Clear Active Match</span>
                <Trash2 size={14} className="text-zinc-600"/>
              </button>

            </div>
          </div>
        </Section>

        {/* ── ANALYTICS DASHBOARD ── */}
        <Section title="📊 Analytics Dashboard" icon={<BarChart3 size={16}/>} defaultOpen={false}>
          <AnalyticsDashboard history={history}/>
        </Section>

        {/* ── FIREBASE INFO ── */}
        <Section title="Database Info" icon={<Database size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Project</span>
                <span className="font-mono text-xs text-zinc-400">mcc-blitz-live</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">History records</span>
                <span className="text-emerald-400 font-bold">{history.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Roster players</span>
                <span className="text-emerald-400 font-bold">{globalRoster.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Courses saved</span>
                <span className="text-emerald-400 font-bold">{courseLibrary.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Security rules</span>
                <span className="text-amber-400 font-bold text-xs">Open (upgrade pending)</span>
              </div>
            </div>
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white py-3 rounded-xl font-semibold text-sm transition-colors">
              <Database size={14}/> Open Firebase Console ↗
            </a>
          </div>
        </Section>

      </div>
    </div>
  )
}