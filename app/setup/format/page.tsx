"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, push, onValue, remove } from 'firebase/database'
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
    <div className={`border rounded-2xl p-5 space-y-4 transition-all ${warning ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
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
              className={`w-11 h-11 rounded-xl font-black text-lg transition-all border-2 ${
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all border-2 ${
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
  const [mode, setMode] = useState<'blitz'|'custom'>('blitz')
  const [customFormat, setCustomFormat] = useState<FormatSpec>({ ...JEFFS_BLITZ, name: 'My Format' })
  const [saved, setSaved] = useState(false)
  const [minTeamSize, setMinTeamSize] = useState<number|null>(null)
  const [scoresExist, setScoresExist] = useState(false)
  const [currentFormatName, setCurrentFormatName] = useState("Jeff's Blitz")
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedFormats, setSavedFormats] = useState<any[]>([])
  const [showSavedFormats, setShowSavedFormats] = useState(false)

  useEffect(() => {
    onValue(ref(db,'tournament/format'), snap => {
      if (snap.val()) {
        const f = snap.val()
        setCurrentFormatName(f.name || "Jeff's Blitz")
        if (f.name === "Jeff's Blitz") setMode('blitz')
        else { setMode('custom'); setCustomFormat(f) }
      }
    })
    onValue(ref(db,'tournament/teams'), snap => {
      if (!snap.val()) { setMinTeamSize(null); return }
      const teams = Object.values(snap.val()) as any[]
      const sizes = teams.map(t => (t.playerIds||[]).length).filter(s => s > 0)
      if (sizes.length > 0) setMinTeamSize(Math.min(...sizes))
      else setMinTeamSize(null)
    })
    onValue(ref(db,'tournament/scores'), snap => {
      if (!snap.val()) { setScoresExist(false); return }
      const allScores = Object.values(snap.val()) as number[][]
      setScoresExist(allScores.some(s => Array.isArray(s) && s.some(v => v > 0)))
    })
    // Load saved formats library
    onValue(ref(db,'savedFormats'), snap => {
      if (snap.val()) {
        const list = Object.entries(snap.val()).map(([key, val]: [string, any]) => ({ id: key, ...val }))
        setSavedFormats(list.sort((a,b) => (b.savedAt||0) - (a.savedAt||0)))
      } else {
        setSavedFormats([])
      }
    })
  }, [])

  const newFormatName = mode === 'blitz' ? "Jeff's Blitz" : customFormat.name
  const isChanging = newFormatName !== currentFormatName

  const handleSave = () => {
    if (scoresExist && isChanging) setShowConfirm(true)
    else doSave()
  }

  const doSave = async () => {
    const toSave = mode === 'blitz' ? JEFFS_BLITZ : customFormat
    // Save as active tournament format
    await set(ref(db,'tournament/format'), toSave)
    // Save to library (only custom formats, not Jeff's Blitz — that's always there)
    if (mode === 'custom' && customFormat.name && customFormat.name !== "Jeff's Blitz") {
      // Check if name already exists — update instead of duplicate
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

  const loadSavedFormat = (format: any) => {
    setMode('custom')
    setCustomFormat({ name: format.name, par3: format.par3, par4: format.par4, par5: format.par5 })
    setShowSavedFormats(false)
  }

  const deleteSavedFormat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("REMOVE THIS FORMAT FROM LIBRARY?")) {
      await set(ref(db,`savedFormats/${id}`), null)
    }
  }

  // Validation
  const activeFormat = mode === 'blitz' ? JEFFS_BLITZ : customFormat
  const maxBallsNeeded = Math.max(activeFormat.par3.length, activeFormat.par4.length, activeFormat.par5.length)
  const hasTeamSizeWarning = minTeamSize !== null && maxBallsNeeded > minTeamSize
  const warnPar3 = minTeamSize !== null && activeFormat.par3.length > minTeamSize
  const warnPar4 = minTeamSize !== null && activeFormat.par4.length > minTeamSize
  const warnPar5 = minTeamSize !== null && activeFormat.par5.length > minTeamSize

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">Team Scoring Format</h1>
          <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">How many balls count per hole for Team vs Team matches</p>
        </div>

        {/* Info strips */}
        {minTeamSize !== null && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <Info size={14} className="text-zinc-500 flex-shrink-0"/>
            <p className="text-zinc-500 text-xs font-black normal-case">
              Smallest team: <span className="text-white">{minTeamSize} players</span> — safe to use up to {minTeamSize} balls per hole.
            </p>
          </div>
        )}
        {scoresExist && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <Info size={14} className="text-blue-400 flex-shrink-0"/>
            <p className="text-blue-300 text-xs font-black normal-case">Scores are in play — changing format will ask for confirmation.</p>
          </div>
        )}
        {hasTeamSizeWarning && (
          <div className="flex items-start gap-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-amber-400 font-black text-sm">FORMAT MISMATCH</p>
              <p className="text-amber-300/70 text-xs font-black normal-case mt-1 leading-relaxed">
                Format needs <strong>{maxBallsNeeded} balls</strong> but smallest team has <strong>{minTeamSize} players</strong>. Reduce balls to {minTeamSize} or add more players.
              </p>
            </div>
          </div>
        )}
        {saved && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2">
            <CheckCircle2 size={16}/> FORMAT SAVED{mode === 'custom' ? ' · ADDED TO LIBRARY' : ''}
          </div>
        )}

        {/* TWO CHOICES */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('blitz')}
            className={`p-5 rounded-[1.75rem] border-2 text-left transition-all ${mode==='blitz'?'border-emerald-500/60 bg-emerald-950/30':'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}>
            <div className="text-2xl mb-2">⭐</div>
            <div className={`font-black text-sm ${mode==='blitz'?'text-emerald-400':'text-zinc-300'}`}>Jeff's Blitz</div>
            <div className="text-[10px] font-black text-zinc-600 mt-1 normal-case leading-relaxed">Best 2 Net per hole<br/>Best 3 Net on par 3s</div>
            {mode==='blitz' && <div className="mt-2"><CheckCircle2 size={14} className="text-emerald-400"/></div>}
          </button>
          <button onClick={() => setMode('custom')}
            className={`p-5 rounded-[1.75rem] border-2 text-left transition-all ${mode==='custom'?'border-purple-500/60 bg-purple-950/20':'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}>
            <div className="text-2xl mb-2">⚙️</div>
            <div className={`font-black text-sm ${mode==='custom'?'text-purple-400':'text-zinc-300'}`}>Configure Custom</div>
            <div className="text-[10px] font-black text-zinc-600 mt-1 normal-case leading-relaxed">Set your own ball<br/>count and types</div>
            {mode==='custom' && <div className="mt-2"><CheckCircle2 size={14} className="text-purple-400"/></div>}
          </button>
        </div>

        {/* JEFF'S BLITZ SUMMARY */}
        {mode === 'blitz' && (
          <div className={`border rounded-2xl p-5 space-y-2 ${warnPar3||warnPar4||warnPar5?'border-amber-500/40 bg-amber-500/5':'border-zinc-800 bg-zinc-900'}`}>
            <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">FORMAT SUMMARY</p>
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
                <span className={row.warn?'text-amber-400':'text-white'}>{row.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOM CONFIGURATOR */}
        {mode === 'custom' && (
          <div className="space-y-4">
            {/* Format name */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-2">FORMAT NAME</label>
              <input value={customFormat.name} onChange={e => setCustomFormat(prev => ({...prev, name: e.target.value}))}
                className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-purple-500 p-4 rounded-2xl font-black text-white text-lg outline-none transition-colors"
                placeholder="MY CUSTOM FORMAT"/>
            </div>

            {/* Saved formats library */}
            {savedFormats.length > 0 && (
              <div>
                <button onClick={() => setShowSavedFormats(!showSavedFormats)}
                  className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 hover:border-zinc-500 px-4 py-3 rounded-2xl font-black text-sm text-zinc-400 hover:text-white transition-all">
                  <span className="flex items-center gap-2"><BookOpen size={14} className="text-purple-400"/> LOAD FROM LIBRARY ({savedFormats.length})</span>
                  {showSavedFormats?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                </button>
                {showSavedFormats && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2 mt-1">
                    {savedFormats.map(f => (
                      <button key={f.id} onClick={() => loadSavedFormat(f)}
                        className="w-full flex items-center justify-between bg-black border border-zinc-800 hover:border-purple-500 p-3 rounded-xl transition-all group">
                        <div className="text-left">
                          <div className="font-black text-sm text-white group-hover:text-purple-400 transition-colors">{f.name}</div>
                          <div className="text-[9px] text-zinc-600 font-black mt-0.5">
                            P3:{formatSummary(f.par3)} · P4:{formatSummary(f.par4)} · P5:{formatSummary(f.par5)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">LOAD</span>
                          <button onClick={e => deleteSavedFormat(f.id, e)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ParSection label="PAR 3" balls={customFormat.par3} warning={warnPar3}
              onChange={balls => setCustomFormat(prev => ({...prev, par3: balls}))}/>
            <ParSection label="PAR 4" balls={customFormat.par4} warning={warnPar4}
              onChange={balls => setCustomFormat(prev => ({...prev, par4: balls}))}/>
            <ParSection label="PAR 5" balls={customFormat.par5} warning={warnPar5}
              onChange={balls => setCustomFormat(prev => ({...prev, par5: balls}))}/>

            <div className="flex gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5"/>
              <p className="text-blue-300 text-xs font-black normal-case leading-relaxed">
                Each player counts once per hole — not both net and gross. Engine finds the best combination automatically.
              </p>
            </div>
          </div>
        )}

        <button onClick={handleSave}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-colors shadow-lg">
          <Save size={20}/> SAVE FORMAT
        </button>

        <Link href="/setup/admin"
          className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs font-black tracking-widest py-2 block transition-colors">
          ← BACK WITHOUT SAVING
        </Link>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 rounded-[2rem] border-2 border-amber-500/50 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-400"/>
                <h2 className="font-black text-base uppercase italic text-amber-400">Scores In Play</h2>
              </div>
              <button onClick={() => setShowConfirm(false)}><X size={18} className="text-zinc-500 hover:text-white transition-colors"/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-zinc-300 text-sm font-black normal-case leading-relaxed">
                You're changing from <span className="text-white">"{currentFormatName}"</span> to <span className="text-white">"{newFormatName}"</span> while scores are in play.
              </p>
              <p className="text-amber-400 text-xs font-black normal-case leading-relaxed">
                ⚠ All team match payouts will recalculate immediately. This cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={doSave}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-black text-sm uppercase italic transition-colors">
                  Yes, Change Format
                </button>
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black text-sm uppercase italic transition-colors">
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