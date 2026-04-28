"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Trophy, ArrowLeft, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
  }, [])

  const getSkinsMap = () => {
    const map = Array(18).fill(null);
    for (let h = 0; h < 18; h++) {
      const holeScores = players.map(p => ({ name: p.name, s: (scores[p.id] || [])[h] || 0 })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s))
        const winners = holeScores.filter(x => x.s === min)
        if (winners.length === 1) map[h] = winners[0].name;
      }
    }
    return map;
  }

  const skinsMap = getSkinsMap();

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} /> HUB</Link>
      
      {/* SKINS DASHBOARD GRID */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="bg-emerald-500 text-black p-6 rounded-t-[2.5rem] border-x-4 border-t-4 border-black flex items-center gap-3 justify-center">
          <LayoutGrid size={24} /><h2 className="text-3xl font-black tracking-tighter italic">Skins Dashboard</h2>
        </div>
        <div className="bg-zinc-900 p-8 border-4 border-black rounded-b-[2.5rem] grid grid-cols-3 md:grid-cols-6 gap-4">
          {skinsMap.map((winner, i) => (
            <div key={i} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center min-h-[100px] ${winner ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
              <span className="text-[10px] text-zinc-600 font-black mb-2">HOLE {i+1}</span>
              <span className={`text-xs font-black text-center ${winner ? 'text-white' : 'text-zinc-800'}`}>{winner || "---"}</span>
              {winner && <Trophy size={14} className="text-yellow-500 mt-2" />}
            </div>
          ))}
        </div>
      </section>
      
      {/* ... (Existing F9/B9 Leaderboards below) ... */}
    </div>
  )
}