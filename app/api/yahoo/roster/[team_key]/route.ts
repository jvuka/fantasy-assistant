import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';

export async function GET(req: NextRequest, { params }: { params: { team_key: string } }) {
  const session = await getSession();

  if (!session || !session.expires_at || Date.now() > session.expires_at) {
    return NextResponse.json({ error: "Token expired, please login again" }, { status: 401 });
  }

  const access_token = session.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  // Get week parameter from query string (optional)
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');

  try {
    // Fetch team roster
    const rosterResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${params.team_key}/roster?format=json`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!rosterResponse.ok) {
      return NextResponse.json({ error: rosterResponse.statusText, status: rosterResponse.status }, { status: rosterResponse.status });
    }

    let rosterData;
    try {
      rosterData = await rosterResponse.json();
      console.log('Roster raw response:', JSON.stringify(rosterData, null, 2));
      if (!rosterData?.fantasy_content?.team) {
        throw new Error('Missing fantasy_content.team in roster response');
      }
      // Parse player keys and selected positions - team is an array with [metadata, roster]
      const teamArray = rosterData.fantasy_content.team;
      const roster = teamArray[1]?.roster?.["0"]?.players;
      if (!roster) {
        throw new Error('No roster found in response');
      }
      const playerKeys = [];
      const playerPositions = new Map(); // Map player_key to selected_position
      for (const key of Object.keys(roster || {}).filter(key => key !== 'count')) {
        const playerData = roster[key];
        // player is an array where player[0] is itself an array of player info objects
        const playerKey = playerData?.player?.[0]?.[0]?.player_key;
        const selectedPosition = playerData?.player?.[1]?.selected_position?.[1]?.position || 'Unknown';
        if (playerKey) {
          playerKeys.push(playerKey);
          playerPositions.set(playerKey, selectedPosition);
        }
      }
      if (playerKeys.length === 0) {
        return NextResponse.json([]);
      }

      // Fetch player stats - use current season
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-11
      // NHL season starts in October (month 9), so if we're past September, use current year
      const season = currentMonth >= 9 ? currentYear : currentYear - 1;
      
      const playerKeysStr = playerKeys.join(',');
      // Build stats URL - if week is provided, get weekly stats, otherwise season stats
      let statsUrl;
      if (week) {
        statsUrl = `https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${playerKeysStr}/stats;type=week;week=${week}?format=json`;
      } else {
        statsUrl = `https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${playerKeysStr}/stats;type=season;season=${season}?format=json`;
      }
      const statsResponse = await fetch(statsUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!statsResponse.ok) {
        return NextResponse.json({ error: statsResponse.statusText, status: statsResponse.status }, { status: statsResponse.status });
      }

      let statsData;
      try {
        statsData = await statsResponse.json();
        console.log('Stats raw response:', JSON.stringify(statsData, null, 2));
        if (!statsData?.fantasy_content?.players) {
          throw new Error('Missing fantasy_content.players in stats response');
        }
        const players = statsData.fantasy_content.players;
        const result = [];
        for (const key of Object.keys(players || {}).filter(key => key !== 'count')) {
          const playerData = players[key];
          const playerInfoArray = playerData?.player?.[0]; // This is an array of objects
          const playerStats = playerData?.player?.[1]?.player_stats;
          
          if (playerInfoArray) {
            // Find the specific objects in the array by searching for known keys
            let name = 'Unknown';
            let position = 'Unknown';
            let nhl_team = 'Unknown';
            let player_key = '';
            
            for (const obj of playerInfoArray) {
              if (obj.name) name = obj.name.full || 'Unknown';
              // In stats response, use display_position instead of primary_position
              if (obj.display_position) position = obj.display_position;
              if (obj.editorial_team_abbr) nhl_team = obj.editorial_team_abbr;
              if (obj.player_key) player_key = obj.player_key;
            }
            
            // Parse stats - handle both weekly and season stats format
            // Detect if player is a goalie
            const isGoalie = position === 'G';
            
            const stats: any = {
              goals: 0,
              assists: 0,
              points: 0,
              ppp: 0,
              hits: 0,
              plus_minus: 0,
              wins: 0,
              gaa: 0,
              sv_pct: 0
            };
            
            if (playerStats && playerStats.stats) {
              console.log(`Stats for ${name}:`, JSON.stringify(playerStats.stats));
              for (const stat of playerStats.stats) {
                const statId = stat.stat.stat_id;
                const value = stat.stat.value;
                
                // Player stats
                if (statId === '2') stats.goals = parseInt(value) || 0; // Goals
                else if (statId === '3') stats.assists = parseInt(value) || 0; // Assists
                else if (statId === '4') stats.points = parseFloat(value) || 0; // Fantasy Points
                else if (statId === '13') stats.ppp = parseInt(value) || 0; // Power Play Points
                else if (statId === '31') stats.hits = parseInt(value) || 0; // Hits
                else if (statId === '28') stats.plus_minus = parseInt(value) || 0; // Plus/Minus
                
                // Goalie stats
                else if (statId === '22') stats.wins = parseInt(value) || 0; // Wins
                else if (statId === '23') stats.gaa = parseFloat(value) || 0; // Goals Against Average
                else if (statId === '24') stats.sv_pct = parseFloat(value) || 0; // Save Percentage
              }
            }
            
            // Get selected position (lineup spot) for this player
            const selected_position = playerPositions.get(player_key) || 'Unknown';
            const is_benched = selected_position === 'BN';
            
            result.push({
              name,
              position,
              nhl_team,
              is_goalie: isGoalie,
              goals: stats.goals,
              assists: stats.assists,
              points: stats.points,
              ppp: stats.ppp,
              hits: stats.hits,
              plus_minus: stats.plus_minus,
              wins: stats.wins,
              gaa: stats.gaa,
              sv_pct: stats.sv_pct,
              selected_position,
              is_benched,
            });
          }
        }
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error parsing stats:', error, error instanceof Error ? error.stack : 'No stack', 'Partial data:', statsData ? JSON.stringify(statsData).slice(0, 500) : 'No data');
        return NextResponse.json({ error: 'Failed to parse stats data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
      }
    } catch (error) {
      console.error('Error parsing roster:', error, error instanceof Error ? error.stack : 'No stack', 'Partial data:', rosterData ? JSON.stringify(rosterData).slice(0, 500) : 'No data');
      return NextResponse.json({ error: 'Failed to parse roster data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching roster or stats:', error);
    return NextResponse.json({ error: 'Failed to fetch roster or stats' }, { status: 500 });
  }
}