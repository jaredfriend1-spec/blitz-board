"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { db } from './lib/firebase'
import { ref, set, onValue } from 'firebase/database'

export default function Home() {
  const [teams, setTeams] = useState<any[]>([])
  const [showSetup, setShowSetup] = useState(false)

  // Load teams from Cloud and LocalStorage
  useEffect(() => {
    const teamsRef = ref(db, 'tournament-teams')
    onValue(teamsRef, (snap) => {
      if (snap.val()) setTeams(snap.val())
    })
  }, [])

  const addTeam = () => {
    setTeams([...teams, { name: `TEAM ${teams.length + 1}`, members: [""] }])
  }

  const updateTeamName = (index: number, name: string) => {
    const newTeams = [...teams]
    newTeams[index].name = name
    setTeams(newTeams)
  }

  const addPlayer = (tIdx: number) => {
    const newTeams = [...teams]
    newTeams[tIdx].members.push("")
    setTeams(newTeams)
  }

  const updatePlayer = (tIdx: number, pIdx: number, name: string) => {
    const newTeams = [...teams]
    newTeams[tIdx].members[pIdx] = name
    setTeams(newTeams)
  }

  const saveTournament = () => {
    // Save to Laptop's memory
    localStorage.setItem('final-teams', JSON.stringify(teams))
    // Save to the Cloud for the phones to see
    set(ref(db, 'tournament-teams'), teams)
    alert("TOURNAMENT SYNCED TO CLOUD!")
    setShowSetup(false)
  }

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh', padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#10b981', fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>BLITZ BOARD</h1>
      <p style={{ color: '#71717a', letterSpacing: '2px', marginBottom: '40px' }}>LIVE TOURNAMENT ENGINE</p>

      {!showSetup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '350px', margin: '0 auto' }}>
          <Link href="/scorer" style={{ border: '2px solid #10b981', color: '#10b981', padding: '18px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>
            ENTER SCORES / VIEW BOARD
          </Link>
          
          <button 
            onClick={() => setShowSetup(true)}
            style={{ background: 'none', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}
          >
            MANAGE TEAMS & PLAYERS
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left', backgroundColor: '#09090b', padding: '20px', borderRadius: '15px', border: '1px solid #27272a' }}>
          <h2 style={{ color: '#10b981', marginBottom: '20px' }}>TOURNAMENT SETUP</h2>
          
          {teams.map((team, tIdx) => (
            <div key={tIdx} style={{ marginBottom: '30px', borderBottom: '1px solid #18181b', paddingBottom: '20px' }}>
              <input 
                value={team.name} 
                onChange={(e) => updateTeamName(tIdx, e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #10b981', color: '#10b981', fontSize: '20px', fontWeight: 'bold', width: '100%', marginBottom: '15px' }}
              />
              {team.members.map((m: string, pIdx: number) => (
                <input 
                  key={pIdx}
                  placeholder="Player Name"
                  value={m}
                  onChange={(e) => updatePlayer(tIdx, pIdx, e.target.value)}
                  style={{ width: '100%', padding: '10px', marginBottom: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: 'white', borderRadius: '6px' }}
                />
              ))}
              <button onClick={() => addPlayer(tIdx)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>+ ADD PLAYER</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={addTeam} style={{ flex: 1, padding: '12px', backgroundColor: '#27272a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>+ ADD TEAM</button>
            <button onClick={saveTournament} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>SYNC & SAVE</button>
          </div>
          <button onClick={() => setShowSetup(false)} style={{ width: '100%', marginTop: '15px', color: '#71717a', background: 'none', border: 'none' }}>CANCEL</button>
        </div>
      )}

      <p style={{ marginTop: '60px', color: '#3f3f46', fontSize: '12px' }}>MCC SPECIAL EDITION • 2026</p>
    </div>
  )
}
