"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, push, onValue } from 'firebase/database'
import { ArrowLeft, Save, CheckCircle2, Info, AlertTriangle, X, BookOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type BallType = 'net' | 'gross'
type Ball = { type: BallType }
type FormatSpec = { par3: Ball[]; par4: Ball[]; par5: Ball[]; name: string }

const JEFFS_BLITZ: FormatSpec = {
 name: "Jeff's Blitz",
 par3: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
 par4: [{ type: 'net' }, { type: 'net' }],
 par5: [{ type: 'net' }, { type: 'net' }],
}

function formatSummary(balls: Ball[]): string {
 const gross = balls.filter(b => b.type === 'gross').length
 const net = balls.filter(b => b.type === 'net').length
 const parts = []
 if (gross > 0) parts.push(`${gross} Gross`)
 if (net > 0) parts.push(`${net} Net`)
 return `Best ${parts.join(' + ')}`
}

function ParSection({ label, balls, onChange, warning }: {
 label: string; balls: Ball[]; onChange: (b: Ball[]) => void; warning?: boolean
}) {
 const setBallCount = (count: number) => {
 onChange(Array.from({ length: count }, (_, i) => balls[i] || { type: 'net' as BallType }))
 }
 const toggleBallType = (index: number) => {
 const updated = [...balls]
 updated[index] = { type: updated[index].type === 'net' ? 'gross' : 'net' }
 onChange(updated)
 }
 return (
 <div className={`border rounded-2xl p-5 space-y-4 ${warning ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-white font-black">{label}</span>
 {warning && <AlertTriangle size={14} className="text-amber-400"/>}
 </div>
 <span className="text-zinc-500 text-xs font-black">{formatSummary(balls)}</span>
 </div>
 <div>
 <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">NUMBER OF BALLS</p>
 <div className="flex gap-2">
 {[1,2,3,4].map(n => (
 <button key={n} onClick={() => setBallCount(n)}
 className={`w-11 h-11 rounded-xl font-black text-lg border-2 transition-all ${
 balls.length === n
 ? warning ? 'bg-amber-500 border-amber-400 text-black' : 'bg-white text-black border-white'
 : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'
 }`}>{n}</button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">BALL TYPES — TAP TO TOGGLE</p>
 <div className="flex gap-2 flex-wrap">
 {balls.map((ball, i) => (
 <button key={i} onClick={() => toggleBallType(i)}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${
 ball.type === 'net'
 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
 : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
 }`}>
 <span className="text-[10px] text-zinc-500 font-black">#{i+1}</span>
 {ball.type === 'net' ? 'NET' : 'GROSS'}
 </button>
 ))}
 </div>
 </div>
 </div>
 )
}

export default function FormatPage() {
 // null = nothing selected yet
 const [mode, setMode] = useState<'blitz'|'custom'|null>(null)
 const [customFormat, setCustomFormat] = useState<FormatSpec>({
 name: '',
 par3: [{ type: 'net' }, { type: 'net' }],
 par4: [{ type: 'net' }, { type: 'net' }],
 par5: [{ type: 'net' }, { type: 'net' }],
 })
 const [saved, setSaved] = useState(false)
 const [minTeamSize, setMinTeamSize] = useState<number|null>(null)
 const [scoresExist, setScoresExist] = useState(false)
 const [currentFormatName, setCurrentFormatName] = useState("Jeff's Blitz")
 const [showConfirm, setShowConfirm] = useState(false)
 const [savedFormats, setSavedFormats] = useState<any[]>([])
 const [showLibrary, setShowLibrary] = useState(false)

 useEffect(() => {
 onValue(ref(db,'tournament/format'), snap => {
 if (snap.val()) setCurrentFormatName(snap.val().name || "Jeff's Blitz")
 })
 onValue(ref(db,'tournament/teams'), snap => {
 if (!snap.val()) { setMinTeamSize(null); return }
 const teams = Object.values(snap.val()) as any[]
 const sizes = teams.map(t => (t.playerIds||[]).length).filter(s => s > 0)
 setMinTeamSize(sizes.length > 0 ? Math.min(...sizes) : null)
 })
 onValue(ref(db,'tournament/scores'), snap => {
 if (!snap.val()) { setScoresExist(false); return }
 const all = Object.values(snap.val()) as number[][]
 setScoresExist(all.some(s => Array.isArray(s) && s.some(v => v > 0)))
 })
 onValue(ref(db,'savedFormats'), snap => {
 if (snap.val()) {
 const list = Object.entries(snap.val()).map(([key, val]: [string, any]) => ({ id: key, ...val }))
 setSavedFormats(list.sort((a,b) => (b.savedAt||0) - (a.savedAt||0)))
 } else {
 setSavedFormats([])
 }
 })
 }, [])

 const activeFormat = mode === 'blitz' ? JEFFS_BLITZ : customFormat
 const newFormatName = mode === 'blitz' ? "Jeff's Blitz": customFormat.name
 const isChanging = newFormatName !== currentFormatName

 const maxBallsNeeded = mode ? Math.max(activeFormat.par3.length, activeFormat.par4.length, activeFormat.par5.length) : 0
 const hasTeamSizeWarning = mode && minTeamSize !== null && maxBallsNeeded > minTeamSize
 const warnPar3 = !!(mode && minTeamSize !== null && activeFormat.par3.length > minTeamSize)
 const warnPar4 = !!(mode && minTeamSize !== null && activeFormat.par4.length > minTeamSize)
 const warnPar5 = !!(mode && minTeamSize !== null && activeFormat.par5.length > minTeamSize)

 const handleSave = () => {
 if (!mode) return
 if (mode === 'custom' && !customFormat.name.trim()) return alert("PLEASE ENTER A FORMAT NAME")
 if (scoresExist && isChanging) setShowConfirm(true)
 else doSave()
 }

 const doSave = async () => {
 const toSave = mode === 'blitz' ? JEFFS_BLITZ : customFormat
 await set(ref(db,'tournament/format'), toSave)
 if (mode === 'custom' && customFormat.name.trim()) {
 const existing = savedFormats.find(f => f.name.toLowerCase() === customFormat.name.toLowerCase())
 if (existing) {
 await set(ref(db,`savedFormats/${existing.id}`), { ...customFormat, savedAt: Date.now(), id: existing.id })
 } else {
 const fRef = push(ref(db,'savedFormats'))
 await set(fRef, { ...customFormat, savedAt: Date.now(), id: fRef.key })
 }
 }
 setShowConfirm(false)
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 }

 const loadFromLibrary = (format: any) => {
 setMode('custom')
 setCustomFormat({ name: format.name, par3: format.par3, par4: format.par4, par5: format.par5 })
 setShowLibrary(false)
 }

 const deleteFromLibrary = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation()
 if (confirm("REMOVE THIS FORMAT FROM LIBRARY?")) {
 await set(ref(db,`savedFormats/${id}`), null)
 }
 }

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
 <Link href="/setup/admin"className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
 <ArrowLeft size={18}/> CHECKLIST
 </Link>

 <div className="max-w-xl mx-auto space-y-6">

 <div>
 <h1 className="text-4xl font-black tracking-tight mb-1">Team Scoring Format</h1>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">
 Currently active: <span className="text-white">{currentFormatName}</span>
 </p>
 </div>

 {/* Info strips */}
 {minTeamSize !== null && (
 <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
 <Info size={14} className="text-zinc-500 flex-shrink-0"/>
 <p className="text-zinc-500 text-xs font-black normal-case">
 Smallest team: <span className="text-white">{minTeamSize} players</span> — safe up to {minTeamSize} balls per hole.
 </p>
 </div>
 )}
 {scoresExist && (
 <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
 <Info size={14} className="text-blue-400 flex-shrink-0"/>
 <p className="text-blue-300 text-xs font-black normal-case">Scores are in play — changing format will ask for confirmation.</p>
 </div>
 )}
 {saved && (
 <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2">
 <CheckCircle2 size={16}/> FORMAT SAVED{mode==='custom'?' · ADDED TO LIBRARY':''}
 </div>
 )}

 {/* ── THREE CHOICES ── */}
 <div className="space-y-3">

 {/* Jeff's Blitz */}
 <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${
 mode==='blitz' ? 'border-emerald-500/60' : 'border-zinc-800'
 }`}>
 <button onClick={() => setMode(mode==='blitz' ? null : 'blitz')}
 className={`w-full p-5 text-left flex items-center justify-between transition-all ${
 mode==='blitz' ? 'bg-emerald-950/30' : 'bg-zinc-900 hover:bg-zinc-800'
 }`}>
 <div className="flex items-center gap-4">
 <span className="text-2xl">⭐</span>
 <div>
 <div className={`font-black text-sm ${mode==='blitz'?'text-emerald-400':'text-zinc-300'}`}>Jeff's Blitz</div>
 <div className="text-[10px] font-black text-zinc-600 normal-case mt-0.5">Best 2 Net / Best 3 Net on par 3s</div>
 </div>
 </div>
 <CheckCircle2 size={18} className={`flex-shrink-0 transition-opacity ${mode==='blitz'?'text-emerald-400 opacity-100':'opacity-0'}`}/>
 </button>
 {/* Jeff's Blitz detail inline */}
 {mode === 'blitz' && (
 <div className="border-t border-emerald-500/20 bg-emerald-950/10 px-5 py-4 space-y-2">
 {[
 { label:'Par 3', desc:'Best 3 Net scores', warn: warnPar3 },
 { label:'Par 4', desc:'Best 2 Net scores', warn: warnPar4 },
 { label:'Par 5', desc:'Best 2 Net scores', warn: warnPar5 },
 ].map(row => (
 <div key={row.label} className="flex justify-between items-center text-sm font-black">
 <span className="flex items-center gap-2 text-zinc-500">
 {row.warn && <AlertTriangle size={12} className="text-amber-400"/>}
 {row.label}
 </span>
 <span className={row.warn?'text-amber-400':'text-emerald-400'}>{row.desc}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Configure Custom — expands inline */}
 <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${
 mode==='custom' ? 'border-purple-500/60' : 'border-zinc-800'
 }`}>
 <button onClick={() => setMode(mode==='custom' ? null : 'custom')}
 className={`w-full p-5 text-left flex items-center justify-between transition-all ${
 mode==='custom' ? 'bg-purple-950/20' : 'bg-zinc-900 hover:bg-zinc-800'
 }`}>
 <div className="flex items-center gap-4">
 <span className="text-2xl">⚙️</span>
 <div>
 <div className={`font-black text-sm ${mode==='custom'?'text-purple-400':'text-zinc-300'}`}>Configure Custom</div>
 <div className="text-[10px] font-black text-zinc-600 normal-case mt-0.5">
 {mode==='custom' ? 'Set ball count and type per par below ↓' : 'Set your own ball count and types per par'}
 </div>
 </div>
 </div>
 <CheckCircle2 size={18} className={`flex-shrink-0 transition-opacity ${mode==='custom'?'text-purple-400 opacity-100':'opacity-0'}`}/>
 </button>

 {/* Custom configurator — expands inside the card */}
 {mode === 'custom' && (
 <div className="border-t border-purple-500/20 bg-purple-950/10 p-5 space-y-4">

 {/* Name */}
 <div>
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-2">FORMAT NAME</label>
 <input value={customFormat.name}
 onChange={e => setCustomFormat(prev => ({...prev, name: e.target.value}))}
 className="w-full bg-black border-2 border-zinc-700 focus:border-purple-500 p-3 rounded-2xl font-black text-white outline-none transition-colors"
 placeholder="E.G. 1 GROSS 2 NET"
 autoFocus
 />
 </div>

 {/* Load from library if any saved */}
 {savedFormats.length > 0 && (
 <div>
 <button onClick={() => setShowLibrary(!showLibrary)}
 className="text-blue-400 text-[10px] font-black hover:text-blue-300 transition-colors flex items-center gap-1.5 mb-2">
 <BookOpen size={11}/> LOAD FROM LIBRARY ({savedFormats.length}) {showLibrary?'▲':'▼'}
 </button>
 {showLibrary && (
 <div className="bg-black rounded-2xl border border-zinc-800 p-3 space-y-2">
 {savedFormats.map(f => (
 <button key={f.id} onClick={() => loadFromLibrary(f)}
 className="w-full flex items-center justify-between hover:bg-zinc-900 p-3 rounded-xl transition-all group">
 <div className="text-left">
 <div className="font-black text-sm text-white group-hover:text-blue-400 transition-colors">{f.name}</div>
 <div className="text-[9px] text-zinc-600 font-black mt-0.5 normal-case">
 P3: {formatSummary(f.par3)} · P4: {formatSummary(f.par4)} · P5: {formatSummary(f.par5)}
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className="text-[9px] text-blue-500 font-black opacity-0 group-hover:opacity-100">LOAD</span>
 <button onClick={e => deleteFromLibrary(f.id, e)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1">
 <Trash2 size={12}/>
 </button>
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {hasTeamSizeWarning && (
 <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3">
 <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
 <p className="text-amber-300/70 text-xs font-black normal-case">
 Format needs <strong>{maxBallsNeeded} balls</strong> but smallest team has <strong>{minTeamSize} players</strong>.
 </p>
 </div>
 )}

 <ParSection label="PAR 3"balls={customFormat.par3} warning={warnPar3}
 onChange={balls => setCustomFormat(prev => ({...prev, par3: balls}))}/>
 <ParSection label="PAR 4"balls={customFormat.par4} warning={warnPar4}
 onChange={balls => setCustomFormat(prev => ({...prev, par4: balls}))}/>
 <ParSection label="PAR 5"balls={customFormat.par5} warning={warnPar5}
 onChange={balls => setCustomFormat(prev => ({...prev, par5: balls}))}/>

 <div className="flex gap-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
 <Info size={12} className="text-blue-400 flex-shrink-0 mt-0.5"/>
 <p className="text-blue-300 text-[10px] font-black normal-case leading-relaxed">
 Each player counts once per hole. Engine finds the best combination automatically. This format saves to the Library when you save.
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Library — standalone (when not in custom mode) */}
 {mode !== 'custom' && (
 <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${
 showLibrary ? 'border-blue-500/40' : 'border-zinc-800'
 }`}>
 <button onClick={() => setShowLibrary(!showLibrary)}
 className={`w-full p-5 text-left flex items-center justify-between transition-all ${
 showLibrary ? 'bg-blue-950/10' : 'bg-zinc-900 hover:bg-zinc-800'
 }`}>
 <div className="flex items-center gap-4">
 <span className="text-2xl">📚</span>
 <div>
 <div className={`font-black text-sm ${showLibrary?'text-blue-400':'text-zinc-300'}`}>Format Library</div>
 <div className="text-[10px] font-black text-zinc-600 normal-case mt-0.5">
 {savedFormats.length > 0 ? `${savedFormats.length} saved format${savedFormats.length > 1 ? 's' : ''} — tap to load` : 'No saved formats yet'}
 </div>
 </div>
 </div>
 {showLibrary ? <ChevronUp size={18} className="text-zinc-500 flex-shrink-0"/> : <ChevronDown size={18} className="text-zinc-500 flex-shrink-0"/>}
 </button>
 {showLibrary && (
 <div className="border-t border-zinc-800 bg-black/30 p-4 space-y-2">
 {savedFormats.length === 0 ? (
 <p className="text-zinc-600 text-xs font-black text-center py-4 normal-case">
 No saved formats yet — configure a custom format and save it.
 </p>
 ) : (
 savedFormats.map(f => (
 <button key={f.id} onClick={() => loadFromLibrary(f)}
 className="w-full flex items-center justify-between bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-blue-500 p-4 rounded-xl transition-all group">
 <div className="text-left">
 <div className="font-black text-sm text-white group-hover:text-blue-400 transition-colors">{f.name}</div>
 <div className="text-[9px] text-zinc-600 font-black mt-0.5 normal-case">
 P3: {formatSummary(f.par3)} · P4: {formatSummary(f.par4)} · P5: {formatSummary(f.par5)}
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0 ml-3">
 <span className="text-[9px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">LOAD</span>
 <button onClick={e => deleteFromLibrary(f.id, e)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1">
 <Trash2 size={14}/>
 </button>
 </div>
 </button>
 ))
 )}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Save button — only when a mode is selected */}
 {mode && (
 <>
 <button onClick={handleSave}
 className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-colors shadow-lg">
 <Save size={20}/> SAVE FORMAT
 </button>
 <Link href="/setup/admin"
 className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs font-black tracking-widest py-2 block transition-colors">
 ← BACK WITHOUT SAVING
 </Link>
 </>
 )}

 {!mode && (
 <Link href="/setup/admin"
 className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs font-black tracking-widest py-4 block transition-colors border border-zinc-900 rounded-2xl">
 ← BACK TO CHECKLIST
 </Link>
 )}
 </div>

 {/* CONFIRMATION MODAL */}
 {showConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <div className="w-full max-w-md bg-zinc-900 rounded-[2rem] border-2 border-amber-500/50 shadow-2xl overflow-hidden">
 <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
 <div className="flex items-center gap-3">
 <AlertTriangle size={20} className="text-amber-400"/>
 <h2 className="font-black text-base text-amber-400">Scores In Play</h2>
 </div>
 <button onClick={() => setShowConfirm(false)}><X size={18} className="text-zinc-500 hover:text-white"/></button>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-zinc-300 text-sm font-black normal-case leading-relaxed">
 Changing from <span className="text-white">"{currentFormatName}"</span> to <span className="text-white">"{newFormatName}"</span> while scores are in play.
 </p>
 <p className="text-amber-400 text-xs font-black normal-case">
 ⚠ All team match payouts will recalculate immediately.
 </p>
 <div className="flex gap-3 pt-2">
 <button onClick={doSave}
 className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-black text-sm transition-colors">
 Yes, Change Format
 </button>
 <button onClick={() => setShowConfirm(false)}
 className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black text-sm transition-colors">
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}