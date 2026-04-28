"use client"

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [course, setCourse] = useState({ name: "Rolling Road", pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/course'), (snap) => snap.val() && setCourse(snap.val()))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block flex items-center gap-2">
        <ArrowLeft size={18} /> BACK
      </Link>
      <div className="max-w-xl mx-auto bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl">
        <h1 className="text-3xl font-black italic text-rose-500 mb-8">Course Config</h1>
        <div className="mb-8">
          <label className="text-zinc-600 font-black text-[10px] mb-2 block tracking-widest">COURSE NAME</label>
          <input 
            value={course.name} 
            onChange={e => setCourse({...course, name: e.target.value})}
            className="w-full bg-black border-2 border-zinc-800 p-5 rounded-2xl font-black text-emerald-400 text-xl italic outline-none"
          />
        </div>
        <div className="grid grid-cols-6 gap-3 mb-10">
          {course.pars.map((p, i) => (
            <div key={i}>
              <span className="text-[8px] font-black text-zinc-700 block text-center mb-1">H{i+1}</span>
              <input 
                type="number" value={p}
                onChange={e => {
                  const np = [...course.pars]; np[i] = parseInt(e.target.value) || 0;
                  setCourse({...course, pars: np})
                }}
                className="w-full bg-zinc-800 border-2 border-zinc-700 p-3 rounded-xl text-center font-black text-white outline-none"
              />
            </div>
          ))}
        </div>
        <button onClick={() => { set(ref(db, 'tournament/course'), course); alert("⛳️ COURSE UPDATED"); }} className="w-full bg-emerald-500 text-black p-6 rounded-2xl font-black italic text-xl flex items-center justify-center gap-3">
          <Save /> Save Course Data
        </button>
      </div>
    </div>
  )
}