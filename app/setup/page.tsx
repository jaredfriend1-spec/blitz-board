"use client"
import Link from 'next/link'
import { ArrowLeft, Users, Trophy, Swords, DollarSign, ShieldAlert, Archive } from 'lucide-react'

export default function SetupCenter() {
  const menuItems = [
    { title: "Manage Roster", icon: <Users />, href: "/setup/roster", desc: "Add or delete teams and players" },
    { title: "Matchup Manager", icon: <Swords />, href: "/setup/matchups", desc: "Set Nassau and Side Bets" },
    { title: "Tournament Settings", icon: <Trophy />, href: "/setup/settings", desc: "Set Course Name and Pars" },
    { title: "Money Setup", icon: <DollarSign />, href: "/setup/money", desc: "Set Stakes and Allocations" },
    { title: "Admin Tools", icon: <ShieldAlert />, href: "/setup/admin", desc: "Wipe Board or Archive Play" },
    { title: "View History", icon: <Archive />, href: "/history", desc: "Access Past Tournament Ledgers" }, // <-- Added this
  ]

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center text-emerald-400 mb-12 font-black">
          <ArrowLeft size={20} className="mr-2" /> BACK TO HUB
        </Link>
        <h1 className="text-5xl font-black text-emerald-500 mb-12 tracking-tighter uppercase">Setup Center</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <div className="bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] hover:border-emerald-500 transition-all group shadow-xl h-full flex flex-col justify-between">
                <div className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                <div>
                  <h2 className="text-2xl font-black mb-2 uppercase">{item.title}</h2>
                  <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}