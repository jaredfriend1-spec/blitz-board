"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
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

 const teamPotPerMan = money.entryFee - money.skinsAllocation
 const totalTeamPot = teamPotPerMan * fieldSize
 const skinsPot = money.skinsAllocation * fieldSize
 const hasError = money.skinsAllocation > money.entryFee

 const save = async () => {
 if (hasError) return
 await set(ref(db, 'tournament/money'), money)
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 }

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-8">
 <Link href="/setup/admin" className="text-emerald-500 font-semibold mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors text-sm">
 <ArrowLeft size={16}/> Checklist
 </Link>

 <div className="max-w-lg mx-auto space-y-6">
 <div>
 <h1 className="text-3xl font-bold tracking-tight mb-1">Entry & Skins</h1>
 <p className="text-zinc-500 text-sm">Set entry fees and skins allocation per player</p>
 </div>

 {saved && (
 <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-semibold text-sm flex items-center gap-2">
 <CheckCircle2 size={16}/> Saved
 </div>
 )}

 <div className="space-y-4">
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-2">
 <label className="text-zinc-400 font-semibold text-sm block">Entry Fee per Player ($)</label>
 <input
 type="number"
 value={money.entryFee}
 onChange={e => setMoney({...money, entryFee: Number(e.target.value)})}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-4 rounded-xl font-bold text-white text-2xl outline-none transition-colors"
 />
 </div>

 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-2">
 <label className="text-emerald-400 font-semibold text-sm block">Skins Allocation per Player ($)</label>
 <input
 type="number"
 value={money.skinsAllocation}
 onChange={e => setMoney({...money, skinsAllocation: Number(e.target.value)})}
 className={`w-full bg-black border p-4 rounded-xl font-bold text-emerald-400 text-2xl outline-none transition-colors ${hasError ? 'border-rose-500' : 'border-zinc-700 focus:border-emerald-500'}`}
 />
 {hasError && (
 <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold mt-1">
 <AlertTriangle size={12}/> Skins allocation cannot exceed entry fee
 </div>
 )}
 </div>
 </div>

 {/* Breakdown */}
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
 <div className="flex items-center gap-2 text-zinc-500 font-semibold text-xs tracking-wider mb-1">
 <Users size={14}/> BREAKDOWN — {fieldSize} PLAYERS
 </div>
 {[
 { label: 'Skins Pot Total', value: `$${skinsPot}`, color: 'text-emerald-400' },
 { label: 'Team Pot per Player', value: `$${teamPotPerMan > 0 ? teamPotPerMan : 0}`, color: 'text-blue-400' },
 { label: 'Total Team Pot', value: `$${totalTeamPot > 0 ? totalTeamPot : 0}`, color: 'text-white font-bold' },
 ].map(row => (
 <div key={row.label} className="flex justify-between items-center text-sm">
 <span className="text-zinc-500 font-medium">{row.label}</span>
 <span className={`font-bold ${row.color}`}>{row.value}</span>
 </div>
 ))}
 </div>

 <button
 onClick={save}
 disabled={hasError}
 className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg"
 >
 <Save size={18}/> Save Configuration
 </button>

 <Link href="/setup/admin"
 className="w-full text-center text-zinc-600 hover:text-zinc-400 text-sm font-medium py-2 block transition-colors">
 ← Back without saving
 </Link>
 </div>
 </div>
 )
}