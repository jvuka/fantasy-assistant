'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth-status')
      .then(res => res.json())
      .then(data => {
        setIsConnected(data.authenticated);
      })
      .catch(err => console.error(err));
  }, []);

  const handleConnectYahoo = () => {
    window.location.href = '/api/yahoo/auth';
  };

  const handleLoadLeagues = async () => {
    try {
      const res = await fetch('/api/yahoo/leagues');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leagues');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array, got ' + typeof data);
      setLeagues(data);
    } catch (error) {
      console.error('Error loading leagues:', error);
    }
  };


  return (
    <main style={{padding: 24}}>
      <h1>Fantasy Assistant</h1>
      <p>Next.js is set up and running.</p>
      {!isConnected ? (
        <button onClick={handleConnectYahoo}>Connect Yahoo</button>
      ) : (
        <>
          <button onClick={handleLoadLeagues}>Load My Leagues</button>
          {leagues.length > 0 && (
            <div>
              <h2>Leagues</h2>
              {leagues.map((league: any) => (
                <button key={league.league_key} onClick={() => setTeams(league.teams)}>
                  {league.name}
                </button>
              ))}
            </div>
          )}
          {teams.length > 0 && (
            <div>
              <h2>Teams</h2>
              <ul>
                {teams.map((team: any) => (
                  <li key={team.team_key}>
                    {team.name} - {team.manager}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
