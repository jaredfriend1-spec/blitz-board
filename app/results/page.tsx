"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { golfers, tournamentSettings } from '@/lib/data'
import { Trophy, Award, ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [money, setMoney] = useState({ pointValue: 10 })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), (snap) => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/money'), (snap) => snap.val() && setMoney(snap.val()))
  }, [])

  const getSkins = (res: any[]) => {
    const skins: Record<string, number> = {}
    for (let h = 0; h < 18; h++) {
      const holeScores = res.map(r => ({ id: r.id, s: (scores[r.id] || [])[h] || 0 })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s))
        const winners = holeScores.filter(x => x.s === min)
        if (winners.length === 1) skins[winners[0].id] = (skins[winners[0].id] || 0) + 1
      }
    }
    return skins
  }

  const getLeaders = () => {
    const list = golfers.map(p => {
      const s = scores[p.id] || Array(18).fill(0)
      const f9 = s.slice(0, 9).reduce((a,b) => a + (Number(b) || 0), 0)
      const b9 = s.slice(9, 18).reduce((a,b) => a + (Number(b) || 0), 0)
      return { ...p, f9, b9 }
    })
    return {
      f9: [...list].sort((a,b) => (a.f9 || 999) - (b.f9 || 999)),
      b9: [...list].sort((a,b) => (a.b9 || 999) - (b.b9 || 999)),
      skins: getSkins(list)
    }
  }

  const { f9, b9, skins } = getLeaders();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={20} className="inline mr-2"/> HUB</Link>
      <div className="bg-emerald-500 text-black text-center p-6 rounded-t-[3rem] border-4 border-black mb-12 shadow-2xl">
        <h1 className="text-3xl font-black tracking-tighter uppercase">{tournamentSettings.name} — DASHBOARD</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <section className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 p-8 shadow-2xl">
          <h2 className="text-blue-500 font-black text-3xl mb-8 border-b-2 border-zinc-800 pb-4">FRONT 9</h2>
          <div className="space-y-4">
            {f9.slice(0, 4).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  {i === 0 && <Trophy className="text-yellow-500" />}
                  {i === 1 && <Award className="text-zinc-400" />}
                  <span className="font-black text-xl">{p.name}</span>
                </div>
                <span className="text-3xl font-black text-emerald-400">{p.f9 || '--'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 p-8 shadow-2xl">
          <h2 className="text-amber-500 font-black text-3xl mb-8 border-b-2 border-zinc-800 pb-4">BACK 9</h2>
          <div className="space-y-4">
            {b9.slice(0, 4).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  {i === 0 && <Trophy className="text-yellow-500" />}
                  {i === 1 && <Award className="text-zinc-400" />}
                  <span className="font-black text-xl">{p.name}</span>
                </div>
                <span className="text-3xl font-black text-amber-500">{p.b9 || '--'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-orange-100 rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl">
          <div className="bg-orange-500 p-6 font-black text-center text-white text-2xl border-b-4 border-black flex items-center justify-center gap-3">
            <TrendingUp /> SKINS WINNINGS
          </div>
          <table className="w-full text-black font-black text-xs">
            <thead><tr className="bg-orange-200 border-b-2 border-black">
              <th className="p-5 text-left">PLAYER</th><th className="p-5">SKINS</th><th className="p-5 text-right">TOTAL</th>
            </tr></thead>
            <tbody>{golfers.map(p => (
              <tr key={p.id} className="border-b border-orange-200">
                <td className="p-5">{p.name}</td><td className="p-5 text-center text-lg">{skins[p.id] || 0}</td>
                <td className="p-5 text-right text-emerald-700 text-lg">${(skins[p.id] || 0) * money.pointValue}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </div>
  )
}