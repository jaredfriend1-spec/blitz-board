"use client"
import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, push, set } from 'firebase/database'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { Flag, Plus, Trash2, Camera, Check, X, ChevronLeft, Edit3, Pencil } from 'lucide-react'

interface Hole { par: number; hcp: number }
interface Course { id: string; name: string; holes: Hole[]; pars: number[] }

const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({ par: 4, hcp: i + 1 }))

export default function CoursesPage() {
  const { role } = useAuth()
  const canEdit = role === 'scorer' || role === 'master'

  const [courses, setCourses] = useState<Course[]>([])
  const [adding, setAdding] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'scan' | null>(null)
  const [newName, setNewName] = useState('')
  const [newHoles, setNewHoles] = useState<Hole[]>(DEFAULT_HOLES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHoles, setEditHoles] = useState<Hole[]>(DEFAULT_HOLES)
  const [editName, setEditName] = useState('')
  const [scanPreview, setScanPreview] = useState<Hole[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    onValue(ref(db, 'courseHistory'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val()).map(([k, v]: any) => ({ id: k, ...v }))
        setCourses(items.sort((a: any, b: any) => (b.savedAt || 0) - (a.savedAt || 0)))
      } else setCourses([])
    })
  }, [])

  const scanCard = async (file: File) => {
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/scan-scorecard', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.holes) {
        setScanPreview(data.holes)
        setAddMode('scan')
      } else showToast('Could not read scorecard — try a clearer photo')
    } catch { showToast('Scan failed — check connection') }
    setScanning(false)
  }

  const updateNewHole = (i: number, field: 'par' | 'hcp', val: number) => {
    const h = [...newHoles]; h[i] = { ...h[i], [field]: val }; setNewHoles(h)
  }

  const updateEditHole = (i: number, field: 'par' | 'hcp', val: number) => {
    const h = [...editHoles]; h[i] = { ...h[i], [field]: val }; setEditHoles(h)
  }

  const saveCourse = async (name: string, holes: Hole[]) => {
    if (!name.trim()) return showToast('Enter a course name')
    const existing = courses.find(c => c.name.toLowerCase() === name.toLowerCase())
    const courseData = { name: name.trim(), holes, pars: holes.map(h => h.par), savedAt: Date.now() }
    if (existing) {
      await set(ref(db, `courseHistory/${existing.id}`), { id: existing.id, ...courseData })
      showToast('✓ Course updated')
    } else {
      const r = push(ref(db, 'courseHistory'))
      await set(r, { id: r.key, ...courseData })
      showToast('✓ Course saved')
    }
    setAdding(false); setAddMode(null); setNewName(''); setNewHoles(DEFAULT_HOLES); setScanPreview(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await set(ref(db, `courseHistory/${editingId}`), {
      id: editingId, name: editName.trim(), holes: editHoles, pars: editHoles.map(h => h.par), savedAt: Date.now()
    })
    showToast('✓ Course updated')
    setEditingId(null)
  }

  const startEdit = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(course.id)
    setEditName(course.name)
    setEditHoles(course.holes?.length ? [...course.holes] : DEFAULT_HOLES)
    setExpandedId(course.id)
  }

  const deleteCourse = async (id: string) => {
    await set(ref(db, `courseHistory/${id}`), null)
    showToast('Deleted')
  }

  // Reusable hole grid editor
  const HoleGrid = ({
    holes, onUpdate, label
  }: { holes: Hole[]; onUpdate: (i: number, f: 'par' | 'hcp', v: number) => void; label?: string }) => {
    // Track which HCP values are already used (excluding the current hole being rendered)
    const usedHcps = (excludeIdx: number) => {
      const used = new Set<number>()
      holes.forEach((h, i) => { if (i !== excludeIdx) used.add(h.hcp) })
      return used
    }
    // Check for duplicates for warning
    const hcpValues = holes.map(h => h.hcp)
    const hasDuplicates = new Set(hcpValues).size !== hcpValues.length

    return (
    <div className="space-y-3">
      {label && <p className="text-[10px] font-black text-zinc-500 tracking-widest">{label}</p>}
      {/* Front 9 */}
      <div>
        <div className="grid grid-cols-10 gap-1 text-center mb-1">
          <div className="text-zinc-600 text-[9px] font-black py-1">HOLE</div>
          {holes.slice(0, 9).map((_, i) => (
            <div key={i} className="text-zinc-500 text-[9px] font-black py-1">{i + 1}</div>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1 mb-1">
          <div className="text-emerald-400 text-[9px] font-black flex items-center justify-center">PAR</div>
          {holes.slice(0, 9).map((h, i) => (
            <select key={i} value={h.par}
              onChange={e => onUpdate(i, 'par', Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-white text-[10px] font-black text-center rounded-lg py-1.5 outline-none focus:border-emerald-500 w-full">
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1">
          <div className="text-blue-400 text-[9px] font-black flex items-center justify-center">HCP</div>
          {holes.slice(0, 9).map((h, i) => {
            const used = usedHcps(i)
            return (
              <select key={i} value={h.hcp}
                onChange={e => onUpdate(i, 'hcp', Number(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 text-blue-300 text-[10px] font-black text-center rounded-lg py-1.5 outline-none focus:border-blue-500 w-full">
                {Array.from({ length: 18 }, (_, n) => n + 1).map(n => (
                  <option key={n} value={n} disabled={used.has(n) && n !== h.hcp}>{n}</option>
                ))}
              </select>
            )
          })}
        </div>
      </div>
      {/* Back 9 */}
      {holes.length > 9 && (
        <div>
          <div className="grid grid-cols-10 gap-1 text-center mb-1">
            <div className="text-zinc-600 text-[9px] font-black py-1">HOLE</div>
            {holes.slice(9, 18).map((_, i) => (
              <div key={i} className="text-zinc-500 text-[9px] font-black py-1">{i + 10}</div>
            ))}
          </div>
          <div className="grid grid-cols-10 gap-1 mb-1">
            <div className="text-emerald-400 text-[9px] font-black flex items-center justify-center">PAR</div>
            {holes.slice(9, 18).map((h, i) => (
              <select key={i} value={h.par}
                onChange={e => onUpdate(9 + i, 'par', Number(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 text-white text-[10px] font-black text-center rounded-lg py-1.5 outline-none focus:border-emerald-500 w-full">
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            ))}
          </div>
          <div className="grid grid-cols-10 gap-1">
            <div className="text-blue-400 text-[9px] font-black flex items-center justify-center">HCP</div>
            {holes.slice(9, 18).map((h, i) => {
              const idx = 9 + i
              const used = usedHcps(idx)
              return (
                <select key={i} value={h.hcp}
                  onChange={e => onUpdate(idx, 'hcp', Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 text-blue-300 text-[10px] font-black text-center rounded-lg py-1.5 outline-none focus:border-blue-500 w-full">
                  {Array.from({ length: 18 }, (_, n) => n + 1).map(n => (
                    <option key={n} value={n} disabled={used.has(n) && n !== h.hcp}>{n}</option>
                  ))}
                </select>
              )
            })}
          </div>
        </div>
      )}
      {hasDuplicates && (
        <p className="text-amber-400 text-[10px] font-black tracking-widest">⚠️ DUPLICATE HCP VALUES — EACH HOLE MUST BE UNIQUE (1-18)</p>
      )}
    </div>
    )
  }

  // Read-only hole display
  const HoleDisplay = ({ holes }: { holes: Hole[] }) => (
    <div className="space-y-3">
      {[holes.slice(0, 9), holes.slice(9, 18)].map((nine, nineIdx) => nine.length > 0 && (
        <div key={nineIdx}>
          <div className="grid grid-cols-10 gap-1 text-center mb-1">
            <div className="text-zinc-700 text-[9px]">H</div>
            {nine.map((_, i) => <div key={i} className="text-zinc-600 text-[9px]">{nineIdx * 9 + i + 1}</div>)}
          </div>
          <div className="grid grid-cols-10 gap-1 mb-1">
            <div className="text-zinc-600 text-[9px] flex items-center justify-center">P</div>
            {nine.map((h, i) => <div key={i} className="bg-zinc-950 rounded text-[10px] font-black text-white py-1 text-center">{h.par}</div>)}
          </div>
          <div className="grid grid-cols-10 gap-1">
            <div className="text-zinc-600 text-[9px] flex items-center justify-center">H</div>
            {nine.map((h, i) => <div key={i} className="bg-zinc-950 rounded text-[10px] text-zinc-500 py-1 text-center">{h.hcp}</div>)}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="font-black text-sm tracking-tight">COURSE LIBRARY</h1>
            <p className="text-zinc-600 text-[10px] font-medium">{courses.length} saved courses</p>
          </div>
        </div>
        {canEdit && !adding && (
          <button onClick={() => { setAdding(true); setAddMode(null) }}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-bold text-sm transition-colors">
            <Plus size={15} /> Add Course
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Add new course */}
        {adding && canEdit && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base">New Course</h2>
              <button onClick={() => { setAdding(false); setAddMode(null); setNewName(''); setNewHoles(DEFAULT_HOLES); setScanPreview(null) }}
                className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>

            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Course name" autoFocus
              className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-4 py-3 rounded-xl text-sm text-white outline-none" />

            {/* Mode selector */}
            {!addMode && (
              <div className="space-y-2">
                <p className="text-zinc-500 text-[10px] font-black tracking-widest">HOW TO ADD HOLES</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setAddMode('manual'); setNewHoles(DEFAULT_HOLES) }}
                    className="flex flex-col items-center gap-2 border-2 border-dashed border-zinc-700 hover:border-emerald-500 py-4 rounded-xl text-zinc-500 hover:text-emerald-400 transition-all font-black text-xs">
                    <Pencil size={18} /> MANUAL
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
                    className="flex flex-col items-center gap-2 border-2 border-dashed border-zinc-700 hover:border-blue-500 py-4 rounded-xl text-zinc-500 hover:text-blue-400 transition-all font-black text-xs">
                    <Camera size={18} /> {scanning ? 'SCANNING...' : 'TAKE PHOTO'}
                  </button>
                  <button onClick={() => uploadInputRef.current?.click()} disabled={scanning}
                    className="flex flex-col items-center gap-2 border-2 border-dashed border-zinc-700 hover:border-zinc-500 py-4 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all font-black text-xs">
                    <Plus size={18} /> UPLOAD
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => e.target.files?.[0] && scanCard(e.target.files[0])} />
                <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && scanCard(e.target.files[0])} />
              </div>
            )}

            {/* Manual entry grid */}
            {addMode === 'manual' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-emerald-400 text-[10px] font-black tracking-widest">ENTER HOLE DATA</p>
                  <button onClick={() => setAddMode(null)} className="text-zinc-600 hover:text-zinc-400 text-[10px] font-black">← BACK</button>
                </div>
                <HoleGrid holes={newHoles} onUpdate={updateNewHole} />
                <div className="flex items-center justify-between text-xs font-black text-zinc-500 px-1">
                  <span>Par: {newHoles.reduce((a, h) => a + h.par, 0)}</span>
                  <span className="text-[9px]">Tap par/hcp to change</span>
                </div>
              </div>
            )}

            {/* Scan preview */}
            {addMode === 'scan' && scanPreview && (
              <div className="space-y-3">
                <p className="text-blue-400 text-[10px] font-black tracking-widest">✓ SCAN PREVIEW — EDIT IF NEEDED</p>
                <HoleGrid holes={scanPreview}
                  onUpdate={(i, f, v) => {
                    const h = [...scanPreview]; h[i] = { ...h[i], [f]: v }; setScanPreview(h)
                  }} />
              </div>
            )}

            {/* Save button — only show when mode is selected */}
            {addMode && (
              <button onClick={() => saveCourse(newName, addMode === 'scan' ? (scanPreview || newHoles) : newHoles)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2">
                <Check size={15} /> Save Course
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !adding && (
          <div className="text-center py-12">
            <Flag size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 font-black text-sm">No courses saved yet</p>
            {canEdit && <p className="text-zinc-700 text-xs font-black normal-case mt-1">Tap Add Course to get started</p>}
          </div>
        )}

        {/* Course list */}
        {courses.map(course => (
          <div key={course.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <button onClick={() => { setExpandedId(expandedId === course.id ? null : course.id); setEditingId(null) }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
              <Flag size={16} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-black text-sm">{course.name}</div>
                <div className="text-zinc-600 text-[10px] font-black normal-case">
                  {course.holes?.length || 18} holes · Par {course.pars?.reduce((a, b) => a + b, 0) || 72}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={e => startEdit(course, e)}
                    className="text-zinc-600 hover:text-emerald-400 p-1.5 rounded-lg transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCourse(course.id) }}
                    className="text-zinc-700 hover:text-rose-400 p-1.5 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </button>

            {expandedId === course.id && (
              <div className="border-t border-zinc-800 p-4 space-y-4">
                {editingId === course.id ? (
                  // ── EDIT MODE ──
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-emerald-400 text-[10px] font-black tracking-widest">EDITING</p>
                      <button onClick={() => setEditingId(null)} className="text-zinc-600 hover:text-zinc-400 text-[10px] font-black">CANCEL</button>
                    </div>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2 rounded-xl text-sm text-white outline-none font-black" />
                    <HoleGrid holes={editHoles} onUpdate={updateEditHole} />
                    <div className="flex items-center justify-between text-xs font-black text-zinc-500 px-1">
                      <span>Par: {editHoles.reduce((a, h) => a + h.par, 0)}</span>
                    </div>
                    <button onClick={saveEdit}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2">
                      <Check size={15} /> Save Changes
                    </button>
                  </div>
                ) : (
                  // ── VIEW MODE ──
                  <HoleDisplay holes={course.holes || []} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
