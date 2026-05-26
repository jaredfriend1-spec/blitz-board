"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, set, push, remove, get } from 'firebase/database'
import Link from 'next/link'
import {
  Shield, Users, BookOpen, History, Settings, BarChart3,
  Trash2, Plus, Edit3, Check, X, ChevronDown, ChevronRight,
  Database, Zap, DollarSign, Trophy, Flag, RefreshCw,
  Lock, Eye, EyeOff, LogOut, Download, Archive, Target,
  AlertTriangle, Activity, Clock, Hash
} from 'lucide-react'

const MASTER_PIN = "jared2025"

// ── SECTION WRAPPER ────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{icon}</span>
          <span className="font-bold text-sm text-white">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-zinc-500"/> : <ChevronRight size={16} className="text-zinc-500"/>}
      </button>
      {open && <div className="border-t border-zinc-800">{children}</div>}
    </div>
  )
}

// ── STAT CARD ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-emerald-400' }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-600 text-[10px] font-semibold tracking-widest mb-1">{label}</p>
      <p className={`font-black text-2xl ${color}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs font-medium normal-case mt-1">{sub}</p>}
    </div>
  )
}

export default function MasterPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // Auto-authenticate if already logged in as master from home screen
    if (typeof window !== 'undefined' && sessionStorage.getItem('role') === 'master') {
      setAuthed(true)
    }
  }, [])
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState(false)

  // Data
  const [history, setHistory] = useState<any[]>([])
  const [globalRoster, setGlobalRoster] = useState<any[]>([])
  const [courseLibrary, setCourseLibrary] = useState<any[]>([])
  const [activeTournament, setActiveTournament] = useState<any>(null)
  const [savedFormats, setSavedFormats] = useState<any[]>([])

  // Edit states
  const [editingPlayer, setEditingPlayer] = useState<string|null>(null)
  const [editName, setEditName] = useState('')
  const [editHcp, setEditHcp] = useState(0)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerHcp, setNewPlayerHcp] = useState(0)
  const [addingPlayer, setAddingPlayer] = useState(false)

  const [editingCourse, setEditingCourse] = useState<string|null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  const [jeffPin, setJeffPin] = useState('jeff')
  const [editingJeffPin, setEditingJeffPin] = useState(false)
  const [newJeffPin, setNewJeffPin] = useState('')

  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{id:string,label:string,path:string}|null>(null)

  useEffect(() => {
    if (!authed) return
    onValue(ref(db,'history'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val())
          .map(([k,v]:any) => ({ id:k, ...v }))
          .sort((a,b) => Number(b.id) - Number(a.id))
        setHistory(items)
      } else setHistory([])
    })
    onValue(ref(db,'globalRoster'), snap => {
      if (snap.val()) setGlobalRoster(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setGlobalRoster([])
    })
    onValue(ref(db,'courseHistory'), snap => {
      if (snap.val()) setCourseLibrary(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setCourseLibrary([])
    })
    onValue(ref(db,'tournament'), snap => setActiveTournament(snap.val()))
    onValue(ref(db,'savedFormats'), snap => {
      if (snap.val()) setSavedFormats(Object.entries(snap.val()).map(([k,v]:any)=>({id:k,...v})))
      else setSavedFormats([])
    })
  }, [authed])

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000) }

  const tryPin = () => {
    if (pin === MASTER_PIN) { setAuthed(true); setPinError(false) }
    else { setPinError(true); setPin('') }
  }

  // ── STATS ────────────────────────────────────────────────────────
  const totalRounds = history.length
  const allPlayers: Record<string,{name:string,rounds:number,skins:number,totalScore:number,holes:number}> = {}
  history.forEach(arch => {
    const roster = arch.roster ? Object.values(arch.roster) as any[] : []
    const scores = arch.scores || {}
    const pars = arch.course?.pars || Array(18).fill(4)
    const totalPar = pars.reduce((a:number,b:number)=>a+b,0)
    roster.forEach((p:any) => {
      if (!allPlayers[p.name]) allPlayers[p.name] = {name:p.name,rounds:0,skins:0,totalScore:0,holes:0}
      allPlayers[p.name].rounds++
      const s = scores[p.id] || []
      const tot = s.reduce((a:number,b:number)=>a+(Number(b)||0),0)
      if (tot > 0) { allPlayers[p.name].totalScore += tot; allPlayers[p.name].holes += 18 }
    })
  })
  const playerStats = Object.values(allPlayers).sort((a,b)=>b.rounds-a.rounds)
  const totalMoneyTracked = history.reduce((acc,arch) => {
    const money = arch.money || {}
    return acc + (money.entryFee||0) * (arch.roster ? Object.keys(arch.roster).length : 0)
  },0)
  const mostActivePlayer = playerStats[0]

  // ── LOGIN SCREEN ─────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-4">
              <Shield size={28} className="text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-white">Master Admin</h1>
            <p className="text-zinc-600 text-sm font-medium normal-case mt-1">Blitz Board Command Center</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(false) }}
                onKeyDown={e => e.key==='Enter' && tryPin()}
                placeholder="Enter master PIN"
                className={`w-full bg-black border ${pinError?'border-rose-500':'border-zinc-700'} focus:border-emerald-500 p-4 rounded-xl font-mono text-white text-lg outline-none text-center tracking-widest`}
                autoFocus
              />
              <button onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                {showPin ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {pinError && <p className="text-rose-400 text-xs font-semibold text-center">Incorrect PIN</p>}
            <button onClick={tryPin}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black text-sm transition-colors">
              Enter
            </button>
          </div>
          <Link href="/" className="block text-center text-zinc-700 hover:text-zinc-500 text-xs font-medium mt-6 transition-colors">
            ← Back to app
          </Link>
        </div>
      </div>
    )
  }

  // ── MAIN DASHBOARD ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-emerald-400"/>
          <div>
            <h1 className="font-black text-sm text-white">MASTER ADMIN</h1>
            <p className="text-zinc-600 text-[10px] font-medium">Blitz Board Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors">
            ← App
          </Link>
          <button onClick={() => setAuthed(false)}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-rose-400 text-xs font-semibold transition-colors">
            <LogOut size={14}/> Lock
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl">
          {toast}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle size={20} className="text-rose-400 flex-shrink-0"/>
                <h2 className="font-bold text-white">Confirm Delete</h2>
              </div>
              <p className="text-zinc-400 text-sm font-medium normal-case">Delete <span className="text-white font-semibold">"{confirmDelete.label}"</span>? This cannot be undone.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors">
                Cancel
              </button>
              <button onClick={async () => {
                await set(ref(db, confirmDelete.path), null)
                showToast('Deleted')
                setConfirmDelete(null)
              }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── AT A GLANCE ── */}
        <Section title="At a Glance" icon={<BarChart3 size={16}/>}>
          <div className="p-4 grid grid-cols-2 gap-3">
            <StatCard label="TOTAL ROUNDS" value={totalRounds} sub="All time"/>
            <StatCard label="MONEY TRACKED" value={`$${totalMoneyTracked.toLocaleString()}`} sub="Entry fees" color="text-yellow-400"/>
            <StatCard label="MOST ACTIVE" value={mostActivePlayer?.name||'—'} sub={`${mostActivePlayer?.rounds||0} rounds`} color="text-blue-400"/>
            <StatCard label="COURSE LIBRARY" value={courseLibrary.length} sub="Saved courses" color="text-purple-400"/>
            <StatCard label="ROSTER SIZE" value={globalRoster.length} sub="Global players" color="text-orange-400"/>
            <StatCard label="HISTORY RECORDS" value={history.length} sub="Archived matches" color="text-pink-400"/>
          </div>
        </Section>

        {/* ── PLAYER STATS ── */}
        <Section title="Player Stats" icon={<Trophy size={16}/>} defaultOpen={false}>
          <div className="p-4">
            <div className="space-y-2">
              {playerStats.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-600 text-xs font-black w-5">{i+1}</span>
                    <div>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-zinc-600 text-xs font-medium normal-case">{p.rounds} round{p.rounds!==1?'s':''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-sm">
                      {p.holes > 0 ? (p.totalScore/p.holes*18).toFixed(1) : '—'}
                    </div>
                    <div className="text-zinc-600 text-[10px]">avg score</div>
                  </div>
                </div>
              ))}
              {playerStats.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No match history yet</p>}
            </div>
          </div>
        </Section>

        {/* ── GLOBAL ROSTER ── */}
        <Section title={`Global Roster (${globalRoster.length})`} icon={<Users size={16}/>}>
          <div className="p-4 space-y-3">
            {/* Add new player */}
            {addingPlayer ? (
              <div className="flex gap-2 items-center">
                <input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value.toUpperCase())}
                  placeholder="NAME" autoFocus
                  className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-bold text-sm outline-none"/>
                <input type="number" value={newPlayerHcp} onChange={e=>setNewPlayerHcp(Number(e.target.value))}
                  className="w-16 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-bold text-sm outline-none text-center"
                  placeholder="HCP"/>
                <button onClick={async()=>{
                  if(!newPlayerName.trim())return
                  const r=push(ref(db,'globalRoster'))
                  await set(r,{id:r.key,name:newPlayerName.trim(),handicap:newPlayerHcp})
                  setNewPlayerName('');setNewPlayerHcp(0);setAddingPlayer(false)
                  showToast('✓ Player added')
                }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                <button onClick={()=>setAddingPlayer(false)} className="text-zinc-600 px-2 py-2.5"><X size={14}/></button>
              </div>
            ) : (
              <button onClick={()=>setAddingPlayer(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-2.5 rounded-xl font-semibold text-sm transition-all">
                <Plus size={14}/> Add Player
              </button>
            )}
            {/* Player list */}
            <div className="space-y-2">
              {globalRoster.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5">
                  {editingPlayer === p.id ? (
                    <>
                      <input value={editName} onChange={e=>setEditName(e.target.value.toUpperCase())} autoFocus
                        className="flex-1 bg-black border border-emerald-500 px-2 py-1 rounded-lg font-bold text-sm outline-none"/>
                      <input type="number" value={editHcp} onChange={e=>setEditHcp(Number(e.target.value))}
                        className="w-14 bg-black border border-zinc-700 px-2 py-1 rounded-lg font-bold text-sm text-center outline-none"/>
                      <button onClick={async()=>{
                        await set(ref(db,`globalRoster/${p.id}`),{id:p.id,name:editName.trim(),handicap:editHcp})
                        setEditingPlayer(null);showToast('✓ Updated')
                      }} className="text-emerald-400"><Check size={14}/></button>
                      <button onClick={()=>setEditingPlayer(null)} className="text-zinc-600"><X size={14}/></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-semibold text-sm">{p.name}</span>
                      <span className="text-zinc-500 text-xs font-semibold">HCP {p.handicap||0}</span>
                      <button onClick={()=>{setEditingPlayer(p.id);setEditName(p.name);setEditHcp(p.handicap||0)}}
                        className="text-zinc-600 hover:text-emerald-400 transition-colors"><Edit3 size={13}/></button>
                      <button onClick={()=>setConfirmDelete({id:p.id,label:p.name,path:`globalRoster/${p.id}`})}
                        className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                    </>
                  )}
                </div>
              ))}
              {globalRoster.length===0 && <p className="text-zinc-600 text-xs text-center py-2">No players in roster</p>}
            </div>
          </div>
        </Section>

        {/* ── COURSE LIBRARY ── */}
        <Section title={`Course Library (${courseLibrary.length})`} icon={<Flag size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-3">
            {addingCourse ? (
              <div className="flex gap-2">
                <input value={newCourseName} onChange={e=>setNewCourseName(e.target.value)} placeholder="Course name" autoFocus
                  className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl font-semibold text-sm outline-none"/>
                <button onClick={async()=>{
                  if(!newCourseName.trim())return
                  const r=push(ref(db,'courseHistory'))
                  await set(r,{id:r.key,name:newCourseName.trim(),holes:Array.from({length:18},(_,i)=>({par:4,hcp:i+1})),pars:Array(18).fill(4)})
                  setNewCourseName('');setAddingCourse(false);showToast('✓ Course added')
                }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                <button onClick={()=>setAddingCourse(false)} className="text-zinc-600 px-2"><X size={14}/></button>
              </div>
            ) : (
              <button onClick={()=>setAddingCourse(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-emerald-500 text-zinc-500 hover:text-emerald-400 py-2.5 rounded-xl font-semibold text-sm transition-all">
                <Plus size={14}/> Add Course
              </button>
            )}
            <div className="space-y-2">
              {courseLibrary.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <Flag size={13} className="text-zinc-600 flex-shrink-0"/>
                  <span className="flex-1 font-semibold text-sm">{c.name}</span>
                  <span className="text-zinc-600 text-xs">18 holes</span>
                  <button onClick={()=>setConfirmDelete({id:c.id,label:c.name,path:`courseHistory/${c.id}`})}
                    className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                </div>
              ))}
              {courseLibrary.length===0 && <p className="text-zinc-600 text-xs text-center py-2">No courses saved</p>}
            </div>
          </div>
        </Section>

        {/* ── ACTIVE MATCH ── */}
        <Section title="Active Match" icon={<Activity size={16}/>} defaultOpen={false}>
          <div className="p-4">
            {activeTournament?.meta ? (
              <div className="space-y-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">COURSE</span>
                    <span className="font-bold text-sm">{activeTournament.course?.name||'—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">MODE</span>
                    <span className="font-bold text-sm capitalize">{activeTournament.meta?.mode||'—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">PLAYERS</span>
                    <span className="font-bold text-sm">{activeTournament.roster?Object.keys(activeTournament.roster).length:0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-semibold">MATCHES</span>
                    <span className="font-bold text-sm">{activeTournament.matchups?Object.keys(activeTournament.matchups).length:0}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={async()=>{
                    const snap = await get(ref(db,'tournament'))
                    if(snap.exists()){
                      await set(ref(db,`history/${Date.now()}`),{
                        ...snap.val(),
                        _meta:{mode:'match',dayLabel:'Quick Match',archivedAt:Date.now(),courseName:snap.val().course?.name||''}
                      })
                      await set(ref(db,'tournament'),null)
                      showToast('✓ Archived to history')
                    }
                  }} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors">
                    <Archive size={14}/> Archive
                  </button>
                  <button onClick={()=>setConfirmDelete({id:'active',label:'the active match',path:'tournament'})}
                    className="flex items-center justify-center gap-2 bg-transparent hover:bg-rose-950/20 border border-zinc-700 hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 py-3 rounded-xl font-bold text-sm transition-colors">
                    <Trash2 size={14}/> Wipe
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm text-center py-4 font-medium">No active match</p>
            )}
          </div>
        </Section>

        {/* ── FULL HISTORY ── */}
        <Section title={`Full History (${history.length})`} icon={<History size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-2">
            {history.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">No archived matches</p>}
            {history.map(arch => {
              const meta = arch._meta || {}
              const date = new Date(Number(arch.id)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
              const players = arch.roster ? Object.keys(arch.roster).length : 0
              const course = arch.course?.name || meta.courseName || '—'
              return (
                <div key={arch.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{course}</div>
                    <div className="text-zinc-600 text-xs font-medium normal-case">{date} · {players} players</div>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${meta.mode==='match'?'bg-amber-500/20 text-amber-400':'bg-blue-500/20 text-blue-400'}`}>
                    {meta.mode==='match'?'MATCH':'TOURNAMENT'}
                  </span>
                  <button onClick={()=>setConfirmDelete({id:arch.id,label:course+' ('+date+')',path:`history/${arch.id}`})}
                    className="text-zinc-700 hover:text-rose-400 transition-colors flex-shrink-0"><Trash2 size={13}/></button>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── APP SETTINGS ── */}
        <Section title="App Settings" icon={<Settings size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-4">
            {/* Jeff's PIN */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">JEFF'S ADMIN PIN</p>
              {editingJeffPin ? (
                <div className="flex gap-2">
                  <input value={newJeffPin} onChange={e=>setNewJeffPin(e.target.value)} placeholder="New PIN" autoFocus
                    className="flex-1 bg-black border border-emerald-500 px-3 py-2.5 rounded-xl font-mono font-bold text-sm outline-none tracking-widest"/>
                  <button onClick={async()=>{
                    // Note: PIN is hardcoded in landing-page.tsx as ADMIN_PIN constant
                    // This is a visual reminder only - actual change requires code update
                    showToast("Update ADMIN_PIN in landing-page.tsx to: "+newJeffPin)
                    setEditingJeffPin(false)
                  }} className="bg-emerald-500 text-black px-3 py-2.5 rounded-xl font-bold text-sm"><Check size={14}/></button>
                  <button onClick={()=>setEditingJeffPin(false)} className="text-zinc-600 px-2"><X size={14}/></button>
                </div>
              ) : (
                <button onClick={()=>{setEditingJeffPin(true);setNewJeffPin('')}}
                  className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-zinc-600 px-4 py-3 rounded-xl transition-colors">
                  <span className="font-mono font-bold text-sm text-zinc-400">••••••</span>
                  <span className="text-zinc-600 text-xs font-semibold flex items-center gap-1"><Edit3 size={12}/> Change</span>
                </button>
              )}
            </div>

            {/* Saved formats */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-2">SAVED FORMATS ({savedFormats.length})</p>
              <div className="space-y-2">
                {savedFormats.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5">
                    <span className="font-semibold text-sm">{f.name}</span>
                    <button onClick={()=>setConfirmDelete({id:f.id,label:f.name,path:`savedFormats/${f.id}`})}
                      className="text-zinc-700 hover:text-rose-400 transition-colors"><Trash2 size={13}/></button>
                  </div>
                ))}
                {savedFormats.length===0 && <p className="text-zinc-600 text-xs">No saved formats</p>}
              </div>
            </div>

            {/* Danger zone */}
            <div className="border border-rose-500/20 rounded-xl p-4 space-y-2">
              <p className="text-rose-400 text-[10px] font-black tracking-widest mb-3">DANGER ZONE</p>
              <button onClick={()=>setConfirmDelete({id:'demo',label:'demo/mock tournament data',path:'tournament'})}
                className="w-full flex items-center justify-between bg-transparent hover:bg-rose-950/10 border border-zinc-800 hover:border-rose-500/30 px-4 py-3 rounded-xl transition-all">
                <span className="text-zinc-400 text-sm font-semibold">Clear Active Match</span>
                <Trash2 size={14} className="text-zinc-600"/>
              </button>
              <button onClick={()=>setConfirmDelete({id:'history-all',label:'ALL history records (cannot be undone)',path:'history'})}
                className="w-full flex items-center justify-between bg-transparent hover:bg-rose-950/10 border border-zinc-800 hover:border-rose-500/30 px-4 py-3 rounded-xl transition-all">
                <span className="text-zinc-400 text-sm font-semibold">Wipe All History</span>
                <Trash2 size={14} className="text-zinc-600"/>
              </button>
            </div>
          </div>
        </Section>

        {/* ── FIREBASE INFO ── */}
        <Section title="Database Info" icon={<Database size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Project</span>
                <span className="font-mono text-xs text-zinc-400">mcc-blitz-live</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">History records</span>
                <span className="text-emerald-400 font-bold">{history.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Roster players</span>
                <span className="text-emerald-400 font-bold">{globalRoster.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Courses saved</span>
                <span className="text-emerald-400 font-bold">{courseLibrary.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-semibold">Security rules</span>
                <span className="text-amber-400 font-bold text-xs">Open (upgrade pending)</span>
              </div>
            </div>
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white py-3 rounded-xl font-semibold text-sm transition-colors">
              <Database size={14}/> Open Firebase Console ↗
            </a>
          </div>
        </Section>

      </div>
    </div>
  )
}