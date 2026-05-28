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
      <AnalyticsSection title="💰 Money Leaderboard" icon={<DollarSign size={15}/>} accent="yellow" defaultOpen={false}>
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
      </AnalyticsSection>

      {/* ── ROUND RECORDS ── */}
      <AnalyticsSection title="🏅 Round Records — All Time" icon={<Trophy size={15}/>} accent="yellow">
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
      </AnalyticsSection>

      {/* ── BETTING STATS ── */}
      <AnalyticsSection title="🎰 Betting Stats & Patterns" icon={<DollarSign size={15}/>} accent="yellow">
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
      </AnalyticsSection>


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
      <AnalyticsSection title="⚠️ Handicap Integrity Index" icon={<AlertTriangle size={15}/>} accent="rose">
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




export default function AnalyticsPage() {
  const [history, setHistory] = useState<any[]>([])
  const { role, loading } = useAuth()
  const authed = role === 'master' || role === 'scorer'

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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading...</div>
    </div>
  )

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Shield size={32} className="text-zinc-700 mx-auto mb-4"/>
          <p className="text-zinc-600 font-semibold text-sm">Master Admin only</p>
          <Link href="/" className="text-emerald-400 text-xs font-semibold mt-4 block hover:text-emerald-300">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BarChart3 size={18} className="text-emerald-400"/>
          <div>
            <h1 className="font-black text-sm text-white tracking-tight">ANALYTICS</h1>
            <p className="text-zinc-600 text-[10px] font-medium">{history.length} rounds · Master Admin only</p>
          </div>
        </div>
        <Link href="/master"
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors">
          <ArrowLeft size={14}/> Dashboard
        </Link>
      </div>

      <AnalyticsDashboard history={history}/>
    </div>
  )
}