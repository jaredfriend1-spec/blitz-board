"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
  const [stakes, setStakes] = useState({ pointValue: 10, skinsEntry: 20, teamBet: 50 })

  useEffect(() => {
    onValue(ref(db, 'tournament/money'), (snap) => snap.val() && setStakes(snap.val()))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block"><ArrowLeft size={18} /> BACK</Link>
      <div className="max-w-xl mx-auto bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 text-emerald-500"><DollarSign /><h1 className="text-3xl font-black italic">Blitz Stakes</h1></div>
        <div className="space-y-8">
          <div><label className="text-zinc-600 font-black text-[10px] block mb-2">STAKE PER POINT ($)</label>
            <input type="number" value={stakes.pointValue} onChange={e => setStakes({...stakes, pointValue: Number(e.target.value)})} className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-emerald-400 text-2xl italic" />
          </div>
          <button onClick={() => set(ref(db, 'tournament/money'), stakes)} className="w-full bg-emerald-500 text-black p-6 rounded-2xl font-black italic text-xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all shadow-xl">
            <Save size={24} /> Update Financials
          </button>
        </div>
      </div>
    </div>
  )
}