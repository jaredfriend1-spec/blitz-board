"use client"

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { golfers, BLITZ_TEAMS } from '@/lib/data'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [course, setCourse] = useState({ name: "Rolling Road", pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), (snap) => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/course'), (snap) => snap.val() && setCourse(snap.val()))
  }, [])

  const calc = (pScores: number[]) => {
    const f9 = pScores.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0)
    const b9 = pScores.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0)
    return { f9, b9, tot: f9 + b9 }
  }

  const getStyle = (s: number, p: number) => {
    if (!s) return "bg-zinc-900 text-zinc-600 border-zinc-800"
    if (s < p) return "bg-red-600 text-white rounded-full border-2 border-white"
    if (s > p) return "bg-zinc-700 text-zinc-400 border border-zinc-500"
    return "bg-zinc-800 text-emerald-400 font-bold border-zinc-700"
  }

  const handleSave = () => {
    set(ref(db, 'tournament/scores'), scores)
      .then(() => alert("✅ BLITZ BOARD SYNCED"))
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 pb-32 font-sans uppercase">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 p-4">
        <Link href="/" className="text-emerald-500 font-black italic flex items-center gap-2">
          <ArrowLeft size={20} /> HUB
        </Link>
        <h1 className="text-2xl font-black italic text-emerald-400">Blitz Scorer</h1>
      </div>

      <div className="max-w-5xl mx-auto space-y-10">
        {BLITZ_TEAMS.map((team) => (
          <div key={team.id} className="border-2 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between">
              <h2 className="text-xl font-black italic text-emerald-500">{team.name}</h2>
              <span className="text-zinc-500 text-xs font-bold">{course.name}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-zinc-950 text-[10px] text-zinc-600">
                  <tr>
                    <th className="p-4 text-left sticky left-0 bg-zinc-950 border-r border-zinc-900">PLAYER</th>
                    {Array.from({ length: 18 }).map((_, i) => <th key={i} className="p-2">H{i+1}</th>)}
                    <th className="p-2 bg-emerald-950 text-emerald-400">TOT</th>
                  </tr>
                </thead>
                <tbody>
                  {team.playerIds.map((pid) => {
                    const p = golfers.find(g => g.id === pid)
                    const pScores = scores[pid] || Array(18).fill(0)
                    const stats = calc(pScores)
                    return (
                      <tr key={pid} className="border-t border-zinc-900">
                        <td className="p-4 text-left font-black text-xs sticky left-0 bg-black border-r border-zinc-900">
                          {p?.name}
                          <div className="text-[8px] text-zinc-600 flex gap-2"><span>F9: {stats.f9}</span><span>B9: {stats.b9}</span></div>
                        </td>
                        {pScores.map((s, i) => (
                          <td key={i} className="p-1">
                            <input 
                              type="number" 
                              value={s || ""}
                              onChange={e => {
                                const ns = [...pScores]; ns[i] = parseInt(e.target.value) || 0;
                                setScores({...scores, [pid]: ns})
                              }}
                              className={`w-8 h-8 text-center text-xs font-black outline-none border transition-all ${getStyle(s, course.pars[i])}`}
                            />
                          </td>
                        ))}
                        <td className="font-black text-emerald-500 text-lg">{stats.tot}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSave} className="fixed bottom-8 left-4 right-4 bg-emerald-500 text-black py-5 rounded-full font-black italic text-xl shadow-2xl flex items-center justify-center gap-3">
        <Save /> Sync Blitz Board
      </button>
    </div>
  )
}