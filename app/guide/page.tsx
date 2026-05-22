"use client"
import { useState } from 'react'
import Link from 'next/link'
import {
 ArrowLeft, Star, Zap, Trophy, DollarSign, Target, Users, Flag,
 Shield, BookOpen, ChevronRight, ChevronDown, ChevronUp,
 Settings, History, RefreshCw, Lock, Unlock, Camera, Check,
 Home, Archive, User, Sword
} from 'lucide-react'

function MockPhone({ children, label }: { children: React.ReactNode; label?: string }) {
 return (
 <div className="flex flex-col items-center gap-2 my-2">
 {label && <p className="text-[10px] font-black text-zinc-500 tracking-widest">{label}</p>}
 <div className="w-full max-w-[280px] bg-zinc-950 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-2xl">
 <div className="bg-black px-4 py-2 flex justify-between items-center">
 <span className="text-[10px] text-zinc-500 font-black">9:41</span>
 <div className="flex gap-1 items-center">
 <div className="w-3 h-1.5 bg-zinc-500 rounded-sm"/>
 <div className="w-3 h-1.5 bg-zinc-500 rounded-sm"/>
 <div className="w-2 h-1.5 bg-emerald-400 rounded-sm"/>
 </div>
 </div>
 <div className="bg-black min-h-[380px]">{children}</div>
 <div className="bg-black py-2 flex justify-center">
 <div className="w-16 h-1 bg-zinc-700 rounded-full"/>
 </div>
 </div>
 </div>
 )
}

function MockLanding() {
 return (
 <div className="p-4 space-y-4">
 <div className="text-center pt-4 pb-2">
 <div className="text-3xl font-black text-white tracking-tighter">BLITZ <span className="text-emerald-500">BOARD</span></div>
 <div className="text-[8px] text-zinc-600 font-black tracking-widest mt-0.5">GOLF TOURNAMENT SCORING</div>
 </div>
 <div className="text-[8px] font-black text-zinc-600 tracking-widest text-center">WHO ARE YOU?</div>
 <div className="space-y-2">
 <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
 <User size={16} className="text-emerald-400"/>
 </div>
 <div>
 <div className="text-white font-black text-xs">I'm a Player</div>
 <div className="text-zinc-600 text-[8px] font-black normal-case">View scores, results & payouts</div>
 </div>
 </div>
 <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
 <Shield size={16} className="text-rose-400"/>
 </div>
 <div>
 <div className="text-white font-black text-xs">I'm the Admin</div>
 <div className="text-zinc-600 text-[8px] font-black normal-case">Setup, manage & configure</div>
 </div>
 </div>
 </div>
 </div>
 )
}

function MockPlayerHub() {
 return (
 <div className="p-3 space-y-3">
 <div className="border-b border-emerald-500 pb-3 mb-3">
 <div className="text-2xl font-black text-white tracking-tighter">BLITZ <span className="text-emerald-500 text-lg">BOARD</span></div>
 <div className="text-[8px] text-zinc-500 font-black mt-0.5 flex items-center gap-1"><Flag size={8} className="text-emerald-500"/> ROLLING ROAD · DAY 2</div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {[
 { label:'Live Scorer', icon:'🎯', color:'border-emerald-500/30' },
 { label:'Payouts', icon:'💰', color:'border-amber-500/30' },
 { label:'Results', icon:'🏆', color:'border-blue-400/30' },
 { label:'History', icon:'📚', color:'border-zinc-600/30' },
 ].map(item => (
 <div key={item.label} className={`bg-zinc-900/40 border ${item.color} rounded-2xl p-3`}>
 <div className="text-lg mb-1">{item.icon}</div>
 <div className="text-white font-black text-[10px]">{item.label}</div>
 </div>
 ))}
 </div>
 <div className="border-t border-zinc-800 pt-2 flex justify-around mt-2">
 {['🏠','🎯','💰','🏆','📚'].map((icon, i) => (
 <div key={i} className={`text-center ${i===0?'opacity-100':'opacity-40'}`}>
 <div className="text-sm">{icon}</div>
 </div>
 ))}
 </div>
 </div>
 )
}

function MockAdminHub() {
 return (
 <div className="p-3 space-y-2">
 <div className="border-b border-emerald-500 pb-2 mb-2">
 <div className="text-2xl font-black text-white tracking-tighter">BLITZ <span className="text-emerald-500 text-lg">BOARD</span></div>
 <div className="text-[8px] text-rose-400 font-black mt-0.5 flex items-center gap-1"><Shield size={8}/> ADMIN</div>
 </div>
 <div className="bg-zinc-900/40 border border-rose-500/30 rounded-2xl p-3 flex items-center gap-2">
 <Shield size={14} className="text-rose-400"/>
 <div>
 <div className="text-white font-black text-[10px]">Tournament Wizard</div>
 <div className="text-zinc-600 text-[8px] font-black normal-case">Full tournament · Multi-day · Skins</div>
 </div>
 </div>
 <div className="bg-zinc-900/40 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2">
 <Zap size={14} className="text-amber-400"/>
 <div>
 <div className="text-white font-black text-[10px]">Quick Match</div>
 <div className="text-zinc-600 text-[8px] font-black normal-case">Casual round · Just bets</div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {[{l:'Live Scorer',c:'border-emerald-500/20'},{l:'Payouts',c:'border-amber-500/20'},{l:'Results',c:'border-blue-400/20'},{l:'History',c:'border-zinc-600/20'}].map(item => (
 <div key={item.l} className={`bg-zinc-900/40 border ${item.c} rounded-xl p-2`}>
 <div className="text-white font-black text-[9px]">{item.l}</div>
 </div>
 ))}
 </div>
 </div>
 )
}

function MockScorer() {
 const pars = [4,3,4,5,4,3,4,4,5]
 return (
 <div className="p-2">
 <div className="flex justify-between items-center mb-2 px-1">
 <span className="text-emerald-500 font-black text-[9px]">← HUB</span>
 <span className="text-white font-black text-[10px]">LIVE SCORER</span>
 <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-2 py-0.5 rounded-lg text-[8px] font-black flex items-center gap-1">
 <Unlock size={8}/> EDITING
 </div>
 </div>
 <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
 <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800">
 <span className="text-emerald-400 font-black text-[10px]">THE EAGLES</span>
 </div>
 <table className="w-full text-center text-[9px]">
 <thead>
 <tr className="bg-black">
 <th className="py-1.5 px-2 text-left text-zinc-600 font-black text-[8px]">PLAYER</th>
 {[1,2,3,4,5,6,7,8,9].map(h => <th key={h} className="py-1.5 text-zinc-500 font-black">{h}</th>)}
 <th className="py-1.5 px-1 text-blue-400 font-black text-[8px]">OUT</th>
 </tr>
 </thead>
 <tbody>
 {[
 { name:'JEFF', scores:[4,3,5,4,4,3,5,4,4] },
 { name:'MIKE', scores:[5,3,4,5,4,2,4,4,5] },
 ].map(p => {
 const tot = p.scores.reduce((a,b)=>a+b,0)
 const toPar = tot - pars.reduce((a,b)=>a+b,0)
 return (
 <tr key={p.name} className="border-t border-zinc-900">
 <td className="py-1.5 px-2 text-left text-white font-black text-[8px]">{p.name}</td>
 {p.scores.map((s,i) => {
 const d = s - pars[i]
 let c = 'w-5 h-5 rounded flex items-center justify-center mx-auto font-black text-[8px] '
 if (d<=-2) c+='rounded-full border border-yellow-400 ring-1 ring-yellow-400 ring-offset-1 ring-offset-black text-yellow-300'
 else if (d===-1) c+='rounded-full border border-red-500 text-red-400'
 else if (d===0) c+='bg-zinc-800 text-white'
 else if (d===1) c+='border border-zinc-500 text-zinc-400'
 else c+='border-2 border-zinc-500 text-zinc-500'
 return <td key={i} className="py-1"><div className={c}>{s}</div></td>
 })}
 <td className={`py-1.5 px-1 font-black text-[9px] ${toPar<0?'text-emerald-400':toPar>0?'text-rose-400':'text-white'}`}>
 {toPar===0?'E':toPar>0?`+${toPar}`:toPar}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )
}

function MockPayouts() {
 return (
 <div className="p-3 space-y-3">
 <div className="text-center"><div className="text-white font-black text-sm ">MATCH PAYOUTS</div></div>
 <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
 <div className="p-3 border-b border-zinc-900">
 <div className="text-sm font-black"><span className="text-emerald-400">JEFF</span><span className="text-zinc-600 mx-2 text-xs">VS</span><span className="text-blue-400">MIKE</span></div>
 <div className="flex gap-1 mt-1 flex-wrap">
 <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[7px] font-black">NET</span>
 <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[7px] font-black">⚡ PRESS</span>
 <span className="text-zinc-600 text-[7px] font-black">N:$5 B:$2 E:$5</span>
 </div>
 </div>
 <div className="p-3 grid grid-cols-3 gap-2">
 {[{l:'FRONT 9',a:'$5',b:'$0'},{l:'BACK 9',a:'$0',b:'$5'},{l:'BIRDIE',a:'$4',b:'$2'}].map(row => (
 <div key={row.l} className="bg-black rounded-xl p-2 text-center">
 <div className="text-zinc-600 text-[7px] font-black mb-1">{row.l}</div>
 <div className="text-[8px] font-black"><span className="text-emerald-400">{row.a}</span><span className="text-zinc-700 mx-0.5">·</span><span className="text-blue-400">{row.b}</span></div>
 </div>
 ))}
 </div>
 <div className="mx-3 mb-3 bg-zinc-900 rounded-2xl p-3 flex justify-between items-center">
 <span className="text-zinc-500 text-[8px] font-black">MATCH RESULT</span>
 <span className="text-emerald-400 font-black text-sm">MIKE OWES $2</span>
 </div>
 </div>
 </div>
 )
}

function MockWizard() {
 return (
 <div className="p-3 space-y-2">
 <div className="text-center mb-2"><div className="text-white font-black text-xs ">TOURNAMENT WIZARD</div></div>
 {[
 { label:'Trip & Days', done:true, sub:'MCC 2025 · 3 Days' },
 { label:'Course Setup', done:true, sub:'Rolling Road · Par 72' },
 { label:'Roster & Teams', done:true, sub:'12 Players · 3 Teams' },
 { label:'Entry & Skins', done:true, sub:'$50 entry · $20 skins' },
 { label:'Team Format', done:false, sub:'Not configured' },
 { label:'Matchups', done:false, sub:'Not configured' },
 ].map(item => (
 <div key={item.label} className={`flex items-center gap-2 p-2 rounded-xl border ${item.done?'border-emerald-500/30 bg-emerald-950/10':'border-zinc-800 bg-zinc-900/50'}`}>
 <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done?'bg-emerald-500':'bg-zinc-800 border border-zinc-700'}`}>
 {item.done && <Check size={10} className="text-black"/>}
 </div>
 <div className="flex-1 min-w-0">
 <div className={`font-black text-[9px] ${item.done?'text-white':'text-zinc-500'}`}>{item.label}</div>
 <div className={`text-[7px] font-black normal-case ${item.done?'text-zinc-500':'text-zinc-700'}`}>{item.sub}</div>
 </div>
 <ChevronRight size={10} className={item.done?'text-emerald-500':'text-zinc-700'}/>
 </div>
 ))}
 </div>
 )
}

function MockWheel() {
 return (
 <div className="p-3 space-y-2">
 <div className="text-purple-400 font-black text-xs flex items-center gap-2"><RefreshCw size={12}/> WHEEL BET</div>
 <div className="flex flex-wrap gap-1 mb-2">
 {['JEFF','MIKE','CARLOS','DAVE'].map(p => (
 <span key={p} className="bg-purple-500/20 text-purple-300 text-[8px] font-black px-2 py-0.5 rounded-lg border border-purple-500/30">{p}</span>
 ))}
 <span className="bg-zinc-800 text-zinc-400 text-[7px] font-black px-2 py-0.5 rounded-lg">$10/PAIR · NET</span>
 </div>
 <div className="space-y-1.5">
 {[
 {a:'JEFF',b:'MIKE',net:'+$10',pos:true},
 {a:'JEFF',b:'CARLOS',net:'EVEN',pos:null},
 {a:'MIKE',b:'DAVE',net:'+$10',pos:true},
 {a:'CARLOS',b:'DAVE',net:'+$10',pos:true},
 ].map((pair,i) => (
 <div key={i} className={`rounded-xl border p-2 flex items-center justify-between ${pair.pos===null?'border-zinc-800 bg-zinc-900':'border-emerald-500/20 bg-emerald-950/10'}`}>
 <span className="text-[8px] font-black text-emerald-400">{pair.a}</span>
 <span className={`text-[8px] font-black ${pair.pos===null?'text-zinc-500':'text-emerald-400'}`}>{pair.net}</span>
 <span className="text-[8px] font-black text-zinc-400">{pair.b}</span>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-2 gap-1.5 mt-1">
 {[{n:'JEFF',net:'+$20',pos:true},{n:'MIKE',net:'-$10',pos:false},{n:'CARLOS',net:'EVEN',pos:null},{n:'DAVE',net:'-$20',pos:false}].map(p => (
 <div key={p.n} className={`rounded-xl border p-2 text-center ${p.pos===true?'border-emerald-500/30 bg-emerald-950/20':p.pos===false?'border-rose-500/30 bg-rose-950/20':'border-zinc-800 bg-zinc-900'}`}>
 <div className="text-zinc-500 text-[7px] font-black">{p.n}</div>
 <div className={`font-black text-[10px] ${p.pos===true?'text-emerald-400':p.pos===false?'text-rose-400':'text-zinc-500'}`}>{p.net}</div>
 </div>
 ))}
 </div>
 </div>
 )
}

function MockResults() {
 return (
 <div className="p-3 space-y-2">
 <div className="text-white font-black text-xs mb-2">TOURNAMENT RESULTS</div>
 <div className="text-[8px] font-black text-zinc-600 tracking-widest mb-1">LEADERBOARD</div>
 {[
 {pos:1,name:'CARLOS R.',score:'-4',money:'$120'},
 {pos:2,name:'JEFF T.',score:'-2',money:'$60'},
 {pos:3,name:'MIKE S.',score:'+1',money:'$0'},
 {pos:4,name:'DAVE L.',score:'+3',money:'$0'},
 ].map(p => (
 <div key={p.pos} className={`flex items-center gap-2 p-2 rounded-xl border ${p.pos===1?'border-yellow-500/40 bg-yellow-950/20':'border-zinc-800 bg-zinc-900'}`}>
 <span className={`text-[10px] font-black w-4 ${p.pos===1?'text-yellow-400':p.pos===2?'text-zinc-400':p.pos===3?'text-amber-700':'text-zinc-600'}`}>{p.pos}</span>
 <span className="flex-1 font-black text-[9px] text-white">{p.name}</span>
 <span className={`font-black text-[9px] ${p.score.includes('-')?'text-emerald-400':'text-rose-400'}`}>{p.score}</span>
 {p.money !== '$0' && <span className="text-amber-400 text-[8px] font-black">{p.money}</span>}
 </div>
 ))}
 <div className="text-[8px] font-black text-zinc-600 tracking-widest mt-2 mb-1">SKINS</div>
 <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
 <div className="flex flex-wrap gap-1">
 {[1,4,7,12,15].map(h => (
 <div key={h} className="bg-black border border-emerald-500/30 rounded-lg px-1.5 py-0.5 text-[7px] font-black text-emerald-400">H{h}</div>
 ))}
 </div>
 <div className="text-zinc-600 text-[7px] font-black normal-case mt-1">5 skins · $20 each</div>
 </div>
 </div>
 )
}

function MockQuickMatch() {
 return (
 <div className="p-3 space-y-3">
 <div className="flex items-center gap-2 mb-1"><Zap size={14} className="text-amber-400"/><span className="text-amber-400 font-black text-xs ">QUICK MATCH</span></div>
 <div className="flex gap-1">{['Course','Players','Teams','Format','Matches'].map((s,i) => (
 <div key={s} className={`flex-1 h-1 rounded-full ${i<2?'bg-emerald-500':i===2?'bg-emerald-400':'bg-zinc-800'}`}/>
 ))}</div>
 <div className="text-white font-black text-sm ">Players</div>
 <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 space-y-2">
 <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
 <span className="text-emerald-400 font-black text-[9px] flex items-center gap-1.5"><Users size={10}/> LOAD FROM ROSTER (8)</span>
 <span className="text-zinc-600 text-[8px]">▼</span>
 </div>
 {[{n:'JEFF T.',h:8},{n:'MIKE S.',h:12},{n:'CARLOS R.',h:5}].map(p => (
 <div key={p.n} className="flex items-center gap-2 bg-black rounded-xl px-3 py-2 border border-zinc-800">
 <span className="flex-1 font-black text-[9px] text-white">{p.n}</span>
 <span className="text-emerald-500 text-[8px] font-black">HCP {p.h}</span>
 </div>
 ))}
 </div>
 <div className="bg-emerald-500 rounded-2xl py-3 flex items-center justify-center gap-2">
 <span className="text-black font-black text-xs">NEXT</span>
 <ChevronRight size={14} className="text-black"/>
 </div>
 </div>
 )
}

function Section({ icon, color, title, badge, children }: {
 icon: React.ReactNode; color: string; title: string; badge?: string; children: React.ReactNode
}) {
 const [open, setOpen] = useState(true)
 return (
 <div className="bg-zinc-950 rounded-[2rem] border border-zinc-800 overflow-hidden">
 <button onClick={() => setOpen(!open)}
 className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-900/30 transition-colors">
 <div className="flex items-center gap-4">
 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-zinc-900 border border-zinc-800 ${color}`}>{icon}</div>
 <div>
 <h2 className={`font-black text-xl ${color}`}>{title}</h2>
 {badge && <span className="text-[10px] font-black text-zinc-600 tracking-widest">{badge}</span>}
 </div>
 </div>
 {open ? <ChevronUp size={20} className="text-zinc-500 flex-shrink-0"/> : <ChevronDown size={20} className="text-zinc-500 flex-shrink-0"/>}
 </button>
 {open && <div className="px-6 pb-6 space-y-6">{children}</div>}
 </div>
 )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
 return (
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
 <div className="text-2xl">{icon}</div>
 <div className="font-black text-sm text-white">{title}</div>
 <div className="text-zinc-500 text-xs font-black normal-case leading-relaxed">{desc}</div>
 </div>
 )
}

function StepRow({ n, title, desc }: { n: number; title: string; desc: string }) {
 return (
 <div className="flex items-start gap-4">
 <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">{n}</div>
 <div>
 <div className="font-black text-sm text-white">{title}</div>
 <div className="text-zinc-500 text-xs font-black normal-case leading-relaxed mt-0.5">{desc}</div>
 </div>
 </div>
 )
}

function Callout({ icon, color, text }: { icon: React.ReactNode; color: string; text: string }) {
 return (
 <div className={`flex items-start gap-3 rounded-2xl p-4 border ${color}`}>
 <div className="flex-shrink-0 mt-0.5">{icon}</div>
 <p className="text-xs font-black normal-case leading-relaxed">{text}</p>
 </div>
 )
}

export default function GuidePage() {
 return (
 <div className="min-h-screen bg-black text-white font-sans">
 <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3">
 <div className="max-w-3xl mx-auto flex items-center gap-4">
 <Link href="/"className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors">
 <ArrowLeft size={16}/> HOME
 </Link>
 <span className="text-zinc-600 font-black text-sm tracking-widest">BLITZ BOARD GUIDE</span>
 </div>
 </div>

 <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

 {/* Hero */}
 <div className="text-center py-6 space-y-3">
 <h1 className="text-5xl sm:text-6xl font-black tracking-tighter">
 BLITZ <span className="text-emerald-500">BOARD</span>
 </h1>
 <p className="text-zinc-400 text-sm font-black normal-case max-w-md mx-auto leading-relaxed">
 The complete golf scoring, betting, and tournament management app for your group.
 </p>
 <div className="flex justify-center gap-2 flex-wrap pt-2">
 {['Live Scoring','Side Bets','Team Matches','Skins','Wheel Bets','Tournaments'].map(tag => (
 <span key={tag} className="bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] font-black px-3 py-1.5 rounded-xl tracking-widest">{tag}</span>
 ))}
 </div>
 </div>

 {/* Cool Features */}
 <div className="bg-gradient-to-br from-emerald-950/40 to-black rounded-[2rem] border-2 border-emerald-500/30 overflow-hidden">
 <div className="p-6 sm:p-8">
 <div className="flex items-center gap-3 mb-2">
 <Star size={24} className="text-emerald-400"/>
 <h2 className="text-3xl font-black text-emerald-400">Why Blitz Board?</h2>
 </div>
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed mb-6">
 Stop keeping score on paper. Stop arguing about who owes what. Stop missing birdies that should have paid out. Blitz Board handles all of it — live, on your phone, for your whole group.
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <FeatureCard icon="⛳"title="Live Hole-by-Hole Scoring"desc="One admin enters scores, everyone else watches live from their phone. Golf symbols — birdie circles, eagle rings, bogey squares — make it instantly readable at a glance."/>
 <FeatureCard icon="💰"title="Automatic Payout Calculation"desc="Nassau matches with auto-press, birdie and eagle bonuses, skins pots — all calculated automatically in real time. No mental math, no disputes, no forgotten birdies."/>
 <FeatureCard icon="🔄"title="Wheel Bets"desc="Set up a 4-player wheel and the app auto-generates all 6 pairs. Straight 18 or Nassau with press — each pair scored independently, net result shown per player."/>
 <FeatureCard icon="🏆"title="Full Tournament Mode"desc="Multi-day trips with team formats, entry fees, skins pools, team vs team matches, and per-day archiving to history. The whole trip in one app."/>
 <FeatureCard icon="⚡"title="Quick Match Mode"desc="Just playing a casual round? Quick Match gets you from zero to scoring in under 2 minutes — course, players, teams, bets, GO. No entry fees, no setup wizard."/>
 <FeatureCard icon="👥"title="Permanent Roster"desc="Save your regular group once. Load them instantly into any match or tournament — names, handicaps, all there. No re-entering the same players every weekend."/>
 <FeatureCard icon="📱"title="Installs Like a Native App"desc="Add to your home screen from Safari on iPhone or Chrome on Android. Opens fullscreen with no browser chrome. Looks and feels like a real app."/>
 <FeatureCard icon="🔒"title="Admin PIN Protection"desc="Players can view everything but only the admin can edit. PIN-protected scorer and setup center means no accidental score changes on the course."/>
 </div>
 <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
 <p className="text-emerald-400 font-black text-sm normal-case leading-relaxed">
 🏌️ <strong>Built for real golf groups.</strong> Every feature in Blitz Board exists because a real problem came up on a real trip. Auto-press fires when you're 2 down. Skins carry when nobody wins. The scorer is PIN-locked so your buddy can't edit his own bogey to a par. This is the app your group has been doing manually on paper for years — digitized.
 </p>
 </div>
 </div>
 </div>

 {/* Getting Started */}
 <Section icon={<Home size={18}/>} color="text-zinc-300"title="Getting Started"badge="FIRST TIME SETUP">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed">When you first open Blitz Board you see a simple choice — are you a player or the admin? This sets what you can see and do throughout the app.</p>
 <StepRow n={1} title="Choose Your Role"desc="Player: view scores, payouts, results. Admin: everything including setup and score entry."/>
 <StepRow n={2} title="Admin PIN"desc="Admins enter the PIN to unlock full access. Role persists for your browser session — no re-entering every time."/>
 <StepRow n={3} title="Install the App"desc="iPhone: open in Safari, Share button, Add to Home Screen. Android: Chrome menu, Add to Home Screen. Opens fullscreen like a native app."/>
 <Callout icon={<Lock size={14} className="text-blue-400"/>} color="bg-blue-500/10 border-blue-500/20 text-blue-300"text="Switch roles anytime with the SWITCH ROLE link at the bottom of the hub, or the lock icon in the bottom nav bar."/>
 </div>
 <MockPhone label="Role Selection"><MockLanding/></MockPhone>
 </div>
 </Section>

 {/* Player Guide */}
 <Section icon={<User size={18}/>} color="text-emerald-400"title="Player Guide"badge="WHAT YOU CAN SEE AND DO">
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed">As a player you have read-only access to everything that matters during a round — live scores, who owes what, where you stand on the leaderboard. No setup required, no PIN needed.</p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-emerald-400">Player Hub</h3>
 <div className="space-y-2">
 {[
 {icon:'🎯',title:'Live Scorer',desc:'Watch scores update hole by hole in real time'},
 {icon:'💰',title:'Payouts',desc:'See who owes who across all matches'},
 {icon:'🏆',title:'Results',desc:'Leaderboard, skins map, team standings'},
 {icon:'📚',title:'History',desc:'Past tournament and match archives'},
 ].map(item => (
 <div key={item.title} className="flex items-start gap-3 bg-zinc-900 rounded-2xl px-4 py-3 border border-zinc-800">
 <span className="text-lg flex-shrink-0">{item.icon}</span>
 <div>
 <div className="font-black text-sm text-white">{item.title}</div>
 <div className="text-zinc-500 text-[10px] font-black normal-case">{item.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <MockPhone label="Player Hub"><MockPlayerHub/></MockPhone>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-emerald-400">Live Scorer</h3>
 <p className="text-zinc-500 text-xs font-black normal-case leading-relaxed">The scorer shows all teams and players with hole-by-hole scores. Golf symbols make it readable at a glance.</p>
 <div className="space-y-2">
 {[
 {sym:'○',color:'text-red-400',label:'Birdie — 1 under par'},
 {sym:'◎',color:'text-yellow-400',label:'Eagle — 2 or more under par'},
 {sym:'□',color:'text-zinc-400',label:'Bogey — 1 over par'},
 {sym:'⬜',color:'text-zinc-500',label:'Double bogey — 2 over par'},
 ].map(item => (
 <div key={item.label} className="flex items-center gap-3">
 <span className={`font-black text-lg w-6 text-center ${item.color}`}>{item.sym}</span>
 <span className="text-zinc-500 text-xs font-black normal-case">{item.label}</span>
 </div>
 ))}
 </div>
 <Callout icon={<Lock size={14} className="text-amber-400"/>} color="bg-amber-500/10 border-amber-500/20 text-amber-300"text="The scorer is VIEW ONLY by default. Only an admin can unlock editing with the PIN. This prevents accidental score changes during a round."/>
 </div>
 <MockPhone label="Live Scorer"><MockScorer/></MockPhone>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-emerald-400">Match Payouts</h3>
 <p className="text-zinc-500 text-xs font-black normal-case leading-relaxed">Every match shows a full breakdown — hole-by-hole scorecard, press indicators, birdie and eagle bonuses, and a final net result.</p>
 <div className="space-y-2">
 {[
 {icon:'⚡',label:'Lightning bolt — press fired that hole'},
 {icon:'★',label:'Star — eagle bonus that hole'},
 {icon:'●',label:'Green dot — birdie for Side A'},
 {icon:'●',label:'Blue dot — birdie for Side B'},
 {icon:'·',label:'Yellow dots — handicap strokes given'},
 ].map(item => (
 <div key={item.label} className="flex items-center gap-3">
 <span className="text-base w-5 text-center">{item.icon}</span>
 <span className="text-zinc-500 text-xs font-black normal-case">{item.label}</span>
 </div>
 ))}
 </div>
 </div>
 <MockPhone label="Match Payouts"><MockPayouts/></MockPhone>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-emerald-400">Tournament Results</h3>
 <div className="space-y-2">
 {['Individual gross and net leaderboard','Skins map — which holes were won or carried','Skins payout per player','Team match standings'].map(item => (
 <div key={item} className="flex items-start gap-2">
 <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
 <span className="text-zinc-500 text-xs font-black normal-case">{item}</span>
 </div>
 ))}
 </div>
 </div>
 <MockPhone label="Results"><MockResults/></MockPhone>
 </div>
 </Section>

 {/* Admin Guide */}
 <Section icon={<Shield size={18}/>} color="text-rose-400"title="Admin Guide"badge="SETUP AND MANAGEMENT">
 <p className="text-zinc-400 text-sm font-black normal-case leading-relaxed">The admin controls everything — setting up tournaments, entering scores, configuring bets. One person per group should be the admin.</p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-rose-400">Admin Hub</h3>
 <div className="space-y-3">
 {[
 {icon:<Shield size={16} className="text-rose-400"/>,title:'Tournament Wizard',desc:'Full multi-day tournament setup — trip name, course, roster, teams, entry fees, skins, format, matchups. Checklist-driven so nothing gets missed.'},
 {icon:<Zap size={16} className="text-amber-400"/>,title:'Quick Match',desc:'Casual round setup in under 2 minutes. Course, players, teams, format, bets — then straight to scoring. No entry fees or skins.'},
 {icon:<Users size={16} className="text-emerald-400"/>,title:'Roster Manager',desc:'Your permanent player list. Enter your group once, load them instantly into any match or tournament.'},
 ].map(item => (
 <div key={item.title} className="flex items-start gap-3 bg-zinc-900 rounded-2xl px-4 py-3 border border-zinc-800">
 <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
 <div>
 <div className="font-black text-sm text-white">{item.title}</div>
 <div className="text-zinc-500 text-[10px] font-black normal-case leading-relaxed">{item.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <MockPhone label="Admin Hub"><MockAdminHub/></MockPhone>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-rose-400">Tournament Wizard</h3>
 <p className="text-zinc-500 text-xs font-black normal-case leading-relaxed">A 6-step checklist that walks you through everything needed for a full tournament.</p>
 <div className="space-y-2">
 {[
 {n:1,title:'Trip & Days',desc:'Trip name, number of days, start Day 1'},
 {n:2,title:'Course Setup',desc:'Scan scorecard with camera or enter par and HCP manually. Save to library.'},
 {n:3,title:'Roster & Teams',desc:'Add players, set handicaps, build teams.'},
 {n:4,title:'Entry & Skins',desc:'Entry fee per player, skins pot allocation.'},
 {n:5,title:'Team Format',desc:"Jeff's Blitz or custom ball configuration."},
 {n:6,title:'Matchups',desc:'1v1, 2v2, Team vs Team, or Wheel with full stakes config.'},
 ].map(item => <StepRow key={item.n} {...item}/>)}
 </div>
 </div>
 <MockPhone label="Tournament Wizard"><MockWizard/></MockPhone>
 </div>

 <div className="space-y-4">
 <h3 className="font-black text-base text-rose-400">Course Setup</h3>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 {icon:'📷',title:'Scan Scorecard',desc:'Photo of the physical scorecard. AI reads all 18 holes of par and HCP. Review before accepting.'},
 {icon:'📚',title:'Saved Courses',desc:'Previously saved courses load instantly — all 18 holes pre-filled. Same library works for both tournaments and quick matches.'},
 {icon:'✏️',title:'Manual Entry',desc:'Front 9 and Back 9 tables with par dropdown and HCP index per hole. Edit any value by tapping.'},
 ].map(item => (
 <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
 <div className="text-2xl">{item.icon}</div>
 <div className="font-black text-xs text-white">{item.title}</div>
 <div className="text-zinc-500 text-[10px] font-black normal-case leading-relaxed">{item.desc}</div>
 </div>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="font-black text-base text-rose-400">Match Types</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {[
 {icon:<User size={18}/>,color:'text-emerald-400',title:'1 v 1 (PvP)',desc:'Player vs player. Nassau (F9/B9/Total), auto-press at ±2, birdie and eagle bonuses. NET or GROSS.'},
 {icon:<div className="flex gap-0.5"><User size={14}/><User size={14}/></div>,color:'text-amber-400',title:'2 v 2',desc:'Best ball of 2 partners per hole. Same Nassau/press/birdie options as 1v1.'},
 {icon:<Users size={18}/>,color:'text-blue-400',title:'Team v Team',desc:"Full team matches using Jeff's Blitz or custom format. Engine picks optimal ball combination automatically."},
 {icon:<RefreshCw size={18}/>,color:'text-purple-400',title:'Wheel Bet',desc:'4 players, 6 auto-generated pairs — everyone vs everyone. Straight 18 or Nassau with press.'},
 ].map(item => (
 <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
 <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
 <div>
 <div className={`font-black text-sm ${item.color}`}>{item.title}</div>
 <div className="text-zinc-500 text-[10px] font-black normal-case leading-relaxed mt-1">{item.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-purple-400">Wheel Bet</h3>
 <p className="text-zinc-500 text-xs font-black normal-case leading-relaxed">Select 4 players — the app generates all 6 pairs automatically. Everyone plays everyone.</p>
 <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
 <div className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">6 AUTO-GENERATED PAIRS</div>
 <div className="grid grid-cols-2 gap-1.5">
 {['A vs B','A vs C','A vs D','B vs C','B vs D','C vs D'].map(pair => (
 <div key={pair} className="bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-center">
 <span className="text-purple-400 text-[9px] font-black">{pair}</span>
 </div>
 ))}
 </div>
 </div>
 <Callout icon={<RefreshCw size={14} className="text-purple-400"/>} color="bg-purple-500/10 border-purple-500/20 text-purple-300"text="In payouts, tap any pair pill to expand a full hole-by-hole scorecard for just those 2 players — with golf symbols, handicap dots, and hole winners shown."/>
 </div>
 <MockPhone label="Wheel Payouts"><MockWheel/></MockPhone>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="font-black text-base text-amber-400">Quick Match</h3>
 <div className="space-y-2">
 {[
 {n:1,title:'Course',desc:'Type a name, load saved, or scan a scorecard.'},
 {n:2,title:'Players',desc:'Load from your saved roster or add manually.'},
 {n:3,title:'Teams',desc:'Optional — skip for 1v1 and wheel only.'},
 {n:4,title:'Format',desc:"Jeff's Blitz or configure custom balls."},
 {n:5,title:'Matches',desc:'Add 1v1, 2v2, Team, or Wheel bets.'},
 ].map(item => <StepRow key={item.n} {...item}/>)}
 </div>
 <Callout icon={<Archive size={14} className="text-emerald-400"/>} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"text="When done — back to admin hub, tap ARCHIVE MATCH TO HISTORY. Saves everything to history and clears the active match."/>
 </div>
 <MockPhone label="Quick Match"><MockQuickMatch/></MockPhone>
 </div>

 <div className="space-y-4">
 <h3 className="font-black text-base text-rose-400">Multi-Day Tournaments</h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 {icon:'📅',title:'Start Day 1',desc:'Configure wizard, tap GO LIVE'},
 {icon:'⛳',title:'Play & Score',desc:'Score the round, review payouts'},
 {icon:'📦',title:'Close the Day',desc:'CLOSE DAY in wizard — archives to history'},
 {icon:'🔄',title:'Day 2+',desc:'Scores reset, roster carries over'},
 ].map(item => (
 <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center space-y-2">
 <div className="text-2xl">{item.icon}</div>
 <div className="font-black text-xs text-white">{item.title}</div>
 <div className="text-zinc-500 text-[9px] font-black normal-case">{item.desc}</div>
 </div>
 ))}
 </div>
 </div>
 </Section>

 {/* Pro Tips */}
 <Section icon={<Star size={18}/>} color="text-yellow-400"title="Pro Tips"badge="GET THE MOST OUT OF BLITZ BOARD">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {[
 {icon:'👥',title:'Set up your Roster first',desc:'Go to Roster Manager and add everyone in your regular group before your first round. Takes 2 minutes and saves time every week — just tap LOAD FROM ROSTER.'},
 {icon:'📷',title:'Scan scorecards',desc:'Use SCAN CARD in course setup to photograph the physical scorecard. AI reads all 18 holes in seconds. Save to library and never enter it again.'},
 {icon:'📱',title:'Install on everyone\'s phone',desc:'iPhone: Safari, Share, Add to Home Screen. Android: Chrome menu, Add to Home Screen. Tell your group before the round — makes a huge difference.'},
 {icon:'⚡',title:'Quick Match for casual rounds',desc:"Don't use the Tournament Wizard for a casual weekend round. Quick Match gets you scoring in under 2 minutes."},
 {icon:'🔒',title:'Only the admin needs to edit',desc:'Everyone else should sign in as a Player. The scorer is view-only by default — players follow along live without any risk of changing scores.'},
 {icon:'💾',title:'Archive before starting fresh',desc:'Always archive before starting a new tournament or match. The Archive button is on the admin hub when something is active.'},
 ].map(item => (
 <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
 <div className="text-2xl">{item.icon}</div>
 <div className="font-black text-sm text-white">{item.title}</div>
 <div className="text-zinc-500 text-xs font-black normal-case leading-relaxed">{item.desc}</div>
 </div>
 ))}
 </div>
 </Section>

 {/* CTA */}
 <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-[2rem] p-8 text-center space-y-4">
 <div className="text-4xl">⛳</div>
 <h2 className="text-2xl font-black text-emerald-400">Ready to Play?</h2>
 <p className="text-zinc-400 text-sm font-black normal-case max-w-sm mx-auto">Sign in as Admin to set up your first tournament or quick match. Players just tap I'm a Player and follow along live.</p>
 <Link href="/"className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-2xl font-black text-sm transition-colors">
 <Home size={16}/> GO TO BLITZ BOARD
 </Link>
 </div>

 </div>
 </div>
 )
}