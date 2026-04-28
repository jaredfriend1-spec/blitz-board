"use client";

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Settings,
  Target,
  DollarSign,
  Flag,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function TournamentHub() {
  const [courseName, setCourseName] = useState("Rolling Road");

  useEffect(() => {
    const config = localStorage.getItem('tournament-course');
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.name) setCourseName(parsed.name);
    }
  }, []);

  const menuItems = [
    {
      title: "Live Scorer",
      desc: "Enter hole-by-hole scores for the field",
      path: "/scorer",
      icon: <Target className="text-emerald-500" size={32} />,
      color: "border-emerald-500/20 hover:border-emerald-500"
    },
    {
      title: "Tournament Results",
      desc: "Leaderboard, Nines, and Team Rankings",
      path: "/results",
      icon: <Trophy className="text-[#33CCFF]" size={32} />,
      color: "border-blue-400/20 hover:border-blue-400"
    },
    {
      title: "Skins & Side Bets",
      desc: "Scorecard evidence & matchplay tracking",
      path: "/payouts",
      icon: <DollarSign className="text-amber-400" size={32} />,
      color: "border-amber-400/20 hover:border-amber-400"
    },
    {
      title: "Setup Center",
      desc: "Course, Roster, Matchups, and Money",
      path: "/setup",
      icon: <Settings className="text-zinc-500" size={32} />,
      color: "border-zinc-800 hover:border-zinc-500"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <div className="max-w-4xl mx-auto py-12">

        {/* OPERATIONAL HEADER */}
        <header className="mb-16 flex justify-between items-end border-b-4 border-emerald-500 pb-8">
          <div>
            <h1 className="text-7xl font-black italic tracking-tighter leading-none mb-2">
              BLITZ <span className="text-emerald-500 text-5xl">BOARD</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] tracking-[.4em]">
              <Flag size={12} className="text-emerald-500" />
              <span>CURRENT VENUE: {courseName}</span>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-zinc-600 mb-1">SYSTEM STATUS</p>
            <p className="text-emerald-500 font-black italic flex items-center gap-2 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE TOURNAMENT
            </p>
          </div>
        </header>

        {/* NAVIGATION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.path}
              className={`group bg-zinc-900/40 p-8 rounded-[2.5rem] border-2 ${item.color} transition-all active:scale-95 flex flex-col justify-between h-64 shadow-2xl relative overflow-hidden`}
            >
              {/* Subtle background decoration */}
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                {React.cloneElement(item.icon, { size: 160 })}
              </div>

              <div className="relative z-10">
                <div className="bg-zinc-950 w-16 h-16 rounded-2xl flex items-center justify-center border border-zinc-800 mb-6 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h2 className="text-3xl font-black italic leading-none mb-2 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h2>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="relative z-10 flex justify-end">
                <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* QUICK ACTION FOOTER */}
        <footer className="mt-20 text-center border-t border-zinc-900 pt-12">
          <p className="text-[8px] font-black text-zinc-700 tracking-[.8em] italic">
            SENIOR MANAGEMENT CONSOLE • VER 3.2.0 • {new Date().getFullYear()}
          </p>
        </footer>

      </div>
    </div>
  );
}
