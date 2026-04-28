"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Scorer() {
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any>({});

  useEffect(() => {
    // 1. Listen for the TEAM LIST from the cloud
    const teamsRef = ref(db, 'tournament-teams');
    onValue(teamsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setTeams(data);
      } else {
        // Fallback: Check local memory if cloud is empty
        const localTeams = localStorage.getItem('final-teams');
        if (localTeams) {
          const parsed = JSON.parse(localTeams);
          setTeams(parsed);
          // Push local teams to cloud so the phone can see them
          set(ref(db, 'tournament-teams'), parsed);
        }
      }
    });

    // 2. Listen for the SCORES from the cloud
    const scoresRef = ref(db, 'live-scores');
    onValue(scoresRef, (snap) => {
      if (snap.val()) setScores(snap.val());
    });
  }, []);

  const updateScore = (teamName: string, holeIdx: number, playerIdx: number, val: string) => {
    const num = parseInt(val) || 0;
    const newScores = { ...scores };
    if (!newScores[teamName]) newScores[teamName] = {};
    if (!newScores[teamName][holeIdx]) newScores[teamName][holeIdx] = [0, 0, 0, 0];
    newScores[teamName][holeIdx][playerIdx] = num;
    
    // Save score to cloud
    set(ref(db, 'live-scores'), newScores);
  };

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
        ← BACK TO HUB
      </Link>
      
      <h1 style={{ color: '#10b981', marginTop: '20px', fontSize: '24px' }}>LIVE SCORER</h1>

      {teams.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #3f3f46', borderRadius: '8px', marginTop: '20px' }}>
          <p style={{ color: '#a1a1aa' }}>Waiting for Team Setup...</p>
          <p style={{ fontSize: '12px', color: '#71717a' }}>Open the Hub on your laptop to sync the players.</p>
        </div>
      ) : (
        teams.map((team: any) => (
          <div key={team.name} style={{ border: '1px solid #27272a', padding: '15px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#09090b' }}>
            <h2 style={{ color: '#10b981', marginBottom: '15px', fontSize: '18px' }}>{team.name}</h2>
            {team.members.map((playerName: string, pIdx: number) => (
              <div key={pIdx} style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '5px' }}>{playerName.toUpperCase()}</div>
                <div style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
                  {[...Array(18)].map((_, hIdx) => (
                    <input
                      key={hIdx}
                      type="number"
                      inputMode="numeric"
                      value={scores[team.name]?.[hIdx]?.[pIdx] || ""}
                      onChange={(e) => updateScore(team.name, hIdx, pIdx, e.target.value)}
                      style={{ width: '32px', height: '32px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: 'white', textAlign: 'center', borderRadius: '4px' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
