"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { Save, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [course, setCourse] = useState({ pars: Array(18).fill(4) })
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const calc = (pScores: number[]) => {
    const f9 = pScores.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0)
    const b9 = pScores.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0)
    return { f9, b9, tot: f9 + b9 }
  }

  const getStyle = (s: number, p: number) => {
    if (!s) return "bg-zinc-900 text-zinc-700 border-zinc-800"
    const d = s - p
    if (d <= -2) return "bg-zinc-900 text-white rounded-full border-[4px] border-emerald-500" 
    if (d === -1) return "bg-zinc-900 text-white rounded-full border-2 border-emerald-500" 
    if (d === 0) return "bg-zinc-800 text-emerald-400 font-black border-zinc-700" 
    if (d === 1) return "bg-zinc-900 text-white border-2 border-zinc-500" 
    if (d >= 2) return "bg-zinc-900 text-white border-[4px] border-zinc-600" 
    return "bg-zinc-700"
  }

  if (teams.length === 0) return (
    <div className="min-h-screen bg-black text-white p-8 text-center pt-32 font-sans uppercase italic"><h1 className="text-4xl font-black text-rose-500 mb-6">NO TEAMS BUILT</h1><Link href="/setup/roster" className="text-emerald-500 underline">GO TO ROSTER MANAGER</Link></div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-2 pb-32 font-sans uppercase italic">
      <div className="max-w-7xl mx-auto flex justify-between p-4 mb-4 border-b border-zinc-900">
        <Link href="/" className="text-emerald-500 font-black flex items-center gap-2"><Home size={20} /> HUB</Link>
        <h1 className="text-2xl font-black text-emerald-400">Live Scorer</h1>
      </div>
      <div className="max-w-7xl mx-auto space-y-12">
        {teams.map((team) => (
          <div key={team.id} className="border-2 border-zinc-900 rounded-[2.5rem] overflow-hidden bg-zinc-950 shadow-2xl">
            <div className="bg-zinc-900 p-6 border-b border-zinc-800 font-black text-2xl text-emerald-500">{team.name}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-black text-[10px] text-zinc-600 font-black">
                  <tr>
                    <th className="p-4 text-left sticky left-0 bg-black z-20 border-r border-zinc-900 min-w-[140px]">PLAYER</th>
                    {Array.from({ length: 9 }).map((_, i) => <th key={i} className="p-2 border-x border-zinc-900 w-10">{i+1}</th>)}
                    <th className="p-2 bg-zinc-800 text-blue-400 border-x border-zinc-900">OUT</th>
                    {Array.from({ length: 9 }).map((_, i) => <th key={i+9} className="p-2 border-x border-zinc-900 w-10">{i+10}</th>)}
                    <th className="p-2 bg-zinc-800 text-blue-400 border-x border-zinc-900">IN</th>
                    <th className="p-2 bg-emerald-950 text-emerald-400">TOT</th>
                  </tr>
                </thead>
                <tbody>
                  {(team.playerIds || []).map((pid: string) => {
                    const p = players.find(g => g.id === pid);
                    if (!p) return null;
                    const pScores = scores[pid] || Array(18).fill(0);
                    const s = calc(pScores);
                    return (
                      <tr key={pid} className="border-b border-zinc-900">
                        <td className="p-4 text-left font-black text-xs sticky left-0 bg-black z-20 border-r border-zinc-900">{p.name}</td>
                        {pScores.slice(0, 9).map((sc: number, i: number) => (
                          <td key={i} className="p-1 border-x border-zinc-900/50">
                            <input type="number" value={sc || ""} onChange={e => {
                              const ns = [...pScores]; ns[i] = parseInt(e.target.value) || 0;
                              setScores({...scores, [pid]: ns})
                            }} className={`w-9 h-9 text-center text-xs font-black outline-none border transition-all ${getStyle(sc, course.pars[i])}`} />
                          </td>
                        ))}
                        <td className="bg-zinc-900/50 font-black text-blue-400">{s.f9}</td>
                        {pScores.slice(9, 18).map((sc: number, i: number) => (
                          <td key={i+9} className="p-1 border-x border-zinc-900/50">
                            <input type="number" value={sc || ""} onChange={e => {
                              const ns = [...pScores]; ns[i+9] = parseInt(e.target.value) || 0;
                              setScores({...scores, [pid]: ns})
                            }} className={`w-9 h-9 text-center text-xs font-black outline-none border transition-all ${getStyle(sc, course.pars[i+9])}`} />
                          </td>
                        ))}
                        <td className="bg-zinc-900/50 font-black text-blue-400">{s.b9}</td>
                        <td className="font-black text-emerald-500 bg-zinc-900 text-lg border-l border-zinc-900">{s.tot}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => set(ref(db, 'tournament/scores'), scores).then(() => alert("✅ SCORES SYNCED"))} className="fixed bottom-8 left-4 right-4 bg-emerald-500 text-black py-5 rounded-full font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"><Save size={24} /> SYNC SCOREBOARD</button>
    </div>
  )
}