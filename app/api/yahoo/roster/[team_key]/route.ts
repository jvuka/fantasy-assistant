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
      // Parse player keys
      const teamKey = Object.keys(rosterData.fantasy_content.team)[0];
      const teamData = rosterData.fantasy_content.team[teamKey];
      const roster = teamData?.team?.[1]?.roster?.[0]?.players;
      if (!roster) {
        throw new Error('No roster found in response');
      }
      const playerKeys = [];
      for (const key of Object.keys(roster || {}).filter(key => key !== 'count')) {
        const playerData = roster[key];
        const playerKey = playerData?.player?.[0]?.player_key;
        if (playerKey) playerKeys.push(playerKey);
      }
      if (playerKeys.length === 0) {
        return NextResponse.json([]);
      }

      // Fetch player stats
      const playerKeysStr = playerKeys.join(',');
      const statsResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${playerKeysStr}/stats;type=season;season=2024?format=json`, {
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
          const playerInfo = playerData?.player?.[0];
          const playerStats = playerData?.player?.[1]?.player_stats;
          if (playerInfo && playerStats) {
            const name = playerInfo.name?.full || 'Unknown';
            const position = playerInfo.primary_position || 'Unknown';
            const nhl_team = playerInfo.editorial_team_abbr || 'Unknown';
            // Parse stats
            const stats: { points?: number; goals?: number; assists?: number } = {};
            for (const stat of playerStats.stats || []) {
              const statId = stat.stat.stat_id;
              const value = stat.stat.value;
              if (statId === '4') stats.points = parseFloat(value) || 0; // stat_id 4 is points
              else if (statId === '2') stats.goals = parseInt(value) || 0; // 2 is goals
              else if (statId === '3') stats.assists = parseInt(value) || 0; // 3 is assists
            }
            result.push({
              name,
              position,
              nhl_team,
              points: stats.points || 0,
              goals: stats.goals || 0,
              assists: stats.assists || 0,
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