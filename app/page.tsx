'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [scoreboard, setScoreboard] = useState<any[]>([]);
  const [matchup, setMatchup] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [playersTotal, setPlayersTotal] = useState<number>(0);
  const [playersPage, setPlayersPage] = useState<number>(0);
  const [selectedLeague, setSelectedLeague] = useState<{key: string, name: string} | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{key: string, name: string} | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [view, setView] = useState<'teams' | 'roster' | 'scoreboard' | 'matchup' | 'players'>('teams');
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
      setScoreboard([]);
      setMatchup(null);
      setSelectedLeague(null);
      setSelectedTeam(null);
      setView('teams');
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
      // Reset other views
      setRoster([]);
      setScoreboard([]);
      setMatchup(null);
      setSelectedTeam(null);
      setView('teams');
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (teamKey: string, teamName: string, week?: number) => {
    setLoading(true);
    try {
      const url = week ? `/api/yahoo/roster/${teamKey}?week=${week}` : `/api/yahoo/roster/${teamKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roster');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setRoster(data);
      setSelectedTeam({key: teamKey, name: teamName});
      setView('roster');
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScoreboard = async (week?: number) => {
    if (!selectedLeague) return;
    setLoading(true);
    const weekNum = week || selectedWeek;
    try {
      const res = await fetch(`/api/yahoo/scoreboard/${selectedLeague.key}?week=${weekNum}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load scoreboard');
      if (!Array.isArray(data)) throw new Error('Invalid data: expected array');
      setScoreboard(data);
      setView('scoreboard');
    } catch (error) {
      console.error('Error loading scoreboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchup = async (week?: number) => {
    if (!selectedTeam) return;
    setLoading(true);
    const weekNum = week || selectedWeek;
    try {
      const res = await fetch(`/api/yahoo/matchup/${selectedTeam.key}?week=${weekNum}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load matchup');
      setMatchup(data);
      setView('matchup');
    } catch (error) {
      console.error('Error loading matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async (page: number = 0) => {
    if (!selectedLeague) return;
    setLoading(true);
    const start = page * 25;
    try {
      const res = await fetch(`/api/yahoo/players/${selectedLeague.key}?start=${start}&count=25`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load players');
      // Store both players and goalies
      setPlayers(data.players || []);
      setPlayersTotal(data.total || 0);
      setPlayersPage(page);
      setView('players');
      // Store goalies in the matchup state temporarily (we'll use a separate state later if needed)
      setMatchup({ ...matchup, goalies: data.goalies || [] });
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    if (view === 'roster' && selectedTeam) {
      loadRoster(selectedTeam.key, selectedTeam.name, week);
    } else if (view === 'scoreboard') {
      loadScoreboard(week);
    } else if (view === 'matchup') {
      loadMatchup(week);
    }
  };

  const goBackToLeagues = () => {
    setTeams([]);
    setRoster([]);
    setScoreboard([]);
    setMatchup(null);
    setPlayers([]);
    setSelectedLeague(null);
    setSelectedTeam(null);
    setView('teams');
  };

  const goBackToTeams = () => {
    setRoster([]);
    setScoreboard([]);
    setMatchup(null);
    setPlayers([]);
    setSelectedTeam(null);
    setView('teams');
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
          {view === 'scoreboard' && (
            <>
              <span style={{margin: '0 8px'}}>›</span>
              <span style={{fontWeight: 'bold'}}>Head to Head</span>
            </>
          )}
          {view === 'matchup' && (
            <>
              <span style={{margin: '0 8px'}}>›</span>
              <span style={{fontWeight: 'bold'}}>Matchup</span>
            </>
          )}
          {view === 'players' && (
            <>
              <span style={{margin: '0 8px'}}>›</span>
              <span style={{fontWeight: 'bold'}}>Available Players</span>
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

          {/* Teams View */}
          {view === 'teams' && teams.length > 0 && (
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h2 style={{margin: 0}}>Teams in {selectedLeague?.name}</h2>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => loadPlayers(0)}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Players
                  </button>
                  <button
                    onClick={() => loadScoreboard()}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Head to Head
                  </button>
                </div>
              </div>
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

          {/* Roster View */}
          {view === 'roster' && roster.length > 0 && (
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px'}}>
                <h2 style={{margin: 0}}>Roster for {selectedTeam?.name}</h2>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <button
                    onClick={() => loadMatchup()}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Head to Head
                  </button>
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

          {/* Scoreboard View */}
          {view === 'scoreboard' && (
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h2 style={{margin: 0}}>Head to Head - {selectedLeague?.name}</h2>
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
                      <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Matchup</th>
                      <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboard.map((matchup: any, index: number) => (
                      <tr 
                        key={index}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9'
                        }}
                      >
                        <td style={{padding: '12px'}}>
                          <div style={{fontWeight: '500'}}>{matchup.team1}</div>
                          <div style={{fontSize: '14px', color: '#666', marginTop: '4px'}}>vs</div>
                          <div style={{fontWeight: '500', marginTop: '4px'}}>{matchup.team2}</div>
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          <div style={{fontSize: '18px', fontWeight: 'bold', color: matchup.team1_points > matchup.team2_points ? '#28a745' : '#003366'}}>
                            {matchup.team1_points}
                          </div>
                          <div style={{fontSize: '14px', color: '#666', margin: '4px 0'}}>-</div>
                          <div style={{fontSize: '18px', fontWeight: 'bold', color: matchup.team2_points > matchup.team1_points ? '#28a745' : '#003366'}}>
                            {matchup.team2_points}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matchup Detail View */}
          {view === 'matchup' && matchup && (
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h2 style={{margin: 0}}>Head to Head Matchup - Week {matchup.week}</h2>
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
              
              {/* Matchup Score Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '24px',
                backgroundColor: '#003366',
                color: 'white',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '8px'}}>{matchup.team1.name}</div>
                  <div style={{fontSize: '36px', fontWeight: 'bold'}}>{matchup.team1.points}</div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', fontSize: '24px', fontWeight: 'bold'}}>VS</div>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '8px'}}>{matchup.team2.name}</div>
                  <div style={{fontSize: '36px', fontWeight: 'bold'}}>{matchup.team2.points}</div>
                </div>
              </div>

              {/* Side-by-side Rosters */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                {/* Team 1 Roster */}
                <div>
                  <h3 style={{marginBottom: '12px', color: '#003366'}}>{matchup.team1.name} Roster</h3>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{backgroundColor: '#003366', color: 'white'}}>
                        <th style={{padding: '6px', textAlign: 'left', fontSize: '12px'}}>Player</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>Pos</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>G</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>A</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>P</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>PPP</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>HIT</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchup.team1.roster.map((player: any, index: number) => (
                        <tr
                          key={index}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: player.is_benched ? '#f5f5f5' : 'white',
                            opacity: player.is_benched ? 0.6 : 1
                          }}
                        >
                          <td style={{padding: '6px', fontSize: '12px'}}>
                            {player.name}
                            {player.is_benched && <span style={{marginLeft: '4px', fontSize: '10px', color: '#666', fontStyle: 'italic'}}>(BN)</span>}
                          </td>
                          <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.position}</td>
                          {player.is_goalie ? (
                            <>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={2}>{player.wins}W</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={2}>{player.gaa?.toFixed(2)}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={3}>{player.sv_pct?.toFixed(3)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.goals || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.assists || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold'}}>{player.points || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.ppp || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.hits || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.plus_minus > 0 ? '+' : ''}{player.plus_minus || 0}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Team 2 Roster */}
                <div>
                  <h3 style={{marginBottom: '12px', color: '#003366'}}>{matchup.team2.name} Roster</h3>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{backgroundColor: '#003366', color: 'white'}}>
                        <th style={{padding: '6px', textAlign: 'left', fontSize: '12px'}}>Player</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>Pos</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>G</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>A</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>P</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>PPP</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>HIT</th>
                        <th style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchup.team2.roster.map((player: any, index: number) => (
                        <tr
                          key={index}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: player.is_benched ? '#f5f5f5' : 'white',
                            opacity: player.is_benched ? 0.6 : 1
                          }}
                        >
                          <td style={{padding: '6px', fontSize: '12px'}}>
                            {player.name}
                            {player.is_benched && <span style={{marginLeft: '4px', fontSize: '10px', color: '#666', fontStyle: 'italic'}}>(BN)</span>}
                          </td>
                          <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.position}</td>
                          {player.is_goalie ? (
                            <>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={2}>{player.wins}W</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={2}>{player.gaa?.toFixed(2)}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}} colSpan={3}>{player.sv_pct?.toFixed(3)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.goals || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.assists || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold'}}>{player.points || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.ppp || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.hits || 0}</td>
                              <td style={{padding: '6px', textAlign: 'center', fontSize: '12px'}}>{player.plus_minus > 0 ? '+' : ''}{player.plus_minus || 0}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Players View */}
          {view === 'players' && (
            <div style={{marginTop: '24px'}}>
              {/* Players Table */}
              <div style={{marginBottom: '32px'}}>
                <h2 style={{marginBottom: '16px'}}>Available Players - {selectedLeague?.name}</h2>
                <div style={{overflowX: 'auto'}}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <thead>
                      <tr style={{backgroundColor: '#003366', color: 'white'}}>
                        <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Player Name</th>
                        <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Position</th>
                        <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>NHL Team</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>GP</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>G</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>A</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>P</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>PPP</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>HIT</th>
                        <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player: any, index: number) => (
                        <tr
                          key={player.player_id}
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
                          <td style={{padding: '10px', fontWeight: '500'}}>{player.name}</td>
                          <td style={{padding: '10px'}}>{player.position}</td>
                          <td style={{padding: '10px', color: '#666'}}>{player.nhl_team}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.games_played}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.goals}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.assists}</td>
                          <td style={{padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{player.points}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.ppp}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.hits}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{player.plus_minus > 0 ? '+' : ''}{player.plus_minus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top 10 Goalies Table */}
              {matchup?.goalies && matchup.goalies.length > 0 && (
                <div style={{marginBottom: '32px'}}>
                  <h2 style={{marginBottom: '16px'}}>Top 10 Goalies</h2>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <thead>
                        <tr style={{backgroundColor: '#003366', color: 'white'}}>
                          <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Goalie Name</th>
                          <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>NHL Team</th>
                          <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>GP</th>
                          <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>W</th>
                          <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>GAA</th>
                          <th style={{padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>SV%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchup.goalies.map((goalie: any, index: number) => (
                          <tr
                            key={goalie.player_id}
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
                            <td style={{padding: '10px', fontWeight: '500'}}>{goalie.name}</td>
                            <td style={{padding: '10px', color: '#666'}}>{goalie.nhl_team}</td>
                            <td style={{padding: '10px', textAlign: 'center'}}>{goalie.games_played}</td>
                            <td style={{padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{goalie.wins}</td>
                            <td style={{padding: '10px', textAlign: 'center'}}>{goalie.gaa?.toFixed(2)}</td>
                            <td style={{padding: '10px', textAlign: 'center'}}>{goalie.sv_pct?.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Pagination */}
              <div style={{marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{color: '#666'}}>
                  Showing {playersPage * 25 + 1}-{Math.min((playersPage + 1) * 25, playersTotal)} of {playersTotal} players
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => loadPlayers(playersPage - 1)}
                    disabled={playersPage === 0}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: playersPage === 0 ? '#ccc' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: playersPage === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadPlayers(playersPage + 1)}
                    disabled={(playersPage + 1) * 25 >= playersTotal}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: (playersPage + 1) * 25 >= playersTotal ? '#ccc' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (playersPage + 1) * 25 >= playersTotal ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
