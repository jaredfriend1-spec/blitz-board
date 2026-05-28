"use client"
import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, push, set } from 'firebase/database'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { Flag, Plus, Trash2, Camera, Check, X, ChevronLeft, Edit3 } from 'lucide-react'

interface Hole { par: number; hcp: number }
interface Course { id: string; name: string; holes: Hole[]; pars: number[] }

export default function CoursesPage() {
  const { role } = useAuth()
  const canEdit = role === 'scorer' || role === 'master'

  const [courses, setCourses] = useState<Course[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [scanPreview, setScanPreview] = useState<Hole[]|null>(null)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000) }

  useEffect(() => {
    onValue(ref(db,'courseHistory'), snap => {
      if (snap.val()) {
        const items = Object.entries(snap.val()).map(([k,v]:any) => ({id:k,...v}))
        setCourses(items)
      } else setCourses([])
    })
  }, [])

  const scanCard = async (file: File) => {
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/scan-scorecard', { method:'POST', body:formData })
      const data = await res.json()
      if (data.holes) setScanPreview(data.holes)
      else showToast('Could not read scorecard — try a clearer photo')
    } catch { showToast('Scan failed — check connection') }
    setScanning(false)
  }

  const saveCourse = async (name: string, holes: Hole[]) => {
    if (!name.trim()) return showToast('Enter a course name')
    const existing = courses.find(c => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      await set(ref(db,`courseHistory/${existing.id}`), {
        id:existing.id, name:name.trim(), holes, pars:holes.map(h=>h.par)
      })
      showToast('✓ Course updated')
    } else {
      const r = push(ref(db,'courseHistory'))
      await set(r, { id:r.key, name:name.trim(), holes, pars:holes.map(h=>h.par) })
      showToast('✓ Course saved')
    }
    setAdding(false); setNewName(''); setScanPreview(null)
  }

  const deleteCourse = async (id: string) => {
    await set(ref(db,`courseHistory/${id}`), null)
    showToast('Deleted')
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={20}/>
          </Link>
          <div>
            <h1 className="font-black text-sm tracking-tight">COURSE LIBRARY</h1>
            <p className="text-zinc-600 text-[10px] font-medium">{courses.length} saved courses</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-bold text-sm transition-colors">
            <Plus size={15}/> Add Course
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Add new course form */}
        {adding && canEdit && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-base">New Course</h2>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Course name"
              autoFocus
              className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-4 py-3 rounded-xl text-sm text-white outline-none"
            />

            {/* Scan scorecard */}
            <div className="space-y-2">
              <p className="text-zinc-500 text-[10px] font-semibold tracking-widest">HOLE DATA</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-emerald-500 py-4 rounded-xl text-zinc-500 hover:text-emerald-400 transition-all font-semibold text-sm">
                  <Camera size={18}/>
                  {scanning ? 'Scanning...' : 'Take Photo'}
                </button>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={scanning}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-zinc-500 py-4 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all font-semibold text-sm">
                  <Plus size={18}/>
                  Upload Image
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && scanCard(e.target.files[0])}/>
              <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && scanCard(e.target.files[0])}/>
            </div>

            {/* Scan preview */}
            {scanPreview && (
              <div className="space-y-2">
                <p className="text-emerald-400 text-[10px] font-semibold tracking-widest">✓ SCAN PREVIEW — {scanPreview.length} HOLES</p>
                <div className="grid grid-cols-9 gap-1 text-center">
                  <div className="text-zinc-600 text-[9px] font-semibold">HOLE</div>
                  {scanPreview.slice(0,9).map((_,i) => (
                    <div key={i} className="text-zinc-600 text-[9px] font-semibold">{i+1}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 text-center">
                  <div className="text-zinc-600 text-[9px]">PAR</div>
                  {scanPreview.slice(0,9).map((h,i) => (
                    <div key={i} className="bg-zinc-900 rounded text-[10px] font-bold text-white py-1">{h.par}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 text-center">
                  <div className="text-zinc-600 text-[9px]">HCP</div>
                  {scanPreview.slice(0,9).map((h,i) => (
                    <div key={i} className="bg-zinc-900 rounded text-[10px] text-zinc-400 py-1">{h.hcp}</div>
                  ))}
                </div>
                {scanPreview.length > 9 && (
                  <>
                    <div className="grid grid-cols-9 gap-1 text-center mt-1">
                      <div className="text-zinc-600 text-[9px] font-semibold">HOLE</div>
                      {scanPreview.slice(9,18).map((_,i) => (
                        <div key={i} className="text-zinc-600 text-[9px] font-semibold">{i+10}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1 text-center">
                      <div className="text-zinc-600 text-[9px]">PAR</div>
                      {scanPreview.slice(9,18).map((h,i) => (
                        <div key={i} className="bg-zinc-900 rounded text-[10px] font-bold text-white py-1">{h.par}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1 text-center">
                      <div className="text-zinc-600 text-[9px]">HCP</div>
                      {scanPreview.slice(9,18).map((h,i) => (
                        <div key={i} className="bg-zinc-900 rounded text-[10px] text-zinc-400 py-1">{h.hcp}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => saveCourse(newName, scanPreview || Array.from({length:18},(_,i)=>({par:4,hcp:i+1})))}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <Check size={15}/> Save Course
              </button>
              <button onClick={() => { setAdding(false); setNewName(''); setScanPreview(null) }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-3 rounded-xl font-bold text-sm transition-colors">
                <X size={15}/>
              </button>
            </div>
          </div>
        )}

        {/* Course list */}
        {courses.length === 0 && !adding && (
          <div className="text-center py-12">
            <Flag size={32} className="text-zinc-700 mx-auto mb-3"/>
            <p className="text-zinc-600 font-semibold text-sm">No courses saved yet</p>
            {canEdit && <p className="text-zinc-700 text-xs font-medium normal-case mt-1">Tap Add Course to get started</p>}
          </div>
        )}

        {courses.map(course => (
          <div key={course.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === course.id ? null : course.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
              <Flag size={16} className="text-emerald-400 flex-shrink-0"/>
              <div className="flex-1 text-left">
                <div className="font-bold text-sm">{course.name}</div>
                <div className="text-zinc-600 text-[10px] font-medium normal-case">
                  {course.holes?.length || 18} holes · Par {course.pars?.reduce((a,b)=>a+b,0) || 72}
                </div>
              </div>
              {canEdit && (
                <button onClick={e => { e.stopPropagation(); deleteCourse(course.id) }}
                  className="text-zinc-700 hover:text-rose-400 p-1.5 rounded-lg transition-colors">
                  <Trash2 size={14}/>
                </button>
              )}
            </button>

            {expandedId === course.id && (
              <div className="border-t border-zinc-800 p-4">
                <div className="grid grid-cols-9 gap-1 text-center mb-1">
                  <div className="text-zinc-600 text-[9px]">HOLE</div>
                  {(course.holes||[]).slice(0,9).map((_,i) => (
                    <div key={i} className="text-zinc-600 text-[9px]">{i+1}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 text-center mb-1">
                  <div className="text-zinc-600 text-[9px]">PAR</div>
                  {(course.holes||[]).slice(0,9).map((h,i) => (
                    <div key={i} className="bg-zinc-950 rounded text-[10px] font-bold text-white py-1">{h.par}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 text-center mb-3">
                  <div className="text-zinc-600 text-[9px]">HCP</div>
                  {(course.holes||[]).slice(0,9).map((h,i) => (
                    <div key={i} className="bg-zinc-950 rounded text-[10px] text-zinc-500 py-1">{h.hcp}</div>
                  ))}
                </div>
                {(course.holes||[]).length > 9 && (
                  <>
                    <div className="grid grid-cols-9 gap-1 text-center mb-1">
                      <div className="text-zinc-600 text-[9px]">HOLE</div>
                      {(course.holes||[]).slice(9,18).map((_,i) => (
                        <div key={i} className="text-zinc-600 text-[9px]">{i+10}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1 text-center mb-1">
                      <div className="text-zinc-600 text-[9px]">PAR</div>
                      {(course.holes||[]).slice(9,18).map((h,i) => (
                        <div key={i} className="bg-zinc-950 rounded text-[10px] font-bold text-white py-1">{h.par}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1 text-center">
                      <div className="text-zinc-600 text-[9px]">HCP</div>
                      {(course.holes||[]).slice(9,18).map((h,i) => (
                        <div key={i} className="bg-zinc-950 rounded text-[10px] text-zinc-500 py-1">{h.hcp}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}