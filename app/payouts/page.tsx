"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { golfers } from '@/lib/data'
import { ArrowLeft, Zap, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function PayoutsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [matches, setMatches] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
  }, [])

  const getHoleWinner = (h: number, a: string, b: string) => {
    const pA = golfers.find(g => g.name === a), pB = golfers.find(g => g.name === b);
    if (!pA || !pB) return null;
    const sA = scores[pA.id]?.[h] || 0, sB = scores[pB.id]?.[h] || 0;
    if (sA === 0 || sB === 0) return null;
    return sA < sB ? 'A' : sB < sA ? 'B' : 'T';
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      <h1 className="text-4xl font-black text-emerald-400 mb-12 uppercase tracking-tighter">Match Payouts & Timeline</h1>
      <div className="max-w-6xl mx-auto space-y-12">
        {matches.map((m) => {
          let score = 0, presses = 0;
          return (
            <div key={m.id} className="bg-zinc-900 p-8 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-900 font-black">
                <h2 className="text-2xl uppercase tracking-widest">{m.sideA} <span className="text-zinc-600 px-2 text-sm">VS</span> {m.sideB}</h2>
                <div className="bg-emerald-500 text-black px-6 py-2 rounded-full italic">STAKE: ${m.stake}</div>
              </div>
              <div className="grid grid-cols-9 gap-4 mb-10">
                {Array.from({ length: 18 }).map((_, i) => {
                  const res = getHoleWinner(i, m.sideA, m.sideB);
                  if (res === 'A') score++; else if (res === 'B') score--;
                  const isPress = Math.abs(score) >= 2;
                  if (isPress) presses++;
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-[8px] text-zinc-600 font-bold mb-1">H{i+1}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${res === 'A' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : res === 'B' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800 text-zinc-700'}`}>
                        <span className="font-black italic">{res || '-'}</span>
                      </div>
                      {isPress && <Zap size={14} className="text-yellow-500 mt-1" />}
                    </div>
                  )
                })}
              </div>
              <div className="bg-black/50 p-8 rounded-[2rem] flex justify-between items-center font-black italic">
                <div className="flex items-center gap-6">
                   <div className="text-zinc-500 text-xs">AUTO-PRESSES: <span className="text-yellow-500 text-lg">{presses} ⚡</span></div>
                   <div className="text-zinc-500 text-xs">STATE: <span className="text-white text-lg">{score > 0 ? `${score} UP` : score < 0 ? `${Math.abs(score)} DN` : 'ALL SQ'}</span></div>
                </div>
                <div className="text-3xl text-emerald-400 flex items-center gap-2">
                  <DollarSign /> {score > 0 ? `${m.sideB} OWES $${m.stake * (presses + 1)}` : score < 0 ? `${m.sideA} OWES $${m.stake * (presses + 1)}` : 'MATCH TIED'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}