"use client"
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Star, Zap, Trophy, DollarSign, Target, Users, Flag,
  Shield, BookOpen, ChevronDown, ChevronUp, Settings, History,
  Camera, Check, Home, Archive, User, BarChart3, Mail, Lock
} from 'lucide-react'

function Section({ title, icon, children }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{icon}</span>
          <span className="font-black text-sm text-white tracking-tight">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-500"/> : <ChevronDown size={16} className="text-zinc-500"/>}
      </button>
      {open && <div className="border-t border-zinc-800 p-5 space-y-3">{children}</div>}
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-emerald-400 text-[10px] font-black">{n}</span>
      </div>
      <p className="text-zinc-400 text-sm font-medium normal-case leading-relaxed">{text}</p>
    </div>
  )
}

function Tag({ text, color = 'emerald' }: { text: string; color?: string }) {
  const colors: Record<string,string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${colors[color]}`}>{text}</span>
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center gap-3 sticky top-0 z-30">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={20}/>
        </Link>
        <div>
          <h1 className="font-black text-sm tracking-tight">HOW BLITZ BOARD WORKS</h1>
          <p className="text-zinc-600 text-[10px] font-medium">Guide & feature walkthrough</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">

        {/* Intro */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-zinc-900/60 border border-emerald-500/20 rounded-2xl p-5">
          <h2 className="font-black text-xl mb-1">BLITZ <span className="text-emerald-400">BOARD</span></h2>
          <p className="text-zinc-400 text-sm font-medium normal-case leading-relaxed">
            A full golf match scoring and betting platform. Track scores hole-by-hole, calculate Nassau payouts automatically, manage skins, run tournaments, and keep history of every round your group has ever played.
          </p>
        </div>

        {/* Who Are You */}
        <Section title="Who Are You? (Login)" icon={<User size={16}/>}>
          <div className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User size={14} className="text-emerald-400"/>
                <span className="font-bold text-sm text-emerald-400">I'm a Player</span>
                <Tag text="NO LOGIN" color="emerald"/>
              </div>
              <p className="text-zinc-500 text-xs font-medium normal-case">Tap this to view live scores, results, payouts and history. No account needed — perfect for players following along during a round.</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-blue-400"/>
                <span className="font-bold text-sm text-blue-400">Admin Sign In</span>
                <Tag text="EMAIL + PASSWORD" color="blue"/>
              </div>
              <p className="text-zinc-500 text-xs font-medium normal-case">Sign in with your email and password to access admin features. Two roles:</p>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-emerald-400"/>
                  <span className="text-xs font-bold text-white">Master Admin</span>
                  <span className="text-zinc-600 text-[10px] font-medium normal-case">— Full control, analytics, user management, settings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-blue-400"/>
                  <span className="text-xs font-bold text-white">Scorer Admin</span>
                  <span className="text-zinc-600 text-[10px] font-medium normal-case">— Set up matches, enter scores, manage rounds</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Quick Match */}
        <Section title="Quick Match" icon={<Zap size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">The fastest way to start a casual round with side bets. No entry fees, no tournament structure — just set up your players, choose your bets, and score.</p>
          <div className="space-y-2">
            <Step n={1} text="Tap Quick Match from the Admin hub"/>
            <Step n={2} text="Add players (or load from your saved roster)"/>
            <Step n={3} text="Select a course from your library or enter hole data"/>
            <Step n={4} text="Set up matchups — 1v1, 2v2, Team vs Team, or Wheel"/>
            <Step n={5} text="Configure Nassau amounts, presses, birdie/eagle bonuses"/>
            <Step n={6} text="Start scoring hole by hole"/>
          </div>
        </Section>

        {/* Match Types */}
        <Section title="Match Types & Betting" icon={<DollarSign size={16}/>}>
          <div className="space-y-3">
            {[
              { name:'1v1 (PvP)', color:'blue', desc:'One player vs another. Nassau with optional presses. Gross or net scoring.' },
              { name:'2v2 Best Ball', color:'purple', desc:'Two players per side. Best ball format — lowest net score per hole counts. Nassau with presses.' },
              { name:'Team vs Team', color:'amber', desc:'Full teams compete. Great for tournament rounds with skins.' },
              { name:'Wheel', color:'emerald', desc:'Round-robin format — every player plays every other player simultaneously. Great for 3 or 4 players.' },
            ].map(m => (
              <div key={m.name} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-black text-${m.color}-400`}>{m.name}</span>
                </div>
                <p className="text-zinc-500 text-xs font-medium normal-case">{m.desc}</p>
              </div>
            ))}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <span className="text-xs font-black text-yellow-400">Nassau</span>
              <p className="text-zinc-500 text-xs font-medium normal-case mt-1">Three separate bets — Front 9, Back 9, and Overall 18. Each worth the Nassau amount. Auto-press doubles the bet when a side falls 2 down.</p>
            </div>
          </div>
        </Section>

        {/* Live Scoring */}
        <Section title="Live Scorer" icon={<Target size={16}/>}>
          <div className="space-y-2">
            <Step n={1} text="Tap Live Scorer from the hub"/>
            <Step n={2} text="Enter each player's score hole by hole"/>
            <Step n={3} text="Scores save to Firebase in real time — players watching on their phones see updates instantly"/>
            <Step n={4} text="Red circles = birdies. Par and above shown as plain numbers"/>
            <Step n={5} text="Payouts page updates live as scores come in"/>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-2">
            <p className="text-amber-400 text-[10px] font-black mb-1">NET vs GROSS</p>
            <p className="text-zinc-500 text-xs font-medium normal-case">Net scoring applies handicap strokes to each player based on hole difficulty rating. The lowest handicap player plays scratch and everyone gets the difference.</p>
          </div>
        </Section>

        {/* Skins */}
        <Section title="Skins" icon={<Star size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Each hole is worth a skin. Win the hole outright (lowest score, no ties) to win the skin. If nobody wins the hole, the skin carries over and grows.</p>
          <div className="space-y-2 mt-2">
            <Step n={1} text="Set an entry fee and skins allocation when setting up a match"/>
            <Step n={2} text="Skins pot = allocation × number of players"/>
            <Step n={3} text="Each skin is worth pot ÷ total skins won"/>
            <Step n={4} text="Payouts page shows who won which holes and the exact dollar amount"/>
          </div>
        </Section>

        {/* Course Library */}
        <Section title="Course Library" icon={<Flag size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Save your home courses so you never have to enter hole data again. Stores par and handicap rating for all 18 holes.</p>
          <div className="space-y-2 mt-2">
            <Step n={1} text="Tap Course Library from the Admin hub"/>
            <Step n={2} text="Tap Add Course and enter the course name"/>
            <Step n={3} text="Take a photo of a scorecard or upload an image — AI reads the hole data automatically"/>
            <Step n={4} text="Review the scan and save — course is stored permanently"/>
            <Step n={5} text="Select saved courses instantly when starting any match or tournament"/>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mt-2">
            <p className="text-emerald-400 text-[10px] font-black mb-1">📷 SCAN SCORECARD</p>
            <p className="text-zinc-500 text-xs font-medium normal-case">The AI reads par and handicap ratings directly from a photo of a printed scorecard. Works best with good lighting and a straight-on shot.</p>
          </div>
        </Section>

        {/* Tournament Wizard */}
        <Section title="Tournament Wizard" icon={<Trophy size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Full multi-day tournament mode with entry fees, team assignments, daily scoring, and cumulative leaderboards.</p>
          <div className="space-y-2 mt-2">
            <Step n={1} text="Tap Tournament Wizard and set trip name + number of days"/>
            <Step n={2} text="Add players and assign to teams"/>
            <Step n={3} text="Set entry fees and skins allocation"/>
            <Step n={4} text="Set up matchups for each day"/>
            <Step n={5} text="Score each day — cumulative standings update automatically"/>
            <Step n={6} text="Archive at end of trip to save to History"/>
          </div>
        </Section>

        {/* Analytics */}
        <Section title="Analytics" icon={<BarChart3 size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Deep stats on every player and every round your group has ever played. Gets richer the more history you archive.</p>
          <div className="space-y-1.5 mt-2">
            {[
              'Money leaderboard — all-time net won/lost',
              'Match records — W/L/T by format',
              'Scoring averages — F9, B9, best round ever',
              'Skins kings — total skins and money',
              'Head to head records between every pair',
              'Best partnership win rates',
              'Handicap trends over time',
              'Handicap integrity index (sandbagging detector)',
              'Consistency index — score variance',
              'Score trends — last 8 rounds chart',
              'Round records — all-time best and worst',
              'Betting stats — formats, averages, press usage',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check size={12} className="text-emerald-500 flex-shrink-0"/>
                <span className="text-zinc-400 text-xs font-medium normal-case">{item}</span>
              </div>
            ))}
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mt-3">
            <p className="text-zinc-500 text-[10px] font-black tracking-wider mb-1">ACCESS CONTROL</p>
            <p className="text-zinc-500 text-xs font-medium normal-case">Master Admin controls who can see Analytics. Scorers and Players can be toggled on/off independently from the Master Dashboard.</p>
          </div>
        </Section>

        {/* History */}
        <Section title="History & Archiving" icon={<History size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Every completed match or tournament can be archived to History. Archived rounds feed the Analytics engine.</p>
          <div className="space-y-2 mt-2">
            <Step n={1} text="After a round is complete, tap Archive from the admin hub or Master Dashboard"/>
            <Step n={2} text="The match is saved permanently with all scores, matchups, and payouts"/>
            <Step n={3} text="View any archived round from the History page"/>
            <Step n={4} text="Analytics automatically processes all archived rounds"/>
          </div>
        </Section>

        {/* Roster */}
        <Section title="Roster Manager" icon={<Users size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">Save your regular players with their names and handicaps so you can load them instantly into any match.</p>
          <div className="space-y-2 mt-2">
            <Step n={1} text="Add players to the global roster from the Roster Manager"/>
            <Step n={2} text="Set their handicap — updates automatically carry forward"/>
            <Step n={3} text="When starting a match, tap 'Load from Roster' to add them all at once"/>
            <Step n={4} text="Handicaps can be adjusted per-round without affecting the saved roster"/>
          </div>
        </Section>

        {/* Master Dashboard */}
        <Section title="Master Dashboard" icon={<Shield size={16}/>}>
          <p className="text-zinc-500 text-sm font-medium normal-case">The control center for the Master Admin. Access from the ⚡ Master Dashboard button in the admin hub.</p>
          <div className="space-y-1.5 mt-2">
            {[
              'Course Library — view and manage all saved courses',
              'Active Match — see current match status, archive or wipe',
              'Full History — view and delete any archived round',
              'Analytics Access — control who sees analytics and which sections',
              'User Management — add/remove users, change roles, send password resets',
              'App Settings — manage saved formats, danger zone options',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check size={12} className="text-emerald-500 flex-shrink-0"/>
                <span className="text-zinc-400 text-xs font-medium normal-case">{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Tips */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-zinc-500 text-[10px] font-black tracking-widest">💡 PRO TIPS</p>
          {[
            'Install as a PWA — tap "Add to Home Screen" in your browser for the full app experience',
            'Scores save in real time — players can follow along on their own phones without being in the scorer view',
            'Archive every round to build up your Analytics history — the more data, the better the insights',
            'Use the Course Library scan feature to set up new courses in under a minute',
            'The Wheel format is great for 3 or 4 players — everyone plays everyone simultaneously',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-emerald-500 text-xs mt-0.5">→</span>
              <p className="text-zinc-500 text-xs font-medium normal-case leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}