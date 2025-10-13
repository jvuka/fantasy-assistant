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

        // Extract season stats
        const stats: { points?: number; goals?: number; assists?: number; games_played?: number } = {};
        if (playerStats && playerStats.player_stats && playerStats.player_stats.stats) {
          for (const stat of playerStats.player_stats.stats) {
            const statId = stat.stat.stat_id;
            const value = stat.stat.value;
            if (statId === '0') stats.games_played = parseInt(value) || 0; // stat_id 0 is games played
            else if (statId === '2') stats.goals = parseInt(value) || 0; // 2 is goals
            else if (statId === '3') stats.assists = parseInt(value) || 0; // 3 is assists
            else if (statId === '4') stats.points = parseFloat(value) || 0; // 4 is fantasy points
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
          editorial_rank,
          games_played: stats.games_played || 0,
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          points: stats.points || 0,
        });
      }

      // Get total count from response
      const totalCount = parseInt(players.count) || 0;

      return NextResponse.json({
        players: result,
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