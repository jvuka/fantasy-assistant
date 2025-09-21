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
      const response = await fetch('/api/yahoo/leagues');
      if (response.status === 401) {
        setIsConnected(false);
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array, got ' + typeof data);
      // Assuming structure: data.fantasy_content.users.user.games.game.leagues.league
      const leaguesData = data.fantasy_content.users.user.games.game.leagues.league;
      const leaguesArray = Array.isArray(leaguesData) ? leaguesData : [leaguesData];
      setLeagues(leaguesArray);
    } catch (error) {
      console.error('Error loading leagues:', error);
    }
  };

  const handleLoadTeams = async (league_key: string) => {
    try {
      const response = await fetch(`/api/yahoo/teams?league_key=${league_key}`);
      if (response.status === 401) {
        setIsConnected(false);
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array, got ' + typeof data);
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
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
                <button key={league.league_key} onClick={() => handleLoadTeams(league.league_key)}>
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
