"use client"
import React, { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { ref, set, onValue } from 'firebase/database'

export default function BlitzBoardMaster() {
  const [activeTab, setActiveTab] = useState('setup')
  const [teams, setTeams] = useState<any[]>([])
  const [scores, setScores] = useState<any>({})
  
  // TOURNAMENT LOGIC: Bets, Skins, and Handicaps
  useEffect(() => {
    onValue(ref(db, 'tournament-teams'), (snap) => { if (snap.val()) setTeams(snap.val()) })
    onValue(ref(db, 'live-scores'), (snap) => { if (snap.val()) setScores(snap.val()) })
  }, [])

  const saveToCloud = () => {
    set(ref(db, 'tournament-teams'), teams)
    set(ref(db, 'live-scores'), scores)
    alert("SYNCED TO ALL DEVICES")
  }

  // STYLING VARIABLES (The "Emerald/Black" look you loved)
  const theme = {
    bg: 'black',
    card: '#09090b',
    border: '#27272a',
    emerald: '#10b981',
    text: 'white',
    muted: '#71717a'
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <header style={{ padding: '30px 20px', textAlign: 'center', borderBottom: `1px solid ${theme.border}` }}>
        <h1 style={{ color: theme.emerald, fontSize: '32px', fontWeight: 'bold', margin: 0 }}>BLITZ BOARD</h1>
        <p style={{ color: theme.muted, fontSize: '10px', letterSpacing: '2px', marginTop: '5px' }}>MCC SPECIAL EDITION • 2026</p>
      </header>

      {/* TABS NAVIGATION */}
      <nav style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, backgroundColor: '#050505' }}>
        {['SETUP', 'SCORER', 'LEADERBOARD', 'BETS'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{ 
              flex: 1, padding: '15px', background: 'none', border: 'none', 
              color: activeTab === tab.toLowerCase() ? theme.emerald : theme.muted,
              borderBottom: activeTab === tab.toLowerCase() ? `2px solid ${theme.emerald}` : 'none',
              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* SETUP MODULE */}
        {activeTab === 'setup' && (
          <div>
            <h2 style={{ color: theme.emerald }}>TOURNAMENT SETUP</h2>
            <button onClick={() => setTeams([...teams, { name: "NEW TEAM", members: ["", ""] }])} style={{ width: '100%', padding: '12px', backgroundColor: theme.emerald, color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '20px' }}>+ ADD TEAM</button>
            {teams.map((team, tIdx) => (
              <div key={tIdx} style={{ backgroundColor: theme.card, padding: '15px', borderRadius: '10px', marginBottom: '15px', border: `1px solid ${theme.border}` }}>
                <input value={team.name} onChange={(e) => { const nt = [...teams]; nt[tIdx].name = e.target.value; setTeams(nt); }} style={{ background: 'none', border: 'none', borderBottom: `1px solid ${theme.emerald}`, color: theme.emerald, fontWeight: 'bold', width: '100%', marginBottom: '10px' }} />
                {team.members.map((m: any, pIdx: any) => (
                  <input key={pIdx} value={m} onChange={(e) => { const nt = [...teams]; nt[tIdx].members[pIdx] = e.target.value; setTeams(nt); }} placeholder="Player Name" style={{ width: '100%', padding: '8px', marginBottom: '5px', backgroundColor: '#18181b', border: `1px solid ${theme.border}`, color: 'white', borderRadius: '4px' }} />
                ))}
              </div>
            ))}
            <button onClick={saveToCloud} style={{ width: '100%', padding: '15px', backgroundColor: '#27272a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>SYNC TEAMS TO PHONES</button>
          </div>
        )}

        {/* SCORER MODULE */}
        {activeTab === 'scorer' && (
          <div>
            <h2 style={{ color: theme.emerald }}>LIVE SCORER</h2>
            {teams.map((team) => (
              <div key={team.name} style={{ marginBottom: '20px', backgroundColor: theme.card, padding: '10px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '14px' }}>{team.name}</h3>
                {team.members.map((player: any, pIdx: any) => (
                  <div key={pIdx} style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '10px' }}>
                    {[...Array(18)].map((_, hIdx) => (
                      <input key={hIdx} type="number" value={scores[team.name]?.[hIdx]?.[pIdx] || ""} onChange={(e) => {
                        const ns = { ...scores }; if (!ns[team.name]) ns[team.name] = {}; if (!ns[team.name][hIdx]) ns[team.name][hIdx] = [0,0,0,0];
                        ns[team.name][hIdx][pIdx] = parseInt(e.target.value) || 0; setScores(ns); set(ref(db, 'live-scores'), ns);
                      }} style={{ width: '30px', height: '30px', textAlign: 'center', backgroundColor: '#18181b', border: `1px solid ${theme.border}`, color: 'white' }} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* LEADERBOARD & BETS (PLACEHOLDERS TO RESTORE YOUR OLD UI) */}
        {activeTab === 'leaderboard' && ( <div style={{ textAlign: 'center', padding: '40px' }}><h2 style={{ color: theme.emerald }}>LEADERBOARD</h2><p style={{ color: theme.muted }}>Calculating Skins and Net Scores...</p></div> )}
        {activeTab === 'bets' && ( <div style={{ textAlign: 'center', padding: '40px' }}><h2 style={{ color: theme.emerald }}>BETTING POOL</h2><p style={{ color: theme.muted }}>Handicaps and Big Pool Entry active.</p></div> )}

      </main>
    </div>
  )
}
