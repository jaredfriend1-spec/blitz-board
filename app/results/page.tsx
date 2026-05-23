"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Trophy, Award, ArrowLeft, LayoutGrid, Medal, Users } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
    onValue(ref(db, 'tournament/money'), snap => snap.val() && setMoney(snap.val()))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  const getIndividualResults = () => {
    const activePlayerIds = new Set<string>()
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)))

    // No teams = all players are active
    const activePlayers = teams.length > 0
      ? players.filter(p => activePlayerIds.has(p.id))
      : players
    const activeFieldSize = activePlayers.length

    const nineHoleLocal = !!course.nineHole
    const offsetLocal = nineHoleLocal && course.nineHoleStart === 'back' ? 9 : 0
    const list = activePlayers.map(p => {
      const s = scores[p.id] || Array(18).fill(0)
      const f9 = nineHoleLocal
        ? s.slice(offsetLocal, offsetLocal + 9).reduce((a, b) => a + (Number(b) || 0), 0)
        : s.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0)
      const b9 = nineHoleLocal ? 0 : s.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0)
      return { ...p, f9, b9, hasPlayed: s.some(val => val > 0) }
    }).filter(p => p.hasPlayed)

    const f9Winners = [...list].sort((a, b) => a.f9 - b.f9).slice(0, 3)
    const b9Winners = [...list].sort((a, b) => a.b9 - b.b9).slice(0, 3)

    const nineHole = !!course.nineHole
    const holeOffset = nineHole && course.nineHoleStart === 'back' ? 9 : 0
    const numHoles = nineHole ? 9 : 18
    const skinsMap = Array(numHoles).fill(null)
    const skinsCount: Record<string, number> = {}
    let totalSkinsWon = 0

    for (let h = 0; h < numHoles; h++) {
      const hIdx = holeOffset + h
      const holeScores = activePlayers
        .map(p => ({ id: p.id, name: p.name, s: (scores[p.id] || [])[hIdx] || 0 }))
        .filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s))
        const winners = holeScores.filter(x => x.s === min)
        if (winners.length === 1) {
          skinsMap[h] = winners[0]
          skinsCount[winners[0].id] = (skinsCount[winners[0].id] || 0) + 1
          totalSkinsWon++
        }
      }
    }

    const totalSkinsPot = activeFieldSize * (money.skinsAllocation || 0)
    const perSkin = totalSkinsWon > 0 ? totalSkinsPot / totalSkinsWon : 0
    const sortedSkins = Object.entries(skinsCount).sort((a, b) => b[1] - a[1])
    const mostSkinsPlayerId = sortedSkins.length > 0 ? sortedSkins[0][0] : null
    const adjustment = 0

    return { f9Winners, b9Winners, skinsMap, skinsCount, mostSkinsPlayerId, totalSkinsPot, totalSkinsWon, perSkin, adjustment }
  }

  const getTeamResults = () => {
    const activePlayerIds = new Set<string>()
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)))
    const totalTeamPot = activePlayerIds.size * ((money.entryFee || 0) - (money.skinsAllocation || 0))
    const sidePot = totalTeamPot / 2

    const teamScores = teams.map(t => {
      const pIds = t.playerIds || []
      const holeAggregates = Array(18).fill(0).map((_, i) => {
        const par = course.pars[i] || 4
        const pScores = pIds.map((id: string) => scores[id]?.[i] || 0).filter((s: number) => s > 0).sort((a: number, b: number) => a - b)
        if (pScores.length === 0) return 0
        return pScores.slice(0, par === 3 ? 3 : 2).reduce((a: number, b: number) => a + b, 0)
      })
      return {
        id: t.id,
        name: t.name,
        f9: holeAggregates.slice(0, 9).reduce((a, b) => a + b, 0),
        b9: holeAggregates.slice(9, 18).reduce((a, b) => a + b, 0)
      }
    })

    const calcPayouts = (pot: number, teamsArr: any[], half: 'f9' | 'b9') => {
      const valid = teamsArr.filter(t => t[half] > 0).sort((a, b) => a[half] - b[half])
      if (valid.length === 0) return []
      const scoreGroups: any = {}
      valid.forEach(t => { if (!scoreGroups[t[half]]) scoreGroups[t[half]] = []; scoreGroups[t[half]].push(t) })
      const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => a - b)
      const results = valid.map(t => ({ ...t, payout: 0, rank: 0 }))
      if (sortedScores.length > 0) {
        const firstGroup = scoreGroups[sortedScores[0]]
        if (firstGroup.length === 1) {
          results.find(t => t.id === firstGroup[0].id)!.payout = pot * 0.60
          results.find(t => t.id === firstGroup[0].id)!.rank = 1
          if (sortedScores.length > 1) {
            const secondGroup = scoreGroups[sortedScores[1]]
            const secondEach = (pot * 0.40) / secondGroup.length
            secondGroup.forEach((t: any) => {
              const r = results.find(x => x.id === t.id)
              if (r) { r.payout = secondEach; r.rank = 2 }
            })
          }
        } else {
          const split = pot / firstGroup.length
          firstGroup.forEach((t: any) => {
            const r = results.find(x => x.id === t.id)
            if (r) { r.payout = split; r.rank = 1 }
          })
        }
      }
      return results
    }

    return {
      totalTeamPot,
      sidePot,
      f9Results: calcPayouts(sidePot, teamScores, 'f9'),
      b9Results: calcPayouts(sidePot, teamScores, 'b9')
    }
  }

  const nineHoleDisplay = !!course.nineHole
  const holeOffset = nineHoleDisplay && course.nineHoleStart === 'back' ? 9 : 0
  const ind = getIndividualResults()
  const tm = getTeamResults()

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        <Link href="/" className="text-emerald-500 font-semibold mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors text-sm">
          <ArrowLeft size={16}/> Home
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        </div>

        {/* Tab switcher — only show Team tab if teams exist */}
        <div className="flex bg-zinc-900 rounded-2xl p-1.5 mb-8 border border-zinc-800 gap-1">
          <button
            onClick={() => setActiveTab('INDIVIDUAL')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'INDIVIDUAL' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Individual
          </button>
          {teams.length > 0 && (
          <button
            onClick={() => setActiveTab('TEAM')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'TEAM' ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Team
          </button>
          )}
        </div>

        {/* ── INDIVIDUAL TAB ── */}
        {activeTab === 'INDIVIDUAL' && (
          <div className="space-y-8">

            {/* Front 9 / Back 9 low */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: nineHoleDisplay ? `${course.nineHoleStart === 'back' ? 'Back' : 'Front'} 9 Low` : 'Front 9 Low', icon: <Medal size={16}/>, winners: ind.f9Winners, key: 'f9' },
                ...(!nineHoleDisplay ? [{ title: 'Back 9 Low', icon: <Award size={16}/>, winners: ind.b9Winners, key: 'b9' }] : []),
              ].map(section => (
                <div key={section.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="bg-emerald-600/20 border-b border-zinc-800 px-5 py-3 flex items-center gap-2">
                    <span className="text-emerald-400">{section.icon}</span>
                    <span className="font-semibold text-sm text-emerald-400">{section.title}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {section.winners.map((w, i) => (
                      <div key={i} className="flex justify-between items-center bg-black rounded-xl px-4 py-3 border border-zinc-800">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : 'text-amber-700'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                          </span>
                          <span className="font-semibold text-sm">{w.name}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">{(w as any)[section.key]}</span>
                      </div>
                    ))}
                    {section.winners.length === 0 && (
                      <p className="text-zinc-600 text-sm text-center py-4">No scores yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Skins map */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} className="text-emerald-400"/>
                  <span className="font-semibold text-sm">Skins</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 text-xs">{ind.totalSkinsWon} won · ${Number.isInteger(ind.perSkin) ? ind.perSkin : ind.perSkin.toFixed(2)}/skin · Pot ${ind.totalSkinsPot}</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ind.skinsMap.map((winner, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex flex-col items-center justify-center min-h-[72px] ${
                    winner ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800 bg-black/30'
                  }`}>
                    <span className="text-[10px] text-zinc-600 font-medium mb-1">Hole {holeOffset + i + 1}</span>
                    <span className={`text-[10px] font-semibold text-center leading-tight ${winner ? 'text-emerald-400' : 'text-zinc-700'}`}>
                      {winner ? winner.name : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout table */}
            {Object.keys(ind.skinsCount).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400"/>
                  <span className="font-semibold text-sm">Skins Payouts</span>
                </div>
                {ind.adjustment !== 0 && ind.mostSkinsPlayerId && (
                  <div className="px-5 py-2 bg-amber-500/10 border-b border-zinc-800 text-amber-400 text-xs font-medium">
                    ${Math.abs(ind.adjustment)} rounding adjustment to {players.find(p => p.id === ind.mostSkinsPlayerId)?.name} (most skins)
                  </div>
                )}
                <div className="divide-y divide-zinc-800">
                  {players.filter(p => ind.skinsCount[p.id] > 0).map(p => {
                    const final = ind.skinsCount[p.id] * ind.perSkin
                    return (
                      <div key={p.id} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Trophy size={14} className="text-amber-400"/>
                          <span className="font-semibold text-sm">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-500 text-xs">{ind.skinsCount[p.id]} skin{ind.skinsCount[p.id] > 1 ? 's' : ''}</span>
                          <span className="text-emerald-400 font-bold">${final}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === 'TEAM' && (
          <div className="space-y-6">

            {/* Total pot */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-400"/>
                <span className="font-semibold text-sm text-zinc-400">Total Team Pot</span>
              </div>
              <span className="text-3xl font-bold text-blue-400">${tm.totalTeamPot}</span>
            </div>

            {/* Front 9 / Back 9 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Front 9', res: tm.f9Results, pot: tm.sidePot, key: 'f9' },
                { title: 'Back 9', res: tm.b9Results, pot: tm.sidePot, key: 'b9' },
              ].map(half => (
                <div key={half.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="bg-blue-600/20 border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
                    <span className="font-semibold text-sm text-blue-400">{half.title}</span>
                    <span className="text-zinc-500 text-xs">Side pot ${half.pot}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {half.res.map((t: any) => (
                      <div key={t.id} className={`flex justify-between items-center px-4 py-3 rounded-xl border ${
                        t.payout > 0 ? 'border-blue-500/40 bg-blue-500/5' : 'border-zinc-800 bg-black/30'
                      }`}>
                        <div className="flex items-center gap-3">
                          {t.rank === 1 && <Trophy size={14} className="text-yellow-400 flex-shrink-0"/>}
                          {t.rank === 2 && <Award size={14} className="text-zinc-400 flex-shrink-0"/>}
                          {t.rank > 2 && <span className="w-3.5"/>}
                          <span className="font-semibold text-sm">{t.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-zinc-300">{(t as any)[half.key]}</div>
                          {t.payout > 0 && (
                            <div className="text-blue-400 font-semibold text-xs">${t.payout.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {half.res.length === 0 && (
                      <p className="text-zinc-600 text-sm text-center py-4">No scores yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}