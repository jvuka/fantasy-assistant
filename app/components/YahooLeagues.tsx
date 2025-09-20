'use client';

console.log('YahooLeagues component is being imported/rendered');

import { useEffect, useState } from 'react';

interface League {
  key: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

export default function YahooLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('YahooLeagues component mounted');
    const storedLeagueKey = localStorage.getItem('selectedLeagueKey');
    if (storedLeagueKey) {
      console.log('Found stored league key:', storedLeagueKey);
      setSelectedLeague(storedLeagueKey);
      fetchTeams(storedLeagueKey);
    }

    console.log('Attempting to fetch leagues from /api/yahoo/leagues');
    fetch('/api/yahoo/leagues')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Leagues API response:', data);
        setLeagues(data);
      })
      .catch((err) => {
        console.error('Leagues fetch error:', err);
        setError(err.message);
      });
  }, []);

  const fetchTeams = (leagueKey: string) => {
    console.log('Attempting to fetch teams for league:', leagueKey);
    fetch(`/api/yahoo/team?leagueKey=${leagueKey}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Teams API response:', data);
        setTeams(data);
      })
      .catch((err) => {
        console.error('Teams fetch error:', err);
        setError(err.message);
      });
  };

  const handleLeagueClick = (leagueKey: string) => {
    setSelectedLeague(leagueKey);
    localStorage.setItem('selectedLeagueKey', leagueKey);
    fetchTeams(leagueKey);
  };

  const handleConnectYahoo = () => {
    const origin = window.location.origin;
    window.location.href = `/api/yahoo/auth?origin=${encodeURIComponent(origin)}`;
  };

  console.log('Rendering YahooLeagues component');
  return (
    <div>
      <button onClick={handleConnectYahoo} style={{ display: 'block', width: '100%', textAlign: 'center', backgroundColor: 'blue', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', marginBottom: '16px' }}>
        Connect Yahoo
      </button>
      {error && <p style={{ color: 'red', marginBottom: '16px' }}>Could not fetch leagues. Please connect your Yahoo account.</p>}
      {leagues.length > 0 && (
        <div>
          <h2>Your Leagues</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {leagues.map((league) => (
              <li key={league.key} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => handleLeagueClick(league.key)}
                  style={{
                    backgroundColor: selectedLeague === league.key ? 'lightblue' : 'lightgray',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  {league.name}
                </button>
              </li>
            ))}
          </ul>
          {teams.length > 0 && (
            <div>
              <h3>Teams in League</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {teams.map((team) => (
                  <li key={team.id} style={{ marginBottom: '4px' }}>
                    {team.name} (ID: {team.id})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {leagues.length === 0 && !error && <p>Loading leagues...</p>}
    </div>
  );
}