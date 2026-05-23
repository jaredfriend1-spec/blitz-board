"use client"
import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { Home, CheckCircle2, Lock, Unlock, Eye, EyeOff, Archive } from 'lucide-react'
import Link from 'next/link'

const ADMIN_PIN = "jeff"

// ── GOLF SCORING SYMBOL ────────────────────────────────────────────
function ScoreCell({ score, par, onChange, editable }: {
 score: number; par: number; onChange: (val: number) => void; editable: boolean
}) {
 const diff = score > 0 ? score - par : null
 let innerClass = ""
 let textClass = "text-sm font-black"

 if (diff === null) {
 innerClass = "w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800"
 textClass = "text-sm font-black text-zinc-700"
 } else if (diff <= -2) {
 innerClass = "w-11 h-11 rounded-full bg-black border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-[3px] ring-offset-black"
 textClass = "text-sm font-black text-yellow-300"
 } else if (diff === -1) {
 innerClass = "w-11 h-11 rounded-full bg-black border-2 border-red-500"
 textClass = "text-sm font-black text-red-400"
 } else if (diff === 0) {
 innerClass = "w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700"
 textClass = "text-sm font-black text-white"
 } else if (diff === 1) {
 innerClass = "w-11 h-11 rounded-sm bg-black border-2 border-zinc-400"
 textClass = "text-sm font-black text-zinc-300"
 } else if (diff === 2) {
 innerClass = "w-11 h-11 rounded-sm bg-black border-2 border-zinc-400 ring-2 ring-zinc-600 ring-offset-[3px] ring-offset-black"
 textClass = "text-sm font-black text-zinc-400"
 } else {
 innerClass = "w-11 h-11 rounded-sm bg-zinc-800 border-2 border-zinc-600"
 textClass = "text-sm font-black text-zinc-500"
 }

 return (
 <div className="relative flex items-center justify-center">
 <div className={`${innerClass} flex items-center justify-center`}>
 {editable ? (
 <input
 type="number"
 value={score || ""}
 onChange={e => onChange(parseInt(e.target.value) || 0)}
 className="w-full h-full text-center bg-transparent outline-none font-black text-sm"
 style={{ color: 'inherit' }}
 min={1} max={12}
 />
 ) : (
 <span className={textClass}>{score || ''}</span>
 )}
 </div>
 </div>
 )
}

function ToPar({ raw, par }: { raw: number; par: number }) {
 if (!raw) return <span className="text-zinc-700">—</span>
 const diff = raw - par
 if (diff === 0) return <span className="text-white font-black">E</span>
 if (diff > 0) return <span className="text-rose-400 font-black">+{diff}</span>
 return <span className="text-emerald-400 font-black">{diff}</span>
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
 let timer: ReturnType<typeof setTimeout>
 return (...args: Parameters<T>) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

export default function ScorerPage() {
 const [scores, setScores] = useState<Record<string, number[]>>({})
 const [course, setCourse] = useState<any>({ pars: Array(18).fill(4) })
 const [teams, setTeams] = useState<any[]>([])
 const [players, setPlayers] = useState<any[]>([])
 const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'>('idle')

 // Edit mode PIN gate
 const [editMode, setEditMode] = useState(false)
 const [isAdmin, setIsAdmin] = useState(false)
 const [activeMode, setActiveMode] = useState('')
 const [showPinModal, setShowPinModal] = useState(false)
 const [pinInput, setPinInput] = useState('')
 const [pinError, setPinError] = useState(false)
 const [showPin, setShowPin] = useState(false)

 useEffect(() => {
 // Check session storage for edit mode and role
 if (sessionStorage.getItem('scorer-edit') === 'true') setEditMode(true)
 setIsAdmin(sessionStorage.getItem('role') === 'admin')
 onValue(ref(db,'tournament/scores'), snap => snap.val() && setScores(snap.val()))
 onValue(ref(db,'tournament/course'), snap => snap.val() && setCourse(snap.val()))
 onValue(ref(db,'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
 onValue(ref(db,'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
 }, [])

 const saveScores = useCallback(
 debounce(async (s: Record<string, number[]>) => {
 setSaveStatus('saving')
 await set(ref(db,'tournament/scores'), s)
 setSaveStatus('saved')
 setTimeout(() => setSaveStatus('idle'), 2000)
 }, 800),
 []
 )

 const updateScore = (pid: string, holeIdx: number, val: number) => {
 if (!editMode) return
 const current = scores[pid] || Array(18).fill(0)
 const updated = [...current]
 updated[holeIdx] = val
 const newScores = { ...scores, [pid]: updated }
 setScores(newScores)
 saveScores(newScores)
 }

 const submitPin = () => {
 if (pinInput === ADMIN_PIN) {
 setEditMode(true)
 sessionStorage.setItem('scorer-edit', 'true')
 setShowPinModal(false)
 setPinInput('')
 setPinError(false)
 } else {
 setPinError(true)
 setPinInput('')
 setTimeout(() => setPinError(false), 2000)
 }
 }

 const lockScorer = () => {
 setEditMode(false)
 sessionStorage.removeItem('scorer-edit')
 }

 const pars = course.pars || Array(18).fill(4)
 const frontPar = pars.slice(0,9).reduce((a:number,b:number)=>a+b,0)
 const backPar = pars.slice(9,18).reduce((a:number,b:number)=>a+b,0)
 const totalPar = frontPar + backPar

 // Show empty state only if no players at all — teams optional for 1v1/wheel
 if (players.length === 0) {
 return (
 <div className="min-h-screen bg-black text-white font-sans">
 <div className="max-w-7xl mx-auto flex justify-between items-center p-4 border-b border-zinc-900">
 <Link href="/"className="text-emerald-500 font-black flex items-center gap-2"><Home size={20}/> HUB</Link>
 <h1 className="text-xl font-black text-emerald-400">Live Scorer</h1>
 <div className="w-16"/>
 </div>
 <div className="text-center pt-32 max-w-lg mx-auto px-6">
 <p className="text-5xl mb-4">⛳</p>
 <h1 className="text-3xl font-black text-rose-500 mb-4">NOT SET UP YET</h1>
 {isAdmin ? (
 <>
 <p className="text-zinc-500 mb-10 font-black text-sm normal-case">Add players to the roster and assign them to teams first.</p>
 <Link href="/setup/roster"className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black hover:bg-emerald-400 transition-colors">
 GO TO ROSTER →
 </Link>
 </>
 ) : (
 <p className="text-zinc-500 font-black text-sm normal-case leading-relaxed">
 The admin hasn't set up today's match yet. Check back soon or ask the admin to configure the round.
 </p>
 )}
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-black text-white font-sans pb-8">

 {/* Top bar */}
 <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900">
 <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
 <Link href="/"className="text-emerald-500 font-black flex items-center gap-2 text-sm"><Home size={18}/> HUB</Link>
 <h1 className="text-lg font-black text-white tracking-tighter">LIVE SCORER</h1>
 <div className="flex items-center gap-3">
 {/* Save status */}
 <span className="text-xs font-black">
 {saveStatus==='saving' && <span className="text-zinc-500 animate-pulse">SAVING...</span>}
 {saveStatus==='saved' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={14}/> SAVED</span>}
 </span>
 {/* Edit mode indicator - minimal */}
 {editMode && (
 <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
 <Unlock size={11}/> EDITING
 </span>
 )}
 </div>
 </div>
 </div>



 {/* Legend */}
 <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto border-b border-zinc-900/50">
 {[
 { label:'EAGLE', cls:'w-5 h-5 rounded-full border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-[2px] ring-offset-black' },
 { label:'BIRDIE', cls:'w-5 h-5 rounded-full border-2 border-red-500' },
 { label:'PAR', cls:'w-5 h-5 rounded bg-zinc-800 border border-zinc-600' },
 { label:'BOGEY', cls:'w-5 h-5 rounded-sm border-2 border-zinc-400' },
 { label:'DBL', cls:'w-5 h-5 rounded-sm border-2 border-zinc-400 ring-2 ring-zinc-600 ring-offset-[2px] ring-offset-black' },
 ].map(item => (
 <div key={item.label} className="flex items-center gap-1.5 flex-shrink-0">
 <div className={item.cls}/>
 <span className="text-[9px] font-black text-zinc-600 tracking-wider">{item.label}</span>
 </div>
 ))}
 </div>

 <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-6 space-y-10">

 {/* Lock/Unlock — TOP */}
 <div className="px-2">
 {editMode ? (
 <button onClick={lockScorer}
 className="w-full flex items-center justify-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/40 hover:border-emerald-500 text-emerald-400 py-4 rounded-2xl font-bold text-sm transition-all">
 <Lock size={18}/> Lock Scorer
 </button>
 ) : (
 <button onClick={() => setShowPinModal(true)}
 className="w-full flex items-center justify-center gap-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-4 rounded-2xl font-bold text-sm transition-all">
 <Unlock size={18}/> Unlock to Edit Scores
 </button>
 )}
 </div>

 {/* If no teams (1v1/wheel), show all players in one card */}
 {teams.length === 0 && players.length > 0 && (
 <div className="bg-zinc-950 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-2xl">
 <div className="bg-zinc-900 px-6 py-4 border-b-2 border-zinc-800 flex items-center justify-between">
 <h2 className="text-xl font-bold text-emerald-400 tracking-tight">Players</h2>
 <span className="text-[10px] text-zinc-600 font-semibold">{players.length} PLAYERS</span>
 </div>
 <div className="overflow-x-auto">
 <table className="border-collapse" style={{minWidth:'780px',width:'100%'}}>
 <thead>
 <tr className="bg-black">
 <th className="sticky left-0 bg-black z-20 border-r border-zinc-800 text-left px-4 py-2 text-[10px] text-zinc-600 font-black min-w-[130px]">PLAYER</th>
 {pars.slice(0,9).map((p:number,i:number) => (
 <th key={i} className="px-1 py-2 text-center w-12">
 <div className="text-[10px] text-zinc-500 font-black">{i+1}</div>
 <div className="text-[9px] text-zinc-700 font-black">p{p}</div>
 </th>
 ))}
 <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
 <div className="text-[10px] text-blue-400 font-black">OUT</div>
 <div className="text-[9px] text-zinc-600 font-black">{frontPar}</div>
 </th>
 {pars.slice(9,18).map((p:number,i:number) => (
 <th key={i+9} className="px-1 py-2 text-center w-12">
 <div className="text-[10px] text-zinc-500 font-black">{i+10}</div>
 <div className="text-[9px] text-zinc-700 font-black">p{pars[i+9]}</div>
 </th>
 ))}
 <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
 <div className="text-[10px] text-blue-400 font-black">IN</div>
 <div className="text-[9px] text-zinc-600 font-black">{backPar}</div>
 </th>
 <th className="px-3 py-2 text-center w-20 bg-emerald-950/60 border-l border-zinc-800">
 <div className="text-[10px] text-emerald-400 font-black">TOT</div>
 <div className="text-[9px] text-zinc-600 font-black">{totalPar}</div>
 </th>
 </tr>
 </thead>
 <tbody>
 {players.map((p:any) => {
 const sc = scores[p.id] || Array(18).fill(0)
 const f9 = sc.slice(0,9).reduce((a:number,b:number)=>a+(Number(b)||0),0)
 const b9 = sc.slice(9,18).reduce((a:number,b:number)=>a+(Number(b)||0),0)
 const tot = f9+b9
 const topar = tot - totalPar
 return (
 <tr key={p.id} className="border-t border-zinc-900 hover:bg-zinc-900/20 transition-colors">
 <td className="sticky left-0 bg-black z-10 border-r border-zinc-800 px-4 py-3 min-w-[130px]">
 <div className="font-bold text-sm text-white">{p.name}</div>
 <div className="text-[9px] text-zinc-600 font-semibold">HCP {p.handicap||0}</div>
 </td>
 {Array.from({length:9},(_,i)=>i).map(i => (
 <td key={i} className="px-1 py-2 text-center w-12">
 <ScoreCell score={sc[i]} par={pars[i]} editable={editMode} onChange={val=>updateScore(p.id,i,val)}/>
 </td>
 ))}
 <td className="px-2 py-2 text-center w-14 bg-zinc-900/40">
 <span className={`text-sm font-bold ${f9>0?(f9-frontPar<0?'text-emerald-400':f9-frontPar>0?'text-rose-400':'text-white'):'text-zinc-700'}`}>
 {f9||'—'}
 </span>
 </td>
 {Array.from({length:9},(_,i)=>i+9).map(i => (
 <td key={i} className="px-1 py-2 text-center w-12">
 <ScoreCell score={sc[i]} par={pars[i]} editable={editMode} onChange={val=>updateScore(p.id,i,val)}/>
 </td>
 ))}
 <td className="px-2 py-2 text-center w-14 bg-zinc-900/40">
 <span className={`text-sm font-bold ${b9>0?(b9-backPar<0?'text-emerald-400':b9-backPar>0?'text-rose-400':'text-white'):'text-zinc-700'}`}>
 {b9||'—'}
 </span>
 </td>
 <td className="px-3 py-2 text-center w-20 bg-emerald-950/20 border-l border-zinc-800">
 <div className={`text-base font-bold ${tot>0?(topar<0?'text-emerald-400':topar>0?'text-rose-400':'text-white'):'text-zinc-700'}`}>{tot||'—'}</div>
 {tot>0&&<div className={`text-[9px] font-bold ${topar<0?'text-emerald-400':topar>0?'text-rose-400':'text-zinc-500'}`}>{topar===0?'E':topar>0?`+${topar}`:topar}</div>}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {teams.map(team => {
 const teamPlayers = (team.playerIds || []).map((pid: string) => players.find(p => p.id === pid)).filter(Boolean)
 return (
 <div key={team.id} className="bg-zinc-950 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-2xl">
 <div className="bg-zinc-900 px-6 py-4 border-b-2 border-zinc-800 flex items-center justify-between">
 <h2 className="text-xl font-black text-emerald-400 tracking-tight">{team.name}</h2>
 <span className="text-[10px] text-zinc-600 font-black">{teamPlayers.length} PLAYERS</span>
 </div>
 <div className="overflow-x-auto">
 <table className="border-collapse"style={{minWidth:'780px',width:'100%'}}>
 <thead>
 <tr className="bg-black">
 <th className="sticky left-0 bg-black z-20 border-r border-zinc-800 text-left px-4 py-2 text-[10px] text-zinc-600 font-black min-w-[130px]">PLAYER</th>
 {pars.slice(0,9).map((p:number,i:number) => (
 <th key={i} className="px-1 py-2 text-center w-12">
 <div className="text-[10px] text-zinc-500 font-black">{i+1}</div>
 <div className="text-[9px] text-zinc-700 font-black">p{p}</div>
 </th>
 ))}
 <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
 <div className="text-[10px] text-blue-400 font-black">OUT</div>
 <div className="text-[9px] text-zinc-600 font-black">{frontPar}</div>
 </th>
 {pars.slice(9,18).map((p:number,i:number) => (
 <th key={i+9} className="px-1 py-2 text-center w-12">
 <div className="text-[10px] text-zinc-500 font-black">{i+10}</div>
 <div className="text-[9px] text-zinc-700 font-black">p{p}</div>
 </th>
 ))}
 <th className="px-2 py-2 text-center w-14 bg-zinc-900/80">
 <div className="text-[10px] text-blue-400 font-black">IN</div>
 <div className="text-[9px] text-zinc-600 font-black">{backPar}</div>
 </th>
 <th className="px-3 py-2 text-center w-20 bg-emerald-950/60 border-l border-zinc-800">
 <div className="text-[10px] text-emerald-500 font-black">TOT</div>
 <div className="text-[9px] text-zinc-600 font-black">{totalPar}</div>
 </th>
 </tr>
 </thead>
 <tbody>
 {teamPlayers.map((p:any) => {
 const pScores = scores[p.id] || Array(18).fill(0)
 const f9Raw = pScores.slice(0,9).reduce((a:number,b:number)=>a+(b||0),0)
 const b9Raw = pScores.slice(9,18).reduce((a:number,b:number)=>a+(b||0),0)
 const totRaw = f9Raw + b9Raw
 const hasAny = pScores.some((s:number)=>s>0)
 return (
 <tr key={p.id} className="border-t border-zinc-900 hover:bg-zinc-900/30 transition-colors">
 <td className="sticky left-0 bg-zinc-950 z-20 border-r border-zinc-800 px-4 py-3">
 <div className="font-black text-sm text-white leading-tight">{p.name}</div>
 <div className="text-[9px] text-zinc-600 font-black mt-0.5">HCP {p.handicap||0}</div>
 </td>
 {pScores.slice(0,9).map((sc:number,i:number) => (
 <td key={i} className="px-0.5 py-2 text-center">
 <ScoreCell score={sc} par={pars[i]} editable={editMode} onChange={val=>updateScore(p.id,i,val)}/>
 </td>
 ))}
 <td className="px-2 py-2 text-center bg-zinc-900/50 border-x border-zinc-800">
 <div className="font-black text-base text-white">{f9Raw||'—'}</div>
 {hasAny && <div className="text-[10px]"><ToPar raw={f9Raw} par={frontPar}/></div>}
 </td>
 {pScores.slice(9,18).map((sc:number,i:number) => (
 <td key={i+9} className="px-0.5 py-2 text-center">
 <ScoreCell score={sc} par={pars[i+9]} editable={editMode} onChange={val=>updateScore(p.id,i+9,val)}/>
 </td>
 ))}
 <td className="px-2 py-2 text-center bg-zinc-900/50 border-x border-zinc-800">
 <div className="font-black text-base text-white">{b9Raw||'—'}</div>
 {hasAny && <div className="text-[10px]"><ToPar raw={b9Raw} par={backPar}/></div>}
 </td>
 <td className="px-3 py-2 text-center bg-emerald-950/40 border-l border-zinc-800">
 <div className="font-black text-lg text-white">{totRaw||'—'}</div>
 {hasAny && <div className="text-sm font-black"><ToPar raw={totRaw} par={totalPar}/></div>}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )
 })}
 </div>

 {/* ── BOTTOM ACTION BAR ── */}
 <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 space-y-3">
 {editMode && (
 <button
 onClick={() => { setEditMode(false); sessionStorage.removeItem('scorer-edit') }}
 className="w-full flex items-center justify-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/40 hover:border-emerald-500 text-emerald-400 py-4 rounded-2xl font-bold text-sm transition-all"
 >
 <Lock size={18}/> Lock Scorer
 </button>
 )}
 {!editMode && (
 <button
 onClick={() => setShowPinModal(true)}
 className="w-full flex items-center justify-center gap-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-4 rounded-2xl font-bold text-sm transition-all"
 >
 <Unlock size={18}/> Unlock to Edit Scores
 </button>
 )}
 {activeMode === 'match' && (
 <button
 onClick={async () => {
 if (!window.confirm('Archive this match to History and close it?')) return
 const { ref: fbRef, set: fbSet, get: fbGet } = await import('firebase/database')
 const snap = await fbGet(fbRef(db, 'tournament'))
 if (snap.exists()) {
 const { ref: fbRef2, set: fbSet2, push: fbPush } = await import('firebase/database')
 await fbSet(fbRef(db, `history/${Date.now()}`), {
 ...snap.val(),
 _meta: { mode: 'match', dayLabel: 'Quick Match', archivedAt: Date.now(), courseName: snap.val().course?.name || '' }
 })
 }
 await fbSet(fbRef(db, 'tournament'), null)
 window.location.href = '/history'
 }}
 className="w-full flex items-center justify-center gap-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-700 hover:border-amber-500 text-zinc-500 hover:text-amber-400 py-4 rounded-2xl font-bold text-sm transition-all"
 >
 <Archive size={18}/> Archive Match to History
 </button>
 )}
 </div>

 {/* PIN MODAL */}
 {showPinModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl p-8 space-y-6">
 <div className="text-center">
 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${pinError?'bg-rose-500/20 border-2 border-rose-500/50 animate-bounce':'bg-zinc-800 border-2 border-zinc-700'}`}>
 <Lock size={24} className={pinError?'text-rose-400':'text-zinc-400'}/>
 </div>
 <h2 className="font-black text-xl">Unlock Scorer</h2>
 <p className="text-zinc-600 text-xs font-black normal-case mt-1">Enter admin PIN to enable score editing</p>
 </div>
 <div className="relative">
 <input
 type={showPin?'text':'password'}
 value={pinInput}
 onChange={e=>setPinInput(e.target.value)}
 onKeyDown={e=>e.key==='Enter'&&submitPin()}
 className={`w-full bg-zinc-800 border-2 p-4 rounded-2xl font-black text-2xl text-center outline-none tracking-[0.5em] transition-all ${pinError?'border-rose-500 text-rose-400':'border-zinc-700 focus:border-emerald-500 text-white'}`}
 placeholder="····"
 autoFocus
 />
 <button onClick={()=>setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
 {showPin?<EyeOff size={18}/>:<Eye size={18}/>}
 </button>
 </div>
 {pinError && <p className="text-rose-400 text-xs font-black text-center tracking-widest">INCORRECT PIN</p>}
 <div className="flex gap-3">
 <button onClick={()=>{setShowPinModal(false);setPinInput('');setPinError(false)}}
 className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-2xl font-black text-sm transition-colors">CANCEL</button>
 <button onClick={submitPin}
 className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-2xl font-black text-sm transition-colors">UNLOCK</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}