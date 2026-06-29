"use client"
import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, Save, Flag, AlertTriangle, Camera, Loader2, BookOpen, Trash2, CheckCircle2, X, RefreshCw, Check } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_HOLES = Array.from({ length: 18 }, (_, i) => ({ par: 4, hcp: i + 1 }))

export default function CourseSetup() {
 const [courseName, setCourseName] = useState("")
 const [holes, setHoles] = useState(DEFAULT_HOLES)
 const [error, setError] = useState("")
 const [isScanning, setIsScanning] = useState(false)
 const [savedCourses, setSavedCourses] = useState<any[]>([])
 const [showHistory, setShowHistory] = useState(false)
 const [saveSuccess, setSaveSuccess] = useState(false)

 // Scan review state
 const [scanPreview, setScanPreview] = useState<{ par: number; hcp: number }[] | null>(null)

 const fileInputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
 onValue(ref(db, 'tournament/course'), snap => {
 if (snap.val()) {
 setCourseName(snap.val().name || "")
 if (snap.val().holes) setHoles(snap.val().holes)
 }
 })
 onValue(ref(db, 'courseHistory'), snap => {
 if (snap.val()) {
 const list = Object.values(snap.val()) as any[]
 setSavedCourses(list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)))
 } else {
 setSavedCourses([])
 }
 })
 }, [])

 const updateHole = (index: number, field: 'par' | 'hcp', value: number) => {
 const newHoles = [...holes]
 newHoles[index] = { ...newHoles[index], [field]: value }
 setHoles(newHoles)
 }

 const updatePreviewHole = (index: number, field: 'par' | 'hcp', value: number) => {
 if (!scanPreview) return
 const updated = [...scanPreview]
 updated[index] = { ...updated[index], [field]: value }
 setScanPreview(updated)
 }

 const clearCourse = () => {
 if (!confirm("CLEAR ALL HOLE DATA?")) return
 setCourseName("")
 setHoles(DEFAULT_HOLES)
 setError("")
 setScanPreview(null)
 }

 const compressImage = (file: File): Promise<string> => {
 return new Promise((resolve) => {
 const reader = new FileReader()
 reader.onload = (event) => {
 const img = new Image()
 img.onload = () => {
 const canvas = document.createElement('canvas')
 const maxWidth = 1000
 const scale = Math.min(maxWidth / img.width, 1)
 canvas.width = img.width * scale
 canvas.height = img.height * scale
 const ctx = canvas.getContext('2d')
 ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
 resolve(canvas.toDataURL('image/jpeg', 0.7))
 }
 img.src = event.target?.result as string
 }
 reader.readAsDataURL(file)
 })
 }

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 setIsScanning(true)
 setError("")
 setScanPreview(null)
 try {
 const compressedBase64 = await compressImage(file)
 const res = await fetch('/api/scan-scorecard', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ imageBase64: compressedBase64 })
 })
 const data = await res.json()
 if (res.ok && data.success && data.holes?.length === 18) {
 // Show preview instead of immediately applying
 setScanPreview(data.holes)
 } else {
 setError(`SCAN FAILED: ${data.error || "Could not parse scorecard."}`)
 }
 } catch (err: any) {
 setError("NETWORK ERROR: Check your connection.")
 } finally {
 setIsScanning(false)
 if (fileInputRef.current) fileInputRef.current.value = ''
 }
 }

 // Accept scan results — apply to main holes
 const acceptScan = () => {
 if (!scanPreview) return
 setHoles(scanPreview)
 setScanPreview(null)
 }

 const acceptAndSave = async () => {
 if (!scanPreview) return
 if (!courseName.trim()) {
 setHoles(scanPreview)
 setScanPreview(null)
 setError("SCAN ACCEPTED · PLEASE ENTER A COURSE NAME AND TAP SAVE")
 return
 }
 const hcpSet = new Set(scanPreview.map(h => h.hcp))
 const hcpWarning = hcpSet.size !== 18 ? "⚠️ HCP RATINGS NOT ALL UNIQUE — SAVED. REVIEW WHEN POSSIBLE." : ""
 const courseData = { name: courseName.trim(), holes: scanPreview, pars: scanPreview.map(h => h.par) }
 await set(ref(db, 'tournament/course'), courseData)
 const alreadySaved = savedCourses.find((c:any) => c.name.toLowerCase() === courseName.trim().toLowerCase())
 if (!alreadySaved) {
 const hRef = push(ref(db, 'courseHistory'))
 await set(hRef, { id: hRef.key, savedAt: Date.now(), ...courseData })
 } else {
 await set(ref(db, `courseHistory/${alreadySaved.id}`), {
 ...alreadySaved,
 holes: scanPreview,
 pars: scanPreview.map(h => h.par),
 savedAt: Date.now()
 })
 }
 setHoles(scanPreview)
 setScanPreview(null)
 setError(hcpWarning)
 setSaveSuccess(true)
 setTimeout(() => setSaveSuccess(false), 3000)
 }

 // Discard scan results
 const discardScan = () => {
 setScanPreview(null)
 }

 const saveCourse = async () => {
 if (!courseName.trim()) return setError("PLEASE ENTER A COURSE NAME")
 // Warn about non-unique HCP but don't block saving
 const hcpSet = new Set(holes.map(h => h.hcp))
 const hcpWarning = hcpSet.size !== 18 ? "⚠️ HCP RATINGS NOT ALL UNIQUE — SAVED. REVIEW WHEN POSSIBLE." : ""
 setError(hcpWarning)

 const courseData = {
 name: courseName.trim(),
 holes,
 pars: holes.map(h => h.par)
 }

 await set(ref(db, 'tournament/course'), courseData)

 const alreadySaved = savedCourses.find(c => c.name.toLowerCase() === courseName.trim().toLowerCase())
 if (!alreadySaved) {
 const hRef = push(ref(db, 'courseHistory'))
 await set(hRef, { id: hRef.key, savedAt: Date.now(), ...courseData })
 } else {
 await set(ref(db, `courseHistory/${alreadySaved.id}`), {
 ...alreadySaved,
 holes,
 pars: holes.map(h => h.par),
 savedAt: Date.now()
 })
 }

 setSaveSuccess(true)
 setTimeout(() => setSaveSuccess(false), 3000)
 }

 const loadCourse = (course: any) => {
 setCourseName(course.name)
 setHoles(course.holes)
 setError("")
 setShowHistory(false)
 setScanPreview(null)
 }

 const deleteSavedCourse = async (courseId: string, e: React.MouseEvent) => {
 e.stopPropagation()
 if (!confirm("REMOVE FROM HISTORY?")) return
 await set(ref(db, `courseHistory/${courseId}`), null)
 }

 const front9 = holes.slice(0, 9)
 const back9 = holes.slice(9, 18)
 const frontPar = front9.reduce((sum, h) => sum + h.par, 0)
 const backPar = back9.reduce((sum, h) => sum + h.par, 0)

 const previewFront = scanPreview?.slice(0, 9) || []
 const previewBack = scanPreview?.slice(9, 18) || []
 const previewFrontPar = previewFront.reduce((sum, h) => sum + h.par, 0)
 const previewBackPar = previewBack.reduce((sum, h) => sum + h.par, 0)

 // Reusable scorecard table renderer
 const renderScorecardTable = (
 nineHoles: { par: number; hcp: number }[],
 startHole: number,
 totalPar: number,
 label: string,
 onUpdate: (index: number, field: 'par' | 'hcp', value: number) => void,
 baseIndex: number,
 highlight = false
 ) => (
 <div>
 <div className={`text-[10px] font-black tracking-widest mb-3 ${highlight ? 'text-amber-400' : 'text-zinc-600'}`}>
 {label}
 </div>
 <div className="overflow-x-auto rounded-2xl border border-zinc-800">
 <table className="w-full text-center">
 <thead>
 <tr className="bg-zinc-950">
 <th className="py-3 px-4 text-left text-xs text-zinc-500 font-black w-20">HOLE</th>
 {nineHoles.map((_, i) => (
 <th key={i} className="py-3 px-2 text-sm font-black text-zinc-400 w-12">{startHole + i}</th>
 ))}
 <th className="py-3 px-4 text-sm font-black text-zinc-500">{startHole === 1 ? 'OUT' : 'IN'}</th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-t border-zinc-800">
 <td className="py-3 px-4 text-left text-xs font-black text-emerald-500">PAR</td>
 {nineHoles.map((hole, i) => (
 <td key={i} className="py-2 px-1">
 <select
 value={hole.par}
 onChange={e => onUpdate(baseIndex + i, 'par', Number(e.target.value))}
 className={`w-10 text-white text-sm font-black text-center rounded-lg py-2 outline-none border transition-colors cursor-pointer
 ${highlight ? 'bg-amber-500/20 border-amber-500/50 focus:border-amber-400' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 focus:border-emerald-500'}`}
 >
 <option value={3}>3</option>
 <option value={4}>4</option>
 <option value={5}>5</option>
 </select>
 </td>
 ))}
 <td className="py-3 px-4 font-black text-emerald-400 text-base">{totalPar}</td>
 </tr>
 <tr className="border-t border-zinc-800 bg-black/40">
 <td className="py-3 px-4 text-left text-xs font-black text-blue-400">HCP</td>
 {nineHoles.map((hole, i) => (
 <td key={i} className="py-2 px-1">
 <input
 type="number"
 value={hole.hcp}
 onChange={e => onUpdate(baseIndex + i, 'hcp', Number(e.target.value))}
 className={`w-10 text-sm font-black text-center rounded-lg py-2 outline-none border transition-colors
 ${highlight ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 focus:border-amber-400' : 'bg-zinc-800 hover:bg-zinc-700 text-blue-300 border-zinc-700 focus:border-blue-500'}`}
 min={1}
 max={18}
 />
 </td>
 ))}
 <td className="py-3 px-4 text-zinc-600 font-black text-xs">—</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 )

 return (
 <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
 <Link href="/setup"className="text-emerald-500 font-black mb-8 inline-block">
 <ArrowLeft size={18} className="inline mr-2"/> HUB
 </Link>

 <div className="max-w-5xl mx-auto space-y-6">

 {/* HEADER */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex items-center gap-3 text-emerald-500">
 <Flag size={32}/>
 <h1 className="text-4xl font-black">Course Setup</h1>
 </div>
 <div className="flex gap-3 w-full sm:w-auto">
 <button
 onClick={() => setShowHistory(!showHistory)}
 className="flex-1 sm:flex-none bg-zinc-900 border-2 border-zinc-700 hover:border-blue-500 text-zinc-300 px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors text-sm"
 >
 <BookOpen size={18} className="text-blue-400"/>
 SAVED ({savedCourses.length})
 </button>
 <input type="file"accept="image/*"capture="environment"ref={fileInputRef} onChange={handleImageUpload} className="hidden"/>
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isScanning}
 className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors text-sm disabled:bg-zinc-800 disabled:text-zinc-500"
 >
 {isScanning
 ? <><Loader2 size={18} className="animate-spin"/> SCANNING...</>
 : <><Camera size={18}/> SCAN CARD</>
 }
 </button>
 </div>
 </div>

 {/* COURSE HISTORY */}
 {showHistory && (
 <div className="bg-zinc-900 rounded-3xl border-2 border-blue-500/30 p-6 space-y-3">
 <div className="flex justify-between items-center mb-2">
 <h3 className="font-black text-blue-400 text-sm tracking-widest">SAVED COURSES</h3>
 <button onClick={() => setShowHistory(false)}><X size={18} className="text-zinc-500"/></button>
 </div>
 {savedCourses.length === 0 && (
 <p className="text-zinc-600 text-sm font-black text-center py-4">NO SAVED COURSES YET</p>
 )}
 {savedCourses.map(course => (
 <button
 key={course.id}
 onClick={() => loadCourse(course)}
 className="w-full flex justify-between items-center bg-black border border-zinc-800 hover:border-blue-500 p-4 rounded-2xl transition-all group"
 >
 <div className="text-left">
 <div className="font-black text-white group-hover:text-blue-400 transition-colors">{course.name}</div>
 <div className="text-[10px] text-zinc-600 font-black mt-0.5">
 PAR {course.pars?.reduce((a: number, b: number) => a + b, 0) || 72} · {new Date(course.savedAt).toLocaleDateString()}
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">LOAD</span>
 <button onClick={(e) => deleteSavedCourse(course.id, e)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1">
 <Trash2 size={16}/>
 </button>
 </div>
 </button>
 ))}
 </div>
 )}

 {/* ERROR */}
 {error && (
 <div className="bg-rose-500/20 text-rose-400 p-4 rounded-xl font-black flex items-center gap-2 border border-rose-500/30 text-sm">
 <AlertTriangle size={16}/> {error}
 </div>
 )}

 {/* SUCCESS */}
 {saveSuccess && (
 <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-xl font-black flex items-center gap-2 border border-emerald-500/30 text-sm">
 <CheckCircle2 size={16}/> COURSE SAVED SUCCESSFULLY
 </div>
 )}

 {/* ── SCAN REVIEW PANEL ── */}
 {scanPreview && (
 <div className="bg-zinc-900 rounded-[2.5rem] border-2 border-amber-500/50 overflow-hidden shadow-2xl shadow-amber-500/10">
 
 {/* Review header */}
 <div className="p-6 border-b-2 border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
 <h2 className="text-xl font-black text-amber-400">REVIEW SCAN RESULTS</h2>
 </div>
 <p className="text-zinc-500 text-xs font-black mt-1 tracking-wider">
 CHECK ALL VALUES BEFORE ACCEPTING · EDIT ANY THAT LOOK WRONG
 </p>
 </div>
 <div className="flex gap-3 w-full sm:w-auto">
 <button
 onClick={discardScan}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 px-5 py-3 rounded-2xl font-black text-sm transition-colors"
 >
 <RefreshCw size={16}/> RESCAN
 </button>
 <button
 onClick={acceptScan}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-3 rounded-2xl font-black text-sm transition-colors"
 >
 <Check size={16}/> ACCEPT ONLY
 </button>
 <button
 onClick={acceptAndSave}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-black text-sm transition-colors shadow-lg"
 >
 <Save size={16}/> ACCEPT & SAVE
 </button>
 </div>
 </div>

 {/* Preview scorecard — editable */}
 <div className="p-4 sm:p-6 space-y-6">
 {renderScorecardTable(previewFront, 1, previewFrontPar, 'FRONT 9 — VERIFY BELOW', updatePreviewHole, 0, true)}
 {renderScorecardTable(previewBack, 10, previewBackPar, 'BACK 9 — VERIFY BELOW', updatePreviewHole, 9, true)}
 <div className="flex justify-end">
 <div className="bg-black border border-amber-500/30 rounded-2xl px-6 py-3 flex items-center gap-4">
 <span className="text-zinc-600 text-xs font-black">SCANNED TOTAL PAR</span>
 <span className={`text-2xl font-black ${previewFrontPar + previewBackPar === 72 ? 'text-emerald-400' : 'text-amber-400'}`}>
 {previewFrontPar + previewBackPar}
 {previewFrontPar + previewBackPar !== 72 && <span className="text-xs ml-2 text-amber-500">≠ 72</span>}
 </span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ── MAIN COURSE EDITOR ── */}
 <div className={`bg-zinc-900 rounded-[2.5rem] border-2 overflow-hidden transition-all ${scanPreview ? 'border-zinc-800 opacity-50 pointer-events-none' : 'border-zinc-800'}`}>

 {/* Course name + actions */}
 <div className="p-6 border-b-2 border-zinc-800 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
 <input
 value={courseName}
 onChange={e => setCourseName(e.target.value)}
 className="flex-1 bg-black border-2 border-zinc-700 focus:border-emerald-500 p-4 rounded-2xl font-black text-2xl outline-none text-white transition-colors"
 placeholder="COURSE NAME"
 />
 <div className="flex gap-3">
 <button
 onClick={clearCourse}
 className="bg-zinc-800 hover:bg-rose-500/20 hover:border-rose-500 border-2 border-zinc-700 text-zinc-400 hover:text-rose-400 px-5 py-4 rounded-2xl font-black text-sm transition-all"
 >
 CLEAR
 </button>
 <button
 onClick={saveCourse}
 className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 justify-center transition-colors shadow-lg"
 >
 <Save size={18}/> SAVE
 </button>
 </div>
 </div>

 <div className="p-4 sm:p-6 space-y-6">
 {renderScorecardTable(front9, 1, frontPar, 'FRONT 9', updateHole, 0)}
 {renderScorecardTable(back9, 10, backPar, 'BACK 9', updateHole, 9)}
 <div className="flex justify-end">
 <div className="bg-black border border-zinc-800 rounded-2xl px-6 py-3 flex items-center gap-4">
 <span className="text-zinc-600 text-xs font-black">TOTAL PAR</span>
 <span className="text-emerald-400 text-2xl font-black">{frontPar + backPar}</span>
 </div>
 </div>
 </div>

 </div>

 {scanPreview && (
 <p className="text-center text-amber-500/60 text-xs font-black tracking-widest">
 ↑ ACCEPT OR RESCAN ABOVE TO EDIT THE COURSE
 </p>
 )}

 </div>
 </div>
 )
}