"use client"

import { golfers, tournamentSettings } from '@/lib/data'
import { Trophy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Spreadsheet Header */}
        <div className="bg-emerald-500 text-black text-center p-4 rounded-t-xl mb-4 border-2 border-black">
          <h1 className="text-2xl font-black italic uppercase tracking-widest">
            RESULTS FROM BETS & SKINS {tournamentSettings.date}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Front 9 Leaderboard */}
          <section className="space-y-4">
            <div className="bg-blue-400 text-black p-3 font-black text-center uppercase border-2 border-black">1st Place - Front 9</div>
            <div className="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-xl">
               {/* Player data would map here */}
               <div className="flex justify-between font-bold border-b border-zinc-800 py-2">
                 <span>ANDREW SOVERO</span><span>36</span>
               </div>
            </div>
          </section>

          {/* Column 2: Back 9 Leaderboard */}
          <section className="space-y-4">
            <div className="bg-blue-400 text-black p-3 font-black text-center uppercase border-2 border-black">1st Place - Back 9</div>
            <div className="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-xl">
               <div className="flex justify-between font-bold border-b border-zinc-800 py-2">
                 <span>RICK SOVERO</span><span>36</span>
               </div>
            </div>
          </section>

          {/* Column 3: Skins Dashboard */}
          <section className="bg-orange-200 text-black rounded-xl border-2 border-black overflow-hidden">
            <div className="bg-orange-500 p-3 font-black text-center uppercase text-white border-b-2 border-black italic">Skins Dashboard</div>
            <table className="w-full text-xs">
              <thead className="bg-orange-100 border-b-2 border-black">
                <tr>
                  <th className="p-3 text-left">PLAYER</th>
                  <th className="p-3 text-center">SKINS</th>
                  <th className="p-3 text-right">WINNINGS</th>
                </tr>
              </thead>
              <tbody className="font-bold uppercase">
                <tr className="border-b border-orange-300">
                  <td className="p-3 flex items-center"><Trophy size={14} className="mr-2 text-orange-600" /> JEFF PERKINS</td>
                  <td className="p-3 text-center text-lg">3</td>
                  <td className="p-3 text-right font-black">$52</td>
                </tr>
                {/* Repeat for others */}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}