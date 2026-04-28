"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Zap, Sword, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function PayoutsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [course, setCourse] = useState({ pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  const getStyle = (s: number, p: number) => {
    if (!s) return "text-zinc-800"
    if (s < p) return "bg-emerald-500 text-black rounded-full"
    if (s > p) return "bg-zinc-800 text-zinc-500"
    return "text-emerald-400"
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-12 inline-block"><ArrowLeft size={18} /> HUB</Link>
      
      <div className="max-w-6xl mx-auto space-y-16">
        {matches.map(m => {
          const pA = players.find(x => x.name === m.sideA);
          const pB = players.find(x => x.name === m.sideB);
          const sA = scores[pA?.id] || Array(18).fill(0);
          const sB = scores[pB?.id] || Array(18).fill(0);
          let score = 0, presses = 0;

          return (
            <div key={m.id} className="bg-zinc-950 p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
              <div className="flex justify-between items-center mb-10 border-b-2 border-zinc-900 pb-8">
                <h2 className="text-3xl font-black tracking-tighter uppercase">{m.sideA} <span className="text-zinc-700">VS</span> {m.sideB}</h2>
                <div className="bg-blue-600 text-black px-6 py-2 rounded-full font-black">MATCH PLAY</div>
              </div>

              {/* Comparative Scorecard */}
              <div className="overflow-x-auto mb-10 bg-black rounded-2xl border border-zinc-900">
                <table className="w-full text-center border-collapse">
                  <thead className="text-[8px] text-zinc-700 font-black bg-zinc-950">
                    <tr><th className="p-4 text-left">HOLE</th>{Array.from({length:18}).map((_,i)=><th key={i} className="p-2 w-8">{i+1}</th>)}</tr>
                  </thead>
                  <tbody className="text-[10px] font-black">
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500">{m.sideA}</td>
                      {sA.map((s, i) => <td key={i} className={`p-2 ${getStyle(s, course.pars[i])}`}>{s || '-'}</td>)}
                    </tr>
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500">{m.sideB}</td>
                      {sB.map((s, i) => <td key={i} className={`p-2 ${getStyle(s, course.pars[i])}`}>{s || '-'}</td>)}
                    </tr>
                    <tr className="border-t-2 border-zinc-800 bg-zinc-900/50">
                      <td className="p-4 text-left text-zinc-600 italic">WINNER</td>
                      {Array.from({length:18}).map((_, i) => {
                        const winner = sA[i] > 0 && sB[i] > 0 ? (sA[i] < sB[i] ? 'A' : sB[i] < sA[i] ? 'B' : 'T') : '-';
                        if (winner === 'A') score++; else if (winner === 'B') score--;
                        const isPress = Math.abs(score) >= 2;
                        if (isPress) presses++;
                        return <td key={i} className="p-2">{winner} {isPress && <Zap size={8} className="text-yellow-500 inline"/>}</td>
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-zinc-900 p-8 rounded-2xl">
                <div className="text-zinc-500 text-xs font-black italic">⚡ PRESSES TRIGGERED: <span className="text-yellow-500 text-xl">{presses}</span></div>
                <div className="text-3xl font-black text-emerald-400">
                  {score > 0 ? `${m.sideB} OWES $${m.stake * (presses + 1)}` : score < 0 ? `${m.sideA} OWES $${m.stake * (presses + 1)}` : 'MATCH TIED'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}