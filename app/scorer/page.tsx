"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Scorer() {
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any>({});

  useEffect(() => {
    // Load the teams you set up on your laptop
    const t = localStorage.getItem('final-teams');
    if (t) setTeams(JSON.parse(t));

    // Listen for live score updates from the cloud
    const scoresRef = ref(db, 'live-scores');
    return onValue(scoresRef, (snap) => {
      if (snap.val()) setScores(snap.val());
    });
  }, []);

  const updateScore = (teamName: string, holeIdx: number, playerIdx: number, val: string) => {
    const num = parseInt(val) || 0;
    const newScores = { ...scores };
    
    if (!newScores[teamName]) newScores[teamName] = {};
    if (!newScores[teamName][holeIdx]) newScores[teamName][holeIdx] = [0, 0, 0, 0];
    
    newScores[teamName][holeIdx][playerIdx] = num;
    
    // Push the new score to the cloud immediately
    set(ref(db, 'live-scores'), newScores);
  };

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
        ← BACK TO HUB
      </Link>
      
      <h1 style={{ color: '#10b981', marginTop: '20px', fontSize: '24px' }}>LIVE SCORER</h1>
      <p style={{ color: '#71717a', fontSize: '12px', marginBottom: '30px' }}>TAP A BOX TO ENTER STROKES</p>

      {teams.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #3f3f46', borderRadius: '8px' }}>
          <p>No teams found. Go to the Hub to set up your tournament.</p>
        </div>
      )}

      {teams.map((team: any) => (
        <div key={team.name} style={{ border: '1px solid #27272a', padding: '15px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#09090b' }}>
          <h2 style={{ color: '#10b981', marginBottom: '15px', fontSize: '18px', textTransform: 'uppercase' }}>{team.name}</h2>
          
          {team.members.map((playerName: string, pIdx: number) => (
            <div key={pIdx} style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '5px', fontWeight: 'bold' }}>
                {playerName.toUpperCase() || `PLAYER ${pIdx + 1}`}
              </div>
              
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
                {[...Array(18)].map((_, hIdx) => (
                  <div key={hIdx} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#52525b', marginBottom: '2px' }}>{hIdx + 1}</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={scores[team.name]?.[hIdx]?.[pIdx] || ""}
                      onChange={(e) => updateScore(team.name, hIdx, pIdx, e.target.value)}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        backgroundColor: '#18181b', 
                        border: '1px solid #3f3f46', 
                        color: 'white', 
                        textAlign: 'center', 
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
