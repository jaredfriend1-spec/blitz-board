"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, User, Users, Sword, Trash2, Save, Target, Zap, ZapOff, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type MatchType = 'PvP' | '2v2' | 'TvT' | 'Wheel'

const DEFAULT_MATCH = {
 sideA: "", sideB: "", sideA2: "", sideB2: "",
 nassau: 5, press: 5, birdie: 2, eagle: 5,
 scoringType: 'NET' as 'NET'|'GROSS',
 autoPress: true,
 // Wheel specific
 wheelPlayers: ["","","",""],
 wheelAmount: 10,
 wheelFormat: 'straight' as 'straight'|'nassau',
 wheelNassau: 5,
 wheelPress: 5,
 wheelAutoPress: true,
}

export default function MatchupCenter() {
 const [matches, setMatches] = useState<any[]>([])
 const [players, setPlayers] = useState<any[]>([])
 const [teams, setTeams] = useState<any[]>([])
 const [isBuilding, setIsBuilding] = useState<MatchType|null>(null)
 const [newMatch, setNewMatch] = useState({...DEFAULT_MATCH})

 useEffect(() => {
 onValue(ref(db,'tournament/matchups'), snap => setMatches(snap.val() ? Object.values(snap.val()) : []))
 onValue(ref(db,'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
 onValue(ref(db,'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
 }, [])

 const saveMatch = () => {
 if (isBuilding === 'Wheel') {
 const filled = newMatch.wheelPlayers.filter(Boolean)
 if (filled.length !== 4) return alert("SELECT ALL 4 PLAYERS FOR THE WHEEL")
 if (new Set(filled).size !== 4) return alert("ALL 4 PLAYERS MUST BE DIFFERENT")
 const mRef = push(ref(db,'tournament/matchups'))
 set(mRef, { id: mRef.key, type: 'Wheel', wheelPlayers: newMatch.wheelPlayers, wheelAmount: newMatch.wheelAmount, scoringType: newMatch.scoringType, wheelFormat: newMatch.wheelFormat, wheelNassau: newMatch.wheelNassau, wheelPress: newMatch.wheelPress, wheelAutoPress: newMatch.wheelAutoPress })
 } else if (isBuilding === '2v2') {
 const picks = [newMatch.sideA, newMatch.sideA2, newMatch.sideB, newMatch.sideB2]
 if (picks.some(p => !p)) return alert("SELECT ALL 4 PLAYERS")
 if (new Set(picks).size !== 4) return alert("ALL 4 PLAYERS MUST BE DIFFERENT")
 const mRef = push(ref(db,'tournament/matchups'))
 set(mRef, { id: mRef.key, type: '2v2', sideA: newMatch.sideA, sideA2: newMatch.sideA2, sideB: newMatch.sideB, sideB2: newMatch.sideB2, nassau: newMatch.nassau, press: newMatch.press, birdie: newMatch.birdie, eagle: newMatch.eagle, scoringType: newMatch.scoringType, autoPress: newMatch.autoPress })
 } else {
 if (!newMatch.sideA || !newMatch.sideB || newMatch.sideA === newMatch.sideB) return alert("SELECT TWO DISTINCT SIDES")
 const mRef = push(ref(db,'tournament/matchups'))
 set(mRef, { id: mRef.key, type: isBuilding, sideA: newMatch.sideA, sideB: newMatch.sideB, nassau: newMatch.nassau, press: newMatch.press, birdie: newMatch.birdie, eagle: newMatch.eagle, scoringType: newMatch.scoringType, autoPress: newMatch.autoPress })
 }
 setIsBuilding(null)
 setNewMatch({...DEFAULT_MATCH})
 }

 const deleteMatch = (id: string) => {
 if (confirm("DELETE THIS MATCHUP?")) set(ref(db,`tournament/matchups/${id}`), null)
 }

 const isPvPLike = isBuilding === 'PvP' || isBuilding === '2v2'

 const getAvailableWheelPlayers = (excludeIdxs: number[]) =>
 players.filter(p => !excludeIdxs.some(i => newMatch.wheelPlayers[i] === p.name))

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
 <Link href="/setup/admin"className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> CHECKLIST
 </Link>

 <div className="max-w-5xl mx-auto space-y-10">

 {/* TYPE SELECTOR */}
 {!isBuilding && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {([
 { type:'PvP', label:'1 v 1', sub:'Player vs Player', icon:<User size={28}/>, color:'hover:border-emerald-500', iconColor:'text-emerald-500' },
 { type:'2v2', label:'2 v 2', sub:'Best Ball Partners', icon:<div className="flex gap-1"><User size={22}/><User size={22}/></div>, color:'hover:border-amber-500', iconColor:'text-amber-400' },
 { type:'TvT', label:'Team v Team', sub:'Full Team Match', icon:<Users size={28}/>, color:'hover:border-blue-500', iconColor:'text-blue-500' },
 { type:'Wheel', label:'Wheel', sub:'Everyone vs Everyone', icon:<RefreshCw size={28}/>, color:'hover:border-purple-500', iconColor:'text-purple-400' },
 ] as const).map(item => (
 <button key={item.type} onClick={() => setIsBuilding(item.type as MatchType)}
 className={`bg-zinc-900 border-2 border-zinc-800 p-5 rounded-[2rem] font-black flex flex-col items-center gap-3 ${item.color} transition-all group`}>
 <div className={`${item.iconColor} group-hover:scale-110 transition-transform`}>{item.icon}</div>
 <div>
 <div className="text-sm font-black">{item.label}</div>
 <div className="text-[9px] text-zinc-600 font-black normal-case mt-0.5">{item.sub}</div>
 </div>
 </button>
 ))}
 </div>
 )}

 {/* BUILDER */}
 {isBuilding && (
 <div className={`bg-zinc-900 p-6 sm:p-8 rounded-[3rem] border-2 shadow-2xl space-y-6 ${
 isBuilding === 'Wheel' ? 'border-purple-500' : 'border-emerald-500'
 }`}>
 <div className="flex justify-between items-center pb-4 border-b-2 border-zinc-800">
 <h2 className={`text-2xl font-black ${isBuilding === 'Wheel' ? 'text-purple-400' : 'text-emerald-500'}`}>
 NEW {isBuilding === '2v2' ? '2V2' : isBuilding.toUpperCase()} MATCHUP
 </h2>
 <button onClick={() => setIsBuilding(null)} className="text-zinc-500 hover:text-rose-500 font-black">CANCEL</button>
 </div>

 {/* ── WHEEL SETUP ── */}
 {isBuilding === 'Wheel' && (
 <>
 <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
 <p className="text-purple-300 text-xs font-black normal-case leading-relaxed">
 Select 4 players. The app generates all 6 pairs automatically — everyone plays everyone.
 </p>
 <p className="text-zinc-600 text-[10px] font-black mt-2 tracking-widest">6 PAIRS · ALL VS ALL</p>
 </div>

 <div>
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">SELECT 4 PLAYERS</label>
 <div className="grid grid-cols-2 gap-3">
 {[0,1,2,3].map(i => (
 <div key={i}>
 <label className="text-[9px] font-black text-zinc-600 tracking-widest block mb-1.5">PLAYER {i+1}</label>
 <select
 value={newMatch.wheelPlayers[i]}
 onChange={e => {
 const updated = [...newMatch.wheelPlayers]
 updated[i] = e.target.value
 setNewMatch({...newMatch, wheelPlayers: updated})
 }}
 className="w-full bg-black border border-zinc-700 focus:border-purple-500 p-3 rounded-xl font-black text-white outline-none transition-colors text-sm"
 >
 <option value="">SELECT...</option>
 {players
 .filter(p => !newMatch.wheelPlayers.some((wp, wi) => wi !== i && wp === p.name))
 .map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)
 }
 </select>
 </div>
 ))}
 </div>
 </div>

 {/* Show generated pairs */}
 {newMatch.wheelPlayers.filter(Boolean).length === 4 && (
 <div className="bg-black border border-zinc-800 rounded-2xl p-4">
 <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-3">6 PAIRS GENERATED</p>
 <div className="grid grid-cols-2 gap-2">
 {[0,1,2,3].flatMap(a => [a+1,a+2,a+3].filter(b=>b<4).map(b => (
 <div key={`${a}-${b}`} className="flex items-center gap-2 text-[10px] font-black text-zinc-400">
 <span className="text-purple-400">{newMatch.wheelPlayers[a]}</span>
 <span className="text-zinc-700">vs</span>
 <span className="text-purple-400">{newMatch.wheelPlayers[b]}</span>
 </div>
 )))}
 </div>
 </div>
 )}

 {/* Wheel format */}
 <div className="bg-black p-5 rounded-2xl border border-zinc-800">
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">MATCH FORMAT PER PAIR</label>
 <div className="flex gap-3 mb-4">
 <button onClick={() => setNewMatch({...newMatch, wheelFormat:'straight'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.wheelFormat==='straight'?'bg-purple-500 border-purple-400 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
 STRAIGHT 18
 <div className="text-[9px] opacity-70 mt-0.5 normal-case">One bet · Total holes</div>
 </button>
 <button onClick={() => setNewMatch({...newMatch, wheelFormat:'nassau'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.wheelFormat==='nassau'?'bg-purple-500 border-purple-400 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
 NASSAU
 <div className="text-[9px] opacity-70 mt-0.5 normal-case">F9 · B9 · Total + presses</div>
 </button>
 </div>

 {newMatch.wheelFormat === 'straight' && (
 <div>
 <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">BET AMOUNT PER PAIR ($)</label>
 <input type="number"value={newMatch.wheelAmount}
 onChange={e => setNewMatch({...newMatch, wheelAmount: Number(e.target.value)})}
 className="w-full bg-zinc-900 p-3 rounded-xl font-black text-purple-400 text-xl outline-none border border-zinc-700 focus:border-purple-500 text-center"
 />
 </div>
 )}

 {newMatch.wheelFormat === 'nassau' && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">NASSAU ($)</label>
 <input type="number"value={newMatch.wheelNassau}
 onChange={e => setNewMatch({...newMatch, wheelNassau: Number(e.target.value)})}
 className="w-full bg-zinc-900 p-3 rounded-xl font-black text-purple-400 outline-none border border-zinc-700 focus:border-purple-500 text-center"
 />
 </div>
 <div>
 <label className="text-[10px] font-black text-zinc-600 tracking-widest block mb-2">PRESS ($)</label>
 <input type="number"value={newMatch.wheelPress}
 onChange={e => setNewMatch({...newMatch, wheelPress: Number(e.target.value)})}
 className={`w-full bg-zinc-900 p-3 rounded-xl font-black outline-none border border-zinc-700 text-center transition-all ${newMatch.wheelAutoPress?'text-yellow-400 focus:border-yellow-500':'text-zinc-600'}`}
 disabled={!newMatch.wheelAutoPress}
 />
 </div>
 </div>
 <div className="flex gap-3">
 <button onClick={() => setNewMatch({...newMatch, wheelAutoPress:true})}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-2 transition-all ${newMatch.wheelAutoPress?'bg-yellow-500/20 border-yellow-500/60 text-yellow-400':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 <Zap size={12}/> AUTO-PRESS ON
 </button>
 <button onClick={() => setNewMatch({...newMatch, wheelAutoPress:false})}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-2 transition-all ${!newMatch.wheelAutoPress?'bg-zinc-700 border-zinc-500 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 <ZapOff size={12}/> NO PRESSES
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Scoring type */}
 <div className="bg-black p-5 rounded-2xl border border-zinc-800">
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">SCORING TYPE</label>
 <div className="flex gap-3">
 <button onClick={() => setNewMatch({...newMatch, scoringType:'NET'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.scoringType==='NET'?'bg-emerald-500 border-emerald-400 text-black':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 NET<div className="text-[9px] opacity-70 mt-0.5">USES HANDICAPS</div>
 </button>
 <button onClick={() => setNewMatch({...newMatch, scoringType:'GROSS'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.scoringType==='GROSS'?'bg-rose-500 border-rose-400 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 GROSS<div className="text-[9px] opacity-70 mt-0.5">SCRATCH</div>
 </button>
 </div>
 </div>


 </>
 )}

 {/* ── 1v1 SETUP ── */}
 {isBuilding === 'PvP' && (
 <div className="grid grid-cols-2 gap-6">
 {['sideA','sideB'].map((side, i) => (
 <div key={side}>
 <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-2">SIDE {i===0?'A':'B'} — PLAYER</label>
 <select value={(newMatch as any)[side]} onChange={e => setNewMatch({...newMatch, [side]: e.target.value})}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-4 rounded-xl font-black text-white outline-none transition-colors">
 <option value="">SELECT...</option>
 {players.map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
 </select>
 </div>
 ))}
 </div>
 )}

 {/* ── 2v2 SETUP ── */}
 {isBuilding === '2v2' && (
 <div className="space-y-4">
 <div>
 <label className="text-[10px] font-black text-amber-500 tracking-widest block mb-2">SIDE A — 2 PARTNERS</label>
 <div className="grid grid-cols-2 gap-3 bg-black/40 p-4 rounded-2xl border border-zinc-800">
 {['sideA','sideA2'].map((side, i) => (
 <div key={side}>
 <label className="text-[9px] font-black text-amber-500/70 block mb-1.5">PLAYER {i+1}</label>
 <select value={(newMatch as any)[side]} onChange={e => setNewMatch({...newMatch, [side]: e.target.value})}
 className="w-full bg-black border border-zinc-700 focus:border-amber-500 p-3 rounded-xl font-black text-white outline-none text-sm">
 <option value="">SELECT...</option>
 {players.filter(p => {
 const others = ['sideA','sideA2','sideB','sideB2'].filter(s=>s!==side).map(s=>(newMatch as any)[s])
 return !others.includes(p.name)
 }).map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
 </select>
 </div>
 ))}
 </div>
 </div>
 <div>
 <label className="text-[10px] font-black text-blue-400 tracking-widest block mb-2">SIDE B — 2 PARTNERS</label>
 <div className="grid grid-cols-2 gap-3 bg-black/40 p-4 rounded-2xl border border-zinc-800">
 {['sideB','sideB2'].map((side, i) => (
 <div key={side}>
 <label className="text-[9px] font-black text-blue-400/70 block mb-1.5">PLAYER {i+1}</label>
 <select value={(newMatch as any)[side]} onChange={e => setNewMatch({...newMatch, [side]: e.target.value})}
 className="w-full bg-black border border-zinc-700 focus:border-blue-500 p-3 rounded-xl font-black text-white outline-none text-sm">
 <option value="">SELECT...</option>
 {players.filter(p => {
 const others = ['sideA','sideA2','sideB','sideB2'].filter(s=>s!==side).map(s=>(newMatch as any)[s])
 return !others.includes(p.name)
 }).map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
 </select>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* ── TvT SETUP ── */}
 {isBuilding === 'TvT' && (
 <div className="grid grid-cols-2 gap-6">
 {['sideA','sideB'].map((side, i) => (
 <div key={side}>
 <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-2">SIDE {i===0?'A':'B'} — TEAM</label>
 <select value={(newMatch as any)[side]} onChange={e => setNewMatch({...newMatch, [side]: e.target.value})}
 className="w-full bg-black border border-zinc-700 focus:border-blue-500 p-4 rounded-xl font-black text-white outline-none transition-colors">
 <option value="">SELECT TEAM...</option>
 {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
 </select>
 </div>
 ))}
 </div>
 )}

 {/* GROSS/NET — not wheel */}
 {isBuilding !== 'Wheel' && (
 <div className="bg-black p-5 rounded-2xl border border-zinc-800">
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">SCORING TYPE</label>
 <div className="flex gap-3">
 <button onClick={() => setNewMatch({...newMatch, scoringType:'NET'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.scoringType==='NET'?'bg-emerald-500 border-emerald-400 text-black':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 NET<div className="text-[9px] opacity-70 mt-0.5">USES HANDICAPS</div>
 </button>
 <button onClick={() => setNewMatch({...newMatch, scoringType:'GROSS'})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${newMatch.scoringType==='GROSS'?'bg-rose-500 border-rose-400 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 GROSS<div className="text-[9px] opacity-70 mt-0.5">SCRATCH</div>
 </button>
 </div>
 </div>
 )}

 {/* AUTO-PRESS — PvP and 2v2 only */}
 {isPvPLike && (
 <div className="bg-black p-5 rounded-2xl border border-zinc-800">
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">AUTOMATIC PRESSES</label>
 <div className="flex gap-3">
 <button onClick={() => setNewMatch({...newMatch, autoPress:true})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 flex items-center justify-center gap-2 transition-all ${newMatch.autoPress?'bg-yellow-500/20 border-yellow-500/60 text-yellow-400':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 <Zap size={14}/> AUTO-PRESS ON
 </button>
 <button onClick={() => setNewMatch({...newMatch, autoPress:false})}
 className={`flex-1 py-3 rounded-xl font-black text-sm border-2 flex items-center justify-center gap-2 transition-all ${!newMatch.autoPress?'bg-zinc-700 border-zinc-500 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
 <ZapOff size={14}/> NO PRESSES
 </button>
 </div>
 </div>
 )}

 {/* STAKES — not wheel */}
 {isBuilding !== 'Wheel' && (
 <div className="bg-black p-5 rounded-2xl border border-zinc-800">
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-4">STAKES</label>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { key:'nassau', label:'NASSAU ($)', color:'text-white' },
 { key:'press', label:'PRESS ($)', color:'text-yellow-400' },
 { key:'birdie', label:'BIRDIE ($)', color:'text-blue-400' },
 { key:'eagle', label:'EAGLE ($)', color:'text-emerald-400' },
 ].map(({key,label,color}) => (
 <div key={key}>
 <label className={`font-black text-[10px] block mb-2 ${color}`}>{label}</label>
 <input type="number"value={(newMatch as any)[key]}
 onChange={e => setNewMatch({...newMatch, [key]: Number(e.target.value)})}
 className={`w-full bg-zinc-900 p-3 rounded-xl font-black ${color} outline-none border border-zinc-700 focus:border-emerald-500`}
 />
 </div>
 ))}
 </div>
 </div>
 )}

 <button onClick={saveMatch}
 className={`w-full py-5 rounded-2xl font-black text-xl flex justify-center items-center gap-2 shadow-xl transition-all ${
 isBuilding === 'Wheel' ? 'bg-purple-500 hover:bg-purple-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'
 }`}>
 <Save size={22}/> SAVE MATCHUP
 </button>
 </div>
 )}

 {/* ACTIVE MATCHES */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 mb-2">
 <Target size={18} className="text-zinc-600"/>
 <h3 className="text-lg font-black text-zinc-500">ACTIVE MATCHES ({matches.length})</h3>
 </div>

 {matches.length === 0 && (
 <p className="text-zinc-700 font-black text-sm p-8 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800 text-center">
 NO MATCHUPS CONFIGURED YET
 </p>
 )}

 {matches.map(m => {
 const isWheel = m.type === 'Wheel'
 const color = isWheel ? 'text-purple-400' : m.type==='TvT' ? 'text-blue-400' : m.type==='2v2' ? 'text-amber-400' : 'text-emerald-400'
 const sideALabel = m.type==='2v2' ? `${m.sideA} + ${m.sideA2}` : isWheel ? m.wheelPlayers?.join(', ') : m.sideA
 return (
 <div key={m.id} className="bg-zinc-900 p-5 rounded-[2rem] border-2 border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div className="flex-1 bg-black p-4 rounded-xl border border-zinc-800 min-w-0">
 {isWheel ? (
 <div>
 <div className="text-[9px] font-black text-purple-500 tracking-widest mb-1">WHEEL BET</div>
 <div className="flex flex-wrap gap-1">
 {(m.wheelPlayers||[]).map((p:string) => (
 <span key={p} className="text-purple-400 font-black text-xs bg-purple-500/10 px-2 py-0.5 rounded-lg">{p}</span>
 ))}
 </div>
 </div>
 ) : (
 <div className="flex items-center justify-between">
 <span className={`font-black text-sm truncate ${color}`}>{m.type==='2v2'?`${m.sideA}+${m.sideA2}`:m.sideA}</span>
 <Sword size={14} className="text-zinc-600 mx-2 flex-shrink-0"/>
 <span className={`font-black text-sm truncate text-right ${color}`}>{m.type==='2v2'?`${m.sideB}+${m.sideB2}`:m.sideB}</span>
 </div>
 )}
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-400">{m.type}</span>
 <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${m.scoringType==='GROSS'?'bg-rose-500/20 text-rose-400':'bg-emerald-500/20 text-emerald-400'}`}>
 {m.scoringType||'NET'}
 </span>
 {isWheel && <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-400">{m.wheelFormat==='nassau'?`N:$${m.wheelNassau}`:`$${m.wheelAmount}`}/PAIR</span>}
 {!isWheel && <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-400">N:${m.nassau} B:${m.birdie} E:${m.eagle}</span>}
 {(m.type==='PvP'||m.type==='2v2') && (
 <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${m.autoPress!==false?'bg-yellow-500/20 text-yellow-400':'bg-zinc-800 text-zinc-600'}`}>
 {m.autoPress!==false?<Zap size={10}/>:<ZapOff size={10}/>}
 {m.autoPress!==false?'PRESS':'NO PRESS'}
 </span>
 )}
 </div>
 <button onClick={() => deleteMatch(m.id)} className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0">
 <Trash2 size={20}/>
 </button>
 </div>
 )
 })}
 </div>
 </div>
 </div>
 )
}