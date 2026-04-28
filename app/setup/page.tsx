"use client";

import React from 'react';
import { Flag, Users, Sword, ChevronLeft, Coins, Database } from 'lucide-react';
import Link from 'next/link';

export default function SetupHub() {
  // Defining settings inside the component to ensure the 's' variable is typed correctly
  const settings = [
    { title: "Course Config", icon: <Flag size={28} />, path: "/setup/course", desc: "Set Pars & Venue" },
    { title: "Roster & Teams", icon: <Users size={28} />, path: "/setup/roster", desc: "Players & Teams" },
    { title: "Side Matchups", icon: <Sword size={28} />, path: "/setup/matchups", desc: "PvP or TvT Bets" },
    { title: "Money Config", icon: <Coins size={28} />, path: "/setup/money", desc: "Fees & Units" },
    { title: "Admin & History", icon: <Database size={28} />, path: "/setup/admin", desc: "Archive & Reset Data" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-500 font-black italic mb-12 opacity-60 hover:opacity-100 transition-all"
        >
          <ChevronLeft size={20} /> Back to Hub
        </Link>

        <header className="mb-12 border-b-4 border-emerald-500 pb-6">
          <h1 className="text-5xl font-black italic text-emerald-500 leading-none">Setup Center</h1>
          <p className="text-zinc-600 font-bold text-[10px] tracking-[.4em] mt-2 italic">
            Tournament Initialization & Rules
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settings.map((s) => (
            <Link
              key={s.title}
              href={s.path}
              className="group bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800 hover:border-emerald-500 transition-all flex flex-col items-center text-center gap-4 shadow-2xl active:scale-95"
            >
              <div className="p-5 bg-zinc-950 rounded-2xl text-emerald-500 border border-zinc-800 group-hover:bg-zinc-800 transition-colors shadow-inner">
                {s.icon}
              </div>

              <div>
                <h2 className="text-xl font-black italic group-hover:text-emerald-400 transition-colors">
                  {s.title}
                </h2>
                <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest opacity-60">
                  {s.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-20 border-t border-zinc-900 pt-8 text-center">
          <p className="text-[8px] font-black text-zinc-800 tracking-[.8em] italic">
            Operational Config • Ver 3.1.0
          </p>
        </footer>
      </div>
    </div>
  );
}