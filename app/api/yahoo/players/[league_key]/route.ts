import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';

export async function GET(req: NextRequest, { params }: { params: { league_key: string } }) {
  const session = await getSession();

  if (!session || !session.expires_at || Date.now() > session.expires_at) {
    return NextResponse.json({ error: "Token expired, please login again" }, { status: 401 });
  }

  const access_token = session.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  // Get pagination parameters from query string
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || '0';
  const count = searchParams.get('count') || '25';

  try {
    // Fetch available players (free agents) for the league
    const playersResponse = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${params.league_key}/players;status=A;start=${start};count=${count}/stats?format=json`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!playersResponse.ok) {
      return NextResponse.json({ error: playersResponse.statusText, status: playersResponse.status }, { status: playersResponse.status });
    }

    let playersData;
    try {
      playersData = await playersResponse.json();
      console.log('Available players raw response:', JSON.stringify(playersData, null, 2));
      
      if (!playersData?.fantasy_content?.league) {
        throw new Error('Missing fantasy_content.league in players response');
      }

      const leagueArray = playersData.fantasy_content.league;
      let players = null;

      // Find the players in the league array
      for (const item of leagueArray) {
        if (item.players) {
          players = item.players;
          break;
        }
      }

      if (!players) {
        return NextResponse.json({ players: [], total: 0 });
      }

      const result = [];
      for (const key of Object.keys(players).filter(key => key !== 'count')) {
        const playerData = players[key];
        if (!playerData || !playerData.player) continue;

        const playerArray = playerData.player;
        const playerInfo = playerArray[0]; // Array of player info objects
        const playerStats = playerArray[1]; // Stats object

        if (!Array.isArray(playerInfo)) continue;

        // Extract player information
        let name = 'Unknown';
        let player_id = '';
        let position = 'Unknown';
        let nhl_team = 'Unknown';
        let uniform_number = '';
        let image_url = '';
        let status = '';
        let editorial_rank = 0;
        
        for (const obj of playerInfo) {
          if (obj.name) name = obj.name.full || 'Unknown';
          if (obj.player_id) player_id = obj.player_id;
          if (obj.display_position) position = obj.display_position;
          if (obj.editorial_team_abbr) nhl_team = obj.editorial_team_abbr;
          if (obj.uniform_number) uniform_number = obj.uniform_number;
          if (obj.image_url) image_url = obj.image_url;
          if (obj.status) status = obj.status;
        }

        // Extract editorial rank (Yahoo's season rank)
        if (playerStats && playerStats.player_points) {
          editorial_rank = parseInt(playerStats.player_points.season) || 0;
        }

        // Detect if player is a goalie
        const isGoalie = position === 'G';

        // Extract season stats
        const stats: any = {
          games_played: 0,
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
        
        if (playerStats && playerStats.player_stats && playerStats.player_stats.stats) {
          for (const stat of playerStats.player_stats.stats) {
            const statId = stat.stat.stat_id;
            const value = stat.stat.value;
            
            if (statId === '0') stats.games_played = parseInt(value) || 0; // Games Played
            else if (statId === '2') stats.goals = parseInt(value) || 0; // Goals
            else if (statId === '3') stats.assists = parseInt(value) || 0; // Assists
            else if (statId === '4') stats.points = parseFloat(value) || 0; // Fantasy Points
            else if (statId === '13') stats.ppp = parseInt(value) || 0; // Power Play Points
            else if (statId === '31') stats.hits = parseInt(value) || 0; // Hits
            else if (statId === '28') stats.plus_minus = parseInt(value) || 0; // Plus/Minus
            else if (statId === '22') stats.wins = parseInt(value) || 0; // Wins (Goalie)
            else if (statId === '23') stats.gaa = parseFloat(value) || 0; // Goals Against Average
            else if (statId === '24') stats.sv_pct = parseFloat(value) || 0; // Save Percentage
          }
        }

        result.push({
          player_id,
          name,
          position,
          nhl_team,
          uniform_number,
          image_url,
          status,
          is_goalie: isGoalie,
          games_played: stats.games_played,
          goals: stats.goals,
          assists: stats.assists,
          points: stats.points,
          ppp: stats.ppp,
          hits: stats.hits,
          plus_minus: stats.plus_minus,
          wins: stats.wins,
          gaa: stats.gaa,
          sv_pct: stats.sv_pct,
        });
      }

      // Get total count from response
      const totalCount = parseInt(players.count) || 0;

      // Separate and sort players and goalies
      const skaters = result.filter(p => !p.is_goalie).sort((a, b) => b.points - a.points);
      const goalies = result.filter(p => p.is_goalie).sort((a, b) => b.wins - a.wins).slice(0, 10);

      return NextResponse.json({
        players: skaters,
        goalies: goalies,
        total: totalCount,
        start: parseInt(start),
        count: result.length
      });
    } catch (error) {
      console.error('Error parsing players:', error, error instanceof Error ? error.stack : 'No stack');
      return NextResponse.json({ error: 'Failed to parse players data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}