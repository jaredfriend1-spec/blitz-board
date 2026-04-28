"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { golfers } from '@/lib/data'
import { ArrowLeft, Save, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function MatchupCenter() {
  const [matches, setMatches] = useState<any[]>([])
  const [money, setMoney] = useState({ perPoint: 10 })

  useEffect(() => {
    onValue(ref(db, 'tournament/matchups'), (snap) => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/money'), (snap) => snap.val() && setMoney(snap.val()))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block flex items-center gap-2"><ArrowLeft size={18} /> BACK</Link>
      
      <h1 className="text-5xl font-black italic text-emerald-500 mb-12">Matchup Payouts</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <section className="space-y-4">
          <h2 className="text-zinc-500 font-black text-xs border-b border-zinc-900 pb-2">ACTIVE BETS & OWES</h2>
          {matches.map(m => (
            <div key={m.id} className="bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 font-bold mb-1">{m.type} MATCH</p>
                <h3 className="text-xl font-black italic">{m.sideA} vs {m.sideB}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Current Payout</p>
                <span className="text-2xl font-black text-rose-500 tracking-tighter">
                  {m.winner ? `${m.loser} owes ${m.winner} $${m.stake}` : "Tied"}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-zinc-950 p-8 rounded-[2.5rem] border-2 border-emerald-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 text-emerald-500"><Wallet /><h2 className="text-2xl font-black italic">Final Payouts</h2></div>
          {/* Payout Logic Summary would go here */}
          <p className="text-zinc-600 text-xs font-bold italic">Calculated live based on $ {money.perPoint}/pt Blitz stakes</p>
        </section>
      </div>
    </div>
  )
}