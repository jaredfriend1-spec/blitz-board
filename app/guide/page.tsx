"use client"
import Link from 'next/link'
import { ArrowLeft, Flag, Users, DollarSign, Sword, Target, Archive, Trophy, Zap, ChevronRight, CheckCircle2, BookOpen, Layers } from 'lucide-react'

const sections = [
  {
    id: 'overview',
    icon: <BookOpen size={20}/>,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    title: 'What is Blitz Board?',
    content: [
      {
        type: 'text',
        text: 'Blitz Board is a golf tournament scoring and betting app designed for multi-day group trips. One person runs it as the administrator — setting up the course, players, teams, and bets. Everyone else can view the scorer and results live from their own phone.'
      },
      {
        type: 'list',
        label: 'What it tracks:',
        items: [
          'Live hole-by-hole scoring for all players',
          'Team best-ball matches (Nassau + press bets)',
          'Player vs Player matches with auto-press',
          'Skins game with automatic payout calculation',
          'Multi-day tournaments with per-day results',
        ]
      }
    ]
  },
  {
    id: 'setup',
    icon: <Flag size={20}/>,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    title: 'Step 1 — Before the Round',
    subtitle: 'Setup Center → Tournament Wizard',
    content: [
      {
        type: 'steps',
        items: [
          {
            label: 'Trip Setup',
            desc: 'Enter the trip name (e.g. "Cabo 2026") and how many days you\'re playing. This links all days together in History.'
          },
          {
            label: 'Course Setup',
            desc: 'Enter the course name, par for each hole, and handicap index (stroke index) per hole. Use Scan Card to photograph the scorecard and have it fill in automatically.'
          },
          {
            label: 'Roster & Teams',
            desc: 'Add all players with their handicap index. Create teams and assign players. Each player can only be on one team.'
          },
          {
            label: 'Money & Pots',
            desc: 'Set the entry fee per player and how much of that goes into the skins pot. The rest goes to the team match pot.'
          },
          {
            label: 'Team Scoring Format',
            desc: "Choose Jeff's Blitz (Best 2 Net per hole, Best 3 Net on par 3s) or configure your own — choose how many balls count per hole and whether each ball is net or gross."
          },
          {
            label: 'Side Bets & Matches',
            desc: 'Create your matches — PvP (1v1) or Team vs Team. Set Nassau amount, press amount, birdie and eagle bonuses. For PvP you can turn auto-press on or off.'
          },
        ]
      },
      {
        type: 'tip',
        text: "When all 6 steps have a green checkmark, the GO LIVE button unlocks and takes you straight to the scorer."
      }
    ]
  },
  {
    id: 'scoring',
    icon: <Target size={20}/>,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    title: 'Step 2 — Live Scoring',
    subtitle: 'Hub → Live Scorer',
    content: [
      {
        type: 'text',
        text: 'The scorer shows all teams as separate scorecards. Enter each player\'s gross score for each hole by tapping the cell and typing the number. Scores auto-save to Firebase — no save button needed.'
      },
      {
        type: 'symbols',
        label: 'Scoring symbols:',
        items: [
          { symbol: '●●', color: 'text-yellow-400', label: 'Eagle or better (double circle)' },
          { symbol: '●', color: 'text-red-400', label: 'Birdie (single circle)' },
          { symbol: '■', color: 'text-white', label: 'Par (filled square)' },
          { symbol: '□', color: 'text-zinc-400', label: 'Bogey (single square outline)' },
          { symbol: '□□', color: 'text-zinc-500', label: 'Double bogey (double square outline)' },
        ]
      },
      {
        type: 'tip',
        text: 'Yellow dots below a score indicate handicap strokes received on that hole. The scorer shows both the gross score and the to-par for each player automatically.'
      }
    ]
  },
  {
    id: 'payouts',
    icon: <DollarSign size={20}/>,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    title: 'Step 3 — Reading the Payouts',
    subtitle: 'Hub → Side Bets',
    content: [
      {
        type: 'text',
        text: 'The payouts page calculates everything live as scores are entered. Each match shows a split scorecard for Front 9 and Back 9 with the following indicators on each hole:'
      },
      {
        type: 'list',
        label: 'Hole indicators:',
        items: [
          '⚡ Yellow bolt — a press bet fired on this hole (PvP only)',
          '★ Gold star — an eagle bonus was earned on this hole',
          '● Green dot — Side A made a birdie on this hole',
          '● Blue dot — Side B made a birdie on this hole',
          '· Yellow dots below score — handicap strokes received',
        ]
      },
      {
        type: 'text',
        text: 'The Match Net at the bottom of each card shows the final result: who owes what after adding front 9, back 9, and all birdie/eagle bonuses together.'
      },
      {
        type: 'tip',
        text: 'The active team format (e.g. "Jeff\'s Blitz") is shown in a banner at the top of the payouts page. Tap the Setup link to change it before the round.'
      }
    ]
  },
  {
    id: 'skins',
    icon: <Zap size={20}/>,
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    title: 'How Skins Work',
    content: [
      {
        type: 'text',
        text: 'A skin is won on any hole where one player has the outright lowest gross score — no ties. If two or more players tie for the lowest score, no skin is awarded on that hole.'
      },
      {
        type: 'list',
        label: 'Skins payout formula:',
        items: [
          'Skins pot = Entry fee skins allocation × number of players',
          'Value per skin = Total skins pot ÷ total skins won across all 18 holes',
          'Player payout = Skins won × value per skin',
        ]
      },
      {
        type: 'tip',
        text: "Skins results are visible in the Tournament Results page under the Skins tab, and in History after the round is archived."
      }
    ]
  },
  {
    id: 'nassau',
    icon: <Sword size={20}/>,
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    title: 'How the Nassau Works',
    content: [
      {
        type: 'text',
        text: 'A Nassau is three separate bets in one match: Front 9, Back 9, and Total 18. Each is worth the Nassau base amount. So a $5 Nassau is worth up to $15 total ($5 per nine plus $5 for overall).'
      },
      {
        type: 'text',
        text: 'Match play scoring: win a hole = +1 point, lose a hole = -1 point, halve = 0. The side with more points at the end of each nine wins that bet.'
      },
      {
        type: 'list',
        label: 'Auto-Press (PvP only, when enabled):',
        items: [
          'When a player goes 2-down (losing by 2), a new press bet automatically starts',
          'The press is worth the press amount (set separately from Nassau)',
          'Multiple presses can stack — each fires independently',
          'A ⚡ appears on the hole where each press fired',
        ]
      },
      {
        type: 'tip',
        text: 'Auto-Press can be turned off per match in the matchup builder if your group prefers to play straight.'
      }
    ]
  },
  {
    id: 'endday',
    icon: <Archive size={20}/>,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    title: 'Step 4 — Ending the Day',
    subtitle: 'Hub → Close Day / End Tournament',
    content: [
      {
        type: 'steps',
        items: [
          {
            label: 'Tap "Close Day / End Tournament" on the Hub',
            desc: 'This button appears at the bottom of the Hub whenever there is active tournament data.'
          },
          {
            label: 'Confirm the trip name and day label',
            desc: 'The trip name links this day to others in History. Select which day this is (Day 1, Day 2, etc.).'
          },
          {
            label: 'Choose what to do next',
            desc: '"Archive Only" saves a snapshot but keeps everything running. "Archive + Wipe Scores" is for Day 2 — keeps teams, course, and matchups but clears scores. "Archive + Full Reset" ends the trip.'
          },
          {
            label: 'Or use the wizard',
            desc: 'In Setup → Tournament Wizard, the Trip Setup step shows your day progress. Use the "Close Day 1 · Start Day 2" button to transition between days without going to the Hub.'
          }
        ]
      },
      {
        type: 'tip',
        text: 'For multi-day trips: closing Day 1 keeps teams and the course in place. Before Day 2 you just need to set up new matchups and then go live.'
      }
    ]
  },
  {
    id: 'history',
    icon: <Trophy size={20}/>,
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    title: 'Step 5 — History & Results',
    subtitle: 'Hub → History or Results',
    content: [
      {
        type: 'text',
        text: 'After archiving, every tournament appears in the History page grouped by trip name. Each entry shows:'
      },
      {
        type: 'list',
        label: '',
        items: [
          'F9 and B9 low scorer',
          'Top skins earner and their payout',
          'Full individual leaderboard with to-par',
          'Hole-by-hole skins map (which player won each hole)',
          'Team best-ball results',
          'Match results summary',
        ]
      },
      {
        type: 'text',
        text: 'The Results page (live during the round) shows the current leaderboard, team standings, and skins in real time as scores are entered.'
      }
    ]
  },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors uppercase italic">
          <ArrowLeft size={16}/> HUB
        </Link>
        <span className="font-black text-sm tracking-widest text-zinc-400 uppercase italic">HOW TO PLAY</span>
        <div className="w-16"/>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="mb-10 pb-8 border-b border-zinc-900">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen size={32} className="text-emerald-400"/>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">How to Build & Score a Tournament</h1>
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed normal-case">
            Everything you need to know to set up and run a Blitz Board golf tournament from start to finish.
          </p>
        </div>

        {/* Quick nav */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['Setup', 'Scoring', 'Payouts', 'End Day'].map((label, i) => (
            <a key={label} href={`#${['setup','scoring','payouts','endday'][i]}`}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 p-3 rounded-xl text-center text-xs font-black uppercase italic text-zinc-400 hover:text-white transition-all">
              {label}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.id} id={section.id} className={`rounded-[2rem] border ${section.border} ${section.bg} overflow-hidden`}>
              {/* Section header */}
              <div className="px-6 py-5 border-b border-zinc-800/50 flex items-center gap-3">
                <span className={section.color}>{section.icon}</span>
                <div>
                  <h2 className={`font-black text-lg uppercase italic tracking-tight ${section.color}`}>{section.title}</h2>
                  {section.subtitle && (
                    <p className="text-[10px] font-black text-zinc-600 tracking-widest mt-0.5 uppercase">{section.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Section content */}
              <div className="px-6 py-5 space-y-4">
                {section.content.map((block: any, i: number) => {
                  if (block.type === 'text') return (
                    <p key={i} className="text-zinc-300 text-sm leading-relaxed normal-case">{block.text}</p>
                  )
                  if (block.type === 'list') return (
                    <div key={i}>
                      {block.label && <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">{block.label}</p>}
                      <ul className="space-y-1.5">
                        {block.items.map((item: string, j: number) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-zinc-300 normal-case">
                            <span className="text-emerald-500 mt-0.5 flex-shrink-0">·</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                  if (block.type === 'steps') return (
                    <div key={i} className="space-y-3">
                      {block.items.map((step: any, j: number) => (
                        <div key={j} className="flex gap-3 bg-black/40 rounded-xl p-4">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 flex-shrink-0 mt-0.5">{j+1}</div>
                          <div>
                            <p className="font-black text-sm text-white uppercase italic">{step.label}</p>
                            <p className="text-zinc-400 text-xs leading-relaxed mt-1 normal-case">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  if (block.type === 'symbols') return (
                    <div key={i}>
                      {block.label && <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">{block.label}</p>}
                      <div className="space-y-2">
                        {block.items.map((item: any, j: number) => (
                          <div key={j} className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-2.5">
                            <span className={`font-black text-base w-8 text-center ${item.color}`}>{item.symbol}</span>
                            <span className="text-zinc-300 text-xs normal-case">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                  if (block.type === 'tip') return (
                    <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex gap-2">
                      <span className="text-yellow-400 flex-shrink-0 text-sm">💡</span>
                      <p className="text-yellow-200/80 text-xs leading-relaxed normal-case">{block.text}</p>
                    </div>
                  )
                  return null
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 bg-emerald-950/40 border border-emerald-500/30 rounded-[2rem] p-6 text-center">
          <p className="text-emerald-400 font-black text-xl uppercase italic mb-2">Ready to play?</p>
          <p className="text-zinc-500 text-sm normal-case mb-4">Head to the Setup Center to start building your tournament.</p>
          <Link href="/setup" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-2xl font-black uppercase italic text-sm transition-colors">
            GO TO SETUP <ChevronRight size={16}/>
          </Link>
        </div>

        <p className="text-center text-[9px] text-zinc-800 font-black tracking-widest mt-8 uppercase italic pb-4">
          Blitz Board · Senior Management Console
        </p>
      </div>
    </div>
  )
}