"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, UserPlus, Trash2, Pencil, Check, X, Users, Search } from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
 const [players, setPlayers] = useState<any[]>([])
 const [newName, setNewName] = useState('')
 const [newHcp, setNewHcp] = useState('')
 const [editingHcp, setEditingHcp] = useState<string|null>(null)
 const [editingHcpVal, setEditingHcpVal] = useState(0)
 const [editingName, setEditingName] = useState<string|null>(null)
 const [editingNameVal, setEditingNameVal] = useState('')
 const [search, setSearch] = useState('')
 const [toast, setToast] = useState<string|null>(null)

 useEffect(() => {
 onValue(ref(db, 'globalRoster'), snap => {
 if (snap.val()) {
 const list = Object.values(snap.val()) as any[]
 setPlayers(list.sort((a, b) => a.name.localeCompare(b.name)))
 } else {
 setPlayers([])
 }
 })
 }, [])

 const showToast = (msg: string) => {
 setToast(msg)
 setTimeout(() => setToast(null), 2500)
 }

 const BLOCKED_PLAYERS = ['SAM SILVERMAN', 'SAMUEL SILVERMAN']
 const isBlocked = (name: string) => BLOCKED_PLAYERS.some(b => name.trim().toUpperCase().includes(b))

 const addPlayer = () => {
 if (!newName.trim()) return
 if (isBlocked(newName)) {
 alert('⛔ Sam Silverman cannot be added to Blitz Board')
 setNewName('')
 return
 }
 const existing = players.find(p => p.name.toLowerCase() === newName.trim().toLowerCase())
 if (existing) return showToast('Player already in roster')
 const pRef = push(ref(db, 'globalRoster'))
 set(pRef, {
 id: pRef.key,
 name: newName.trim().toUpperCase(),
 handicap: Number(newHcp) || 0,
 addedAt: Date.now()
 })
 setNewName('')
 setNewHcp('')
 showToast('✓ Player added to roster')
 }

 const deletePlayer = (id: string, name: string) => {
 if (!confirm(`Remove ${name} from the roster?`)) return
 set(ref(db, `globalRoster/${id}`), null)
 showToast(`✓ ${name} removed`)
 }

 const saveHcp = async (id: string) => {
 await set(ref(db, `globalRoster/${id}/handicap`), editingHcpVal)
 setEditingHcp(null)
 showToast('✓ Handicap updated')
 }

 const saveName = async (id: string) => {
 if (!editingNameVal.trim()) return
 await set(ref(db, `globalRoster/${id}/name`), editingNameVal.trim().toUpperCase())
 setEditingName(null)
 showToast('✓ Name updated')
 }

 const filtered = players.filter(p =>
 p.name.toLowerCase().includes(search.toLowerCase())
 )

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans">

 {toast && (
 <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl">
 {toast}
 </div>
 )}

 <Link href="/"className="text-emerald-500 font-black mb-6 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> HUB
 </Link>

 <div className="max-w-lg mx-auto space-y-6">

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-black tracking-tight">Roster</h1>
 <p className="text-zinc-600 text-[10px] font-black tracking-widest normal-case mt-1">
 Your permanent player list — available in every quick match
 </p>
 </div>
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-center">
 <div className="text-2xl font-black text-emerald-400">{players.length}</div>
 <div className="text-[9px] font-black text-zinc-600 tracking-widest">PLAYERS</div>
 </div>
 </div>

 {/* Add player */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-3">
 <p className="text-[10px] font-black text-zinc-500 tracking-widest">ADD PLAYER</p>
 <input
 value={newName}
 onChange={e => setNewName(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addPlayer()}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none transition-colors"
 placeholder="PLAYER NAME"
 autoFocus
 />
 <div className="flex gap-3">
 <input
 type="number"
 value={newHcp}
 onChange={e => setNewHcp(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addPlayer()}
 className="w-28 bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-emerald-400 outline-none transition-colors text-center"
 placeholder="HCP"
 min={0} max={54}
 />
 <button onClick={addPlayer}
 className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black transition-colors flex items-center justify-center gap-2">
 <UserPlus size={16}/> ADD TO ROSTER
 </button>
 </div>
 </div>

 {/* Search */}
 {players.length > 5 && (
 <div className="relative">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 pl-10 pr-4 py-3 rounded-xl font-black text-white outline-none transition-colors text-sm"
 placeholder="SEARCH PLAYERS..."
 />
 </div>
 )}

 {/* Player list */}
 <div className="space-y-2">
 {filtered.length === 0 && players.length === 0 && (
 <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
 <Users size={36} className="text-zinc-700 mx-auto mb-3"/>
 <p className="text-zinc-600 text-xs font-black">NO PLAYERS YET</p>
 <p className="text-zinc-700 text-[10px] font-black normal-case mt-1">
 Add your regular group above — they'll be available in every quick match
 </p>
 </div>
 )}

 {filtered.length === 0 && players.length > 0 && (
 <p className="text-zinc-600 text-xs font-black text-center py-6">NO MATCHES FOR "{search}"</p>
 )}

 {filtered.map(p => (
 <div key={p.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-3 flex items-center gap-3">

 {/* Name — editable */}
 <div className="flex-1 min-w-0">
 {editingName === p.id ? (
 <div className="flex items-center gap-2">
 <input
 value={editingNameVal}
 onChange={e => setEditingNameVal(e.target.value)}
 onKeyDown={e => { if(e.key==='Enter') saveName(p.id); if(e.key==='Escape') setEditingName(null) }}
 className="flex-1 bg-black border border-emerald-500 text-white px-3 py-1.5 rounded-xl font-black text-sm outline-none"
 autoFocus
 />
 <button onClick={() => saveName(p.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={16}/></button>
 <button onClick={() => setEditingName(null)} className="text-zinc-600 hover:text-zinc-400"><X size={16}/></button>
 </div>
 ) : (
 <button
 onClick={() => { setEditingName(p.id); setEditingNameVal(p.name) }}
 className="flex items-center gap-2 group text-left w-full"
 >
 <span className="font-black text-base text-white group-hover:text-emerald-400 transition-colors truncate">
 {p.name}
 </span>
 <Pencil size={11} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"/>
 </button>
 )}

 {/* HCP — editable */}
 {editingHcp === p.id ? (
 <div className="flex items-center gap-2 mt-1">
 <span className="text-zinc-600 text-[10px] font-black">HCP</span>
 <input
 type="number"
 value={editingHcpVal}
 onChange={e => setEditingHcpVal(Number(e.target.value))}
 onKeyDown={e => { if(e.key==='Enter') saveHcp(p.id); if(e.key==='Escape') setEditingHcp(null) }}
 className="w-14 bg-black border border-emerald-500 text-emerald-400 px-2 py-1 rounded-lg font-black text-sm text-center outline-none"
 autoFocus min={0} max={54}
 />
 <button onClick={() => saveHcp(p.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
 <button onClick={() => setEditingHcp(null)} className="text-zinc-600 hover:text-zinc-400"><X size={14}/></button>
 </div>
 ) : (
 <button
 onClick={() => { setEditingHcp(p.id); setEditingHcpVal(p.handicap || 0) }}
 className="flex items-center gap-1.5 text-emerald-500 text-xs font-black hover:text-emerald-400 transition-colors group mt-0.5"
 >
 <span>HCP {p.handicap ?? 0}</span>
 <Pencil size={10} className="opacity-40 group-hover:opacity-100 transition-opacity"/>
 </button>
 )}
 </div>

 {/* Delete */}
 <button
 onClick={() => deletePlayer(p.id, p.name)}
 className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0 p-1"
 >
 <Trash2 size={18}/>
 </button>
 </div>
 ))}
 </div>

 {players.length > 0 && (
 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
 <p className="text-zinc-600 text-[10px] font-black normal-case leading-relaxed">
 💡 Tap any name or HCP to edit inline. Changes save instantly. This roster persists across all matches and tournaments — it's never cleared.
 </p>
 </div>
 )}
 </div>
 </div>
 )
}