"use client"
import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, Save, Flag, AlertTriangle, Camera, Loader2, BookOpen, Trash2, CheckCircle2, X } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load active course
    onValue(ref(db, 'tournament/course'), snap => {
      if (snap.val()) {
        setCourseName(snap.val().name || "")
        if (snap.val().holes) setHoles(snap.val().holes)
      }
    })
    // Load course history
    onValue(ref(db, 'courseHistory'), snap => {
      if (snap.val()) {
        const list = Object.values(snap.val()) as any[]
        // Sort newest first
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

  const clearCourse = () => {
    if (!confirm("CLEAR ALL HOLE DATA?")) return
    setCourseName("")
    setHoles(DEFAULT_HOLES)
    setError("")
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
    try {
      const compressedBase64 = await compressImage(file)
      const res = await fetch('/api/scan-scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64 })
      })
      const data = await res.json()
      if (res.ok && data.success && data.holes?.length === 18) {
        setHoles(data.holes)
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

  const saveCourse = async () => {
    if (!courseName.trim()) return setError("PLEASE ENTER A COURSE NAME")
    const hcpSet = new Set(holes.map(h => h.hcp))
    if (hcpSet.size !== 18) return setError("ALL 18 HOLE HANDICAP RATINGS MUST BE UNIQUE (1-18)")
    setError("")

    const courseData = {
      name: courseName.trim(),
      holes,
      pars: holes.map(h => h.par)
    }

    // Save as active tournament course
    await set(ref(db, 'tournament/course'), courseData)

    // Save to course history (only if not already there by exact name)
    const alreadySaved = savedCourses.find(c => c.name.toLowerCase() === courseName.trim().toLowerCase())
    if (!alreadySaved) {
      const hRef = push(ref(db, 'courseHistory'))
      await set(hRef, { id: hRef.key, savedAt: Date.now(), ...courseData })
    } else {
      // Update existing entry
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

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block">
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
            {/* History button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex-1 sm:flex-none bg-zinc-900 border-2 border-zinc-700 hover:border-blue-500 text-zinc-300 px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <BookOpen size={18} className="text-blue-400"/>
              SAVED ({savedCourses.length})
            </button>
            {/* Scan button */}
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} className="hidden"/>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors text-sm disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {isScanning ? <><Loader2 size={18} className="animate-spin"/> SCANNING...</> : <><Camera size={18}/> SCAN CARD</>}
            </button>
          </div>
        </div>

        {/* COURSE HISTORY PANEL */}
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
                  <button
                    onClick={(e) => deleteSavedCourse(course.id, e)}
                    className="text-zinc-700 hover:text-rose-500 transition-colors p-1"
                  >
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

        {/* MAIN CARD */}
        <div className="bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-800 overflow-hidden">

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

          {/* SCORECARD TABLE — Front 9 */}
          <div className="p-4 sm:p-6">
            <div className="text-[10px] font-black text-zinc-600 tracking-widest mb-3">FRONT 9</div>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-zinc-950">
                    <th className="py-3 px-4 text-left text-xs text-zinc-500 font-black w-20">HOLE</th>
                    {front9.map((_, i) => (
                      <th key={i} className="py-3 px-2 text-sm font-black text-zinc-400 w-12">{i + 1}</th>
                    ))}
                    <th className="py-3 px-4 text-sm font-black text-zinc-500">OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {/* PAR ROW */}
                  <tr className="border-t border-zinc-800">
                    <td className="py-3 px-4 text-left text-xs font-black text-emerald-500">PAR</td>
                    {front9.map((hole, i) => (
                      <td key={i} className="py-2 px-1">
                        <select
                          value={hole.par}
                          onChange={e => updateHole(i, 'par', Number(e.target.value))}
                          className="w-10 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black text-center rounded-lg py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>
                    ))}
                    <td className="py-3 px-4 font-black text-emerald-400 text-base">{frontPar}</td>
                  </tr>
                  {/* HCP ROW */}
                  <tr className="border-t border-zinc-800 bg-black/40">
                    <td className="py-3 px-4 text-left text-xs font-black text-blue-400">HCP</td>
                    {front9.map((hole, i) => (
                      <td key={i} className="py-2 px-1">
                        <input
                          type="number"
                          value={hole.hcp}
                          onChange={e => updateHole(i, 'hcp', Number(e.target.value))}
                          className="w-10 bg-zinc-800 hover:bg-zinc-700 text-blue-300 text-sm font-black text-center rounded-lg py-2 outline-none border border-zinc-700 focus:border-blue-500 transition-colors"
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

            {/* SCORECARD TABLE — Back 9 */}
            <div className="text-[10px] font-black text-zinc-600 tracking-widest mb-3 mt-6">BACK 9</div>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-zinc-950">
                    <th className="py-3 px-4 text-left text-xs text-zinc-500 font-black w-20">HOLE</th>
                    {back9.map((_, i) => (
                      <th key={i} className="py-3 px-2 text-sm font-black text-zinc-400 w-12">{i + 10}</th>
                    ))}
                    <th className="py-3 px-4 text-sm font-black text-zinc-500">IN</th>
                  </tr>
                </thead>
                <tbody>
                  {/* PAR ROW */}
                  <tr className="border-t border-zinc-800">
                    <td className="py-3 px-4 text-left text-xs font-black text-emerald-500">PAR</td>
                    {back9.map((hole, i) => (
                      <td key={i} className="py-2 px-1">
                        <select
                          value={hole.par}
                          onChange={e => updateHole(i + 9, 'par', Number(e.target.value))}
                          className="w-10 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black text-center rounded-lg py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>
                    ))}
                    <td className="py-3 px-4 font-black text-emerald-400 text-base">{backPar}</td>
                  </tr>
                  {/* HCP ROW */}
                  <tr className="border-t border-zinc-800 bg-black/40">
                    <td className="py-3 px-4 text-left text-xs font-black text-blue-400">HCP</td>
                    {back9.map((hole, i) => (
                      <td key={i} className="py-2 px-1">
                        <input
                          type="number"
                          value={hole.hcp}
                          onChange={e => updateHole(i + 9, 'hcp', Number(e.target.value))}
                          className="w-10 bg-zinc-800 hover:bg-zinc-700 text-blue-300 text-sm font-black text-center rounded-lg py-2 outline-none border border-zinc-700 focus:border-blue-500 transition-colors"
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

            {/* TOTALS FOOTER */}
            <div className="mt-4 flex justify-end">
              <div className="bg-black border border-zinc-800 rounded-2xl px-6 py-3 flex items-center gap-4">
                <span className="text-zinc-600 text-xs font-black">TOTAL PAR</span>
                <span className="text-emerald-400 text-2xl font-black">{frontPar + backPar}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}