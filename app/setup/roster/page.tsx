"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import {
 ArrowLeft, UserPlus, Trash2, Users, Check, Pencil,
 X, ChevronRight, AlertTriangle, CheckCircle2, RotateCcw, Plus
} from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
 const [players, setPlayers] = useState<any[]>([])
 const [teams, setTeams] = useState<any[]>([])

 const [newPlayerName, setNewPlayerName] = useState("")
 const [newPlayerHcp, setNewPlayerHcp] = useState<string>("")

 const [editingHcp, setEditingHcp] = useState<string|null>(null)
 const [editingHcpValue, setEditingHcpValue] = useState(0)

 const [editingTeamName, setEditingTeamName] = useState<string|null>(null)
 const [editingTeamNameValue, setEditingTeamNameValue] = useState("")

 const [showTeamBuilder, setShowTeamBuilder] = useState(false)
 const [builderStep, setBuilderStep] = useState<'count'|'names'>('count')
 const [teamCount, setTeamCount] = useState(2)
 const [teamNames, setTeamNames] = useState(['Team 1', 'Team 2'])

 const [toast, setToast] = useState<string|null>(null)
 const [globalRoster, setGlobalRoster] = useState<any[]>([])
 const [showRosterPicker, setShowRosterPicker] = useState(false)

 useEffect(() => {
 onValue(ref(db,'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
 onValue(ref(db,'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
 onValue(ref(db,'globalRoster'), snap => {
 if (snap.val()) setGlobalRoster(Object.values(snap.val()) as any[])
 else setGlobalRoster([])
 })
 }, [])

 const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null), 2500) }

 // ── LOAD FROM GLOBAL ROSTER ──────────────────────────────────
 const loadFromGlobalRoster = (rp: any) => {
 const already = players.find(p => p.name === rp.name)
 if (already) return showToast(`${rp.name} already in roster`)
 const pRef = push(ref(db,'tournament/roster'))
 set(pRef, { id: pRef.key, name: rp.name, handicap: rp.handicap || 0 })
 showToast(`✓ Added ${rp.name}`)
 }

 const loadAllFromGlobalRoster = () => {
 let added = 0
 globalRoster.forEach(rp => {
 const already = players.find(p => p.name === rp.name)
 if (!already) {
 const pRef = push(ref(db,'tournament/roster'))
 set(pRef, { id: pRef.key, name: rp.name, handicap: rp.handicap || 0 })
 added++
 }
 })
 setShowRosterPicker(false)
 showToast(`✓ Added ${added} player${added !== 1 ? 's' : ''} from roster`)
 }

 // ── PLAYERS ───────────────────────────────────────────────────
 const BLOCKED_PLAYERS = ['SAM SILVERMAN', 'SAMUEL SILVERMAN']
 const isBlocked = (name: string) => BLOCKED_PLAYERS.some(b => name.trim().toUpperCase().includes(b))

 const addPlayer = () => {
 if (!newPlayerName.trim()) return
 if (isBlocked(newPlayerName)) {
 alert('⛔ Sam Silverman cannot be added to Blitz Board')
 setNewPlayerName('')
 return
 }
 const pRef = push(ref(db,'tournament/roster'))
 set(pRef, { id: pRef.key, name: newPlayerName.trim().toUpperCase(), handicap: Number(newPlayerHcp) || 0 })
 setNewPlayerName("")
 setNewPlayerHcp("")
 }

 const deletePlayer = (id: string) => {
 set(ref(db,`tournament/roster/${id}`), null)
 teams.forEach(t => {
 if ((t.playerIds||[]).includes(id)) {
 const updated = (t.playerIds||[]).filter((pid:string) => pid !== id)
 set(ref(db,`tournament/teams/${t.id}/playerIds`), updated.length ? updated : null)
 }
 })
 }

 const saveHcp = async (id: string) => {
 await set(ref(db,`tournament/roster/${id}/handicap`), editingHcpValue)
 setEditingHcp(null)
 showToast('✓ Handicap updated')
 }

 // ── TEAM NAME EDITING ─────────────────────────────────────────
 const startEditTeamName = (t: any) => {
 setEditingTeamName(t.id)
 setEditingTeamNameValue(t.name)
 }

 const saveTeamName = async (id: string) => {
 if (!editingTeamNameValue.trim()) return
 await set(ref(db,`tournament/teams/${id}/name`), editingTeamNameValue.trim())
 setEditingTeamName(null)
 showToast('✓ Team renamed')
 }

 // ── ASSIGNMENT ────────────────────────────────────────────────
 const assignPlayerToTeam = (playerId: string, teamId: string) => {
 teams.forEach(t => {
 if ((t.playerIds||[]).includes(playerId)) {
 const updated = (t.playerIds||[]).filter((pid:string) => pid !== playerId)
 set(ref(db,`tournament/teams/${t.id}/playerIds`), updated.length ? updated : null)
 }
 })
 if (teamId !== 'none') {
 const target = teams.find(t => t.id === teamId)
 if (!target) return
 set(ref(db,`tournament/teams/${teamId}/playerIds`), [...(target.playerIds||[]), playerId])
 }
 }

 const removeFromTeam = (playerId: string, teamId: string) => {
 const team = teams.find(t => t.id === teamId)
 if (!team) return
 const updated = (team.playerIds||[]).filter((pid:string) => pid !== playerId)
 set(ref(db,`tournament/teams/${teamId}/playerIds`), updated.length ? updated : null)
 }

 const getPlayerTeam = (playerId: string) => teams.find(t => (t.playerIds||[]).includes(playerId))

 // ── TEAM BUILDER ──────────────────────────────────────────────
 const openTeamBuilder = () => {
 setTeamCount(2); setTeamNames(['Team 1','Team 2']); setBuilderStep('count'); setShowTeamBuilder(true)
 }

 const handleTeamCountSelect = (n: number) => {
 setTeamCount(n)
 setTeamNames(Array.from({length:n}, (_,i) => `Team ${i+1}`))
 }

 const createTeams = async () => {
 await set(ref(db,'tournament/teams'), null)
 for (const name of teamNames) {
 const tRef = push(ref(db,'tournament/teams'))
 await set(tRef, { id: tRef.key, name: name.trim() || `Team ${teamNames.indexOf(name)+1}`, playerIds: [] })
 }
 setShowTeamBuilder(false)
 showToast(`✓ ${teamCount} teams created`)
 }

 const playerCount = players.length
 const isEven = playerCount > 0 && playerCount % teamCount === 0
 const perTeam = Math.floor(playerCount / teamCount)
 const assignedIds = new Set(teams.flatMap(t => t.playerIds || []))
 const unassigned = players.filter(p => !assignedIds.has(p.id))

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans">

 {toast && (
 <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl">
 {toast}
 </div>
 )}

 <Link href="/setup/admin"className="text-emerald-500 font-black mb-6 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> CHECKLIST
 </Link>

 <h1 className="text-4xl font-black tracking-tight mb-8">Roster & Teams</h1>

 <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

 {/* ── LEFT: PLAYERS ── */}
 <section>
 <div className="flex items-center gap-3 mb-5">
 <UserPlus size={22} className="text-emerald-500"/>
 <h2 className="text-2xl font-black text-emerald-400">Players</h2>
 <span className="text-zinc-600 text-[10px] font-black tracking-widest ml-auto">{playerCount} TOTAL</span>
 </div>

 {/* Add form */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-3 mb-5">
 <input
 value={newPlayerName}
 onChange={e => setNewPlayerName(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addPlayer()}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none transition-colors"
 placeholder="PLAYER NAME"
 />
 <div className="flex gap-3">
 <input
 type="number"
 value={newPlayerHcp}
 onChange={e => setNewPlayerHcp(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addPlayer()}
 className="w-28 bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-emerald-400 outline-none transition-colors text-center"
 placeholder="HCP"
 min={0} max={54}
 />
 <button onClick={addPlayer}
 className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black transition-colors flex items-center justify-center gap-2">
 <Plus size={16}/> ADD PLAYER
 </button>
 </div>
 </div>

 {/* Load from global roster */}
 {globalRoster.length > 0 && (
 <div>
 <button onClick={() => setShowRosterPicker(!showRosterPicker)}
 className="w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500 px-4 py-3 rounded-2xl transition-all group">
 <span className="flex items-center gap-2 text-zinc-500 group-hover:text-emerald-400 transition-colors text-sm font-semibold">
 <Users size={15}/> Load from Roster ({globalRoster.length} saved)
 </span>
 <span className="text-zinc-700 text-xs">{showRosterPicker ? '▲' : '▼'}</span>
 </button>
 {showRosterPicker && (
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mt-1 space-y-2">
 <button onClick={loadAllFromGlobalRoster}
 className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
 <Users size={14}/> Add All from Roster
 </button>
 <div className="border-t border-zinc-800 pt-2 space-y-1">
 {globalRoster.map((rp: any) => {
 const alreadyAdded = players.some(p => p.name === rp.name)
 return (
 <button key={rp.id} onClick={() => !alreadyAdded && loadFromGlobalRoster(rp)}
 disabled={alreadyAdded}
 className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
 alreadyAdded ? 'text-zinc-700 cursor-not-allowed' : 'text-white hover:bg-zinc-800 hover:text-emerald-400'
 }`}>
 <span className="font-semibold">{rp.name}</span>
 <span className={`text-xs font-semibold ${alreadyAdded ? 'text-zinc-700' : 'text-emerald-500'}`}>
 {alreadyAdded ? '✓ Added' : `HCP ${rp.handicap ?? 0}`}
 </span>
 </button>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Player list */}
 <div className="space-y-2">
 {players.length === 0 && (
 <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
 <p className="text-zinc-700 text-xs font-black">ADD PLAYERS ABOVE TO GET STARTED</p>
 </div>
 )}
 {players.map(p => {
 const playerTeam = getPlayerTeam(p.id)
 const isEditingThisHcp = editingHcp === p.id
 return (
 <div key={p.id} className={`rounded-2xl border p-4 transition-all ${
 playerTeam ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800'
 }`}>
 <div className="flex items-center gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap mb-1.5">
 <span className="font-black text-base">{p.name}</span>
 {playerTeam && (
 <span className="text-[9px] font-black bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/20">
 {playerTeam.name}
 </span>
 )}
 {!playerTeam && teams.length > 0 && (
 <span className="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20">
 UNASSIGNED
 </span>
 )}
 </div>
 {isEditingThisHcp ? (
 <div className="flex items-center gap-2">
 <span className="text-zinc-500 text-[10px] font-black">HCP</span>
 <input
 type="number"
 value={editingHcpValue}
 onChange={e => setEditingHcpValue(Number(e.target.value))}
 onKeyDown={e => { if(e.key==='Enter') saveHcp(p.id); if(e.key==='Escape') setEditingHcp(null) }}
 className="w-16 bg-black border border-emerald-500 text-emerald-400 px-2 py-1 rounded-lg font-black text-sm text-center outline-none"
 autoFocus min={0} max={54}
 />
 <button onClick={() => saveHcp(p.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
 <button onClick={() => setEditingHcp(null)} className="text-zinc-600 hover:text-zinc-400"><X size={14}/></button>
 </div>
 ) : (
 <button onClick={() => { setEditingHcp(p.id); setEditingHcpValue(p.handicap||0) }}
 className="flex items-center gap-1.5 text-emerald-500 text-xs font-black hover:text-emerald-400 transition-colors group">
 <span>HCP {p.handicap ?? 0}</span>
 <Pencil size={10} className="opacity-40 group-hover:opacity-100 transition-opacity"/>
 </button>
 )}
 </div>

 {/* Team assignment — radio-style buttons, NOT a dropdown */}
 {teams.length > 0 && !isEditingThisHcp && (
 <div className="flex gap-1.5 flex-wrap justify-end">
 {teams.map(t => (
 <button
 key={t.id}
 onClick={() => assignPlayerToTeam(p.id, playerTeam?.id === t.id ? 'none' : t.id)}
 className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all border ${
 playerTeam?.id === t.id
 ? 'bg-blue-600 border-blue-500 text-white'
 : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
 }`}
 >
 {t.name}
 </button>
 ))}
 </div>
 )}

 <button onClick={() => deletePlayer(p.id)}
 className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0 ml-1">
 <Trash2 size={16}/>
 </button>
 </div>
 </div>
 )
 })}
 </div>
 </section>

 {/* ── RIGHT: TEAMS ── */}
 <section>
 <div className="flex items-center gap-3 mb-5">
 <Users size={22} className="text-blue-500"/>
 <h2 className="text-2xl font-black text-blue-400">Teams</h2>
 <button onClick={openTeamBuilder}
 className="ml-auto flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 px-3 py-1.5 rounded-xl font-black text-[10px] transition-all">
 <RotateCcw size={11}/>
 {teams.length > 0 ? 'REBUILD TEAMS' : 'CREATE TEAMS'}
 </button>
 </div>

 {teams.length === 0 ? (
 <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center">
 <Users size={40} className="text-zinc-700 mx-auto mb-4"/>
 <p className="text-zinc-600 text-xs font-black mb-5">NO TEAMS CREATED YET</p>
 <button onClick={openTeamBuilder}
 className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-colors inline-flex items-center gap-2">
 <Plus size={16}/> CREATE TEAMS
 </button>
 </div>
 ) : (
 <div className="space-y-5">

 {/* Status banner */}
 <div className={`rounded-xl px-4 py-3 border flex items-center gap-2 ${
 unassigned.length === 0 && players.length > 0
 ? 'bg-emerald-500/10 border-emerald-500/30'
 : 'bg-zinc-900 border-zinc-800'
 }`}>
 {unassigned.length === 0 && players.length > 0
 ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0"/>
 : <AlertTriangle size={14} className="text-amber-400 flex-shrink-0"/>
 }
 <p className={`text-xs font-black normal-case ${
 unassigned.length === 0 && players.length > 0 ? 'text-emerald-400' : 'text-amber-400'
 }`}>
 {players.length === 0
 ? 'Add players on the left to assign them'
 : unassigned.length === 0
 ? `All ${players.length} players assigned across ${teams.length} teams ✓`
 : `${unassigned.length} player${unassigned.length>1?'s':''} not yet assigned`
 }
 </p>
 </div>

 {/* Team cards */}
 {teams.map(t => {
 const members = (t.playerIds||[])
 .map((pid:string) => players.find(p => p.id === pid))
 .filter(Boolean)
 const isEditingThisName = editingTeamName === t.id

 return (
 <div key={t.id} className="bg-zinc-900 rounded-[1.75rem] border-2 border-zinc-800 overflow-hidden">

 {/* Team header */}
 <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>

 {/* Editable team name */}
 {isEditingThisName ? (
 <div className="flex items-center gap-2 flex-1">
 <input
 value={editingTeamNameValue}
 onChange={e => setEditingTeamNameValue(e.target.value)}
 onKeyDown={e => { if(e.key==='Enter') saveTeamName(t.id); if(e.key==='Escape') setEditingTeamName(null) }}
 className="flex-1 bg-black border border-blue-500 text-white px-3 py-1.5 rounded-xl font-black text-sm outline-none"
 autoFocus
 />
 <button onClick={() => saveTeamName(t.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={16}/></button>
 <button onClick={() => setEditingTeamName(null)} className="text-zinc-600 hover:text-zinc-400"><X size={16}/></button>
 </div>
 ) : (
 <button onClick={() => startEditTeamName(t)}
 className="flex items-center gap-2 group flex-1 text-left">
 <span className="font-black text-base text-white group-hover:text-blue-400 transition-colors">{t.name}</span>
 <Pencil size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
 </button>
 )}

 <span className="text-zinc-600 text-[10px] font-black flex-shrink-0">{members.length} PLAYERS</span>
 <button onClick={() => set(ref(db,`tournament/teams/${t.id}`), null)}
 className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0">
 <X size={18}/>
 </button>
 </div>

 {/* Members */}
 <div className="p-4 space-y-2">
 {members.map((p:any) => (
 <div key={p.id} className="flex items-center justify-between bg-black rounded-xl px-4 py-3 border border-zinc-800">
 <div className="flex items-center gap-3">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
 <span className="font-black text-sm text-white">{p.name}</span>
 <span className="text-zinc-500 text-[10px] font-black">HCP {p.handicap??0}</span>
 </div>
 <button onClick={() => removeFromTeam(p.id, t.id)}
 className="text-zinc-700 hover:text-rose-500 transition-colors">
 <X size={14}/>
 </button>
 </div>
 ))}

 {members.length === 0 && (
 <p className="text-zinc-700 text-[10px] font-black text-center py-3">
 NO PLAYERS — ASSIGN FROM THE LEFT
 </p>
 )}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </section>
 </div>

 {/* ── TEAM BUILDER MODAL ── */}
 {showTeamBuilder && (
 <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <div className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl overflow-hidden">
 <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
 <div className="flex items-center gap-3">
 <Users size={20} className="text-blue-400"/>
 <h2 className="font-black text-lg">
 {builderStep === 'count' ? 'How Many Teams?' : 'Name Your Teams'}
 </h2>
 </div>
 <button onClick={() => setShowTeamBuilder(false)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
 </div>

 <div className="p-6 space-y-5">
 {builderStep === 'count' && (
 <>
 <div>
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">NUMBER OF TEAMS</label>
 <div className="flex gap-3">
 {[2,3,4].map(n => (
 <button key={n} onClick={() => handleTeamCountSelect(n)}
 className={`flex-1 py-5 rounded-2xl font-black text-3xl border-2 transition-all ${
 teamCount === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'
 }`}>{n}</button>
 ))}
 </div>
 </div>

 {/* Distribution preview */}
 <div className={`rounded-2xl p-4 border ${
 playerCount === 0 ? 'bg-zinc-900 border-zinc-800' :
 isEven ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
 }`}>
 <div className="flex items-center gap-2">
 {playerCount > 0 && (isEven
 ? <CheckCircle2 size={14} className="text-emerald-400"/>
 : <AlertTriangle size={14} className="text-amber-400"/>
 )}
 <p className={`text-xs font-black normal-case ${
 playerCount === 0 ? 'text-zinc-500' : isEven ? 'text-emerald-400' : 'text-amber-400'
 }`}>
 {playerCount === 0
 ? `${teamCount} teams will be created — add players after`
 : isEven
 ? `${playerCount} players ÷ ${teamCount} teams = ${perTeam} per team ✓`
 : `${playerCount} players ÷ ${teamCount} teams = uneven (${perTeam}-${perTeam+1} per team)`
 }
 </p>
 </div>
 </div>

 {teams.length > 0 && (
 <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
 <AlertTriangle size={14} className="text-rose-400 flex-shrink-0"/>
 <p className="text-rose-400 text-[10px] font-black normal-case">
 Replaces existing {teams.length} teams — player assignments will be cleared
 </p>
 </div>
 )}

 <button onClick={() => setBuilderStep('names')}
 className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
 NEXT — NAME TEAMS <ChevronRight size={16}/>
 </button>
 </>
 )}

 {builderStep === 'names' && (
 <>
 <div>
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">TEAM NAMES — TAP TO EDIT</label>
 <div className="space-y-3">
 {teamNames.map((name, i) => (
 <div key={i} className="flex items-center gap-3">
 <span className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm flex-shrink-0">
 {i+1}
 </span>
 <input
 value={name}
 onChange={e => {
 const updated = [...teamNames]
 updated[i] = e.target.value
 setTeamNames(updated)
 }}
 className="flex-1 bg-black border border-zinc-700 focus:border-blue-500 p-3 rounded-xl font-black text-white outline-none transition-colors"
 placeholder={`Team ${i+1}`}
 />
 </div>
 ))}
 </div>
 </div>

 <div className="flex gap-3">
 <button onClick={() => setBuilderStep('count')}
 className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-2xl font-black text-sm transition-colors">
 ← BACK
 </button>
 <button onClick={createTeams}
 className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2">
 <Check size={16}/> CREATE TEAMS
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 )
}