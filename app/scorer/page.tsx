"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { golfers, BLITZ_TEAMS } from '@/lib/data'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [course, setCourse] = useState({ pars: Array(18).fill(4) })

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
    if (!s) return "bg-zinc-900 text-zinc-700 border-zinc-800"
    const d = s - p
    if (d <= -3) return "bg-emerald-500 text-black rounded-full border-4 border-white font-black" // Shaded Circle
    if (d === -2) return "bg-zinc-900 text-white rounded-full border-[5px] border-emerald-500" // Double Circle
    if (d === -1) return "bg-zinc-900 text-white rounded-full border-2 border-emerald-500" // Circle
    if (d === 0) return "bg-zinc-800 text-emerald-400 font-bold border-zinc-700" // Par
    if (d === 1) return "bg-zinc-900 text-white border-2 border-zinc-500" // Square
    if (d === 2) return "bg-zinc-900 text-white border-[5px] border-zinc-600" // Double Square
    if (d >= 3) return "bg-zinc-600 text-black border-4 border-black font-black" // Shaded Square
    return "bg-zinc-700"
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-6 pb-32 font-sans uppercase">
      <Link href="/" className="text-emerald-500 font-black italic mb-6 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      <div className="max-w-6xl mx-auto space-y-10">
        {BLITZ_TEAMS.map((team) => (
          <div key={team.id} className="border-2 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 text-emerald-500 font-black italic">{team.name}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-black text-[10px] text-zinc-600">
                  <tr>
                    <th className="p-4 text-left sticky left-0 bg-black border-r border-zinc-900">PLAYER</th>
                    {Array.from({ length: 9 }).map((_, i) => <th key={i} className="p-2 w-10">H{i+1}</th>)}
                    <th className="bg-zinc-800 text-blue-400">OUT</th>
                    {Array.from({ length: 9 }).map((_, i) => <th key={i+9} className="p-2 w-10">H{i+10}</th>)}
                    <th className="bg-zinc-800 text-blue-400">IN</th>
                    <th className="bg-emerald-950 text-emerald-400">TOT</th>
                  </tr>
                </thead>
                <tbody>
                  {team.playerIds.map((pid) => {
                    const p = golfers.find(g => g.id === pid)
                    const pScores = scores[pid] || Array(18).fill(0)
                    const s = calc(pScores)
                    return (
                      <tr key={pid} className="border-t border-zinc-900">
                        <td className="p-4 text-left font-black text-xs sticky left-0 bg-black border-r border-zinc-900">{p?.name}</td>
                        {pScores.slice(0, 9).map((sc, i) => (
                          <td key={i} className="p-1"><input type="number" value={sc || ""} onChange={e => {
                            const ns = [...pScores]; ns[i] = parseInt(e.target.value) || 0;
                            setScores({...scores, [pid]: ns})
                          }} className={`w-8 h-8 text-center text-xs font-black outline-none border ${getStyle(sc, course.pars[i])}`} /></td>
                        ))}
                        <td className="bg-zinc-900/50 font-black text-blue-400">{s.f9}</td>
                        {pScores.slice(9, 18).map((sc, i) => (
                          <td key={i+9} className="p-1"><input type="number" value={sc || ""} onChange={e => {
                            const ns = [...pScores]; ns[i+9] = parseInt(e.target.value) || 0;
                            setScores({...scores, [pid]: ns})
                          }} className={`w-8 h-8 text-center text-xs font-black outline-none border ${getStyle(sc, course.pars[i+9])}`} /></td>
                        ))}
                        <td className="bg-zinc-900/50 font-black text-blue-400">{s.b9}</td>
                        <td className="font-black text-emerald-500 bg-zinc-900 text-lg">{s.tot}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => set(ref(db, 'tournament/scores'), scores).then(() => alert("✅ SYNCED"))} className="fixed bottom-8 left-4 right-4 bg-emerald-500 text-black py-5 rounded-full font-black italic text-xl shadow-2xl flex items-center justify-center gap-3"><Save /> SYNC BLITZ BOARD</button>
    </div>
  )
}