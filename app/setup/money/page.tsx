"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
  const [money, setMoney] = useState({ stakeAmount: 20, sideBetAmount: 17 })

  useEffect(() => {
    onValue(ref(db, 'tournament/money'), snap => snap.val() && setMoney(snap.val()))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block flex items-center gap-2"><ArrowLeft size={18} /> BACK</Link>
      <div className="max-w-xl mx-auto bg-zinc-900 p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-10 text-emerald-500"><DollarSign size={32} /><h1 className="text-4xl font-black">Financial Config</h1></div>
        
        <div className="space-y-10">
          <div>
            <label className="text-zinc-600 font-black text-[10px] block mb-3 tracking-widest">MAIN STAKE / SKINS ($)</label>
            <input type="number" value={money.stakeAmount} onChange={e => setMoney({...money, stakeAmount: Number(e.target.value)})} className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-emerald-400 text-3xl" />
          </div>
          
          <div>
            <label className="text-zinc-600 font-black text-[10px] block mb-3 tracking-widest">SIDE BET BASE STAKE ($)</label>
            <input type="number" value={money.sideBetAmount} onChange={e => setMoney({...money, sideBetAmount: Number(e.target.value)})} className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-blue-400 text-3xl" />
          </div>

          <button onClick={() => set(ref(db, 'tournament/money'), money).then(() => alert("💰 STAKES UPDATED"))} className="w-full bg-emerald-500 text-black py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-3 shadow-xl">
            <Save size={24} /> SAVE FINANCIALS
          </button>
        </div>
      </div>
    </div>
  )
}