'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);

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

  const loadTeams = async (leagueKey: string) => {
    try {
      const res = await fetch(`/api/yahoo/teams/${leagueKey}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load teams');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadRoster = async (teamKey: string) => {
    try {
      const res = await fetch(`/api/yahoo/roster/${teamKey}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roster');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setRoster(data);
    } catch (error) {
      console.error('Error loading roster:', error);
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
                <button key={league.league_key} onClick={() => loadTeams(league.league_key)}>
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
                  <li key={team.team_key} onClick={() => loadRoster(team.team_key)} style={{cursor: 'pointer'}}>
                    {team.name} - {team.manager}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {roster.length > 0 && (
            <div>
              <h2>Roster</h2>
              <table>
                <thead>
                  <tr>
                    <th>Player Name</th>
                    <th>Position</th>
                    <th>NHL Team</th>
                    <th>Points</th>
                    <th>Goals</th>
                    <th>Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((player: any, index: number) => (
                    <tr key={index}>
                      <td>{player.name}</td>
                      <td>{player.position}</td>
                      <td>{player.nhl_team}</td>
                      <td>{player.points}</td>
                      <td>{player.goals}</td>
                      <td>{player.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
