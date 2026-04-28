"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })

  useEffect(() => {
    onValue(ref(db, 'tournament/money'), snap => {
      if (snap.val()) {
        setMoney({
          entryFee: snap.val().entryFee || 25,
          skinsAllocation: snap.val().skinsAllocation || 10
        })
      }
    })
  }, [])

  const remaining = money.entryFee - money.skinsAllocation;
  const hasError = money.skinsAllocation > money.entryFee;

  const handleSave = () => {
    if (hasError) return alert("ERROR: Skins allocation cannot exceed the entry fee.");
    // We only save the global tournament money here now.
    set(ref(db, 'tournament/money'), { 
      entryFee: money.entryFee, 
      skinsAllocation: money.skinsAllocation 
    }).then(() => alert("💰 TOURNAMENT FINANCIALS SAVED"));
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block flex items-center gap-2"><ArrowLeft size={18} /> BACK</Link>
      <div className="max-w-xl mx-auto bg-zinc-900 p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-10 text-emerald-500"><DollarSign size={32} /><h1 className="text-4xl font-black">Tournament Money</h1></div>
        
        <div className="space-y-8">
          <div>
            <label className="text-zinc-500 font-black text-[10px] block mb-2 tracking-widest">ENTRY FEE PER MAN ($)</label>
            <input type="number" value={money.entryFee} onChange={e => setMoney({...money, entryFee: Number(e.target.value)})} className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-white text-3xl outline-none focus:border-emerald-500" />
          </div>
          
          <div>
            <label className="text-emerald-500 font-black text-[10px] block mb-2 tracking-widest">SKINS ALLOCATION PER MAN ($)</label>
            <input type="number" value={money.skinsAllocation} onChange={e => setMoney({...money, skinsAllocation: Number(e.target.value)})} className={`w-full bg-black border-2 p-5 rounded-2xl font-black text-emerald-400 text-3xl outline-none ${hasError ? 'border-rose-500 text-rose-500' : 'border-emerald-500/50'}`} />
            {hasError && <div className="text-rose-500 text-xs font-black mt-2 flex items-center gap-1"><AlertTriangle size={12}/> ALLOCATION EXCEEDS ENTRY FEE</div>}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex justify-between items-center">
            <span className="text-zinc-500 font-black text-xs">REMAINING FOR TEAM POT:</span>
            <span className={`text-2xl font-black ${remaining < 0 ? 'text-rose-500' : 'text-zinc-300'}`}>${remaining}</span>
          </div>

          <button onClick={handleSave} disabled={hasError} className={`w-full py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-3 shadow-xl transition-all ${hasError ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
            <Save size={24} /> SAVE CONFIG
          </button>
        </div>
      </div>
    </div>
  )
}