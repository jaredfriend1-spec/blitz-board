"use client"
import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Save, Flag, AlertTriangle, Camera, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CourseSetup() {
  const [courseName, setCourseName] = useState("BLITZ COURSE")
  const [holes, setHoles] = useState(Array.from({length: 18}, (_, i) => ({ par: 4, hcp: i + 1 })))
  const [error, setError] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onValue(ref(db, 'tournament/course'), snap => {
      if (snap.val()) {
        setCourseName(snap.val().name || "BLITZ COURSE");
        if (snap.val().holes) setHoles(snap.val().holes);
      }
    })
  }, [])

  const updateHole = (index: number, field: 'par' | 'hcp', value: number) => {
    const newHoles = [...holes];
    newHoles[index][field] = value;
    setHoles(newHoles);
  }

  const saveCourse = () => {
    const hcpSet = new Set(holes.map(h => h.hcp));
    if (hcpSet.size !== 18) return setError("ALL 18 HOLE HANDICAP RATINGS MUST BE UNIQUE (1-18)");
    
    setError("");
    set(ref(db, 'tournament/course'), { name: courseName, holes, pars: holes.map(h => h.par) })
      .then(() => alert("COURSE SAVED"));
  }

  // --- AI VISION SCANNER ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError("");

    try {
      // Convert image to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;

        // Send to our Next.js API route
        const res = await fetch('/api/scan-scorecard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64data })
        });

        const data = await res.json();
        
        if (data.success && data.holes && data.holes.length === 18) {
          // Auto-fill the grid!
          setHoles(data.holes);
        } else {
          setError("COULD NOT READ SCORECARD. PLEASE ENTER MANUALLY.");
        }
        setIsScanning(false);
      };
    } catch (err) {
      console.error(err);
      setError("SCAN FAILED. PLEASE TRY AGAIN.");
      setIsScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-4xl mx-auto bg-zinc-900 p-8 rounded-[3rem] border-2 border-zinc-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 text-emerald-500">
            <Flag size={32}/><h1 className="text-4xl font-black">Course Specs</h1>
          </div>
          
          {/* THE MAGIC BUTTON */}
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isScanning}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-colors shadow-lg disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isScanning ? <><Loader2 size={20} className="animate-spin"/> SCANNING...</> : <><Camera size={20}/> SCAN SCORECARD</>}
          </button>
        </div>
        
        <input value={courseName} onChange={e => setCourseName(e.target.value)} className="w-full bg-black border-2 border-zinc-800 p-6 rounded-2xl font-black text-3xl mb-8 outline-none focus:border-emerald-500 text-white" placeholder="COURSE NAME" />

        {error && <div className="bg-rose-500/20 text-rose-500 p-4 rounded-xl font-black mb-6 flex items-center gap-2"><AlertTriangle size={18}/> {error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {holes.map((hole, i) => (
            <div key={i} className="bg-black p-4 rounded-2xl border border-zinc-800 flex flex-col gap-3">
              <div className="text-zinc-500 font-black text-sm">HOLE {i+1}</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-zinc-600 font-black">PAR</label>
                  <select value={hole.par} onChange={e => updateHole(i, 'par', Number(e.target.value))} className="w-full bg-zinc-900 text-white p-2 rounded-lg font-black outline-none border border-zinc-700">
                    <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-emerald-600 font-black">HCP INDEX</label>
                  <input type="number" value={hole.hcp} onChange={e => updateHole(i, 'hcp', Number(e.target.value))} className="w-full bg-zinc-900 text-emerald-400 p-2 rounded-lg font-black outline-none border border-zinc-700 text-center" min={1} max={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={saveCourse} className="w-full bg-emerald-500 text-black py-6 rounded-2xl font-black text-2xl flex justify-center items-center gap-2 hover:bg-emerald-400 transition-colors"><Save size={24}/> SAVE COURSE RATINGS</button>
      </div>
    </div>
  )
}