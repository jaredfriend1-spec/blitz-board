"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Archive, Calendar, Users, DollarSign, Sword } from 'lucide-react'
import Link from 'next/link'

export default function HistoryPage() {
  const [archives, setArchives] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'history'), snap => {
      if (snap.val()) {
        const data = Object.entries(snap.val()).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        })).sort((a, b) => Number(b.id) - Number(a.id));
        setArchives(data);
      } else {
        setArchives([]);
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-12 text-blue-500">
          <Archive size={40} />
          <h1 className="text-5xl font-black tracking-tighter">Tournament History</h1>
        </div>

        <div className="space-y-6">
          {archives.length === 0 ? (
            <div className="bg-zinc-900 p-12 rounded-[2rem] border-2 border-zinc-800 text-center font-black text-zinc-500">
              NO ARCHIVED TOURNAMENTS FOUND.<br/>USE ADMIN TOOLS TO PUSH A LIVE BOARD TO HISTORY.
            </div>
          ) : (
            archives.map(arch => {
              const date = new Date(Number(arch.id)).toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
              });
              
              const playerCount = arch.roster ? Object.keys(arch.roster).length : 0;
              const teamCount = arch.teams ? Object.keys(arch.teams).length : 0;
              const matchCount = arch.matchups ? Object.keys(arch.matchups).length : 0;
              const entryFee = arch.money?.entryFee || 0;

              return (
                <div key={arch.id} className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-blue-500 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-zinc-400 font-black text-sm mb-2"><Calendar size={16}/> {date}</div>
                    <h2 className="text-2xl font-black text-white">BLITZ BOARD ARCHIVE</h2>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-black border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
                      <Users className="text-emerald-500" size={20}/>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-black">FIELD</div>
                        <div className="font-black text-lg">{playerCount} PLYR / {teamCount} TM</div>
                      </div>
                    </div>
                    <div className="bg-black border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
                      <Sword className="text-rose-500" size={20}/>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-black">SIDE BETS</div>
                        <div className="font-black text-lg">{matchCount} MATCHES</div>
                      </div>
                    </div>
                    <div className="bg-black border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
                      <DollarSign className="text-blue-500" size={20}/>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-black">ENTRY FEE</div>
                        <div className="font-black text-lg">${entryFee}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}