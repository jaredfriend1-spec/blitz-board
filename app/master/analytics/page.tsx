"use client"
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import Link from 'next/link'
import {
  BarChart3, DollarSign, Trophy, Zap, Users, Target,
  AlertTriangle, Activity, Hash, ChevronDown, Shield,
  ArrowLeft
} from 'lucide-react'

// ════════════════════════════════════════════════════════════════════
// Winnings = match money + skins. Net also backs out the skins buy-in.
// Module scope so both the engine and the dashboard can use them.
// Every distinct kind of wager the app can settle. `pot` categories are
// funded by a buy-in and paid out one-way; `h2h` categories are zero-sum.
const BET_CATEGORIES: { key: string; label: string; kind: 'pot' | 'h2h'; color: string }[] = [
  { key: 'skinsGross', label: 'Gross Skins', kind: 'pot', color: 'text-yellow-400' },
  { key: 'skinsNet',   label: 'Net Skins',   kind: 'pot', color: 'text-amber-400' },
  { key: 'pvp',        label: '1v1 Matches', kind: 'h2h', color: 'text-blue-400' },
  { key: 'twoV2',      label: '2v2 Matches', kind: 'h2h', color: 'text-sky-400' },
  { key: 'team',       label: 'Team Matches',kind: 'h2h', color: 'text-indigo-400' },
  { key: 'press',      label: 'Presses',     kind: 'h2h', color: 'text-purple-400' },
  { key: 'bonus',      label: 'Birdies/Eagles', kind: 'h2h', color: 'text-pink-400' },
  { key: 'wheel',      label: 'Wheel',       kind: 'h2h', color: 'text-orange-400' },
]

const addBet = (p: any, cat: string, amt: number) => {
  if (!amt) return
  if (!p.bets[cat]) p.bets[cat] = { won: 0, lost: 0 }
  if (amt > 0) p.bets[cat].won += amt
  else p.bets[cat].lost += -amt
}
const betNet = (p: any, cat: string) => (p.bets[cat]?.won || 0) - (p.bets[cat]?.lost || 0)
const betBuyIn = (p: any, cat: string) =>
  cat === 'skinsGross' ? (p.skinsBuyInGross || 0) : cat === 'skinsNet' ? (p.skinsBuyInNet || 0) : 0

// Tournament money = the field-wide skins pot. Side bets = head-to-head
// and team matchups. They are funded differently and settle differently.
const tourneyWin = (p: any) => betNet(p, 'skinsGross') + betNet(p, 'skinsNet')
const sideBetWin = (p: any) => BET_CATEGORIES.filter(c => c.kind === 'h2h').reduce((t, c) => t + betNet(p, c.key), 0)
const totalWin = (p: any) => tourneyWin(p) + sideBetWin(p)
const netWin = (p: any) => totalWin(p) - p.skinsBuyIn

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
    skinsBuyIn: number; entryFees: number; pressUnsupported: boolean
    bets: Record<string, { won: number; lost: number }>
    skinsBuyInGross: number; skinsBuyInNet: number
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
      skinsBuyIn: 0, entryFees: 0, pressUnsupported: false,
      bets: {}, skinsBuyInGross: 0, skinsBuyInNet: 0,
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
    // Gross and net pools are funded and settled separately, exactly as
    // the History/Payouts engine does it.
    if (skinsAlloc > 0) {
      const fieldSize = roster.length
      const netOn = !!money.netSkinsEnabled
      const splitG = Number(money.skinsSplitGross ?? 100)
      const splitN = Number(money.skinsSplitNet ?? 0)
      const hcpPct = Number(money.handicapPercent ?? 100)
      const gC: Record<string, number> = {}
      const nC: Record<string, number> = {}

      for (let h = 0; h < numHoles; h++) {
        const hIdx = holeOffset + h
        const hs = roster.map(rp => ({ name: rp.name, s: Number(scores[rp.id]?.[hIdx]) || 0 })).filter(x => x.s > 0)
        if (!hs.length) continue
        const mn = Math.min(...hs.map(x => x.s))
        const w = hs.filter(x => x.s === mn)
        if (w.length === 1) gC[w[0].name] = (gC[w[0].name] || 0) + 1
      }

      if (netOn) {
        const adj: Record<string, number> = {}
        roster.forEach(rp => { adj[rp.name] = Math.round((Number(rp.handicap) || 0) * (hcpPct / 100)) })
        const baseAdj = Math.min(...Object.values(adj))
        for (let h = 0; h < numHoles; h++) {
          const hIdx = holeOffset + h
          const rating = Number(arch.course?.holes?.[hIdx]?.hcp) || (hIdx + 1)
          const nets = roster.map(rp => {
            const g = Number(scores[rp.id]?.[hIdx]) || 0
            if (!g) return null
            const diff = Math.max(0, adj[rp.name] - baseAdj)
            let st = Math.floor(diff / 18)
            if (rating <= (diff % 18)) st++
            return { name: rp.name, net: g - st }
          }).filter(Boolean) as any[]
          if (!nets.length) continue
          const mn = Math.min(...nets.map(x => x.net))
          const w = nets.filter(x => x.net === mn)
          if (w.length === 1) nC[w[0].name] = (nC[w[0].name] || 0) + 1
        }
      }

      const pot = skinsAlloc * fieldSize
      const gPot = netOn ? pot * (splitG / 100) : pot
      const nPot = netOn ? pot * (splitN / 100) : 0
      const tg = Object.values(gC).reduce((x, y) => x + y, 0)
      const tn = Object.values(nC).reduce((x, y) => x + y, 0)
      const perG = tg > 0 ? gPot / tg : 0
      const perN = tn > 0 ? nPot / tn : 0

      roster.forEach(rp => {
        const p = getP(rp.name)
        p.skinsBuyIn += skinsAlloc
        p.skinsBuyInGross += skinsAlloc * (netOn ? splitG / 100 : 1)
        p.skinsBuyInNet += skinsAlloc * (netOn ? splitN / 100 : 0)
        p.entryFees += entryFee
        p.skinsPerRound.push(gC[rp.name] || 0)
      })
      Object.entries(gC).forEach(([n, c]) => {
        const p = getP(n); p.skinsWon += c; p.skinsMoney += c * perG; addBet(p, 'skinsGross', c * perG)
      })
      Object.entries(nC).forEach(([n, c]) => {
        const p = getP(n); p.skinsMoney += c * perN; addBet(p, 'skinsNet', c * perN)
      })
    } else {
      roster.forEach(rp => { getP(rp.name).entryFees += entryFee })
    }

    // ── Matches ──────────────────────────────────────────────────────
    // Mirrors buildRecap in app/history: match-play nines with auto-press
    // bets spawning at 2-up, an overall bet on holes won across the round,
    // plus birdie/eagle bonuses. Wheel settles as round-robin pairs.
    const holeCount = numHoles
    const runNine = (sA: number[], sB: number[], from: number, to: number, nassau: number, press: number, autoPress: boolean) => {
      const legs = [{ score: 0, pressed: false, isBase: true }]
      for (let i = from; i <= to; i++) {
        const sa = sA[i], sb = sB[i]
        let delta = 0
        if (sa > 0 && sb > 0) delta = sa < sb ? 1 : sb < sa ? -1 : 0
        if (delta !== 0) {
          let np = 0
          legs.forEach(l => {
            l.score += delta
            if (autoPress && Math.abs(l.score) >= 2 && !l.pressed) { l.pressed = true; np++ }
          })
          for (let k = 0; k < np; k++) legs.push({ score: 0, pressed: false, isBase: false })
        }
      }
      let base = 0, pressNet = 0
      legs.forEach(l => {
        const amt = l.isBase ? nassau : press
        if (l.score > 0) { if (l.isBase) base += amt; else pressNet += amt }
        else if (l.score < 0) { if (l.isBase) base -= amt; else pressNet -= amt }
      })
      return { base, press: pressNet }
    }

    const strokesFor = (h: number, hcpVal: number, base: number, isGross: boolean) => {
      if (isGross) return 0
      const rating = Number(arch.course?.holes?.[h]?.hcp) || (h + 1)
      const diff = Math.max(0, hcpVal - base)
      let st = Math.floor(diff / 18)
      if (rating <= (diff % 18)) st++
      return st
    }

    matchups.forEach((m: any) => {
      const type = m.type || 'PvP'
      const isGross = m.scoringType === 'GROSS'

      if (type === 'Wheel') {
        const wp: string[] = m.wheelPlayers || []
        const amt = Number(m.wheelAmount) || 10
        const hcps = wp.map(n => Number(roster.find((r: any) => r.name === n)?.handicap) || 0)
        const base = isGross ? 0 : Math.min(...(hcps.length ? hcps : [0]))
        const net: Record<string, number[]> = {}
        wp.forEach(n => {
          const rp = roster.find((r: any) => r.name === n)
          if (!rp) return
          net[n] = Array.from({ length: holeCount }, (_, i) => {
            const g = Number(scores[rp.id]?.[holeOffset + i]) || 0
            return g ? g - strokesFor(holeOffset + i, Number(rp.handicap) || 0, base, isGross) : 0
          })
        })
        for (let x = 0; x < wp.length; x++) {
          for (let y = x + 1; y < wp.length; y++) {
            const na = wp[x], nb = wp[y]
            let aW = 0, bW = 0
            for (let i = 0; i < holeCount; i++) {
              const sa = net[na]?.[i] || 0, sb = net[nb]?.[i] || 0
              if (sa > 0 && sb > 0) { if (sa < sb) aW++; else if (sb < sa) bW++ }
            }
            if (aW > bW) { addBet(getP(na), 'wheel', amt); addBet(getP(nb), 'wheel', -amt) }
            else if (bW > aW) { addBet(getP(nb), 'wheel', amt); addBet(getP(na), 'wheel', -amt) }
          }
        }
        return
      }

      let pA: any[] = [], pB: any[] = []
      if (type === 'PvP') {
        pA = roster.filter((p: any) => p.name === m.sideA)
        pB = roster.filter((p: any) => p.name === m.sideB)
      } else if (type === '2v2') {
        pA = roster.filter((p: any) => p.name === m.sideA || p.name === m.sideA2)
        pB = roster.filter((p: any) => p.name === m.sideB || p.name === m.sideB2)
      } else {
        const teams: any[] = arch.teams ? Object.values(arch.teams) : []
        pA = roster.filter((p: any) => (teams.find((t: any) => t.name === m.sideA)?.playerIds || []).includes(p.id))
        pB = roster.filter((p: any) => (teams.find((t: any) => t.name === m.sideB)?.playerIds || []).includes(p.id))
      }
      if (!pA.length || !pB.length) return

      const allH = isGross ? [0] : [...pA, ...pB].map((p: any) => Number(p.handicap) || 0)
      const baseH = Math.min(...allH)
      const bestBall = (list: any[]) => Array.from({ length: holeCount }, (_, i) => {
        const vals = list.map((p: any) => {
          const g = Number(scores[p.id]?.[holeOffset + i]) || 0
          return g ? g - strokesFor(holeOffset + i, Number(p.handicap) || 0, baseH, isGross) : 0
        }).filter(Boolean)
        return vals.length ? Math.min(...vals) : 0
      })
      const sA = bestBall(pA), sB = bestBall(pB)

      const nassau = Number(m.nassau) || 5
      const pressAmt = Number(m.press) || 5
      const autoPress = m.autoPress !== false && (type === 'PvP' || type === '2v2')

      const nines: [number, number][] = holeCount > 9 ? [[0, 8], [9, 17]] : [[0, holeCount - 1]]
      let baseNet = 0, pressNet = 0
      nines.forEach(([f, t]) => {
        const r = runNine(sA, sB, f, t, nassau, pressAmt, autoPress)
        baseNet += r.base; pressNet += r.press
      })
      let aW = 0, bW = 0
      for (let i = 0; i < holeCount; i++) {
        if (sA[i] > 0 && sB[i] > 0) { if (sA[i] < sB[i]) aW++; else if (sB[i] < sA[i]) bW++ }
      }
      baseNet += aW > bW ? nassau : bW > aW ? -nassau : 0

      const bonusFor = (list: any[]) => Array.from({ length: holeCount }, (_, i) => {
        const par = pars[holeOffset + i] || 4
        const g = Math.min(...list.map((p: any) => Number(scores[p.id]?.[holeOffset + i]) || 99).filter((x: number) => x < 99))
        return (isFinite(g) && g < par) ? (g <= par - 2 ? Number(m.eagle || 0) : Number(m.birdie || 0)) : 0
      }).reduce((x, y) => x + y, 0)
      const bonusNet = bonusFor(pA) - bonusFor(pB)

      const cat = type === 'PvP' ? 'pvp' : type === '2v2' ? 'twoV2' : 'team'
      const total = baseNet + pressNet + bonusNet
      const aWon = total > 0, bWon = total < 0

      pA.forEach((p: any) => {
        const pl = getP(p.name)
        addBet(pl, cat, baseNet); addBet(pl, 'press', pressNet); addBet(pl, 'bonus', bonusNet)
        if (total > 0) pl.moneyWon += total; else if (total < 0) pl.moneyLost += -total
        if (aWon) pl.matchWins++; else if (bWon) pl.matchLosses++; else pl.matchTies++
        if (type === 'PvP') { if (aWon) pl.pvpWins++; else if (bWon) pl.pvpLosses++ }
        else { if (aWon) pl.tvtWins++; else if (bWon) pl.tvtLosses++ }
        pA.filter((q: any) => q.name !== p.name).forEach((partner: any) => {
          if (!pl.partnerships[partner.name]) pl.partnerships[partner.name] = { wins: 0, losses: 0 }
          if (aWon) pl.partnerships[partner.name].wins++; else if (bWon) pl.partnerships[partner.name].losses++
        })
        pB.forEach((o: any) => {
          if (!pl.opponents[o.name]) pl.opponents[o.name] = { wins: 0, losses: 0, moneyWon: 0 }
          if (aWon) pl.opponents[o.name].wins++; else if (bWon) pl.opponents[o.name].losses++
          pl.opponents[o.name].moneyWon += total / pA.length
        })
      })
      pB.forEach((p: any) => {
        const pl = getP(p.name)
        addBet(pl, cat, -baseNet); addBet(pl, 'press', -pressNet); addBet(pl, 'bonus', -bonusNet)
        if (total < 0) pl.moneyWon += -total; else if (total > 0) pl.moneyLost += total
        if (bWon) pl.matchWins++; else if (aWon) pl.matchLosses++; else pl.matchTies++
        if (type === 'PvP') { if (bWon) pl.pvpWins++; else if (aWon) pl.pvpLosses++ }
        else { if (bWon) pl.tvtWins++; else if (aWon) pl.tvtLosses++ }
        pB.filter((q: any) => q.name !== p.name).forEach((partner: any) => {
          if (!pl.partnerships[partner.name]) pl.partnerships[partner.name] = { wins: 0, losses: 0 }
          if (bWon) pl.partnerships[partner.name].wins++; else if (aWon) pl.partnerships[partner.name].losses++
        })
        pA.forEach((o: any) => {
          if (!pl.opponents[o.name]) pl.opponents[o.name] = { wins: 0, losses: 0, moneyWon: 0 }
          if (bWon) pl.opponents[o.name].wins++; else if (aWon) pl.opponents[o.name].losses++
          pl.opponents[o.name].moneyWon += -total / pB.length
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
    .sort((a,b) => netWin(b) - netWin(a))

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

  // ── ROUND RECORDS ─────────────────────────────────────────────────
  const roundRecords: {name:string, score:number, course:string, date:string, nineHole:boolean}[] = []
  history.forEach(arch => {
    const roster: any[] = arch.roster ? Object.values(arch.roster) : []
    const scores: Record<string,number[]> = arch.scores || {}
    const pars: number[] = arch.course?.pars || Array(18).fill(4)
    const courseName = arch.course?.name || 'Unknown'
    const date = new Date(Number(arch.id)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    const nineHole = !!arch.course?.nineHole
    const holeOffset = nineHole && arch.course?.nineHoleStart === 'back' ? 9 : 0
    const numHoles = nineHole ? 9 : 18
    roster.forEach((rp:any) => {
      const sc = scores[rp.id] || []
      const holeScores = sc.slice(holeOffset, holeOffset+numHoles).map(Number).filter(s=>s>0)
      if (holeScores.length < numHoles*0.8) return
      const gross = holeScores.reduce((a,b)=>a+b,0)
      roundRecords.push({ name: rp.name, score: gross, course: courseName, date, nineHole })
    })
  })

  // Separate 9-hole and 18-hole records
  const records18 = roundRecords.filter(r => !r.nineHole)
  const records9 = roundRecords.filter(r => r.nineHole)
  const allTimeLowest = [...records18].sort((a,b)=>a.score-b.score).slice(0,10)
  const allTimeHighest = [...records18].sort((a,b)=>b.score-a.score).slice(0,10)
  const allTimeLowest9 = [...records9].sort((a,b)=>a.score-b.score).slice(0,5)
  const allTimeHighest9 = [...records9].sort((a,b)=>b.score-a.score).slice(0,5)

  // Per-player best/worst — separated by hole count
  const lowestPerPlayer: Record<string,{score:number,course:string,date:string,nineHole:boolean}> = {}
  const highestPerPlayer: Record<string,{score:number,course:string,date:string,nineHole:boolean}> = {}
  records18.forEach(r => {
    if (!lowestPerPlayer[r.name] || r.score < lowestPerPlayer[r.name].score)
      lowestPerPlayer[r.name] = {score:r.score, course:r.course, date:r.date, nineHole:false}
    if (!highestPerPlayer[r.name] || r.score > highestPerPlayer[r.name].score)
      highestPerPlayer[r.name] = {score:r.score, course:r.course, date:r.date, nineHole:false}
  })

  // ── BETTING STATS ─────────────────────────────────────────────────
  let totalMatchups = 0
  let totalNassau = 0, totalPvP = 0, total2v2 = 0, totalTvT = 0, totalWheel = 0
  let totalGross = 0, totalNet = 0
  let totalAutoPress = 0, totalNoPress = 0
  let nassauAmounts: number[] = [], wheelAmounts: number[] = [], pressAmounts: number[] = []
  let birdieAmounts: number[] = [], eagleAmounts: number[] = []
  let totalOverall = 0, overallAmounts: number[] = []
  let totalPotMoney = 0
  const betSizesByRound: number[] = []

  history.forEach(arch => {
    const matchups: any[] = arch.matchups ? Object.values(arch.matchups) : []
    const entryFee = Number(arch.money?.entryFee) || 0
    const players: any[] = arch.roster ? Object.values(arch.roster) : []
    totalPotMoney += entryFee * players.length

    let roundBetTotal = 0
    matchups.forEach((m:any) => {
      totalMatchups++
      const type = m.type || 'PvP'
      if (type === 'PvP') totalPvP++
      else if (type === '2v2') total2v2++
      else if (type === 'TvT') totalTvT++
      else if (type === 'Wheel') totalWheel++
      if (type !== 'Wheel' && Number(m.nassau) > 0) totalNassau++

      if (m.scoringType === 'GROSS') totalGross++
      else totalNet++

      if (m.autoPress) totalAutoPress++
      else totalNoPress++

      const nassau = Number(m.nassau) || 0
      const press = Number(m.press) || 0
      const birdie = Number(m.birdie) || 0
      const eagle = Number(m.eagle) || 0
      const overall = Number(m.overall) || 0
      const wheelAmt = Number(m.wheelAmount) || 0

      if (nassau > 0) { nassauAmounts.push(nassau); roundBetTotal += nassau * 3 }
      if (press > 0) pressAmounts.push(press)
      if (birdie > 0) birdieAmounts.push(birdie)
      if (eagle > 0) eagleAmounts.push(eagle)
      if (overall > 0) { totalOverall++; overallAmounts.push(overall); roundBetTotal += overall }
      if (wheelAmt > 0) { wheelAmounts.push(wheelAmt); roundBetTotal += wheelAmt }
    })
    if (matchups.length > 0) betSizesByRound.push(roundBetTotal)
  })

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*10)/10 : 0
  const bettingStats = {
    totalMatchups, totalRounds,
    avgMatchupsPerRound: Math.round(totalMatchups / (history.length||1) * 10)/10,
    formatBreakdown: { pvp: totalPvP, tvt: total2v2+totalTvT, wheel: totalWheel, nassau: totalNassau },
    scoringBreakdown: { net: totalNet, gross: totalGross },
    pressBreakdown: { auto: totalAutoPress, none: totalNoPress },
    avgNassau: avg(nassauAmounts), avgPress: avg(pressAmounts),
    avgBirdie: avg(birdieAmounts), avgEagle: avg(eagleAmounts),
    avgWheel: avg(wheelAmounts), avgOverall: avg(overallAmounts),
    avgBetPerRound: avg(betSizesByRound),
    totalOverallBets: totalOverall, totalPotMoney,
    nassauCount: nassauAmounts.length, wheelCount: wheelAmounts.length,
    pressCount: pressAmounts.length,
  }

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
  if (sandbagIndex[0] && sandbagIndex[0].sandbag > 2) badges[sandbagIndex[0].name] = [...(badges[sandbagIndex[0].name]||[]), '⚠️ Sandbagger']

  return { playerList, totalRounds, totalMoneyTracked, moneyLeaderboard, scoringLeaderboard, winRateLeaderboard, skinsLeaderboard, handicapTrends, sandbagIndex, consistency, partnerships, h2h, scoreTrends, badges, allTimeLowest, allTimeHighest, allTimeLowest9, allTimeHighest9, lowestPerPlayer, highestPerPlayer, bettingStats }
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

function AnalyticsDashboard({ history, activeSections }: { history: any[], activeSections: Record<string,boolean> }) {
  const [betCat, setBetCat] = useState<string>('all')
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

  const { playerList, totalRounds, moneyLeaderboard, scoringLeaderboard, winRateLeaderboard, skinsLeaderboard, handicapTrends, sandbagIndex, consistency, partnerships, h2h, scoreTrends, badges, allTimeLowest, allTimeHighest, allTimeLowest9, allTimeHighest9, lowestPerPlayer, highestPerPlayer, bettingStats } = data
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
      {activeSections.money_board!==false && <AnalyticsSection title="💰 Money Leaderboard" icon={<DollarSign size={15}/>} accent="yellow" defaultOpen={false}>
        <div className="p-4 space-y-3">
          {(() => {
            const anyPress = moneyLeaderboard.some((p: any) => p.pressUnsupported)
            const maxAbs = Math.max(1, ...moneyLeaderboard.map((x: any) => Math.abs(netWin(x))))
            return (
              <>
                {/* category totals */}
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
                    <p className="text-[9px] font-black text-yellow-500/80 tracking-widest">TOURNAMENT (SKINS)</p>
                    <p className="text-lg font-black text-yellow-400">
                      ${Math.round(moneyLeaderboard.reduce((s: number, p: any) => s + tourneyWin(p), 0))}
                    </p>
                    <p className="text-[9px] font-black text-zinc-600">POT DISTRIBUTED</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2">
                    <p className="text-[9px] font-black text-blue-400/80 tracking-widest">SIDE BETS (MATCHES)</p>
                    <p className="text-lg font-black text-blue-400">
                      ${Math.round(moneyLeaderboard.reduce((s: number, p: any) => s + Math.max(0, sideBetWin(p)), 0))}
                    </p>
                    <p className="text-[9px] font-black text-zinc-600">CHANGED HANDS</p>
                  </div>
                </div>

                {/* column headers */}
                <div className="flex items-center gap-3 pb-1 border-b border-zinc-800">
                  <span className="w-5"/>
                  <span className="flex-1 text-[9px] font-black text-zinc-600 tracking-widest">PLAYER</span>
                  <span className="w-16 text-right text-[9px] font-black text-yellow-600 tracking-widest">TOURN</span>
                  <span className="w-16 text-right text-[9px] font-black text-blue-500 tracking-widest">SIDE</span>
                  <span className="w-16 text-right text-[9px] font-black text-zinc-600 tracking-widest">NET</span>
                </div>

                {moneyLeaderboard.map((p: any, i: number) => {
                  const match = p.moneyWon - p.moneyLost
                  const win = totalWin(p)
                  const net = netWin(p)
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black w-5 ${i===0?'text-yellow-400':i===1?'text-zinc-400':i===2?'text-amber-600':'text-zinc-700'}`}>#{i+1}</span>
                        <span className="flex-1 font-bold text-sm text-white truncate">{p.name}</span>
                        <span className="w-16 text-right font-black text-sm tabular-nums text-yellow-400">
                          {tourneyWin(p) > 0 ? '$' + Math.round(tourneyWin(p)) : <span className="text-zinc-700">—</span>}
                        </span>
                        <span className={`w-16 text-right font-black text-sm tabular-nums ${match > 0 ? 'text-blue-400' : match < 0 ? 'text-rose-400' : 'text-zinc-700'}`}>
                          {match === 0 ? '—' : (match > 0 ? '$' : '-$') + Math.abs(Math.round(match))}
                        </span>
                        <span className={`w-16 text-right font-black text-sm tabular-nums ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {net >= 0 ? '$' : '-$'}{Math.abs(Math.round(net))}
                        </span>
                      </div>
                      <div className="pl-8">
                        <MiniBar value={Math.abs(net)} max={maxAbs} color={net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}/>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {BET_CATEGORIES.map(c => [c.label, betNet(p, c.key), c.color + '/80'])
                            .filter(([, v]) => Math.round(Number(v)) !== 0).map(([lbl, v, cls]: any) => (
                            <span key={lbl} className={`text-[10px] font-semibold ${cls}`}>
                              {lbl} {Number(v) >= 0 ? '+' : '-'}${Math.abs(Math.round(Number(v)))}
                            </span>
                          ))}
                          <span className="text-zinc-700 text-[10px] font-semibold">Buy-in -${Math.round(p.skinsBuyIn)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-2 mt-1 border-t border-zinc-800 space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 leading-relaxed">
                    TOURN = SKINS POT (EVERYONE BUYS IN, WINNERS SPLIT IT). SIDE = HEAD-TO-HEAD AND TEAM MATCHES, ZERO-SUM BETWEEN PLAYERS.
                    NET = TOURN + SIDE - BUY-IN, SO NET SUMS TO ZERO ACROSS THE FIELD.
                    ENTRY FEES BEYOND THE SKINS ALLOCATION FUND OVERALL PRIZES AND ARE NOT TRACKED HERE.
                  </p>
                  {anyPress && (
                    <p className="text-[9px] font-black text-amber-500/80 leading-relaxed">
                      ⚠ SOME MATCHES USE PRESSES OR WHEEL BETS. THOSE PAYOUTS ARE NOT INCLUDED IN THESE TOTALS.
                    </p>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      </AnalyticsSection>}

      {/* ── BETTING MONEY ── */}
      {activeSections.betting!==false && <AnalyticsSection title="🎲 Betting Money" icon={<DollarSign size={15}/>} accent="purple" defaultOpen={false}>
        {(() => {
          // Only surface categories that actually saw action
          const active = BET_CATEGORIES.filter(c =>
            playerList.some((p: any) => (p.bets[c.key]?.won || 0) + (p.bets[c.key]?.lost || 0) > 0))
          const handsFor = (key: string) =>
            playerList.reduce((t: number, p: any) => t + (p.bets[key]?.won || 0), 0)
          const totalHands = active.reduce((t, c) => t + handsFor(c.key), 0)
          const shown = betCat === 'all' ? active : active.filter(c => c.key === betCat)

          const rows = playerList.map((p: any) => {
            const won = shown.reduce((t, c) => t + (p.bets[c.key]?.won || 0), 0)
            const lost = shown.reduce((t, c) => t + (p.bets[c.key]?.lost || 0), 0)
            const buyIn = shown.reduce((t, c) => t + betBuyIn(p, c.key), 0)
            return { name: p.name, won, lost, buyIn, net: won - lost - buyIn }
          }).filter((r: any) => r.won || r.lost || r.buyIn)
            .sort((a: any, b: any) => b.net - a.net)

          const $ = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n))

          return (
            <div className="p-4 space-y-4">
              {/* headline stat */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-purple-400/80 tracking-widest">TOTAL MONEY CHANGED HANDS</p>
                <p className="text-3xl font-black text-purple-300">${Math.round(totalHands)}</p>
                <p className="text-[9px] font-black text-zinc-600">
                  ACROSS {active.length} BET TYPE{active.length === 1 ? '' : 'S'} · {totalRounds} ROUND{totalRounds === 1 ? '' : 'S'}
                </p>
              </div>

              {/* per-category summary */}
              <div className="space-y-1.5">
                {active.map(c => {
                  const hands = handsFor(c.key)
                  const top = playerList
                    .filter((p: any) => betNet(p, c.key) > 0)
                    .sort((x: any, y: any) => betNet(y, c.key) - betNet(x, c.key))[0]
                  return (
                    <button key={c.key} onClick={() => setBetCat(betCat === c.key ? 'all' : c.key)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 border transition-all text-left ${
                        betCat === c.key ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'}`}>
                      <span className={`text-[11px] font-black w-28 flex-shrink-0 ${c.color}`}>{c.label}</span>
                      <span className="text-[10px] font-black text-zinc-500 flex-shrink-0">${Math.round(hands)}</span>
                      <span className="text-[10px] font-semibold text-zinc-600 truncate ml-auto">
                        {top ? `top: ${top.name} ${$(betNet(top, c.key))}` : 'no net winner'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* toggle back to combined */}
              <div className="flex gap-2">
                <button onClick={() => setBetCat('all')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                    betCat === 'all' ? 'bg-purple-500 text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
                  ALL BETS
                </button>
                {betCat !== 'all' && (
                  <span className="text-[10px] font-black text-zinc-500 self-center">
                    SHOWING {active.find(c => c.key === betCat)?.label.toUpperCase()} ONLY
                  </span>
                )}
              </div>

              {/* leaderboard */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[9px] font-black text-zinc-600 tracking-widest border-b border-zinc-800">
                      <th className="text-left py-2 w-6">#</th>
                      <th className="text-left py-2">PLAYER</th>
                      <th className="text-right py-2 px-1">WON</th>
                      <th className="text-right py-2 px-1">LOST</th>
                      <th className="text-right py-2 px-1">BUY-IN</th>
                      <th className="text-right py-2 pl-2">NET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => (
                      <tr key={r.name} className={`border-b border-zinc-900 ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
                        <td className="py-2 text-[10px] font-black text-zinc-700">{i + 1}</td>
                        <td className="py-2 font-bold text-white whitespace-nowrap">{r.name}</td>
                        <td className="py-2 px-1 text-right text-emerald-400 font-bold tabular-nums">{r.won ? '$' + Math.round(r.won) : '—'}</td>
                        <td className="py-2 px-1 text-right text-rose-400/80 font-bold tabular-nums">{r.lost ? '-$' + Math.round(r.lost) : '—'}</td>
                        <td className="py-2 px-1 text-right text-zinc-600 font-bold tabular-nums">{r.buyIn ? '-$' + Math.round(r.buyIn) : '—'}</td>
                        <td className={`py-2 pl-2 text-right font-black tabular-nums ${r.net > 0 ? 'text-emerald-400' : r.net < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{$(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[9px] font-black text-zinc-700 leading-relaxed">
                MONEY CHANGED HANDS COUNTS EVERY DOLLAR WON. HEAD-TO-HEAD BETS ARE ZERO-SUM SO WON EQUALS LOST.
                SKINS ARE A POT — EVERYONE BUYS IN, WINNERS SPLIT IT — SO BUY-IN ONLY APPLIES THERE.
              </p>
            </div>
          )
        })()}
      </AnalyticsSection>}

      {/* ── MATCH WIN/LOSS ── */}
      {activeSections.match_records!==false && <AnalyticsSection title="⚡ Match Records" icon={<Trophy size={15}/>} accent="emerald">
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
      </AnalyticsSection>}

      {/* ── SCORING STATS ── */}
      {activeSections.scoring_avgs!==false && <AnalyticsSection title="🏌️ Scoring Averages" icon={<Target size={15}/>} accent="blue">
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
                  <div className="space-y-2 mt-1">
                    <p className="text-zinc-600 text-[9px] font-semibold tracking-widest">SCORING BREAKDOWN</p>
                    {/* Stacked bar */}
                    <div className="flex gap-0.5 h-3 rounded-lg overflow-hidden">
                      {[
                        {count:p.eagles, color:'bg-yellow-400'},
                        {count:p.birdies, color:'bg-red-500'},
                        {count:p.pars, color:'bg-emerald-600'},
                        {count:p.bogeys, color:'bg-zinc-500'},
                        {count:p.doubles, color:'bg-zinc-700'},
                      ].map((seg, i) => seg.count > 0 && (
                        <div key={i} className={`${seg.color} h-full transition-all`} style={{flex: seg.count}}/>
                      ))}
                    </div>
                    {/* Clear labeled legend */}
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        {label:'Eagle', count:p.eagles, dotColor:'bg-yellow-400', textColor:'text-yellow-400', sub:'-2+'},
                        {label:'Birdie', count:p.birdies, dotColor:'bg-red-500', textColor:'text-red-400', sub:'-1'},
                        {label:'Par', count:p.pars, dotColor:'bg-emerald-600', textColor:'text-emerald-500', sub:'E'},
                        {label:'Bogey', count:p.bogeys, dotColor:'bg-zinc-500', textColor:'text-zinc-400', sub:'+1'},
                        {label:'Double+', count:p.doubles, dotColor:'bg-zinc-700', textColor:'text-zinc-600', sub:'+2+'},
                      ].map(item => (
                        <div key={item.label} className="bg-zinc-950 rounded-lg p-1.5 text-center">
                          <div className={`w-2 h-2 ${item.dotColor} rounded-full mx-auto mb-1`}/>
                          <div className={`font-black text-sm ${item.textColor}`}>{item.count}</div>
                          <div className="text-zinc-600 text-[8px] font-semibold leading-tight">{item.label}</div>
                          <div className="text-zinc-700 text-[8px]">{item.sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* % of total */}
                    <div className="text-zinc-700 text-[9px] font-medium normal-case">
                      {Math.round((p.birdies+p.eagles)/totalHoles*100)}% under par · {Math.round(p.pars/totalHoles*100)}% par · {Math.round((p.bogeys+p.doubles)/totalHoles*100)}% over par · {totalHoles} holes tracked
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </AnalyticsSection>}

      {/* ── ROUND RECORDS ── */}
      {activeSections.records!==false && <AnalyticsSection title="🏅 Round Records — All Time" icon={<Trophy size={15}/>} accent="yellow">
        <div className="p-4 space-y-4">

          {/* 18-hole records */}
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">🔥 LOWEST — 18 HOLES</p>
            <div className="space-y-2">
              {allTimeLowest.slice(0,5).map((r,i) => (
                <div key={`${r.name}-${r.score}-${i}`} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-2.5">
                  <span className={`text-sm ${i===0?'text-yellow-400':i===1?'text-zinc-300':i===2?'text-amber-600':'text-zinc-600'}`}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-sm text-white">{r.name}</span>
                    <span className="text-zinc-600 text-xs ml-2 font-medium normal-case">{r.course} · {r.date}</span>
                  </div>
                  <span className="text-emerald-400 font-black text-lg">{r.score}</span>
                </div>
              ))}
              {allTimeLowest.length === 0 && <p className="text-zinc-600 text-xs text-center py-2">No 18-hole rounds yet</p>}
            </div>
          </div>

          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">💀 HIGHEST — 18 HOLES</p>
            <div className="space-y-2">
              {allTimeHighest.slice(0,5).map((r,i) => (
                <div key={`${r.name}-${r.score}-h-${i}`} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-2.5">
                  <span className="text-zinc-600 text-sm">#{i+1}</span>
                  <div className="flex-1">
                    <span className="font-bold text-sm text-white">{r.name}</span>
                    <span className="text-zinc-600 text-xs ml-2 font-medium normal-case">{r.course} · {r.date}</span>
                  </div>
                  <span className="text-rose-400 font-black text-lg">{r.score}</span>
                </div>
              ))}
              {allTimeHighest.length === 0 && <p className="text-zinc-600 text-xs text-center py-2">No 18-hole rounds yet</p>}
            </div>
          </div>

          {/* 9-hole records — only show if any exist */}
          {allTimeLowest9.length > 0 && (
            <>
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">🔥 LOWEST — 9 HOLES</p>
                <div className="space-y-2">
                  {allTimeLowest9.map((r,i) => (
                    <div key={`9l-${i}`} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-2.5">
                      <span className={`text-sm ${i===0?'text-yellow-400':i===1?'text-zinc-300':i===2?'text-amber-600':'text-zinc-600'}`}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                      </span>
                      <div className="flex-1">
                        <span className="font-bold text-sm text-white">{r.name}</span>
                        <span className="text-zinc-600 text-xs ml-2 font-medium normal-case">{r.course} · {r.date}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-black text-lg">{r.score}</span>
                        <span className="text-zinc-600 text-[9px] ml-1">/ 9</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">💀 HIGHEST — 9 HOLES</p>
                <div className="space-y-2">
                  {allTimeHighest9.map((r,i) => (
                    <div key={`9h-${i}`} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-2.5">
                      <span className="text-zinc-600 text-sm">#{i+1}</span>
                      <div className="flex-1">
                        <span className="font-bold text-sm text-white">{r.name}</span>
                        <span className="text-zinc-600 text-xs ml-2 font-medium normal-case">{r.course} · {r.date}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-rose-400 font-black text-lg">{r.score}</span>
                        <span className="text-zinc-600 text-[9px] ml-1">/ 9</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Per-player best/worst — 18 hole only */}
          {Object.keys(lowestPerPlayer).length > 0 && (
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">PER PLAYER — BEST vs WORST (18 HOLES)</p>
              <div className="space-y-2">
                {Object.entries(lowestPerPlayer).sort((a,b)=>a[1].score-b[1].score).map(([name, best]) => {
                  const worst = highestPerPlayer[name]
                  return (
                    <div key={name} className="bg-zinc-900/60 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{name}</span>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <span className="text-emerald-400 font-black text-base">{best.score}</span>
                            <span className="text-zinc-600 text-[9px] ml-1">BEST</span>
                          </div>
                          <span className="text-zinc-700">·</span>
                          <div className="text-center">
                            <span className="text-rose-400 font-black text-base">{worst?.score || '—'}</span>
                            <span className="text-zinc-600 text-[9px] ml-1">WORST</span>
                          </div>
                          <div className="text-center">
                            <span className="text-zinc-400 font-black text-base">{worst && best ? worst.score - best.score : '—'}</span>
                            <span className="text-zinc-600 text-[9px] ml-1">RANGE</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        <div className="bg-emerald-500 rounded-full" style={{flex: 1}}/>
                        <div className="bg-zinc-700 rounded-full" style={{flex: worst && best ? (worst.score - best.score) : 1}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </AnalyticsSection>}

      {/* ── BETTING STATS ── */}
      {activeSections.betting!==false && <AnalyticsSection title="🎰 Betting Stats & Patterns" icon={<DollarSign size={15}/>} accent="yellow">
        <div className="p-4 space-y-4">

          {/* Overview numbers */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {label:'TOTAL MATCHES', val:bettingStats.totalMatchups, color:'text-white'},
              {label:'AVG/ROUND', val:bettingStats.avgMatchupsPerRound, color:'text-emerald-400'},
              {label:'AVG BET/ROUND', val:`$${bettingStats.avgBetPerRound}`, color:'text-yellow-400'},
            ].map(s => (
              <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                <div className={`font-black text-xl ${s.color}`}>{s.val}</div>
                <div className="text-zinc-600 text-[8px] font-semibold tracking-wide mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Format breakdown */}
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">MATCH FORMAT BREAKDOWN</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:'1v1 (PvP)', count:bettingStats.formatBreakdown.pvp, color:'bg-blue-500', textColor:'text-blue-400'},
                {label:'2v2 / TvT', count:bettingStats.formatBreakdown.tvt, color:'bg-purple-500', textColor:'text-purple-400'},
                {label:'Wheel', count:bettingStats.formatBreakdown.wheel, color:'bg-emerald-500', textColor:'text-emerald-400'},
                {label:'Nassau', count:bettingStats.formatBreakdown.nassau, color:'bg-amber-500', textColor:'text-amber-400'},
              ].map(f => {
                const pct = bettingStats.totalMatchups > 0 ? Math.round(f.count/bettingStats.totalMatchups*100) : 0
                return (
                  <div key={f.label} className="bg-zinc-900/60 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-zinc-400 text-xs font-semibold">{f.label}</span>
                      <span className={`font-black text-base ${f.textColor}`}>{f.count}</span>
                    </div>
                    <div className="bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`${f.color} h-full rounded-full`} style={{width:`${pct}%`}}/>
                    </div>
                    <span className="text-zinc-600 text-[9px] font-medium">{pct}% of all matches</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gross vs Net */}
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">NET vs GROSS GAMES</p>
            <div className="bg-zinc-900/60 rounded-xl p-4">
              <div className="flex gap-2 h-8 rounded-xl overflow-hidden mb-2">
                <div className="bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white rounded-l-xl" style={{flex:bettingStats.scoringBreakdown.net}}>
                  NET {bettingStats.scoringBreakdown.net}
                </div>
                <div className="bg-zinc-600 flex items-center justify-center text-[10px] font-black text-white rounded-r-xl" style={{flex:bettingStats.scoringBreakdown.gross||0.01}}>
                  {bettingStats.scoringBreakdown.gross > 0 ? `GROSS ${bettingStats.scoringBreakdown.gross}` : 'GROSS 0'}
                </div>
              </div>
              <p className="text-zinc-600 text-[10px] font-medium normal-case">
                {Math.round(bettingStats.scoringBreakdown.net/(bettingStats.totalMatchups||1)*100)}% of matches played net · {Math.round(bettingStats.scoringBreakdown.gross/(bettingStats.totalMatchups||1)*100)}% gross
              </p>
            </div>
          </div>

          {/* Auto-press */}
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">AUTO-PRESS USAGE</p>
            <div className="bg-zinc-900/60 rounded-xl p-4">
              <div className="flex gap-2 h-8 rounded-xl overflow-hidden mb-2">
                <div className="bg-yellow-500 flex items-center justify-center text-[10px] font-black text-black rounded-l-xl" style={{flex:bettingStats.pressBreakdown.auto}}>
                  ⚡ ON {bettingStats.pressBreakdown.auto}
                </div>
                <div className="bg-zinc-700 flex items-center justify-center text-[10px] font-black text-white rounded-r-xl" style={{flex:bettingStats.pressBreakdown.none||0.01}}>
                  OFF {bettingStats.pressBreakdown.none}
                </div>
              </div>
              <p className="text-zinc-600 text-[10px] font-medium normal-case">
                {Math.round(bettingStats.pressBreakdown.auto/(bettingStats.totalMatchups||1)*100)}% of matches use auto-press
              </p>
            </div>
          </div>

          {/* Average bet sizes */}
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">AVERAGE BET SIZES</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:'Nassau (per 9)', val:bettingStats.avgNassau, count:bettingStats.nassauCount, color:'text-amber-400'},
                {label:'Overall Bet', val:bettingStats.avgOverall, count:bettingStats.totalOverallBets, color:'text-purple-400'},
                {label:'Press Amount', val:bettingStats.avgPress, count:bettingStats.pressCount, color:'text-yellow-400'},
                {label:'Wheel (per pair)', val:bettingStats.avgWheel, count:bettingStats.wheelCount, color:'text-emerald-400'},
                {label:'Birdie Bonus', val:bettingStats.avgBirdie, count:0, color:'text-red-400'},
                {label:'Eagle Bonus', val:bettingStats.avgEagle, count:0, color:'text-yellow-300'},
              ].filter(b => b.val > 0).map(b => (
                <div key={b.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <div className={`font-black text-xl ${b.color}`}>${b.val}</div>
                  <div className="text-zinc-500 text-[10px] font-semibold">{b.label}</div>
                  {b.count > 0 && <div className="text-zinc-700 text-[9px] font-medium normal-case">{b.count} uses</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Overall bet popularity */}
          {bettingStats.totalOverallBets > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <p className="text-purple-400 text-[10px] font-semibold tracking-widest mb-1">💡 OVERALL BET INSIGHT</p>
              <p className="text-zinc-500 text-xs font-medium normal-case">
                The 18-hole overall bet has been used in <span className="text-purple-400 font-bold">{bettingStats.totalOverallBets}</span> of {bettingStats.totalMatchups} matches ({Math.round(bettingStats.totalOverallBets/bettingStats.totalMatchups*100)}%). Avg overall bet: <span className="text-purple-400 font-bold">${bettingStats.avgOverall}</span>
              </p>
            </div>
          )}

        </div>
      </AnalyticsSection>}


      {activeSections.skins!==false && <AnalyticsSection title="🦴 Skins Kings" icon={<Zap size={15}/>} accent="purple">
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
      </AnalyticsSection>}

      {/* ── HEAD TO HEAD ── */}
      {activeSections.h2h!==false && <AnalyticsSection title="🥊 Head to Head Records" icon={<Users size={15}/>} accent="orange">
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
      </AnalyticsSection>}

      {/* ── BEST PARTNERSHIPS ── */}
      {activeSections.partnerships!==false && <AnalyticsSection title="🤝 Best Partnerships" icon={<Users size={15}/>} accent="teal">
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
      </AnalyticsSection>}

      {/* ── HANDICAP ANALYSIS ── */}
      {activeSections.handicap!==false && <AnalyticsSection title="📐 Handicap Analysis" icon={<Hash size={15}/>} accent="blue">
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
      </AnalyticsSection>}

      {/* ── SANDBAG INDEX ── */}
      {activeSections.integrity!==false && <AnalyticsSection title="⚠️ Handicap Integrity Index" icon={<AlertTriangle size={15}/>} accent="rose">
        <div className="p-4 space-y-3">
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-3 mb-1">
            <p className="text-zinc-400 text-xs font-semibold mb-1">How to read this</p>
            <p className="text-zinc-600 text-[11px] font-medium normal-case leading-relaxed">
              Compares each player's average handicap vs how they actually score. A high positive number means they consistently play <span className="text-amber-400 font-bold">better</span> than their handicap — classic sandbagging. A negative means they play <span className="text-emerald-400 font-bold">worse</span> than their handicap (legitimate).
            </p>
          </div>
          {sandbagIndex.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
              <span className="text-zinc-600 text-[10px] font-black w-5">#{i+1}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-zinc-600 text-[10px] font-medium normal-case">HCP {p.avgHcp} · Avg gross {p.avgGross}</div>
              </div>
              <div className={`text-sm font-black px-2 py-1 rounded-lg ${p.sandbag > 3 ? 'bg-rose-500/20 text-rose-400' : p.sandbag > 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                {p.sandbag > 0 ? '+' : ''}{p.sandbag}
                {p.sandbag > 3 ? ' ⚠️' : ''}
              </div>
            </div>
          ))}
        </div>
      </AnalyticsSection>}

      {/* ── CONSISTENCY ── */}
      {activeSections.consistency!==false && <AnalyticsSection title="🎯 Consistency Index" icon={<Activity size={15}/>} accent="emerald">
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
      </AnalyticsSection>}

      {/* ── SCORING TRENDS ── */}
      {activeSections.trends!==false && <AnalyticsSection title="📈 Score Trends (Last 8 Rounds)" icon={<BarChart3 size={15}/>} accent="blue">
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
      </AnalyticsSection>}

    </div>
  )
}




export default function AnalyticsPage() {
  const [history, setHistory] = useState<any[]>([])
  const [filterType, setFilterType] = useState<'all'|'match'|'tournament'|'nine'>('all')
  const [selectedTrip, setSelectedTrip] = useState<string>('all')
  const { role, loading } = useAuth()
  const defaultSections = {money_board:true,match_records:true,scoring_avgs:true,skins:true,h2h:true,partnerships:true,handicap:true,integrity:true,consistency:true,trends:true,records:true,betting:true}
  const [scorerAccess, setScorerAccess] = useState(true)
  const [playerAccess, setPlayerAccess] = useState(false)
  const [scorerSections, setScorerSections] = useState<Record<string,boolean>>(defaultSections)
  const [playerSections, setPlayerSections] = useState<Record<string,boolean>>(defaultSections)
  const [flagsLoaded, setFlagsLoaded] = useState(false)

  useEffect(() => {
    onValue(ref(db,'analyticsFlags'), snap => {
      const d = snap.val() || {}
      if (d.scorer_access !== undefined) setScorerAccess(!!d.scorer_access)
      if (d.player_access !== undefined) setPlayerAccess(!!d.player_access)
      if (d.scorer_sections) setScorerSections((prev:any) => ({...prev,...d.scorer_sections}))
      if (d.player_sections) setPlayerSections((prev:any) => ({...prev,...d.player_sections}))
      setFlagsLoaded(true)
    })
    setTimeout(() => setFlagsLoaded(true), 2000)
  }, [])

  // Access control - players use sessionStorage role 'player', not Firebase Auth
  const sessionRole = typeof window !== 'undefined' ? sessionStorage.getItem('role') : null
  const authed = role === 'master' ||
    (role === 'scorer' && scorerAccess) ||
    (sessionRole === 'player' && playerAccess) ||
    (role === null && playerAccess)

  // Which sections to show based on role
  const activeSections = role === 'master' ? defaultSections :
    role === 'scorer' ? scorerSections : playerSections


  useEffect(() => {
    if (!authed) return
    onValue(ref(db, 'history'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val())
          .map(([k,v]:any) => ({ id:k, ...v }))
          .sort((a:any,b:any) => Number(b.id) - Number(a.id))
        setHistory(items)
      } else setHistory([])
    })
  }, [authed])

  // Wait for both auth AND flags before deciding access
  const authAndFlagsReady = !loading && flagsLoaded

  if (!authAndFlagsReady) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading...</div>
    </div>
  )

  if (authAndFlagsReady && !authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Shield size={32} className="text-zinc-700 mx-auto mb-4"/>
          <p className="text-zinc-600 font-semibold text-sm">Access restricted</p>
          <p className="text-zinc-700 text-xs font-medium normal-case mt-1">Analytics is not enabled for your role</p>
          <Link href="/" className="text-emerald-400 text-xs font-semibold mt-4 block hover:text-emerald-300">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }


  // Every distinct trip found in history, newest first
  const tripOptions = (() => {
    const m: Record<string, any> = {}
    history.forEach((a: any) => {
      const t = a._meta?.tripName
      if (!t || a._meta?.mode === 'match') return
      const when = Number(a._meta?.playedAt || a.id)
      if (!m[t]) m[t] = { name: t, count: 0, min: when, max: when, complete: false }
      m[t].count++
      m[t].min = Math.min(m[t].min, when)
      m[t].max = Math.max(m[t].max, when)
      if (a._meta?.isFinal) m[t].complete = true
    })
    return Object.values(m).sort((a: any, b: any) => b.max - a.max)
  })()

  const filteredHistory = history.filter(arch => {
    // Trip scope first — 'all' keeps everything, otherwise match the trip name exactly
    if (selectedTrip !== 'all' && (arch._meta?.tripName || '') !== selectedTrip) return false
    if (filterType === 'all') return true
    if (filterType === 'match') return arch._meta?.mode === 'match'
    if (filterType === 'tournament') return arch._meta?.mode !== 'match' && !!arch._meta?.tripName
    if (filterType === 'nine') return !!arch.course?.nineHole
    return true
  })

  // Human-readable description of exactly what is being analyzed
  const scope = (() => {
    const n = filteredHistory.length
    if (!n) return { rounds: 0, label: 'NO ROUNDS MATCH THIS FILTER', detail: '' }
    const times = filteredHistory.map((a: any) => Number(a._meta?.playedAt || a.id))
    const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const trips = Array.from(new Set(filteredHistory.map((a: any) => a._meta?.tripName).filter(Boolean)))
    const matches = filteredHistory.filter((a: any) => a._meta?.mode === 'match').length
    const untagged = filteredHistory.filter((a: any) => !a._meta?.tripName && a._meta?.mode !== 'match').length
    const bits: string[] = []
    if (trips.length === 1) bits.push(String(trips[0]))
    else if (trips.length > 1) bits.push(`${trips.length} tournaments`)
    if (matches) bits.push(`${matches} quick match${matches > 1 ? 'es' : ''}`)
    if (untagged) bits.push(`${untagged} untagged round${untagged > 1 ? 's' : ''}`)
    return {
      rounds: n,
      label: bits.join(' · ').toUpperCase() || 'ALL ARCHIVED ROUNDS',
      detail: `${fmt(Math.min(...times))} – ${fmt(Math.max(...times))}`,
      untagged,
    }
  })()

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BarChart3 size={18} className="text-emerald-400"/>
          <div>
            <h1 className="font-black text-sm text-white tracking-tight">ANALYTICS</h1>
            <p className="text-zinc-600 text-[10px] font-medium">{filteredHistory.length} of {history.length} rounds</p>
          </div>
        </div>
        <Link href="/"
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors">
          <ArrowLeft size={14}/> Home
        </Link>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-zinc-900 bg-zinc-950 sticky top-[57px] z-20">
        {([
          { key: 'all', label: '⚡ All' },
          { key: 'match', label: '🏌️ Quick Matches' },
          { key: 'tournament', label: '🏆 Tournaments' },
          { key: 'nine', label: '🔟 9-Hole' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterType === f.key
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tournament picker */}
      {tripOptions.length > 0 && (
        <div className="px-4 pt-3">
          <label className="text-[9px] font-black text-zinc-600 tracking-widest block mb-1.5">TOURNAMENT</label>
          <select
            value={selectedTrip}
            onChange={e => setSelectedTrip(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white font-black text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
          >
            <option value="all">All tournaments &amp; matches ({history.length} rounds)</option>
            {tripOptions.map((t: any) => (
              <option key={t.name} value={t.name}>
                {t.name} — {t.count} day{t.count > 1 ? 's' : ''}{t.complete ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scope banner — always says exactly what is being analyzed */}
      <div className="px-4 pt-3">
        <div className={`rounded-xl border px-4 py-3 ${scope.rounds ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/10'}`}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className={`text-[11px] font-black tracking-wider ${scope.rounds ? 'text-emerald-400' : 'text-amber-400'}`}>
              ANALYZING {scope.rounds} ROUND{scope.rounds === 1 ? '' : 'S'}
            </p>
            {scope.detail && <p className="text-[10px] font-black text-zinc-500">{scope.detail}</p>}
          </div>
          <p className="text-[10px] font-black text-zinc-400 mt-0.5 leading-snug">{scope.label}</p>
          {selectedTrip === 'all' && (scope as any).untagged > 0 && (
            <p className="text-[9px] font-black text-amber-500/80 mt-1.5">
              INCLUDES {(scope as any).untagged} UNTAGGED ROUND{(scope as any).untagged > 1 ? 'S' : ''} NOT LINKED TO ANY TOURNAMENT
            </p>
          )}
        </div>
      </div>

      <AnalyticsDashboard history={filteredHistory} activeSections={activeSections}/>
    </div>
  )
}