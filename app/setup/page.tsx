"use client"

import Link from 'next/link'
import { ArrowLeft, Users, Trophy, Swords, RefreshCw } from 'lucide-react'

export default function SetupCenter() {
  const menuItems = [
    { title: "Manage Roster", icon: <Users />, href: "/setup/roster", desc: "Edit players and delete extra teams" },
    { title: "Matchup Manager", icon: <Swords />, href: "/setup/matchups", desc: "Set PvP and TvT side bets" },
    { title: "Tournament Settings", icon: <Trophy />, href: "/setup/settings", desc: "Set MCC course pars and dates" },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center text-emerald-400 mb-12 font-black italic">
          <ArrowLeft size={20} className="mr-2" /> BACK TO HOME
        </Link>

        <h1 className="text-5xl font-black italic text-emerald-500 mb-12 tracking-tighter uppercase">Setup Center</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <div className="bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] hover:border-emerald-500 transition-all group">
                <div className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h2 className="text-2xl font-black italic mb-2 uppercase">{item.title}</h2>
                <p className="text-zinc-500 font-bold text-sm uppercase">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        
        <button className="w-full mt-12 bg-zinc-900 border-2 border-dashed border-zinc-800 p-8 rounded-[2rem] flex items-center justify-center gap-4 text-zinc-500 font-black italic hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500 transition-all">
          <RefreshCw size={24} /> PUBLISH DATA TO CLOUD
        </button>
      </div>
    </div>
  )
}