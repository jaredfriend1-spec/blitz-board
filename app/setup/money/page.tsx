"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })
  const [fieldSize, setFieldSize] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    onValue(ref(db, 'tournament/money'), snap => { if (snap.val()) setMoney(snap.val()) })
    onValue(ref(db, 'tournament/teams'), snap => {
      if (snap.val()) {
        const ids = new Set()
        Object.values(snap.val()).forEach((t: any) => (t.playerIds || []).forEach((id: string) => ids.add(id)))
        setFieldSize(ids.size)
      }
    })
  }, [])

  const teamPotPerMan = Math.max(0, money.entryFee - money.skinsAllocation)
  const totalTeamPot = teamPotPerMan * fieldSize
  const totalSkinsPot = money.skinsAllocation * fieldSize
  const hasError = money.skinsAllocation > money.entryFee

  const saveMoney = async () => {
    await set(ref(db, 'tournament/money'), money)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-emerald-500">
          <DollarSign size={32}/>
          <h1 className="text-4xl font-black">Money Setup</h1>
        </div>

        {saved && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2 mb-6">
            <CheckCircle2 size={16}/> MONEY CONFIG SAVED
          </div>
        )}

        <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl space-y-6">

          {/* Entry Fee */}
          <div>
            <label className="text-zinc-500 font-black text-xs block mb-2 tracking-widest">ENTRY FEE PER PLAYER ($)</label>
            <input
              type="number"
              value={money.entryFee}
              onChange={e => setMoney({...money, entryFee: Number(e.target.value)})}
              className="w-full bg-black border-2 border-zinc-700 focus:border-emerald-500 p-5 rounded-2xl font-black text-white text-3xl outline-none transition-colors"
            />
          </div>

          {/* Skins Allocation */}
          <div>
            <label className={`font-black text-xs block mb-2 tracking-widest ${hasError ? 'text-rose-500' : 'text-emerald-500'}`}>
              SKINS POT PER PLAYER ($)
            </label>
            <input
              type="number"
              value={money.skinsAllocation}
              onChange={e => setMoney({...money, skinsAllocation: Number(e.target.value)})}
              className={`w-full bg-black border-2 p-5 rounded-2xl font-black text-emerald-400 text-3xl outline-none transition-colors ${hasError ? 'border-rose-500' : 'border-zinc-700 focus:border-emerald-500'}`}
            />
            {hasError && (
              <p className="text-rose-500 text-xs font-black mt-2">Skins allocation can't exceed entry fee</p>
            )}
          </div>

          {/* Summary breakdown */}
          <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-zinc-500 font-black text-sm pb-3 border-b border-zinc-800">
              <span className="flex items-center gap-2"><Users size={14}/> FIELD SIZE</span>
              <span className="text-white">{fieldSize > 0 ? `${fieldSize} PLAYERS` : 'NO TEAMS YET'}</span>
            </div>
            <div className="flex justify-between items-center font-black text-sm">
              <span className="text-zinc-500">TEAM POT PER PLAYER</span>
              <span className="text-blue-400">${teamPotPerMan}</span>
            </div>
            <div className="flex justify-between items-center font-black text-sm pb-3 border-b border-zinc-800">
              <span className="text-zinc-500">TOTAL SKINS POT</span>
              <span className="text-emerald-400">${totalSkinsPot > 0 ? totalSkinsPot : 0}</span>
            </div>
            <div className="flex justify-between items-center font-black text-xl">
              <span className="text-zinc-400">TOTAL TEAM POT</span>
              <span className="text-white">${totalTeamPot > 0 ? totalTeamPot : 0}</span>
            </div>
          </div>

          <button
            onClick={saveMoney}
            disabled={hasError}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Save size={20}/> SAVE & BACK TO CHECKLIST
          </button>

          <Link
            href="/setup/admin"
            className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs font-black tracking-widest py-2 block transition-colors"
          >
            ← BACK WITHOUT SAVING
          </Link>
        </div>
      </div>
    </div>
  )
}