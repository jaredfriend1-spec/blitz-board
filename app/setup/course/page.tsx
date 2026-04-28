"use client";

import React, { useState, useEffect } from 'react';
import { Save, ChevronLeft, Flag } from 'lucide-react';
import Link from 'next/link';

export default function CourseSetup() {
  const [config, setConfig] = useState({
    name: "Rolling Road",
    pars: new Array(18).fill(4)
  });

  // 1. Load data from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem('tournament-course');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse course data", e);
      }
    }
  }, []);

  const saveCourse = () => {
    localStorage.setItem('tournament-course', JSON.stringify(config));
    alert("✅ COURSE UPDATED: Pars are now locked for the Blitz.");
  };

  const handleParChange = (index: number, value: string) => {
    const newPars = [...config.pars];
    newPars[index] = parseInt(value) || 4;
    setConfig({ ...config, pars: newPars });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 text-emerald-500 font-black italic mb-8 hover:opacity-100 opacity-60 transition-all"
        >
          <ChevronLeft size={20} /> Back to Setup Hub
        </Link>

        <div className="bg-zinc-900/40 p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
          <header className="mb-12 flex items-center gap-6">
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-emerald-500 shadow-inner">
              <Flag size={32} />
            </div>
            <div className="flex-1">
              <input
                value={config.name}
                onChange={e => setConfig({ ...config, name: e.target.value })}
                className="bg-transparent text-5xl font-black italic text-emerald-500 outline-none border-b-2 border-transparent focus:border-emerald-500/30 w-full uppercase tracking-tighter"
                placeholder="COURSE NAME"
              />
              <p className="text-[10px] text-zinc-600 font-black mt-2 tracking-[.4em] italic uppercase">Rolling Road Blitz Specifications</p>
            </div>
          </header>

          {/* 18-HOLE PAR GRID */}
          <div className="grid grid-cols-6 gap-4">
            {config.pars.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group">
                <span className="text-[9px] font-black text-zinc-700 tracking-widest group-hover:text-zinc-400 transition-colors">H{i + 1}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={p}
                  onChange={e => handleParChange(i, e.target.value)}
                  className="w-full h-14 bg-zinc-950 border-2 border-zinc-800 rounded-xl text-center font-black text-2xl text-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-inner"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveCourse}
            className="w-full mt-16 bg-emerald-500 text-emerald-950 p-6 rounded-2xl font-black italic flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.2)] active:scale-95 transition-all hover:bg-emerald-400"
          >
            <Save size={24} /> LOCK COURSE PARS
          </button>
        </div>
      </div>
    </div>
  );
}