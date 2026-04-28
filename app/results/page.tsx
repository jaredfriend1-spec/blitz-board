"use client"

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { golfers, tournamentSettings } from '@/lib/data'
import { Trophy, ArrowLeft, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [stakes, setStakes] = useState({ pointValue: 10 })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), (snap) => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/money'), (snap) => snap.val() && setStakes(snap.val()))
  }, [])

  const calculateResults = () => {
    const results = golfers.map(p => {
      const pScores = scores[p.id] || Array(18).fill(0)
      const f9 = pScores.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0)
      const b9 = pScores.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0)
      return { ...p, f9, b9, tot: f9 + b9, pScores }
    })

    // NO CARRY OVER LOGIC
    const skinsCount: Record<string, number> = {}
    for (let h = 0; h < 18; h++) {
      const holeScores = results.map(r => ({ id: r.id, s: r.pScores[h] })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const minScore = Math.min(...holeScores.map(h => h.s))
        const winners = holeScores.filter(h => h.s === minScore)
        // Only award 1 skin if there is an outright winner
        if (winners.length === 1) {
          const winnerId = winners[0].id
          skinsCount[winnerId] = (skinsCount[winnerId] || 0) + 1
        }
      }
    }

    return {
      f9List: [...results].sort((a, b) => (a.f9 || 999) - (b.f9 || 999)),
      b9List: [...results].sort((a, b) => (a.b9 || 999) - (b.b9 || 999)),
      skinsCount
    }
  }

  const { f9List, b9List, skinsCount } = calculateResults()

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans uppercase">
      <div className="max-w-7xl mx-auto">
        <Link href="/" className="text-emerald-500 font-black italic mb-6 inline-block"><ArrowLeft size={20} className="inline mr-2"/> HUB</Link>
        <div className="bg-emerald-500 text-black text-center p-4 rounded-t-3xl border-4 border-black mb-8 shadow-2xl">
          <h1 className="text-2xl font-black italic uppercase">Blitz Board: Bets & Skins</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-800 p-6">
            <h2 className="bg-blue-500 text-white p-3 font-black text-center mb-6 border-2 border-black">Front 9</h2>
            <div className="space-y-2">
              {f9List.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
                  <span className="font-black italic">{p.name}</span><span className="text-emerald-400 font-black">{p.f9 || '--'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-800 p-6">
            <h2 className="bg-amber-500 text-black p-3 font-black text-center mb-6 border-2 border-black">Back 9</h2>
            <div className="space-y-2">
              {b9List.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
                  <span className="font-black italic">{p.name}</span><span className="text-amber-400 font-black">{p.b9 || '--'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-orange-100 rounded-[2.5rem] border-4 border-black overflow-hidden">
            <div className="bg-orange-500 p-4 font-black text-center text-white italic border-b-4 border-black text-xl flex items-center justify-center gap-2">
              <DollarSign /> Skins Winnings
            </div>
            <table className="w-full text-black">
              <thead className="bg-orange-200 border-b-2 border-black text-[10px] font-black uppercase">
                <tr><th className="p-4 text-left">Player</th><th className="p-4 text-center">Skins</th><th className="p-4 text-right">Total</th></tr>
              </thead>
              <tbody className="font-black italic">
                {golfers.map(p => (
                  <tr key={p.id} className="border-b border-orange-200">
                    <td className="p-4 text-xs">{p.name}</td>
                    <td className="p-4 text-center">{skinsCount[p.id] || 0}</td>
                    <td className="p-4 text-right text-emerald-700">${(skinsCount[p.id] || 0) * stakes.pointValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}