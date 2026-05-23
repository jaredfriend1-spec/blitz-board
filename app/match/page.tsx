"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, push, onValue } from 'firebase/database'
import {
 ArrowLeft, ArrowRight, Flag, Users, Layers, Sword, Play,
 Check, X, Plus, Trash2, Zap, ZapOff, ChevronRight,
 AlertTriangle, Loader2, User, RefreshCw, Pencil, Camera, Save, Archive
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── CONSTANTS ─────────────────────────────────────────────────────
const JEFFS_BLITZ = {
 name: "Jeff's Blitz",
 par3: [{type:'net'},{type:'net'},{type:'net'}],
 par4: [{type:'net'},{type:'net'}],
 par5: [{type:'net'},{type:'net'}],
}

const STEPS = ['Course', 'Players', 'Teams', 'Format', 'Matches']

export default function QuickMatch() {
 const router = useRouter()
 const [step, setStep] = useState(0)
 const [loading, setLoading] = useState(false)
 const [checkingExisting, setCheckingExisting] = useState(true)
 const [existingWarning, setExistingWarning] = useState(false)
 const [existingTripName, setExistingTripName] = useState('')

 // Course
 const [courseName, setCourseName] = useState('')
 const [holes, setHoles] = useState(Array.from({length:18}, (_, i) => ({ par: 4, hcp: i + 1 })))
 const [savedCourses, setSavedCourses] = useState<any[]>([])
 const [showCourseLibrary, setShowCourseLibrary] = useState(false)
 const [isScanning, setIsScanning] = useState(false)
 const [scanPreview, setScanPreview] = useState<any[]|null>(null)
 const [scanError, setScanError] = useState('')
 const fileInputRef = typeof window !== 'undefined' ? { current: null as HTMLInputElement|null } : { current: null as HTMLInputElement|null }

 // Players
 const [players, setPlayers] = useState<{id:string, name:string, handicap:number}[]>([])
 const [newName, setNewName] = useState('')
 const [newHcp, setNewHcp] = useState('')
 const [globalRoster, setGlobalRoster] = useState<any[]>([])
 const [showRosterPicker, setShowRosterPicker] = useState(false)
 const [editingHcp, setEditingHcp] = useState<string|null>(null)
 const [editingHcpVal, setEditingHcpVal] = useState(0)

 // Teams
 const [skipTeams, setSkipTeams] = useState(false)
 const [teams, setTeams] = useState<{id:string, name:string, playerIds:string[]}[]>([])
 const [teamCount, setTeamCount] = useState(2)
 const [teamNames, setTeamNames] = useState(['Team 1', 'Team 2'])
 const [teamsCreated, setTeamsCreated] = useState(false)

 // Format
 const [formatMode, setFormatMode] = useState<'blitz'|'custom'>('blitz')
 const [savedFormats, setSavedFormats] = useState<any[]>([])
 const [selectedSavedFormat, setSelectedSavedFormat] = useState<any>(null)
 const [customFormatBalls, setCustomFormatBalls] = useState({
 par3: [{type:'net'},{type:'net'},{type:'net'}],
 par4: [{type:'net'},{type:'net'}],
 par5: [{type:'net'},{type:'net'}],
 })

 // Matches
 const [matches, setMatches] = useState<any[]>([])
 const [buildingType, setBuildingType] = useState<string|null>(null)
 const [matchDraft, setMatchDraft] = useState({
 sideA:'', sideB:'', sideA2:'', sideB2:'',
 nassau:5, press:5, birdie:2, eagle:5,
 scoringType:'NET' as 'NET'|'GROSS',
 autoPress:true,
 wheelPlayers:['','','',''] as string[],
 wheelAmount:10,
 wheelFormat:'straight' as 'straight'|'nassau',
 wheelNassau:5, wheelPress:5, wheelAutoPress:true,
 })

 // Toast
 const [toast, setToast] = useState<string|null>(null)
 const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(null),2500) }

 const updateHole = (index: number, field: 'par'|'hcp', value: number) => {
 setHoles(prev => { const n=[...prev]; n[index]={...n[index],[field]:value}; return n })
 }

 const compressImage = (file: File): Promise<string> => {
 return new Promise(resolve => {
 const reader = new FileReader()
 reader.onload = e => {
 const img = new Image()
 img.onload = () => {
 const canvas = document.createElement('canvas')
 const scale = Math.min(1000/img.width, 1)
 canvas.width = img.width*scale; canvas.height = img.height*scale
 canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
 resolve(canvas.toDataURL('image/jpeg', 0.7))
 }
 img.src = e.target?.result as string
 }
 reader.readAsDataURL(file)
 })
 }

 const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 setIsScanning(true); setScanError('')
 try {
 const base64 = await compressImage(file)
 const res = await fetch('/api/scan-scorecard', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageBase64:base64}) })
 const data = await res.json()
 if (res.ok && data.success && data.holes?.length === 18) {
 setScanPreview(data.holes)
 } else {
 setScanError(data.error || 'Could not parse scorecard')
 }
 } catch { setScanError('Network error — check connection') }
 finally { setIsScanning(false); if(e.target) e.target.value='' }
 }

 const acceptScan = () => {
 if (!scanPreview) return
 setHoles(scanPreview)
 setScanPreview(null)
 showToast('✓ Scorecard accepted')
 }

 const [existingMatchMode, setExistingMatchMode] = useState(false)

 const [addingToExisting, setAddingToExisting] = useState(false)
 useEffect(() => {
 // Check for existing tournament data
 get(ref(db,'tournament/meta')).then(async snap => {
 const m = snap.val()
 if (m && m.mode === 'match') {
 // Existing quick match — offer to continue or restart
 setExistingMatchMode(true)
 setCheckingExisting(false)
 } else if (m && m.tripName && !m.isMock) {
 setExistingTripName(m.tripName)
 setExistingWarning(true)
 setCheckingExisting(false)
 } else {
 setCheckingExisting(false)
 }
 })
 // Load course history (shared with tournament)
 onValue(ref(db,'courseHistory'), snap => {
 if (snap.val()) {
 const list = Object.values(snap.val()) as any[]
 setSavedCourses(list.sort((a,b) => (b.savedAt||0)-(a.savedAt||0)))
 }
 })
 // Also try to pre-load current tournament course
 get(ref(db,'tournament/course')).then(snap => {
 if (snap.val()?.name) {
 // Don't auto-load — just make it available in library
 }
 })
 // Load global roster
 onValue(ref(db,'globalRoster'), snap => {
 if (snap.val()) {
 const list = Object.values(snap.val()) as any[]
 setGlobalRoster(list.sort((a:any,b:any) => a.name.localeCompare(b.name)))
 }
 })
 // Load saved formats
 onValue(ref(db,'savedFormats'), snap => {
 if (snap.val()) setSavedFormats(Object.values(snap.val()) as any[])
 })
 }, [])

 // ── CONTINUE EXISTING QUICK MATCH ───────────────────────────────
 const continueExistingMatch = async () => {
 setLoading(true)
  setAddingToExisting(true)
 // Pre-load course
 const courseSnap = await get(ref(db,'tournament/course'))
 if (courseSnap.val()) {
 setCourseName(courseSnap.val().name || '')
 if (courseSnap.val().holes?.length === 18) setHoles(courseSnap.val().holes)
 }
 // Pre-load players
 const rosterSnap = await get(ref(db,'tournament/roster'))
 if (rosterSnap.val()) {
 const ps = Object.values(rosterSnap.val()) as any[]
 setPlayers(ps.map(p => ({ id: p.id, name: p.name, handicap: p.handicap || 0 })))
 }
 // Pre-load teams
 const teamsSnap = await get(ref(db,'tournament/teams'))
 if (teamsSnap.val()) {
 const ts = Object.values(teamsSnap.val()) as any[]
 setTeams(ts.map(t => ({ id: t.id, name: t.name, playerIds: t.playerIds || [] })))
 setTeamsCreated(true)
 setSkipTeams(false)
 }
 // Pre-load existing matches
 const matchSnap = await get(ref(db,'tournament/matchups'))
 if (matchSnap.val()) {
 setMatches(Object.values(matchSnap.val()) as any[])
 }
 setLoading(false)
 setExistingMatchMode(false)
 setStep(4) // Jump straight to matches step
 }

 const startFreshWithArchive = async () => {
 setLoading(true)
 const snap = await get(ref(db, 'tournament'))
 if (snap.exists()) {
 await set(ref(db, `history/${Date.now()}`), {
 ...snap.val(),
 _meta: { mode:'match', dayLabel:'Quick Match', archivedAt:Date.now(), courseName:snap.val().course?.name||'' }
 })
 }
 await set(ref(db,'tournament'), null)
 setLoading(false)
 setExistingMatchMode(false)
 }

 const startFreshDiscard = async () => {
 await set(ref(db,'tournament'), null)
 setExistingMatchMode(false)
 }


 // ── ARCHIVE EXISTING + START MATCH ──────────────────────────────
 const archiveAndStart = async () => {
 setLoading(true)
 const snap = await get(ref(db,'tournament'))
 if (snap.exists()) {
 await set(ref(db,`history/${Date.now()}`), {
 ...snap.val(),
 _meta: { tripName: existingTripName, dayLabel: 'Archived', archivedAt: Date.now() }
 })
 }
 await set(ref(db,'tournament'), null)
 setLoading(false)
 setExistingWarning(false)
 }

 // ── PLAYERS ───────────────────────────────────────────────────────
 const addPlayer = () => {
 if (!newName.trim()) return
 const id = `p_${Date.now()}`
 setPlayers(prev => [...prev, { id, name: newName.trim().toUpperCase(), handicap: Number(newHcp)||0 }])
 setNewName(''); setNewHcp('')
 }

 const loadFromRoster = (rosterPlayer: any) => {
 const already = players.find(p => p.name === rosterPlayer.name)
 if (already) return showToast(`${rosterPlayer.name} already added`)
 const id = `p_${Date.now()}_${Math.random().toString(36).slice(2)}`
 setPlayers(prev => [...prev, { id, name: rosterPlayer.name, handicap: rosterPlayer.handicap || 0 }])
 showToast(`✓ Added ${rosterPlayer.name}`)
 }

 const loadAllFromRoster = () => {
 let added = 0
 globalRoster.forEach(rp => {
 const already = players.find(p => p.name === rp.name)
 if (!already) {
 const id = `p_${Date.now()}_${Math.random().toString(36).slice(2)}_${added}`
 setPlayers(prev => [...prev, { id, name: rp.name, handicap: rp.handicap || 0 }])
 added++
 }
 })
 setShowRosterPicker(false)
 showToast(`✓ Added ${added} player${added !== 1 ? 's' : ''} from roster`)
 }

 const removePlayer = (id: string) => {
 setPlayers(prev => prev.filter(p => p.id !== id))
 setTeams(prev => prev.map(t => ({ ...t, playerIds: t.playerIds.filter(pid => pid !== id) })))
 }

 const saveHcp = (id: string) => {
 setPlayers(prev => prev.map(p => p.id===id ? {...p, handicap: editingHcpVal} : p))
 setEditingHcp(null)
 }

 // ── TEAMS ─────────────────────────────────────────────────────────
 const buildTeams = () => {
 const newTeams = teamNames.map((name, i) => ({
 id: `t_${i}`, name: name.trim() || `Team ${i+1}`, playerIds: []
 }))
 setTeams(newTeams)
 setTeamsCreated(true)
 }

 const assignPlayer = (playerId: string, teamId: string) => {
 setTeams(prev => prev.map(t => {
 const hasPlayer = t.playerIds.includes(playerId)
 if (t.id === teamId) {
 if (hasPlayer) return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) }
 return { ...t, playerIds: [...t.playerIds, playerId] }
 }
 // Remove from other teams
 return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) }
 }))
 }

 const getPlayerTeam = (playerId: string) => teams.find(t => t.playerIds.includes(playerId))
 const unassigned = players.filter(p => !teams.some(t => t.playerIds.includes(p.id)))

 // ── MATCHES ───────────────────────────────────────────────────────
 const saveMatch = () => {
 const m = matchDraft
 if (buildingType === 'Wheel') {
 const filled = m.wheelPlayers.filter(Boolean)
 if (filled.length !== 4) return showToast('Select all 4 players')
 if (new Set(filled).size !== 4) return showToast('All 4 must be different')
 setMatches(prev => [...prev, { id:`m_${Date.now()}`, type:'Wheel', wheelPlayers:m.wheelPlayers, wheelAmount:m.wheelAmount, scoringType:m.scoringType, wheelFormat:m.wheelFormat, wheelNassau:m.wheelNassau, wheelPress:m.wheelPress, wheelAutoPress:m.wheelAutoPress }])
 } else if (buildingType === '2v2') {
 const picks = [m.sideA, m.sideA2, m.sideB, m.sideB2]
 if (picks.some(p=>!p)) return showToast('Select all 4 players')
 if (new Set(picks).size !== 4) return showToast('All 4 must be different')
 setMatches(prev => [...prev, { id:`m_${Date.now()}`, type:'2v2', sideA:m.sideA, sideA2:m.sideA2, sideB:m.sideB, sideB2:m.sideB2, nassau:m.nassau, press:m.press, birdie:m.birdie, eagle:m.eagle, scoringType:m.scoringType, autoPress:m.autoPress }])
 } else if (buildingType === 'TvT') {
 if (!m.sideA || !m.sideB || m.sideA===m.sideB) return showToast('Select two different teams')
 setMatches(prev => [...prev, { id:`m_${Date.now()}`, type:'TvT', sideA:m.sideA, sideB:m.sideB, nassau:m.nassau, press:m.press, birdie:m.birdie, eagle:m.eagle, scoringType:m.scoringType }])
 } else {
 if (!m.sideA || !m.sideB || m.sideA===m.sideB) return showToast('Select two different players')
 setMatches(prev => [...prev, { id:`m_${Date.now()}`, type:'PvP', sideA:m.sideA, sideB:m.sideB, nassau:m.nassau, press:m.press, birdie:m.birdie, eagle:m.eagle, scoringType:m.scoringType, autoPress:m.autoPress }])
 }
 setBuildingType(null)
 setMatchDraft({sideA:'',sideB:'',sideA2:'',sideB2:'',nassau:5,press:5,birdie:2,eagle:5,scoringType:'NET',autoPress:true,wheelPlayers:['','','',''],wheelAmount:10,wheelFormat:'straight',wheelNassau:5,wheelPress:5,wheelAutoPress:true})
 }

 // ── GO LIVE ───────────────────────────────────────────────────────
 const goLive = async () => {
 if (!courseName.trim()) return showToast('Enter a course name')
 if (players.length === 0) return showToast('Add at least 2 players')
 setLoading(true)

 // If adding to existing round — ONLY update matchups, preserve all scores
 if (addingToExisting) {
 await set(ref(db, 'tournament/matchups'), null)
 for (const m of matches) {
 const mRef = push(ref(db,'tournament/matchups'))
 await set(mRef, { id:mRef.key, ...m })
 }
 showToast('✓ Matches updated — scores preserved')
 setLoading(false)
 router.push('/scorer')
 return
 }

 // Fresh start — always archive if real match exists (safe default)
 const existingMeta = await get(ref(db,'tournament/meta'))
 const existingMetaVal = existingMeta.val()
 if (existingMetaVal && !existingMetaVal.isMock && (existingMetaVal.mode || existingMetaVal.tripName)) {
 const snap = await get(ref(db, 'tournament'))
 if (snap.exists()) {
 await set(ref(db, `history/${Date.now()}`), {
 ...snap.val(),
 _meta: { mode:'match', dayLabel:'Quick Match', archivedAt:Date.now(), courseName:snap.val().course?.name||'' }
 })
 }
 }
 await set(ref(db,'tournament'), null)
 await set(ref(db,'tournament/meta'), { isMock:false, mode:'match', currentDay:'Match Day', totalDays:1 })
 await set(ref(db,'tournament/course'), { name:courseName.trim(), holes, pars:holes.map(h=>h.par) })

 // Players
 const pidMap: Record<string,string> = {}
 for (const p of players) {
 const pRef = push(ref(db,'tournament/roster'))
 await set(pRef, { id:pRef.key, name:p.name, handicap:p.handicap })
 pidMap[p.id] = pRef.key!
 }

 // Teams
 if (!skipTeams && teamsCreated && teams.length > 0) {
 for (const t of teams) {
 const tRef = push(ref(db,'tournament/teams'))
 await set(tRef, { id:tRef.key, name:t.name, playerIds:t.playerIds.map(pid=>pidMap[pid]) })
 }
 }

 // Format
 const formatToSave = formatMode === 'blitz'
 ? JEFFS_BLITZ
 : selectedSavedFormat
 ? selectedSavedFormat
 : { name: 'Custom', ...customFormatBalls }
 await set(ref(db,'tournament/format'), formatToSave)

 // Matches — remap player names (they're already names not IDs)
 for (const m of matches) {
 const mRef = push(ref(db,'tournament/matchups'))
 await set(mRef, { id:mRef.key, ...m })
 }

 setLoading(false)
 router.push('/scorer')
 }

 // ── STEP VALIDATION ───────────────────────────────────────────────
 const canProceed = [
 courseName.trim().length > 0,
 players.length >= 2,
 true, // teams optional
 true, // format always has default
 true, // matches optional but recommended
 ][step]

 // ── LOADING / WARNING ─────────────────────────────────────────────
 if (checkingExisting) {
 return (
 <div className="min-h-screen bg-black flex items-center justify-center">
 <Loader2 size={32} className="animate-spin text-emerald-500"/>
 </div>
 )
 }

 if (existingMatchMode) {
 return (
 <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
 <div className="max-w-md w-full bg-zinc-900 rounded-[2.5rem] border-2 border-amber-500/50 p-8 space-y-6">
 <div className="flex items-center gap-3">
 <Zap size={28} className="text-amber-400 flex-shrink-0"/>
 <div>
 <h2 className="font-black text-xl">Quick Match In Progress</h2>
 <p className="text-zinc-500 text-xs font-black normal-case mt-1">
 A match is already configured
 </p>
 </div>
 </div>
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed">
 Do you want to add more matches to the current setup, or start a completely fresh match?
 </p>
 <div className="space-y-3">
 <button onClick={continueExistingMatch} disabled={loading}
 className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
 {loading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
 Add More Matches
 </button>
 <div className="border border-zinc-800 rounded-2xl p-4 space-y-2">
 <p className="text-zinc-500 text-xs font-semibold normal-case text-center">Start a completely new match:</p>
 <button onClick={startFreshWithArchive} disabled={loading}
 className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
 <Archive size={14}/> Archive Current & Start Fresh
 </button>
 <button onClick={startFreshDiscard} disabled={loading}
 className="w-full bg-transparent hover:bg-rose-950/20 border border-zinc-700 hover:border-rose-500/40 text-zinc-500 hover:text-rose-400 py-3.5 rounded-xl font-bold text-sm transition-colors">
 Discard Scores & Start Fresh
 </button>
 </div>
 <Link href="/" className="w-full block text-center text-zinc-600 hover:text-zinc-400 font-semibold text-sm py-2 transition-colors">
 Cancel — Go Back
 </Link>
 </div>
 </div>
 </div>
 )
 }

 if (existingWarning) {
 return (
 <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
 <div className="max-w-md w-full bg-zinc-900 rounded-[2.5rem] border-2 border-amber-500/50 p-8 space-y-6">
 <div className="flex items-center gap-3">
 <AlertTriangle size={28} className="text-amber-400 flex-shrink-0"/>
 <div>
 <h2 className="font-black text-xl">Tournament In Progress</h2>
 <p className="text-zinc-500 text-xs font-black normal-case mt-1">
 "{existingTripName}"is currently active
 </p>
 </div>
 </div>
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed">
 Starting a Quick Match will archive the current tournament and clear all active data. The tournament will be saved to History.
 </p>
 <div className="flex gap-3">
 <Link href="/"className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black text-sm text-center transition-colors">
 CANCEL
 </Link>
 <button onClick={archiveAndStart} disabled={loading}
 className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2">
 {loading ? <Loader2 size={16} className="animate-spin"/> : null}
 ARCHIVE & CONTINUE
 </button>
 </div>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-black text-white font-sans">

 {toast && (
 <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl">
 {toast}
 </div>
 )}

 {/* Header */}
 <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3">
 <div className="max-w-2xl mx-auto flex items-center justify-between">
 <Link href="/"className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors">
 <ArrowLeft size={16}/> HOME
 </Link>
 <span className="font-black text-sm tracking-widest text-zinc-400">⚡ QUICK MATCH</span>
 <div className="w-16"/>
 </div>
 </div>

 {/* Progress steps */}
 <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
 <div className="flex items-center gap-1">
 {STEPS.map((s, i) => (
 <div key={s} className="flex items-center gap-1 flex-1">
 <button onClick={() => i < step && setStep(i)}
 className={`flex-1 h-1.5 rounded-full transition-all ${
 i < step ? 'bg-emerald-500 cursor-pointer' :
 i === step ? 'bg-emerald-400' : 'bg-zinc-800'
 }`}/>
 {i < STEPS.length - 1 && <div className="w-1"/>}
 </div>
 ))}
 </div>
 <div className="flex justify-between mt-2 text-[9px] font-black text-zinc-600 tracking-widest">
 {STEPS.map((s,i) => (
 <span key={s} className={i===step?'text-emerald-400':''}>{s}</span>
 ))}
 </div>
 </div>

 <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

 {/* ── STEP 0: COURSE ── */}
 {step === 0 && (
 <div className="space-y-5">
 <div className="flex items-start justify-between">
 <div>
 <h2 className="text-3xl font-black tracking-tight mb-1">Course</h2>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">Where are you playing today?</p>
 </div>
 {/* Scan button */}
 <div>
 <input type="file"accept="image/*"capture="environment"
 ref={el => { if(fileInputRef) fileInputRef.current = el }}
 onChange={handleScan} className="hidden"/>
 <button onClick={() => fileInputRef.current?.click()} disabled={isScanning}
 className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 px-4 py-2.5 rounded-xl font-black text-xs transition-all disabled:opacity-50">
 {isScanning ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>}
 {isScanning ? 'SCANNING...' : 'SCAN CARD'}
 </button>
 </div>
 </div>

 {/* Scan error */}
 {scanError && (
 <div className="bg-rose-500/20 border border-rose-500/40 text-rose-400 p-3 rounded-xl font-black text-xs flex items-center gap-2">
 <AlertTriangle size={14}/> {scanError}
 </div>
 )}

 {/* Scan preview */}
 {scanPreview && (
 <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3">
 <p className="text-amber-400 font-black text-xs tracking-widest">SCAN RESULT — REVIEW BEFORE ACCEPTING</p>
 <div className="grid grid-cols-9 gap-1 text-center text-[10px]">
 {scanPreview.map((h:any, i:number) => (
 <div key={i} className="bg-black rounded-lg p-1.5">
 <div className="text-zinc-600 font-black">{i+1}</div>
 <div className="text-emerald-400 font-black">{h.par}</div>
 <div className="text-zinc-500 font-black text-[9px]">{h.hcp}</div>
 </div>
 ))}
 </div>
 <div className="flex gap-2">
 <button onClick={() => setScanPreview(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl font-black text-xs transition-colors">DISCARD</button>
 <button onClick={acceptScan} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5">
 <Check size={14}/> ACCEPT
 </button>
 </div>
 </div>
 )}

 {/* Course name */}
 <input
 value={courseName}
 onChange={e => setCourseName(e.target.value)}
 className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 p-4 rounded-2xl font-black text-white text-xl outline-none transition-colors"
 placeholder="COURSE NAME"
 autoFocus
 />

 {/* Saved courses */}
 {savedCourses.length > 0 && (
 <div>
 <button onClick={() => setShowCourseLibrary(!showCourseLibrary)}
 className="text-emerald-500 text-xs font-black hover:text-emerald-400 transition-colors flex items-center gap-1.5 mb-2">
 <Flag size={12}/> LOAD SAVED COURSE ({savedCourses.length} available)
 </button>
 {showCourseLibrary && (
 <div className="space-y-2">
 {savedCourses.map((c:any) => (
 <button key={c.id} onClick={() => {
 setCourseName(c.name)
 if (c.holes?.length === 18) setHoles(c.holes)
 setShowCourseLibrary(false)
 showToast(`✓ Loaded ${c.name}`)
 }}
 className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500 p-4 rounded-2xl transition-all text-left">
 <div>
 <div className="font-black text-sm">{c.name}</div>
 <div className="text-zinc-600 text-[10px] font-black normal-case">
 Par {(c.pars||c.holes?.map((h:any)=>h.par)||[]).reduce((a:number,b:number)=>a+b,0)} · 18 holes
 </div>
 </div>
 <span className="text-emerald-500 text-[10px] font-black">LOAD →</span>
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Scorecard table */}
 <div className="space-y-3">
 <p className="text-[10px] font-black text-zinc-500 tracking-widest">SCORECARD — PAR & HCP INDEX</p>
 {/* Front 9 */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
 <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
 <span className="text-[10px] font-black text-zinc-500 tracking-widest">FRONT 9</span>
 <span className="text-[10px] font-black text-zinc-600 ml-3">OUT: {holes.slice(0,9).reduce((a,h)=>a+h.par,0)}</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-center"style={{minWidth:'500px'}}>
 <thead>
 <tr className="border-b border-zinc-800">
 <td className="py-2 px-2 text-[10px] font-black text-zinc-600 text-left w-12">HOLE</td>
 {holes.slice(0,9).map((_,i)=><td key={i} className="py-2 px-1 text-[10px] font-black text-zinc-500 w-10">{i+1}</td>)}
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-zinc-800">
 <td className="py-2 px-2 text-[10px] font-black text-emerald-600 text-left">PAR</td>
 {holes.slice(0,9).map((h,i)=>(
 <td key={i} className="py-1.5 px-0.5">
 <select value={h.par} onChange={e=>updateHole(i,'par',Number(e.target.value))}
 className="w-full bg-zinc-800 text-emerald-400 font-black text-xs rounded-lg outline-none border border-zinc-700 text-center py-1">
 <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
 </select>
 </td>
 ))}
 </tr>
 <tr>
 <td className="py-2 px-2 text-[10px] font-black text-zinc-600 text-left">HCP</td>
 {holes.slice(0,9).map((h,i)=>(
 <td key={i} className="py-1.5 px-0.5">
 <input type="number"value={h.hcp} onChange={e=>updateHole(i,'hcp',Number(e.target.value))}
 className="w-full bg-zinc-800 text-zinc-400 font-black text-xs rounded-lg outline-none border border-zinc-700 text-center py-1"
 min={1} max={18}/>
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 {/* Back 9 */}
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
 <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
 <span className="text-[10px] font-black text-zinc-500 tracking-widest">BACK 9</span>
 <span className="text-[10px] font-black text-zinc-600 ml-3">IN: {holes.slice(9,18).reduce((a,h)=>a+h.par,0)}</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-center"style={{minWidth:'500px'}}>
 <thead>
 <tr className="border-b border-zinc-800">
 <td className="py-2 px-2 text-[10px] font-black text-zinc-600 text-left w-12">HOLE</td>
 {holes.slice(9,18).map((_,i)=><td key={i} className="py-2 px-1 text-[10px] font-black text-zinc-500 w-10">{i+10}</td>)}
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-zinc-800">
 <td className="py-2 px-2 text-[10px] font-black text-emerald-600 text-left">PAR</td>
 {holes.slice(9,18).map((h,i)=>(
 <td key={i} className="py-1.5 px-0.5">
 <select value={h.par} onChange={e=>updateHole(i+9,'par',Number(e.target.value))}
 className="w-full bg-zinc-800 text-emerald-400 font-black text-xs rounded-lg outline-none border border-zinc-700 text-center py-1">
 <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
 </select>
 </td>
 ))}
 </tr>
 <tr>
 <td className="py-2 px-2 text-[10px] font-black text-zinc-600 text-left">HCP</td>
 {holes.slice(9,18).map((h,i)=>(
 <td key={i} className="py-1.5 px-0.5">
 <input type="number"value={h.hcp} onChange={e=>updateHole(i+9,'hcp',Number(e.target.value))}
 className="w-full bg-zinc-800 text-zinc-400 font-black text-xs rounded-lg outline-none border border-zinc-700 text-center py-1"
 min={1} max={18}/>
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 <div className="flex justify-between text-[10px] font-black text-zinc-600 px-1">
 <span>TOTAL PAR: {holes.reduce((a,h)=>a+h.par,0)}</span>
 <span className="text-zinc-700 normal-case">Tap any value to edit</span>
 </div>
 </div>
 </div>
 )}

 {/* ── STEP 1: PLAYERS ── */}
 {step === 1 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-3xl font-black tracking-tight mb-1">Players</h2>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">Who's playing today?</p>
 </div>

 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
 <input
 value={newName}
 onChange={e => setNewName(e.target.value)}
 onKeyDown={e => e.key==='Enter' && addPlayer()}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none transition-colors"
 placeholder="PLAYER NAME"
 />
 <div className="flex gap-3">
 <input
 type="number"
 value={newHcp}
 onChange={e => setNewHcp(e.target.value)}
 onKeyDown={e => e.key==='Enter' && addPlayer()}
 className="w-24 bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-emerald-400 outline-none transition-colors text-center"
 placeholder="HCP"
 min={0} max={54}
 />
 <button onClick={addPlayer}
 className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-black transition-colors flex items-center justify-center gap-2">
 <Plus size={16}/> ADD
 </button>
 </div>
 </div>

 {/* Load from global roster */}
 {globalRoster.length > 0 && (
 <div>
 <button onClick={() => setShowRosterPicker(!showRosterPicker)}
 className="w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500 px-4 py-3 rounded-2xl font-black text-sm transition-all group">
 <span className="flex items-center gap-2 text-zinc-500 group-hover:text-emerald-400 transition-colors">
 <Users size={16}/> LOAD FROM ROSTER ({globalRoster.length} saved)
 </span>
 <span className="text-[10px] font-black text-zinc-700">{showRosterPicker ? '▲' : '▼'}</span>
 </button>
 {showRosterPicker && (
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mt-1 space-y-2">
 <button onClick={loadAllFromRoster}
 className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2">
 <Users size={14}/> ADD ALL FROM ROSTER
 </button>
 <div className="border-t border-zinc-800 pt-2 space-y-1.5">
 {globalRoster.map(rp => {
 const alreadyAdded = players.some(p => p.name === rp.name)
 return (
 <button key={rp.id} onClick={() => !alreadyAdded && loadFromRoster(rp)}
 disabled={alreadyAdded}
 className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-black text-sm transition-all ${
 alreadyAdded
 ? 'text-zinc-700 cursor-not-allowed'
 : 'text-white hover:bg-zinc-800 hover:text-emerald-400'
 }`}>
 <span>{rp.name}</span>
 <span className={`text-[10px] font-black ${alreadyAdded ? 'text-zinc-700' : 'text-emerald-500'}`}>
 {alreadyAdded ? '✓ ADDED' : `HCP ${rp.handicap ?? 0}`}
 </span>
 </button>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )}

 <div className="space-y-2">
 {players.length === 0 && (
 <p className="text-zinc-700 text-xs font-black text-center py-6 border border-dashed border-zinc-800 rounded-2xl">
 ADD AT LEAST 2 PLAYERS TO CONTINUE
 </p>
 )}
 {players.map(p => (
 <div key={p.id} className="flex items-center gap-3 bg-zinc-900 rounded-2xl px-4 py-3 border border-zinc-800">
 <span className="flex-1 font-black">{p.name}</span>
 {editingHcp === p.id ? (
 <div className="flex items-center gap-2">
 <input type="number"value={editingHcpVal}
 onChange={e => setEditingHcpVal(Number(e.target.value))}
 onKeyDown={e => { if(e.key==='Enter') saveHcp(p.id); if(e.key==='Escape') setEditingHcp(null) }}
 className="w-14 bg-black border border-emerald-500 text-emerald-400 px-2 py-1 rounded-lg font-black text-sm text-center outline-none"
 autoFocus min={0} max={54}
 />
 <button onClick={() => saveHcp(p.id)} className="text-emerald-400"><Check size={14}/></button>
 <button onClick={() => setEditingHcp(null)} className="text-zinc-600"><X size={14}/></button>
 </div>
 ) : (
 <button onClick={() => { setEditingHcp(p.id); setEditingHcpVal(p.handicap) }}
 className="text-emerald-500 text-xs font-black hover:text-emerald-400 group flex items-center gap-1">
 HCP {p.handicap} <Pencil size={10} className="opacity-40 group-hover:opacity-100"/>
 </button>
 )}
 <button onClick={() => removePlayer(p.id)} className="text-zinc-700 hover:text-rose-500 transition-colors">
 <Trash2 size={16}/>
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── STEP 2: TEAMS ── */}
 {step === 2 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-3xl font-black tracking-tight mb-1">Teams</h2>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">Optional — skip for 1v1 matches only</p>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button onClick={() => setSkipTeams(false)}
 className={`p-5 rounded-[1.5rem] border-2 text-left transition-all ${!skipTeams?'border-blue-500/60 bg-blue-950/20':'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}>
 <div className="text-xl mb-2">👥</div>
 <div className={`font-black text-sm ${!skipTeams?'text-blue-400':'text-zinc-300'}`}>Build Teams</div>
 <div className="text-[10px] text-zinc-600 normal-case mt-1">Team matches + best ball</div>
 {!skipTeams && <Check size={14} className="text-blue-400 mt-2"/>}
 </button>
 <button onClick={() => setSkipTeams(true)}
 className={`p-5 rounded-[1.5rem] border-2 text-left transition-all ${skipTeams?'border-zinc-500/60 bg-zinc-800/30':'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}>
 <div className="text-xl mb-2">⚡</div>
 <div className={`font-black text-sm ${skipTeams?'text-zinc-300':'text-zinc-300'}`}>Skip Teams</div>
 <div className="text-[10px] text-zinc-600 normal-case mt-1">1v1 and wheel only</div>
 {skipTeams && <Check size={14} className="text-zinc-400 mt-2"/>}
 </button>
 </div>

 {!skipTeams && (
 <div className="space-y-4">
 {!teamsCreated ? (
 <>
 <div>
 <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">NUMBER OF TEAMS</label>
 <div className="flex gap-3">
 {[2,3,4].map(n => (
 <button key={n} onClick={() => {
 setTeamCount(n)
 setTeamNames(Array.from({length:n},(_,i)=>`Team ${i+1}`))
 }}
 className={`flex-1 py-4 rounded-2xl font-black text-2xl border-2 transition-all ${teamCount===n?'bg-blue-600 border-blue-500 text-white':'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
 {n}
 </button>
 ))}
 </div>
 </div>
 <div className="space-y-2">
 {teamNames.map((name, i) => (
 <div key={i} className="flex items-center gap-3">
 <span className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm flex-shrink-0">{i+1}</span>
 <input value={name} onChange={e => { const u=[...teamNames]; u[i]=e.target.value; setTeamNames(u) }}
 className="flex-1 bg-black border border-zinc-700 focus:border-blue-500 p-3 rounded-xl font-black text-white outline-none transition-colors"
 placeholder={`Team ${i+1}`}
 />
 </div>
 ))}
 </div>
 <button onClick={buildTeams}
 className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-base transition-colors flex items-center justify-center gap-2">
 <Users size={18}/> CREATE TEAMS
 </button>
 </>
 ) : (
 <div className="space-y-4">
 {teams.map(t => {
 const members = t.playerIds.map(pid => players.find(p=>p.id===pid)).filter(Boolean)
 return (
 <div key={t.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
 <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700 flex items-center justify-between">
 <span className="font-black text-sm">{t.name}</span>
 <span className="text-zinc-600 text-[10px] font-black">{members.length} PLAYERS</span>
 </div>
 <div className="p-3 space-y-3">
 {/* Current members */}
 {members.length > 0 && (
 <div className="space-y-1.5">
 {members.map((p:any) => (
 <div key={p.id} className="flex items-center justify-between bg-black rounded-xl px-3 py-2.5 border border-zinc-800">
 <div>
 <span className="font-black text-sm text-white">{p.name}</span>
 <span className="text-zinc-500 text-[10px] font-black ml-2">HCP {p.handicap ?? 0}</span>
 </div>
 <button onClick={() => assignPlayer(p.id, t.id)}
 className="text-zinc-600 hover:text-rose-500 transition-colors p-1">
 <X size={14}/>
 </button>
 </div>
 ))}
 </div>
 )}
 {/* Unassigned player pills — tap to add */}
 {unassigned.length > 0 && (
 <div>
 <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">TAP TO ADD</p>
 <div className="flex flex-wrap gap-2">
 {unassigned.map(p => (
 <button key={p.id}
 onClick={() => assignPlayer(p.id, t.id)}
 className="flex items-center gap-2 bg-zinc-800 hover:bg-blue-600 border border-zinc-700 hover:border-blue-500 text-white hover:text-white px-3 py-2 rounded-xl font-black text-sm transition-all">
 <span>{p.name}</span>
 <span className="text-[10px] text-zinc-400 hover:text-blue-200">HCP {p.handicap ?? 0}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 {members.length === 0 && unassigned.length === 0 && (
 <p className="text-zinc-700 text-[10px] font-black text-center py-2">NO PLAYERS AVAILABLE</p>
 )}
 </div>
 </div>
 )
 })}
 {unassigned.length > 0 && (
 <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
 <p className="text-amber-400 text-[10px] font-black tracking-widest mb-2">UNASSIGNED</p>
 <div className="flex flex-wrap gap-2">
 {unassigned.map(p => <span key={p.id} className="text-amber-300 text-xs font-black bg-amber-500/10 px-2 py-1 rounded-lg">{p.name}</span>)}
 </div>
 </div>
 )}
 <button onClick={() => setTeamsCreated(false)}
 className="w-full text-zinc-600 hover:text-zinc-400 text-[10px] font-black py-2 transition-colors">
 ← REBUILD TEAMS
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 )}

 {/* ── STEP 3: FORMAT ── */}
 {step === 3 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-3xl font-black tracking-tight mb-1">Team Format</h2>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">How balls count for team matches</p>
 </div>

 {/* Jeff's Blitz card */}
 <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${formatMode==='blitz'?'border-emerald-500/60':'border-zinc-800'}`}>
 <button onClick={() => setFormatMode('blitz')}
 className={`w-full p-5 text-left flex items-center justify-between transition-all ${formatMode==='blitz'?'bg-emerald-950/30':'bg-zinc-900 hover:bg-zinc-800'}`}>
 <div className="flex items-center gap-4">
 <span className="text-2xl">⭐</span>
 <div>
 <div className={`font-black text-sm ${formatMode==='blitz'?'text-emerald-400':'text-zinc-300'}`}>Jeff's Blitz</div>
 <div className="text-[10px] text-zinc-600 normal-case mt-0.5">Best 2 Net · Best 3 Net on par 3s</div>
 </div>
 </div>
 <Check size={16} className={formatMode==='blitz'?'text-emerald-400':'text-transparent'}/>
 </button>
 {formatMode === 'blitz' && (
 <div className="border-t border-emerald-500/20 bg-emerald-950/10 px-5 py-3 space-y-1.5">
 {[['Par 3','Best 3 Net'],['Par 4','Best 2 Net'],['Par 5','Best 2 Net']].map(([label,desc])=>(
 <div key={label} className="flex justify-between text-sm font-black">
 <span className="text-zinc-500">{label}</span>
 <span className="text-emerald-400">{desc}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Configure Custom card — expands inline */}
 <div className={`rounded-[1.75rem] border-2 overflow-hidden transition-all ${formatMode==='custom'?'border-purple-500/60':'border-zinc-800'}`}>
 <button onClick={() => setFormatMode('custom')}
 className={`w-full p-5 text-left flex items-center justify-between transition-all ${formatMode==='custom'?'bg-purple-950/20':'bg-zinc-900 hover:bg-zinc-800'}`}>
 <div className="flex items-center gap-4">
 <span className="text-2xl">⚙️</span>
 <div>
 <div className={`font-black text-sm ${formatMode==='custom'?'text-purple-400':'text-zinc-300'}`}>Configure Custom</div>
 <div className="text-[10px] text-zinc-600 normal-case mt-0.5">
 {formatMode==='custom' ? 'Configure your format below ↓' : 'Set your own ball count and types per par'}
 </div>
 </div>
 </div>
 <Check size={16} className={formatMode==='custom'?'text-purple-400':'text-transparent'}/>
 </button>

 {formatMode === 'custom' && (
 <div className="border-t border-purple-500/20 bg-purple-950/10 p-5 space-y-4">

 {/* Par sections */}
 {(['par3','par4','par5'] as const).map((parKey, pi) => {
 const label = ['PAR 3','PAR 4','PAR 5'][pi]
 const balls = customFormatBalls[parKey]
 const grossCount = balls.filter((b:any)=>b.type==='gross').length
 const summary = grossCount > 0 ? `${grossCount}G + ${balls.length-grossCount}N` : `Best ${balls.length} Net`
 return (
 <div key={parKey} className="bg-black rounded-2xl border border-zinc-800 p-4 space-y-3">
 <div className="flex justify-between items-center">
 <span className="font-black text-sm">{label}</span>
 <span className="text-purple-400 text-[10px] font-black">{summary}</span>
 </div>
 <div>
 <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">NUMBER OF BALLS</p>
 <div className="flex gap-2">
 {[1,2,3,4].map(n => (
 <button key={n} onClick={() => setCustomFormatBalls(prev => ({
 ...prev,
 [parKey]: Array.from({length:n}, (_,i) => (prev[parKey] as any[])[i] || {type:'net'})
 }))}
 className={`w-11 h-11 rounded-xl font-black text-lg border-2 transition-all ${balls.length===n?'bg-white text-black border-white':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
 {n}
 </button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">TAP TO TOGGLE NET / GROSS</p>
 <div className="flex gap-2 flex-wrap">
 {balls.map((ball:any, i:number) => (
 <button key={i} onClick={() => setCustomFormatBalls(prev => {
 const updated = [...(prev[parKey] as any[])]
 updated[i] = {type: updated[i].type === 'net' ? 'gross' : 'net'}
 return {...prev, [parKey]: updated}
 })}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs border-2 transition-all ${
 ball.type==='net'?'bg-emerald-500/20 border-emerald-500/50 text-emerald-400':'bg-rose-500/20 border-rose-500/50 text-rose-400'
 }`}>
 <span className="text-[9px] text-zinc-500">#{i+1}</span>
 {ball.type==='net'?'NET':'GROSS'}
 </button>
 ))}
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {skipTeams && (
 <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
 <p className="text-zinc-600 text-[10px] font-black normal-case">Format only applies to team matches. Skip if doing 1v1 or wheel only.</p>
 </div>
 )}
 </div>
 )}

 {/* ── STEP 4: MATCHES ── */}
 {step === 4 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-3xl font-black tracking-tight mb-1">Matches & Bets</h2>
 <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">Set up your side bets</p>
 </div>

 {/* Match type selector */}
 {!buildingType && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 {type:'PvP', label:'1v1', sub:'Player vs Player', icon:<User size={22}/>, color:'hover:border-emerald-500', ic:'text-emerald-500'},
 {type:'2v2', label:'2v2', sub:'Best Ball Partners', icon:<div className="flex gap-0.5"><User size={18}/><User size={18}/></div>, color:'hover:border-amber-500', ic:'text-amber-400'},
 ...(!skipTeams&&teamsCreated?[{type:'TvT', label:'Team', sub:'Team vs Team', icon:<Users size={22}/>, color:'hover:border-blue-500', ic:'text-blue-500'}]:[]),
 {type:'Wheel', label:'Wheel', sub:'All vs All', icon:<RefreshCw size={22}/>, color:'hover:border-purple-500', ic:'text-purple-400'},
 ].map(item => (
 <button key={item.type} onClick={() => setBuildingType(item.type)}
 className={`bg-zinc-900 border-2 border-zinc-800 ${item.color} p-4 rounded-2xl font-black flex flex-col items-center gap-2 transition-all group`}>
 <div className={`${item.ic} group-hover:scale-110 transition-transform`}>{item.icon}</div>
 <div className="text-sm">{item.label}</div>
 <div className="text-[9px] text-zinc-600 normal-case">{item.sub}</div>
 </button>
 ))}
 </div>
 )}

 {/* Builder */}
 {buildingType && (
 <div className="bg-zinc-900 rounded-[2rem] border-2 border-emerald-500 p-5 space-y-4">
 <div className="flex justify-between items-center">
 <h3 className="font-black text-lg text-emerald-500">NEW {buildingType === '2v2' ? '2V2' : buildingType.toUpperCase()}</h3>
 <button onClick={() => setBuildingType(null)} className="text-zinc-500 hover:text-rose-500 font-black">CANCEL</button>
 </div>

 {/* PvP selects */}
 {buildingType === 'PvP' && (
 <div className="grid grid-cols-2 gap-3">
 {['sideA','sideB'].map((side,i) => (
 <div key={side}>
 <label className="text-[10px] font-black text-zinc-600 block mb-1.5">PLAYER {i===0?'A':'B'}</label>
 <select value={(matchDraft as any)[side]} onChange={e => setMatchDraft(d=>({...d,[side]:e.target.value}))}
 className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none text-sm">
 <option value="">SELECT...</option>
 {players.map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
 </select>
 </div>
 ))}
 </div>
 )}

 {/* 2v2 selects */}
 {buildingType === '2v2' && (
 <div className="space-y-3">
 {[['sideA','sideA2','A'],['sideB','sideB2','B']].map(([s1,s2,label]) => (
 <div key={label} className="grid grid-cols-2 gap-2">
 {[s1,s2].map((side,i) => (
 <div key={side}>
 <label className="text-[9px] font-black text-zinc-600 block mb-1">SIDE {label} · P{i+1}</label>
 <select value={(matchDraft as any)[side]} onChange={e => setMatchDraft(d=>({...d,[side]:e.target.value}))}
 className="w-full bg-black border border-zinc-700 p-2.5 rounded-xl font-black text-white outline-none text-xs">
 <option value="">SELECT...</option>
 {players.filter(p => !['sideA','sideA2','sideB','sideB2'].filter(s=>s!==side).map(s=>(matchDraft as any)[s]).includes(p.name))
 .map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
 </select>
 </div>
 ))}
 </div>
 ))}
 </div>
 )}

 {/* TvT selects */}
 {buildingType === 'TvT' && (
 <div className="grid grid-cols-2 gap-3">
 {['sideA','sideB'].map((side,i) => (
 <div key={side}>
 <label className="text-[10px] font-black text-zinc-600 block mb-1.5">TEAM {i===0?'A':'B'}</label>
 <select value={(matchDraft as any)[side]} onChange={e => setMatchDraft(d=>({...d,[side]:e.target.value}))}
 className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none text-sm">
 <option value="">SELECT...</option>
 {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
 </select>
 </div>
 ))}
 </div>
 )}

 {/* Wheel selects */}
 {buildingType === 'Wheel' && (
 <div className="grid grid-cols-2 gap-3">
 {[0,1,2,3].map(i => (
 <div key={i}>
 <label className="text-[9px] font-black text-zinc-600 block mb-1.5">PLAYER {i+1}</label>
 <select value={matchDraft.wheelPlayers[i]}
 onChange={e => { const u=[...matchDraft.wheelPlayers]; u[i]=e.target.value; setMatchDraft(d=>({...d,wheelPlayers:u})) }}
 className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none text-sm">
 <option value="">SELECT...</option>
 {players.filter(p => !matchDraft.wheelPlayers.some((wp,wi)=>wi!==i&&wp===p.name))
 .map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
 </select>
 </div>
 ))}
 </div>
 )}

 {/* Scoring type */}
 <div className="flex gap-3">
 <button onClick={() => setMatchDraft(d=>({...d,scoringType:'NET'}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${matchDraft.scoringType==='NET'?'bg-emerald-500 border-emerald-400 text-black':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 NET
 </button>
 <button onClick={() => setMatchDraft(d=>({...d,scoringType:'GROSS'}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${matchDraft.scoringType==='GROSS'?'bg-rose-500 border-rose-400 text-white':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 GROSS
 </button>
 </div>

 {/* Stakes */}
 {buildingType !== 'Wheel' && (
 <div className="grid grid-cols-2 gap-3">
 {[['nassau','NASSAU ($)','text-white'],['press','PRESS ($)','text-yellow-400'],['birdie','BIRDIE ($)','text-blue-400'],['eagle','EAGLE ($)','text-emerald-400']].map(([key,label,color]) => (
 <div key={key}>
 <label className={`text-[10px] font-black block mb-1 ${color}`}>{label}</label>
 <input type="number"value={(matchDraft as any)[key]}
 onChange={e => setMatchDraft(d=>({...d,[key]:Number(e.target.value)}))}
 className={`w-full bg-black border border-zinc-700 p-2.5 rounded-xl font-black ${color} outline-none text-center`}
 />
 </div>
 ))}
 </div>
 )}

 {/* Wheel options */}
 {buildingType === 'Wheel' && (
 <div className="space-y-3">
 {/* Format */}
 <div>
 <label className="text-[10px] font-black text-zinc-600 block mb-2">MATCH FORMAT PER PAIR</label>
 <div className="flex gap-2">
 <button onClick={() => setMatchDraft(d=>({...d,wheelFormat:'straight'}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${matchDraft.wheelFormat==='straight'?'bg-purple-500 border-purple-400 text-white':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 STRAIGHT 18
 <div className="text-[9px] opacity-70 mt-0.5 normal-case">One bet · total holes</div>
 </button>
 <button onClick={() => setMatchDraft(d=>({...d,wheelFormat:'nassau'}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 transition-all ${matchDraft.wheelFormat==='nassau'?'bg-purple-500 border-purple-400 text-white':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 NASSAU
 <div className="text-[9px] opacity-70 mt-0.5 normal-case">F9 · B9 · Total</div>
 </button>
 </div>
 </div>
 {/* Straight amount */}
 {matchDraft.wheelFormat === 'straight' && (
 <div>
 <label className="text-[10px] font-black text-zinc-600 block mb-1.5">BET AMOUNT PER PAIR ($)</label>
 <input type="number"value={matchDraft.wheelAmount}
 onChange={e => setMatchDraft(d=>({...d,wheelAmount:Number(e.target.value)}))}
 className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-purple-400 outline-none text-center text-xl"
 />
 </div>
 )}
 {/* Nassau options */}
 {matchDraft.wheelFormat === 'nassau' && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-[10px] font-black text-zinc-600 block mb-1.5">NASSAU ($)</label>
 <input type="number"value={matchDraft.wheelNassau}
 onChange={e => setMatchDraft(d=>({...d,wheelNassau:Number(e.target.value)}))}
 className="w-full bg-black border border-zinc-700 p-2.5 rounded-xl font-black text-purple-400 outline-none text-center"/>
 </div>
 <div>
 <label className={`text-[10px] font-black block mb-1.5 ${matchDraft.wheelAutoPress?'text-yellow-500':'text-zinc-600'}`}>PRESS ($)</label>
 <input type="number"value={matchDraft.wheelPress}
 onChange={e => setMatchDraft(d=>({...d,wheelPress:Number(e.target.value)}))}
 disabled={!matchDraft.wheelAutoPress}
 className={`w-full bg-black border border-zinc-700 p-2.5 rounded-xl font-black outline-none text-center ${matchDraft.wheelAutoPress?'text-yellow-400':'text-zinc-700'}`}/>
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setMatchDraft(d=>({...d,wheelAutoPress:true}))}
 className={`flex-1 py-2 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-1 transition-all ${matchDraft.wheelAutoPress?'bg-yellow-500/20 border-yellow-500/60 text-yellow-400':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 <Zap size={11}/> AUTO-PRESS
 </button>
 <button onClick={() => setMatchDraft(d=>({...d,wheelAutoPress:false}))}
 className={`flex-1 py-2 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-1 transition-all ${!matchDraft.wheelAutoPress?'bg-zinc-700 border-zinc-500 text-white':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 <ZapOff size={11}/> NO PRESS
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Auto press for PvP and 2v2 */}
 {(buildingType==='PvP'||buildingType==='2v2') && (
 <div className="flex gap-3">
 <button onClick={() => setMatchDraft(d=>({...d,autoPress:true}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-1.5 transition-all ${matchDraft.autoPress?'bg-yellow-500/20 border-yellow-500/60 text-yellow-400':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 <Zap size={12}/> AUTO-PRESS
 </button>
 <button onClick={() => setMatchDraft(d=>({...d,autoPress:false}))}
 className={`flex-1 py-2.5 rounded-xl font-black text-xs border-2 flex items-center justify-center gap-1.5 transition-all ${!matchDraft.autoPress?'bg-zinc-700 border-zinc-500 text-white':'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
 <ZapOff size={12}/> NO PRESS
 </button>
 </div>
 )}

 <button onClick={saveMatch}
 className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-black transition-colors flex items-center justify-center gap-2">
 <Check size={18}/> ADD MATCH
 </button>
 </div>
 )}

 {/* Match list */}
 {matches.length > 0 && (
 <div className="space-y-2">
 <p className="text-[10px] font-black text-zinc-600 tracking-widest">{matches.length} MATCH{matches.length>1?'ES':''} CONFIGURED</p>
 {matches.map(m => (
 <div key={m.id} className="flex items-center gap-3 bg-zinc-900 rounded-2xl px-4 py-3 border border-zinc-800">
 <div className="flex-1 min-w-0">
 {m.type==='Wheel'
 ? <div><span className="text-purple-400 font-black text-sm">WHEEL</span><span className="text-zinc-600 text-[10px] font-black ml-2">{(m.wheelPlayers||[]).join(' · ')}</span></div>
 : m.type==='2v2'
 ? <span className="font-black text-sm">{m.sideA}+{m.sideA2} <span className="text-zinc-600">vs</span> {m.sideB}+{m.sideB2}</span>
 : <span className="font-black text-sm">{m.sideA} <span className="text-zinc-600">vs</span> {m.sideB}</span>
 }
 </div>
 <span className="text-[9px] font-black text-zinc-600 bg-zinc-800 px-2 py-1 rounded-lg">{m.type}</span>
 <button onClick={() => setMatches(prev=>prev.filter(mm=>mm.id!==m.id))} className="text-zinc-700 hover:text-rose-500 transition-colors">
 <X size={16}/>
 </button>
 </div>
 ))}
 </div>
 )}

 {matches.length === 0 && !buildingType && (
 <p className="text-zinc-700 text-xs font-black text-center py-4 border border-dashed border-zinc-800 rounded-2xl">
 NO MATCHES YET — ADD ONE ABOVE OR GO LIVE WITHOUT BETS
 </p>
 )}
 </div>
 )}

 {/* ── NAVIGATION ── */}
 <div className="flex gap-3 pt-4">
 {step > 0 && (
 <button onClick={() => setStep(s=>s-1)}
 className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-4 rounded-2xl font-black transition-colors flex items-center justify-center gap-2">
 <ArrowLeft size={16}/> BACK
 </button>
 )}
 {step < STEPS.length - 1 ? (
 <button onClick={() => canProceed && setStep(s=>s+1)} disabled={!canProceed}
 className={`flex-1 py-4 rounded-2xl font-black transition-colors flex items-center justify-center gap-2 ${
 canProceed ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
 }`}>
 NEXT <ArrowRight size={16}/>
 </button>
 ) : (
 <button onClick={goLive} disabled={loading || players.length < 2}
 className={`flex-1 py-4 rounded-2xl font-black transition-colors flex items-center justify-center gap-2 shadow-xl ${
 players.length >= 2 ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
 }`}>
 {loading ? <Loader2 size={20} className="animate-spin"/> : <Play size={20}/>}
 GO LIVE
 </button>
 )}
 </div>
 </div>
 </div>
 )
}