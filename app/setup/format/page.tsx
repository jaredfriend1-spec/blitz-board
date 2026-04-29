"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Save, CheckCircle2, RotateCcw, Info } from 'lucide-react'
import Link from 'next/link'

// ── TYPE DEFS ──────────────────────────────────────────────────────
type BallType = 'net' | 'gross'
type Ball = { type: BallType }
type FormatSpec = { par3: Ball[]; par4: Ball[]; par5: Ball[]; name: string }

// ── PRESETS ────────────────────────────────────────────────────────
const JEFFS_BLITZ: FormatSpec = {
  name: "Jeff's Blitz",
  par3: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
  par4: [{ type: 'net' }, { type: 'net' }],
  par5: [{ type: 'net' }, { type: 'net' }],
}

const PRESETS: FormatSpec[] = [
  JEFFS_BLITZ,
  {
    name: "1 Gross + 1 Net",
    par3: [{ type: 'gross' }, { type: 'net' }],
    par4: [{ type: 'gross' }, { type: 'net' }],
    par5: [{ type: 'gross' }, { type: 'net' }],
  },
  {
    name: "Best 1 Net",
    par3: [{ type: 'net' }],
    par4: [{ type: 'net' }],
    par5: [{ type: 'net' }],
  },
  {
    name: "Best 3 Net",
    par3: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
    par4: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
    par5: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
  },
  {
    name: "All Gross",
    par3: [{ type: 'gross' }, { type: 'gross' }],
    par4: [{ type: 'gross' }, { type: 'gross' }],
    par5: [{ type: 'gross' }, { type: 'gross' }],
  },
]

// ── HUMAN READABLE SUMMARY ─────────────────────────────────────────
function formatSummary(balls: Ball[]): string {
  const gross = balls.filter(b => b.type === 'gross').length
  const net = balls.filter(b => b.type === 'net').length
  const parts = []
  if (gross > 0) parts.push(`${gross} Gross`)
  if (net > 0) parts.push(`${net} Net`)
  return `Best ${parts.join(' + ')}`
}

// ── PAR SECTION EDITOR ─────────────────────────────────────────────
function ParSection({
  label,
  balls,
  onChange,
}: {
  label: string
  balls: Ball[]
  onChange: (balls: Ball[]) => void
}) {
  const setBallCount = (count: number) => {
    const newBalls = Array.from({ length: count }, (_, i) => balls[i] || { type: 'net' as BallType })
    onChange(newBalls)
  }

  const toggleBallType = (index: number) => {
    const updated = [...balls]
    updated[index] = { type: updated[index].type === 'net' ? 'gross' : 'net' }
    onChange(updated)
  }

  const grossCount = balls.filter(b => b.type === 'gross').length
  const netCount = balls.filter(b => b.type === 'net').length

  return (
    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-white font-black text-lg">{label}</span>
          <span className="text-zinc-500 text-xs font-black ml-3 tracking-wider">
            {formatSummary(balls)}
          </span>
        </div>
        <div className={`px-3 py-1 rounded-xl text-xs font-black ${
          grossCount > 0 && netCount > 0
            ? 'bg-purple-500/20 text-purple-400'
            : netCount > 0
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/20 text-rose-400'
        }`}>
          {grossCount > 0 && netCount > 0 ? 'MIXED' : netCount > 0 ? 'NET' : 'GROSS'}
        </div>
      </div>

      {/* Ball count picker */}
      <div>
        <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">NUMBER OF BALLS</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setBallCount(n)}
              className={`w-11 h-11 rounded-xl font-black text-lg transition-all border-2 ${
                balls.length === n
                  ? 'bg-white text-black border-white'
                  : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Ball type toggles */}
      <div>
        <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">BALL TYPES — TAP TO TOGGLE</p>
        <div className="flex gap-2 flex-wrap">
          {balls.map((ball, i) => (
            <button
              key={i}
              onClick={() => toggleBallType(i)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                ball.type === 'net'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30'
              }`}
            >
              <span className="text-[10px] text-zinc-500 font-black">#{i + 1}</span>
              {ball.type === 'net' ? 'NET' : 'GROSS'}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-zinc-700 font-black mt-2 tracking-wider normal-case">
          Tap any ball to switch between Net and Gross
        </p>
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────
export default function FormatPage() {
  const [format, setFormat] = useState<FormatSpec>({ ...JEFFS_BLITZ })
  const [saved, setSaved] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>("Jeff's Blitz")

  useEffect(() => {
    onValue(ref(db, 'tournament/format'), snap => {
      if (snap.val()) {
        setFormat(snap.val())
        // Check if it matches a preset
        const match = PRESETS.find(p => p.name === snap.val().name)
        setActivePreset(match ? match.name : null)
      }
    })
  }, [])

  const loadPreset = (preset: FormatSpec) => {
    setFormat({ ...preset })
    setActivePreset(preset.name)
  }

  const updatePar = (par: 'par3' | 'par4' | 'par5', balls: Ball[]) => {
    setFormat(prev => ({ ...prev, [par]: balls }))
    setActivePreset(null) // custom
  }

  const saveFormat = async () => {
    await set(ref(db, 'tournament/format'), format)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">Team Scoring Format</h1>
          <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">
            Configure how many balls count per hole for Team vs Team matches
          </p>
        </div>

        {/* How it works note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5"/>
          <p className="text-blue-300 text-xs font-black normal-case leading-relaxed">
            The engine finds the <strong>optimal combination</strong> of player scores that produces the lowest possible team score — but each player can only count once per hole (not both their net and gross). Only applies to Team vs Team matches. PvP matches use their own scoring type setting.
          </p>
        </div>

        {/* Saved confirmation */}
        {saved && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2">
            <CheckCircle2 size={16}/> FORMAT SAVED · PAYOUTS WILL USE THIS IMMEDIATELY
          </div>
        )}

        {/* Format name */}
        <div>
          <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-2">FORMAT NAME</label>
          <input
            value={format.name}
            onChange={e => { setFormat(prev => ({...prev, name: e.target.value})); setActivePreset(null) }}
            className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 p-4 rounded-2xl font-black text-white text-xl outline-none transition-colors"
            placeholder="MY CUSTOM FORMAT"
          />
        </div>

        {/* Presets */}
        <div>
          <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">LOAD A PRESET</p>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all border-2 ${
                  activePreset === preset.name
                    ? preset.name === "Jeff's Blitz"
                      ? 'bg-emerald-500 border-emerald-400 text-black'
                      : 'bg-zinc-600 border-zinc-500 text-white'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {preset.name === "Jeff's Blitz" && '⭐ '}
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* PAR SECTIONS */}
        <ParSection
          label="PAR 3"
          balls={format.par3}
          onChange={balls => updatePar('par3', balls)}
        />
        <ParSection
          label="PAR 4"
          balls={format.par4}
          onChange={balls => updatePar('par4', balls)}
        />
        <ParSection
          label="PAR 5"
          balls={format.par5}
          onChange={balls => updatePar('par5', balls)}
        />

        {/* Format summary card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">FORMAT SUMMARY</p>
          <div className="space-y-2 text-sm font-black">
            <div className="flex justify-between">
              <span className="text-zinc-500">PAR 3</span>
              <span className="text-white">{formatSummary(format.par3)} ({format.par3.length} ball{format.par3.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PAR 4</span>
              <span className="text-white">{formatSummary(format.par4)} ({format.par4.length} ball{format.par4.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PAR 5</span>
              <span className="text-white">{formatSummary(format.par5)} ({format.par5.length} ball{format.par5.length !== 1 ? 's' : ''})</span>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={saveFormat}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
        >
          <Save size={20}/> SAVE FORMAT
        </button>

        <Link
          href="/setup/admin"
          className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs font-black tracking-widest py-2 block transition-colors"
        >
          ← BACK WITHOUT SAVING
        </Link>

      </div>
    </div>
  )
}