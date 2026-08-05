"use client"
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { signOut, resetPassword } from '@/lib/auth'
import { auth } from '@/lib/firebase'
import { db } from '@/lib/firebase'
import { ref, onValue, set, push, remove, get } from 'firebase/database'
import Link from 'next/link'
import {
  Shield, Users, BookOpen, History, Settings, BarChart3,
  Trash2, Plus, Edit3, Check, X, ChevronDown, ChevronRight,
  Database, Zap, DollarSign, Trophy, Flag, RefreshCw,
  Lock, LogOut, Download, Archive, Target,
  AlertTriangle, Activity, Clock, Hash, Mail, UserPlus, UserX, KeyRound
} from 'lucide-react'


// ── SECTION WRAPPER ────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = false }: any) {
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


// Analytics lives at /master/analytics and is powered by lib/payouts.
// The ~750-line dashboard that used to sit here was never rendered and
// carried its own (incorrect) copy of the payout math. Removed.


export default function MasterPage() {
  const { user, role, loading } = useAuth()
  const authed = role === 'master'
 
  // Data
  const [history, setHistory] = useState<any[]>([])
  const [globalRoster, setGlobalRoster] = useState<any[]>([])
  const [courseLibrary, setCourseLibrary] = useState<any[]>([])
  const [activeTournament, setActiveTournament] = useState<any>(null)
  const [savedFormats, setSavedFormats] = useState<any[]>([])

  // Edit states
  // Analytics access control
  const [scorerAccess, setScorerAccess] = useState(true)
  const [playerAccess, setPlayerAccess] = useState(false)
  const SECTIONS = [
    {key:'money_board', label:'💰 Money Leaderboard'},
    {key:'match_records', label:'⚡ Match Records'},
    {key:'scoring_avgs', label:'🏌️ Scoring Averages'},
    {key:'skins', label:'🦴 Skins Kings'},
    {key:'h2h', label:'🥊 Head to Head'},
    {key:'partnerships', label:'🤝 Best Partnerships'},
    {key:'handicap', label:'📐 Handicap Analysis'},
    {key:'integrity', label:'⚠️ Handicap Integrity'},
    {key:'consistency', label:'🎯 Consistency Index'},
    {key:'trends', label:'📈 Score Trends'},
    {key:'records', label:'🏅 Round Records'},
    {key:'betting', label:'🎰 Betting Stats'},
  ]
  const defaultSections = Object.fromEntries(SECTIONS.map(s => [s.key, true]))
  const [scorerSections, setScorerSections] = useState<Record<string,boolean>>(defaultSections)
  const [playerSections, setPlayerSections] = useState<Record<string,boolean>>(defaultSections)
  const [analyticsTab, setAnalyticsTab] = useState<'who'|'what'>('who')

  // User management state
  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'scorer'|'master'>('scorer')
  const [inviting, setInviting] = useState(false)
  const [resetSent, setResetSent] = useState<string|null>(null)
  const [newUserUid, setNewUserUid] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<'scorer'|'master'>('scorer')

  const [editingPlayer, setEditingPlayer] = useState<string|null>(null)
  const [editName, setEditName] = useState('')
  const [editHcp, setEditHcp] = useState(0)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerHcp, setNewPlayerHcp] = useState(0)
  const [addingPlayer, setAddingPlayer] = useState(false)

  const [editingCourse, setEditingCourse] = useState<string|null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)


  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{id:string,label:string,path:string}|null>(null)

  useEffect(() => {
    if (!authed) return
    onValue(ref(db,'analyticsFlags'), snap => {
      const d = snap.val() || {}
      if (d.scorer_access !== undefined) setScorerAccess(!!d.scorer_access)
      if (d.player_access !== undefined) setPlayerAccess(!!d.player_access)
      if (d.scorer_sections) setScorerSections(d.scorer_sections)
      if (d.player_sections) setPlayerSections(d.player_sections)
    })
    onValue(ref(db,'users'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val()).map(([uid, data]: any) => ({ uid, ...data }))
        setDbUsers(items)
      } else setDbUsers([])
    })
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

  // ── LOGIN SCREEN ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-600 text-sm font-medium">Loading...</div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Shield size={32} className="text-zinc-700 mx-auto mb-4"/>
          <p className="text-zinc-500 font-semibold text-sm mb-4">Master Admin access required</p>
          <Link href="/login"
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black text-sm transition-colors">
            Sign In
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
          <div className="flex items-center gap-3">
            <Link href="/master/analytics"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <BarChart3 size={13}/> Analytics
            </Link>
            <Link href="/" className="text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors">
              ← App
            </Link>
          </div>

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
        

        {/* ── PLAYER STATS ── */}
        

        {/* ── GLOBAL ROSTER ── */}
        

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

        {/* ── ANALYTICS ACCESS ── */}
        <Section title="📊 Analytics Access Control" icon={<BarChart3 size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-4">

            {/* Tabs */}
            <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
              <button onClick={() => setAnalyticsTab('who')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${analyticsTab==='who' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                👥 Who Can See
              </button>
              <button onClick={() => setAnalyticsTab('what')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${analyticsTab==='what' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                👁️ What They See
              </button>
            </div>

            {/* WHO CAN SEE */}
            {analyticsTab === 'who' && (
              <div className="space-y-3">
                <p className="text-zinc-600 text-xs font-medium normal-case">Turn Analytics on or off for each role. Changes save instantly to Firebase.</p>

                {/* Scorer */}
                <div className={`border-2 rounded-xl overflow-hidden transition-colors ${scorerAccess ? 'border-blue-500/40' : 'border-zinc-800'}`}>
                  <div className="flex items-center justify-between px-4 py-4 bg-zinc-950">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scorerAccess ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
                        <Shield size={18} className={scorerAccess ? 'text-blue-400' : 'text-zinc-600'}/>
                      </div>
                      <div>
                        <div className="font-bold text-sm">Scorer Admins</div>
                        <div className="text-zinc-500 text-[10px] font-medium normal-case">Jeff and other scorers</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setScorerAccess(v => !v)}
                      className={`relative w-14 h-7 rounded-full transition-all ${scorerAccess ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${scorerAccess ? 'translate-x-8' : 'translate-x-1.5'}`}/>
                    </button>
                  </div>
                  <div className={`px-4 py-2 text-[11px] font-semibold ${scorerAccess ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-900 text-zinc-600'}`}>
                    {scorerAccess ? '🟢 Scorers CAN see Analytics' : '🔴 Scorers CANNOT see Analytics'}
                  </div>
                  <div className="px-4 pb-3">
                    <button
                      onClick={async () => {
                        try {
                          await set(ref(db, 'analyticsFlags/scorer_access'), scorerAccess)
                          showToast('✓ Scorer access saved!')
                        } catch(e) { showToast('❌ Save failed') }
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2">
                      <Check size={13}/> Save Scorer Access
                    </button>
                  </div>
                </div>

                {/* Player */}
                <div className={`border-2 rounded-xl overflow-hidden transition-colors ${playerAccess ? 'border-amber-500/40' : 'border-zinc-800'}`}>
                  <div className="flex items-center justify-between px-4 py-4 bg-zinc-950">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${playerAccess ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                        <Users size={18} className={playerAccess ? 'text-amber-400' : 'text-zinc-600'}/>
                      </div>
                      <div>
                        <div className="font-bold text-sm">Players</div>
                        <div className="text-zinc-500 text-[10px] font-medium normal-case">Anyone on the Player hub</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPlayerAccess(v => !v)}
                      className={`relative w-14 h-7 rounded-full transition-all ${playerAccess ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${playerAccess ? 'translate-x-8' : 'translate-x-1.5'}`}/>
                    </button>
                  </div>
                  <div className={`px-4 py-2 text-[11px] font-semibold ${playerAccess ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-900 text-zinc-600'}`}>
                    {playerAccess ? '🟢 Players CAN see Analytics' : '🔴 Players CANNOT see Analytics (default off)'}
                  </div>
                  <div className="px-4 pb-3">
                    <button
                      onClick={async () => {
                        try {
                          await set(ref(db, 'analyticsFlags/player_access'), playerAccess)
                          showToast('✓ Player access saved!')
                        } catch(e) { showToast('❌ Save failed') }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2">
                      <Check size={13}/> Save Player Access
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WHAT THEY SEE */}
            {analyticsTab === 'what' && (
              <div className="space-y-4">
                <p className="text-zinc-600 text-xs font-medium normal-case">Tap sections to toggle. Save buttons are at the bottom of each list.</p>

                {/* Scorer sections */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={12} className="text-blue-400"/>
                    <p className="text-blue-400 text-[10px] font-black tracking-widest">SCORER VIEW</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {SECTIONS.map(s => (
                      <button key={s.key}
                        onClick={() => {
                          setScorerSections(prev => ({...prev, [s.key]: !prev[s.key]}))
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${scorerSections[s.key] ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-zinc-900/60 border border-zinc-800'}`}>
                        <span className={`text-xs font-semibold ${scorerSections[s.key] ? 'text-white' : 'text-zinc-600'}`}>{s.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${scorerSections[s.key] ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                          {scorerSections[s.key] && <Check size={10} className="text-white"/>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await set(ref(db, 'analyticsFlags/scorer_sections'), scorerSections)
                        showToast('✓ Scorer view saved!')
                      } catch(e) {
                        showToast('❌ Save failed — check connection')
                      }
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2">
                    <Check size={15}/> Save Scorer View
                  </button>
                </div>

                {/* Player sections */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={12} className="text-amber-400"/>
                    <p className="text-amber-400 text-[10px] font-black tracking-widest">PLAYER VIEW</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {SECTIONS.map(s => (
                      <button key={s.key}
                        onClick={() => {
                          setPlayerSections(prev => ({...prev, [s.key]: !prev[s.key]}))
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${playerSections[s.key] ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-900/60 border border-zinc-800'}`}>
                        <span className={`text-xs font-semibold ${playerSections[s.key] ? 'text-white' : 'text-zinc-600'}`}>{s.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${playerSections[s.key] ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                          {playerSections[s.key] && <Check size={10} className="text-white"/>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await set(ref(db, 'analyticsFlags/player_sections'), playerSections)
                        showToast('✓ Player view saved!')
                      } catch(e) {
                        showToast('❌ Save failed — check connection')
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2">
                    <Check size={15}/> Save Player View
                  </button>
                </div>
              </div>
            )}

          </div>
        </Section>

        {/* ── USER MANAGEMENT ── */}
        <Section title="👤 User Management" icon={<Users size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-4">

            {/* Current users */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-3">ACTIVE ACCOUNTS</p>
              <div className="space-y-2">
                {dbUsers.map(u => (
                  <div key={u.uid} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${u.role === 'master' ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                          <Shield size={14} className={u.role === 'master' ? 'text-emerald-400' : 'text-blue-400'}/>
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{u.email || u.uid.slice(0,12)+'...'}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${u.role === 'master' ? 'text-emerald-400' : 'text-blue-400'}`}>{u.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Change role */}
                        <select
                          value={u.role}
                          onChange={async e => {
                            await set(ref(db, `users/${u.uid}/role`), e.target.value)
                            showToast('✓ Role updated')
                          }}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold px-2 py-1 rounded-lg outline-none">
                          <option value="scorer">Scorer</option>
                          <option value="master">Master</option>
                        </select>
                        {/* Send reset */}
                        <button
                          onClick={async () => {
                            if (!u.email) return showToast('No email on record')
                            try {
                              await resetPassword(u.email)
                              setResetSent(u.uid)
                              setTimeout(() => setResetSent(null), 3000)
                              showToast(`✓ Reset email sent to ${u.email}`)
                            } catch { showToast('Failed to send reset email') }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Send password reset">
                          {resetSent === u.uid ? <Check size={14} className="text-emerald-400"/> : <KeyRound size={14}/>}
                        </button>
                        {/* Remove from app (delete from users node, not Firebase Auth) */}
                        {u.role !== 'master' && (
                          <button
                            onClick={() => setConfirmDelete({id:u.uid, label:u.email||u.uid, path:`users/${u.uid}`})}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-700 hover:text-rose-400 transition-colors"
                            title="Remove access">
                            <UserX size={14}/>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add new user */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-3">ADD NEW ADMIN USER</p>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-amber-400 text-[10px] font-semibold tracking-wider mb-1">TWO STEP PROCESS</p>
                  <p className="text-zinc-500 text-xs font-medium normal-case leading-relaxed">
                    1. Go to <span className="text-white font-semibold">Firebase Console → Authentication → Add user</span> and create their account.<br/>
                    2. Copy their UID from the Users tab and paste it below.
                  </p>
                </div>
                <input
                  value={newUserUid}
                  onChange={e => setNewUserUid(e.target.value)}
                  placeholder="Firebase UID (paste from Auth console)"
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl text-xs font-mono text-white outline-none"
                />
                <input
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl text-xs text-white outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as 'scorer'|'master')}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-2.5 rounded-xl outline-none flex-1">
                    <option value="scorer">Scorer Admin</option>
                    <option value="master">Master Admin</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (!newUserUid.trim() || !newUserEmail.trim()) return showToast('Enter both UID and email')
                      await set(ref(db, `users/${newUserUid.trim()}`), { role: newUserRole, email: newUserEmail.trim() })
                      setNewUserUid(''); setNewUserEmail('')
                      showToast('✓ User added — they can now sign in')
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5">
                    <UserPlus size={13}/> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Password reset shortcut */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest mb-3">SEND PASSWORD RESET</p>
              <div className="flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="user@email.com"
                  className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                />
                <button
                  onClick={async () => {
                    if (!inviteEmail.trim()) return
                    setInviting(true)
                    try {
                      await resetPassword(inviteEmail.trim())
                      showToast(`✓ Reset email sent to ${inviteEmail}`)
                      setInviteEmail('')
                    } catch { showToast('Failed — check the email address') }
                    setInviting(false)
                  }}
                  disabled={inviting}
                  className="bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5">
                  <Mail size={13}/> {inviting ? 'Sending...' : 'Send Reset'}
                </button>
              </div>
            </div>

          </div>
        </Section>

        {/* ── APP SETTINGS ── */}
        <Section title="App Settings" icon={<Settings size={16}/>} defaultOpen={false}>
          <div className="p-4 space-y-4">


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

            </div>
          </div>
        </Section>

{/* ── FIREBASE INFO ── */}
        

      </div>
    </div>
  )
}