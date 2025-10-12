'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<{key: string, name: string} | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{key: string, name: string} | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const res = await fetch('/api/yahoo/leagues');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leagues');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array, got ' + typeof data);
      setLeagues(data);
      // Reset other states
      setTeams([]);
      setRoster([]);
      setSelectedLeague(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async (leagueKey: string, leagueName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/yahoo/teams/${leagueKey}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load teams');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setTeams(data);
      setSelectedLeague({key: leagueKey, name: leagueName});
      // Reset roster
      setRoster([]);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (teamKey: string, teamName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/yahoo/roster/${teamKey}?week=${selectedWeek}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roster');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setRoster(data);
      setSelectedTeam({key: teamKey, name: teamName});
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    if (selectedTeam) {
      loadRoster(selectedTeam.key, selectedTeam.name);
    }
  };

  const goBackToLeagues = () => {
    setTeams([]);
    setRoster([]);
    setSelectedLeague(null);
    setSelectedTeam(null);
  };

  const goBackToTeams = () => {
    setRoster([]);
    setSelectedTeam(null);
  };

  return (
    <main style={{padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif'}}>
      <h1 style={{color: '#003366', marginBottom: '8px'}}>Fantasy Assistant</h1>
      <p style={{color: '#666', marginBottom: '24px'}}>NHL Fantasy Hockey Helper</p>

      {/* Breadcrumbs */}
      {(selectedLeague || selectedTeam) && (
        <div style={{marginBottom: '16px', fontSize: '14px', color: '#666'}}>
          <span style={{cursor: 'pointer', color: '#0066cc'}} onClick={goBackToLeagues}>Leagues</span>
          {selectedLeague && (
            <>
              <span style={{margin: '0 8px'}}>›</span>
              <span style={{cursor: 'pointer', color: '#0066cc'}} onClick={goBackToTeams}>{selectedLeague.name}</span>
            </>
          )}
          {selectedTeam && (
            <>
              <span style={{margin: '0 8px'}}>›</span>
              <span style={{fontWeight: 'bold'}}>{selectedTeam.name}</span>
            </>
          )}
        </div>
      )}

      {loading && <div style={{padding: '16px', color: '#666'}}>Loading...</div>}

      {!isConnected ? (
        <button 
          onClick={handleConnectYahoo}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#400090',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Connect Yahoo
        </button>
      ) : (
        <>
          {!selectedLeague && (
            <button 
              onClick={handleLoadLeagues}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              Load My Leagues
            </button>
          )}

          {leagues.length > 0 && !selectedLeague && (
            <div style={{marginTop: '24px'}}>
              <h2 style={{marginBottom: '16px'}}>My Leagues</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {leagues.map((league: any) => (
                  <button 
                    key={league.league_key} 
                    onClick={() => loadTeams(league.league_key, league.name)}
                    style={{
                      padding: '16px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      color: '#003366',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#0066cc';
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    {league.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {teams.length > 0 && !selectedTeam && (
            <div style={{marginTop: '24px'}}>
              <h2 style={{marginBottom: '16px'}}>Teams in {selectedLeague?.name}</h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'}}>
                {teams.map((team: any) => (
                  <div 
                    key={team.team_key} 
                    onClick={() => loadRoster(team.team_key, team.name)}
                    style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#0066cc';
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{fontWeight: 'bold', fontSize: '16px', marginBottom: '4px'}}>{team.name}</div>
                    <div style={{fontSize: '14px', color: '#666'}}>Manager: {team.manager}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {roster.length > 0 && (
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h2 style={{margin: 0}}>Roster for {selectedTeam?.name}</h2>
                <div>
                  <label style={{marginRight: '8px', fontWeight: 'bold'}}>Week:</label>
                  <select 
                    value={selectedWeek} 
                    onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map(week => (
                      <option key={week} value={week}>Week {week}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#003366', color: 'white'}}>
                      <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Player Name</th>
                      <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Position</th>
                      <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>NHL Team</th>
                      <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Points</th>
                      <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Goals</th>
                      <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Assists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((player: any, index: number) => (
                      <tr 
                        key={index}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9f9f9';
                        }}
                      >
                        <td style={{padding: '12px', fontWeight: '500'}}>{player.name}</td>
                        <td style={{padding: '12px'}}>{player.position}</td>
                        <td style={{padding: '12px', color: '#666'}}>{player.nhl_team}</td>
                        <td style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{player.points}</td>
                        <td style={{padding: '12px', textAlign: 'center'}}>{player.goals}</td>
                        <td style={{padding: '12px', textAlign: 'center'}}>{player.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
