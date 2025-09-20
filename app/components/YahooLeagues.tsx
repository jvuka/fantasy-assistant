'use client';

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
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedLeagueKey = localStorage.getItem('selectedLeagueKey');
    if (storedLeagueKey) {
      setSelectedLeague(storedLeagueKey);
      fetchTeam(storedLeagueKey);
    }

    fetch('/api/yahoo/leagues')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        return res.json();
      })
      .then(setLeagues)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  const fetchTeam = (leagueKey: string) => {
    fetch(`/api/yahoo/team?leagueKey=${leagueKey}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        return res.json();
      })
      .then(setTeam)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  };

  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const leagueKey = event.target.value;
    setSelectedLeague(leagueKey);
    localStorage.setItem('selectedLeagueKey', leagueKey);
    fetchTeam(leagueKey);
  };

  if (error) {
    return (
      <div>
        <p>Could not fetch leagues. Please connect your Yahoo account.</p>
        <a href="/api/yahoo/auth">
          <button>Connect Yahoo</button>
        </a>
      </div>
    );
  }

  if (leagues.length === 0) {
    return <p>Loading leagues...</p>;
  }

  return (
    <div>
      <h2>Your Leagues</h2>
      <select onChange={handleLeagueChange} value={selectedLeague || ''}>
        <option value="" disabled>Select a league</option>
        {leagues.map((league) => (
          <option key={league.key} value={league.key}>
            {league.name}
          </option>
        ))}
      </select>
      {team && (
        <div>
          <h3>Your Team</h3>
          <p>ID: {team.id}</p>
          <p>Name: {team.name}</p>
        </div>
      )}
    </div>
  );
}