"use client"

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { golfers } from '@/lib/data'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function ScorerPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Load existing scores from Firebase on mount
  useEffect(() => {
    const scoresRef = ref(db, 'tournament/scores')
    onValue(scoresRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setScores(data)
    })
  }, [])

  const handleScoreChange = (playerId: string, holeIndex: number, value: string) => {
    const newScore = parseInt(value) || 0
    setScores(prev => {
      const playerScores = prev[playerId] ? [...prev[playerId]] : Array(18).fill(0)
      playerScores[holeIndex] = newScore
      return { ...prev, [playerId]: playerScores }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await set(ref(db, 'tournament/scores'), scores)
      alert("Scores Saved to Leaderboard!")
    } catch (error) {
      console.error("Error saving scores:", error)
      alert("Failed to save. Check your connection.")
    }
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center text-emerald-400">
          <ArrowLeft className="mr-2" /> HUB
        </Link>
        <h1 className="text-2xl font-bold tracking-tighter text-emerald-400">LIVE SCORER</h1>
        <div className="w-10"></div>
      </div>

      {/* Scoring Grid */}
      <div className="max-w-4xl mx-auto space-y-8">
        {golfers.map((player) => (
          <div key={player.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold uppercase tracking-widest">{player.name}</h2>
              <span className="text-zinc-500 text-sm">HDCP: {player.handicap}</span>
            </div>
            
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-500 mb-1">{i + 1}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={scores[player.id]?.[i] || ""}
                    onChange={(e) => handleScoreChange(player.id, i, e.target.value)}
                    className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded text-center text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-8 left-0 right-0 px-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`max-w-md mx-auto w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-xl shadow-2xl transition-all ${
            isSaving ? 'bg-zinc-700 text-zinc-400' : 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95'
          }`}
        >
          <Save size={24} />
          {isSaving ? 'UPLOADING...' : 'SAVE & UPDATE LEADERBOARD'}
        </button>
      </div>
    </div>
  )
}
