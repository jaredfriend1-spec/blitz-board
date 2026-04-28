"use client"

import { useState } from 'react'
import { golfers } from '@/lib/data'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})

  const calculateStats = (playerScores: number[]) => {
    const f9 = playerScores.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0)
    const b9 = playerScores.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0)
    return { f9, b9, total: f9 + b9 }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <Link href="/setup" className="text-emerald-500 font-bold mb-8 inline-block italic uppercase">← Hub</Link>
      
      {golfers.map((player) => {
        const stats = calculateStats(scores[player.id] || [])
        return (
          <div key={player.id} className="mb-8 bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-800">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-3xl font-black italic text-emerald-500">{player.name}</h2>
               <div className="flex gap-4 text-xs font-black italic">
                 <span className="bg-zinc-800 p-2 rounded-lg">F9: {stats.f9}</span>
                 <span className="bg-zinc-800 p-2 rounded-lg">B9: {stats.b9}</span>
                 <span className="bg-emerald-500 text-black p-2 rounded-lg">TOT: {stats.total}</span>
               </div>
            </div>
            
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <input 
                  key={i}
                  type="number"
                  placeholder={`${i + 1}`}
                  className="bg-black border-2 border-zinc-800 rounded-xl p-3 text-center font-black text-emerald-400 focus:border-emerald-500 outline-none"
                />
              ))}
            </div>
          </div>
        )
      })}

      <button className="fixed bottom-6 left-6 right-6 bg-emerald-500 text-black py-5 rounded-full font-black italic text-xl shadow-2xl uppercase tracking-tighter flex items-center justify-center gap-3 active:scale-95 transition-all">
        <Save /> Save & Update Board
      </button>
    </div>
  )
}