"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save, AlertTriangle, Users } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })
  const [fieldSize, setFieldSize] = useState(0)

  useEffect(() => {
    onValue(ref(db, 'tournament/money'), snap => { if (snap.val()) setMoney(snap.val()) })
    onValue(ref(db, 'tournament/teams'), snap => {
      if (snap.val()) {
        const ids = new Set();
        Object.values(snap.val()).forEach((t: any) => (t.playerIds || []).forEach((id: string) => ids.add(id)));
        setFieldSize(ids.size);
      }
    })
  }, [])

  const teamPotPerMan = money.entryFee - money.skinsAllocation;
  const totalTeamPot = teamPotPerMan * fieldSize;
  const hasError = money.skinsAllocation > money.entryFee;

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block"><ArrowLeft size={18} className="inline mr-2" /> BACK</Link>
      <div className="max-w-xl mx-auto bg-zinc-900 p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-10 text-emerald-500"><DollarSign size={32} /><h1 className="text-4xl font-black">Tournament Money</h1></div>
        
        <div className="space-y-8">
          <div>
            <label className="text-zinc-500 font-black text-xs block mb-2">ENTRY FEE PER MAN ($)</label>
            <input type="number" value={money.entryFee} onChange={e => setMoney({...money, entryFee: Number(e.target.value)})} className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-white text-3xl" />
          </div>
          <div>
            <label className="text-emerald-500 font-black text-xs block mb-2">SKINS ALLOCATION PER MAN ($)</label>
            <input type="number" value={money.skinsAllocation} onChange={e => setMoney({...money, skinsAllocation: Number(e.target.value)})} className={`w-full bg-black border-2 p-5 rounded-2xl font-black text-emerald-400 text-3xl ${hasError ? 'border-rose-500' : 'border-zinc-800'}`} />
          </div>

          <div className="bg-black border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-zinc-400 font-black text-sm border-b border-zinc-800 pb-4">
              <span className="flex items-center gap-2"><Users size={16}/> ACTIVE FIELD SIZE:</span>
              <span className="text-white">{fieldSize} PLAYERS</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 font-black text-sm">
              <span>TEAM POT PER MAN:</span>
              <span className="text-blue-400">${teamPotPerMan > 0 ? teamPotPerMan : 0}</span>
            </div>
            <div className="flex justify-between items-center text-white font-black text-xl">
              <span>TOTAL TEAM POT:</span>
              <span className="text-emerald-500">${totalTeamPot > 0 ? totalTeamPot : 0}</span>
            </div>
          </div>

          <button onClick={() => set(ref(db, 'tournament/money'), money)} disabled={hasError} className="w-full bg-emerald-500 text-black py-6 rounded-2xl font-black text-2xl"><Save size={24} className="inline mr-2"/> SAVE CONFIG</button>
        </div>
      </div>
    </div>
  )
}