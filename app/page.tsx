"use client"
import React, { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { ref, set, onValue } from 'firebase/database'

export default function BlitzBoardPro() {
  const [activeTab, setActiveTab] = useState('board')
  const [teams, setTeams] = useState<any[]>([])
  const [scores, setScores] = useState<any>({})

  useEffect(() => {
    onValue(ref(db, 'tournament-teams'), (snap) => { if (snap.val()) setTeams(snap.val()) })
    onValue(ref(db, 'live-scores'), (snap) => { if (snap.val()) setScores(snap.val()) })
  }, [])

  const saveTeams = () => {
    set(ref(db, 'tournament-teams'), teams)
    alert("TEAMS SYNCED TO CLOUD")
  }

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh' }}>
      {/* HEADER AREA */}
      <div style={{ padding: '40px 20px', textAlign: 'center', background: 'linear-gradient(to bottom, #064e3b, black)' }}>
        <h1 style={{ color: '#10b981', fontSize: '36px', fontWeight: '900', letterSpacing: '-1px' }}>BLITZ BOARD</h1>
        <div style={{ color: '#71717a', fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase' }}>MCC SPECIAL EDITION</div>
      </div>

      {/* PRO NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: '1px solid #27272a', position: 'sticky', top: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        {['BOARD', 'SCORER', 'SETUP', 'BETS'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t.toLowerCase())} style={{ flex: 1, padding: '16px', background: 'none', border: 'none', color: activeTab === t.toLowerCase() ? '#10b981' : '#52525b', fontWeight: 'bold', borderBottom: activeTab === t.toLowerCase() ? '3px solid #10b981' : 'none', cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      <main style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {activeTab === 'board' && (
          <div>
            <h2 style={{ fontSize: '14px', color: '#71717a', marginBottom: '20px' }}>LIVE LEADERBOARD</h2>
            {teams.map((team) => (
              <div key={team.name} style={{ background: '#09090b', border: '1px solid #27272a', padding: '15px', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{team.name}</div>
                  <div style={{ fontSize: '10px', color: '#71717a' }}>{team.members.join(', ')}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>-4</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'setup' && (
          <div>
            <h2 style={{ color: '#10b981' }}>TOURNAMENT CONFIG</h2>
            <button onClick={() => setTeams([...teams, { name: "NEW TEAM", members: ["", ""] }])} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'black', fontWeight: 'bold', borderRadius: '8px', border: 'none', marginBottom: '20px' }}>+ ADD TEAM</button>
            {teams.map((team, tIdx) => (
              <div key={tIdx} style={{ background: '#09090b', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #27272a' }}>
                <input value={team.name} onChange={(e) => { const nt = [...teams]; nt[tIdx].name = e.target.value; setTeams(nt); }} style={{ background: 'none', border: 'none', borderBottom: '1px solid #10b981', color: '#10b981', width: '100%', marginBottom: '10px', fontWeight: 'bold' }} />
                {team.members.map((m: any, pIdx: any) => (
                  <input key={pIdx} value={m} onChange={(e) => { const nt = [...teams]; nt[tIdx].members[pIdx] = e.target.value; setTeams(nt); }} placeholder="Player Name" style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', color: 'white', borderRadius: '6px', marginBottom: '5px' }} />
                ))}
              </div>
            ))}
            <button onClick={saveTeams} style={{ width: '100%', padding: '15px', background: '#27272a', color: 'white', borderRadius: '8px', border: 'none' }}>SYNC ALL DEVICES</button>
          </div>
        )}
      </main>
    </div>
  )
}
