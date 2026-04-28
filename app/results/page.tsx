"use client"

import { tournamentSettings } from '@/lib/data'
import { Trophy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans uppercase">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-emerald-500 font-black italic flex items-center gap-2 mb-6"><ArrowLeft size={18} /> HUB</Link>
        <div className="bg-emerald-500 text-black text-center p-4 rounded-t-xl mb-6 border-2 border-black">
          <h1 className="text-2xl font-black italic tracking-widest">RESULTS: BETS & SKINS {tournamentSettings.date}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-zinc-900 p-6 rounded-2xl border-2 border-zinc-800"><h2 className="bg-blue-400 text-black p-2 font-black text-center mb-4 border-2 border-black">1st - Front 9</h2>{/* Data mapping */}</section>
          <section className="bg-zinc-900 p-6 rounded-2xl border-2 border-zinc-800"><h2 className="bg-blue-400 text-black p-2 font-black text-center mb-4 border-2 border-black">1st - Back 9</h2>{/* Data mapping */}</section>
          <section className="bg-orange-200 text-black rounded-xl border-2 border-black overflow-hidden">
            <div className="bg-orange-500 p-3 font-black text-center text-white border-b-2 border-black italic">Skins Dash</div>
            <table className="w-full text-[10px]">
              <thead className="bg-orange-100 border-b-2 border-black font-black uppercase"><tr><th className="p-3 text-left">PLAYER</th><th className="p-3">SKINS</th><th className="p-3 text-right">WINNINGS</th></tr></thead>
              <tbody className="font-bold">
                <tr className="border-b border-orange-300"><td className="p-3 flex items-center"><Trophy size={14} className="mr-2 text-orange-600" /> JEFF PERKINS</td><td className="p-3 text-center text-lg">3</td><td className="p-3 text-right font-black italic">$52</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}