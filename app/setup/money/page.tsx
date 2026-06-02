"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, DollarSign, Save, CheckCircle2, AlertTriangle, Users, Target, Zap } from 'lucide-react'
import Link from 'next/link'

export default function MoneySetup() {
 const [money, setMoney] = useState({
 entryFee: 25,
 skinsAllocation: 10,
 handicapPercent: 100,
 netSkinsEnabled: false,
 skinsSplitGross: 100,
 skinsSplitNet: 0,
 })
 const [fieldSize, setFieldSize] = useState(0)
 const [saved, setSaved] = useState(false)

 useEffect(() => {
 onValue(ref(db, 'tournament/money'), snap => { if (snap.val()) setMoney(prev => ({...prev, ...snap.val()})) })
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
 const grossSkinsPot = money.netSkinsEnabled ? Math.round(skinsPot * (money.skinsSplitGross / 100) * 100) / 100 : skinsPot
 const netSkinsPot = money.netSkinsEnabled ? Math.round(skinsPot * (money.skinsSplitNet / 100) * 100) / 100 : 0
 const hasError = money.skinsAllocation > money.entryFee

 const save = async () => {
 if (hasError) return
 await set(ref(db, 'tournament/money'), money)
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 }

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
 <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors text-sm">
 <ArrowLeft size={16}/> CHECKLIST
 </Link>

 <div className="max-w-lg mx-auto space-y-6">
 <div>
 <h1 className="text-3xl font-black tracking-tight mb-1">Entry & Skins</h1>
 <p className="text-zinc-500 text-sm font-black normal-case">Set entry fees, skins allocation, and handicap settings</p>
 </div>

 {saved && (
 <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2">
 <CheckCircle2 size={16}/> Saved
 </div>
 )}

 {/* Entry Fee */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-2">
 <label className="text-zinc-400 font-black text-sm block tracking-widest">ENTRY FEE PER PLAYER ($)</label>
 <input
 type="number"
 value={money.entryFee}
 onChange={e => setMoney({...money, entryFee: Number(e.target.value)})}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-4 rounded-xl font-black text-white text-2xl outline-none transition-colors"
 />
 </div>

 {/* Skins Allocation */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-2">
 <label className="text-emerald-400 font-black text-sm block tracking-widest">SKINS ALLOCATION PER PLAYER ($)</label>
 <input
 type="number"
 value={money.skinsAllocation}
 onChange={e => setMoney({...money, skinsAllocation: Number(e.target.value)})}
 className={`w-full bg-black border p-4 rounded-xl font-black text-emerald-400 text-2xl outline-none transition-colors ${hasError ? 'border-rose-500' : 'border-zinc-700 focus:border-emerald-500'}`}
 />
 {hasError && (
 <div className="flex items-center gap-2 text-rose-400 text-xs font-black mt-1">
 <AlertTriangle size={12}/> Skins allocation cannot exceed entry fee
 </div>
 )}
 </div>

 {/* ── HANDICAP % ── */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-zinc-400 font-black text-sm tracking-widest">HANDICAP %</label>
 <span className={`font-black text-sm ${money.handicapPercent < 100 ? 'text-amber-400' : 'text-zinc-500'}`}>
 {money.handicapPercent < 100 ? `${money.handicapPercent}% of HCP` : 'Full Handicap'}
 </span>
 </div>
 <div className="grid grid-cols-5 gap-2">
 {[100, 90, 80, 75, 50].map(pct => (
 <button key={pct}
 onClick={() => setMoney({...money, handicapPercent: pct})}
 className={`py-2.5 rounded-xl font-black text-xs transition-all ${money.handicapPercent === pct ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
 {pct}%
 </button>
 ))}
 </div>
 <input
 type="range" min="0" max="100" step="5"
 value={money.handicapPercent}
 onChange={e => setMoney({...money, handicapPercent: Number(e.target.value)})}
 className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
 />
 <div className="flex justify-between text-[9px] text-zinc-600 font-black">
 <span>0%</span><span>50%</span><span>100%</span>
 </div>
 </div>

 {/* ── NET SKINS ── */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <label className="text-zinc-400 font-black text-sm tracking-widest block">NET SKINS</label>
 <p className="text-zinc-600 text-[10px] font-black normal-case mt-0.5">Award skins based on net scores (handicap applied)</p>
 </div>
 <button
 onClick={() => setMoney({...money, netSkinsEnabled: !money.netSkinsEnabled})}
 className={`w-14 h-7 rounded-full flex items-center px-1 transition-all ${money.netSkinsEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
 <div className={`w-5 h-5 rounded-full bg-white transition-transform ${money.netSkinsEnabled ? 'translate-x-7' : ''}`}/>
 </button>
 </div>

 {money.netSkinsEnabled && (
 <div className="space-y-3">
 <label className="text-zinc-400 font-black text-xs tracking-widest block">SKINS POT SPLIT (Gross / Net)</label>
 <div className="grid grid-cols-2 gap-3">
 {[
 {g:100, n:0, label:'Gross Only'},
 {g:70, n:30, label:'70/30'},
 {g:60, n:40, label:'60/40'},
 {g:50, n:50, label:'50/50'},
 ].map(preset => (
 <button key={preset.label}
 onClick={() => setMoney({...money, skinsSplitGross: preset.g, skinsSplitNet: preset.n})}
 className={`py-3 rounded-xl font-black text-xs transition-all ${
 money.skinsSplitGross === preset.g && money.skinsSplitNet === preset.n
 ? 'bg-amber-500 text-black'
 : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
 }`}>
 <div>{preset.label}</div>
 <div className="text-[9px] opacity-75 mt-0.5">{preset.g}% / {preset.n}%</div>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* ── BREAKDOWN ── */}
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
 <div className="flex items-center gap-2 text-zinc-500 font-black text-xs tracking-widest mb-1">
 <Users size={14}/> BREAKDOWN — {fieldSize} PLAYERS
 </div>
 {[
 { label: 'Total Skins Pot', value: `$${skinsPot}`, color: 'text-emerald-400' },
 ...(money.netSkinsEnabled ? [
 { label: `Gross Skins Pot (${money.skinsSplitGross}%)`, value: `$${grossSkinsPot}`, color: 'text-emerald-400' },
 { label: `Net Skins Pot (${money.skinsSplitNet}%)`, value: `$${netSkinsPot}`, color: 'text-blue-400' },
 ] : []),
 { label: 'Team Pot per Player', value: `$${teamPotPerMan > 0 ? teamPotPerMan : 0}`, color: 'text-purple-400' },
 { label: 'Total Team Pot', value: `$${totalTeamPot > 0 ? totalTeamPot : 0}`, color: 'text-white' },
 ].map(row => (
 <div key={row.label} className="flex justify-between items-center text-sm">
 <span className="text-zinc-500 font-black normal-case">{row.label}</span>
 <span className={`font-black ${row.color}`}>{row.value}</span>
 </div>
 ))}
 </div>

 <button
 onClick={save}
 disabled={hasError}
 className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors shadow-lg"
 >
 <Save size={18}/> Save Configuration
 </button>

 <Link href="/setup/admin"
 className="w-full text-center text-zinc-600 hover:text-zinc-400 text-sm font-black py-2 block transition-colors">
 ← Back without saving
 </Link>
 </div>
 </div>
 )
}