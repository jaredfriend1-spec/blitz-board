"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Save, CheckCircle2, Info } from 'lucide-react'
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

// Starting points for custom config
const STARTING_POINTS: { label: string; format: FormatSpec }[] = [
  {
    label: "Jeff's Blitz",
    format: JEFFS_BLITZ,
  },
  {
    label: "1 Gross + 1 Net",
    format: {
      name: "1 Gross + 1 Net",
      par3: [{ type: 'gross' }, { type: 'net' }],
      par4: [{ type: 'gross' }, { type: 'net' }],
      par5: [{ type: 'gross' }, { type: 'net' }],
    },
  },
  {
    label: "Best 1 Net",
    format: {
      name: "Best 1 Net",
      par3: [{ type: 'net' }],
      par4: [{ type: 'net' }],
      par5: [{ type: 'net' }],
    },
  },
  {
    label: "Best 3 Net",
    format: {
      name: "Best 3 Net",
      par3: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
      par4: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
      par5: [{ type: 'net' }, { type: 'net' }, { type: 'net' }],
    },
  },
]

function formatSummary(balls: Ball[]): string {
  const gross = balls.filter(b => b.type === 'gross').length
  const net = balls.filter(b => b.type === 'net').length
  const parts = []
  if (gross > 0) parts.push(`${gross} Gross`)
  if (net > 0) parts.push(`${net} Net`)
  return `Best ${parts.join(' + ')}`
}

function ParSection({ label, balls, onChange }: {
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
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white font-black">{label}</span>
        <span className="text-zinc-500 text-xs font-black">{formatSummary(balls)}</span>
      </div>
      {/* Ball count */}
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
      {/* Ball types */}
      <div>
        <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">BALL TYPES — TAP TO TOGGLE</p>
        <div className="flex gap-2 flex-wrap">
          {balls.map((ball, i) => (
            <button
              key={i}
              onClick={() => toggleBallType(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all border-2 ${
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
      </div>
    </div>
  )
}

export default function FormatPage() {
  const [mode, setMode] = useState<'blitz' | 'custom'>('blitz')
  const [customFormat, setCustomFormat] = useState<FormatSpec>({ ...JEFFS_BLITZ, name: 'Custom Format' })
  const [saved, setSaved] = useState(false)
  const [currentFormatName, setCurrentFormatName] = useState("Jeff's Blitz")

  useEffect(() => {
    onValue(ref(db, 'tournament/format'), snap => {
      if (snap.val()) {
        const f = snap.val()
        setCurrentFormatName(f.name || "Jeff's Blitz")
        if (f.name === "Jeff's Blitz") {
          setMode('blitz')
        } else {
          setMode('custom')
          setCustomFormat(f)
        }
      }
    })
  }, [])

  const loadStartingPoint = (sp: typeof STARTING_POINTS[0]) => {
    setCustomFormat({
      ...sp.format,
      name: sp.label === "Jeff's Blitz" ? 'Custom Format' : sp.label,
    })
  }

  const saveFormat = async () => {
    const toSave = mode === 'blitz' ? JEFFS_BLITZ : customFormat
    await set(ref(db, 'tournament/format'), toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-xl mx-auto space-y-6">

        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">Team Scoring Format</h1>
          <p className="text-zinc-600 text-xs font-black tracking-widest normal-case">
            How many balls count per hole for Team vs Team matches
          </p>
        </div>

        {saved && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl font-black text-sm flex items-center gap-2">
            <CheckCircle2 size={16}/> FORMAT SAVED
          </div>
        )}

        {/* ── TWO CHOICES ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Jeff's Blitz */}
          <button
            onClick={() => setMode('blitz')}
            className={`p-5 rounded-[1.75rem] border-2 text-left transition-all ${
              mode === 'blitz'
                ? 'border-emerald-500/60 bg-emerald-950/30'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            <div className="text-2xl mb-2">⭐</div>
            <div className={`font-black text-sm ${mode === 'blitz' ? 'text-emerald-400' : 'text-zinc-300'}`}>
              Jeff's Blitz
            </div>
            <div className="text-[10px] font-black text-zinc-600 mt-1 normal-case leading-relaxed">
              Best 2 Net per hole<br/>Best 3 Net on par 3s
            </div>
            {mode === 'blitz' && (
              <div className="mt-2">
                <CheckCircle2 size={14} className="text-emerald-400"/>
              </div>
            )}
          </button>

          {/* Configure Custom */}
          <button
            onClick={() => setMode('custom')}
            className={`p-5 rounded-[1.75rem] border-2 text-left transition-all ${
              mode === 'custom'
                ? 'border-purple-500/60 bg-purple-950/20'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className={`font-black text-sm ${mode === 'custom' ? 'text-purple-400' : 'text-zinc-300'}`}>
              Configure Custom
            </div>
            <div className="text-[10px] font-black text-zinc-600 mt-1 normal-case leading-relaxed">
              Set your own ball<br/>count and types
            </div>
            {mode === 'custom' && (
              <div className="mt-2">
                <CheckCircle2 size={14} className="text-purple-400"/>
              </div>
            )}
          </button>

        </div>

        {/* ── JEFF'S BLITZ SUMMARY ── */}
        {mode === 'blitz' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
            <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">FORMAT SUMMARY</p>
            {[
              { label: 'Par 3', desc: 'Best 3 Net scores' },
              { label: 'Par 4', desc: 'Best 2 Net scores' },
              { label: 'Par 5', desc: 'Best 2 Net scores' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm font-black">
                <span className="text-zinc-500">{row.label}</span>
                <span className="text-white">{row.desc}</span>
              </div>
            ))}
            <p className="text-[10px] text-zinc-700 font-black normal-case pt-2 border-t border-zinc-800">
              Each player can only count once per hole. Engine picks the optimal combination.
            </p>
          </div>
        )}

        {/* ── CUSTOM CONFIGURATOR ── */}
        {mode === 'custom' && (
          <div className="space-y-4">

            {/* Format name */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-2">FORMAT NAME</label>
              <input
                value={customFormat.name}
                onChange={e => setCustomFormat(prev => ({...prev, name: e.target.value}))}
                className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-purple-500 p-4 rounded-2xl font-black text-white text-lg outline-none transition-colors"
                placeholder="MY CUSTOM FORMAT"
              />
            </div>

            {/* Start from a base */}
            <div>
              <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">START FROM A BASE</p>
              <div className="flex gap-2 flex-wrap">
                {STARTING_POINTS.map(sp => (
                  <button
                    key={sp.label}
                    onClick={() => loadStartingPoint(sp)}
                    className="px-3 py-2 rounded-xl font-black text-xs bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition-all"
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Par sections */}
            <ParSection
              label="PAR 3"
              balls={customFormat.par3}
              onChange={balls => setCustomFormat(prev => ({...prev, par3: balls}))}
            />
            <ParSection
              label="PAR 4"
              balls={customFormat.par4}
              onChange={balls => setCustomFormat(prev => ({...prev, par4: balls}))}
            />
            <ParSection
              label="PAR 5"
              balls={customFormat.par5}
              onChange={balls => setCustomFormat(prev => ({...prev, par5: balls}))}
            />

            {/* Info note */}
            <div className="flex gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5"/>
              <p className="text-blue-300 text-xs font-black normal-case leading-relaxed">
                Each player can only contribute one score per hole — not both their net and gross. The engine finds the best combination automatically.
              </p>
            </div>
          </div>
        )}

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