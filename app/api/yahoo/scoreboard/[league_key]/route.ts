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

  // Get week parameter from query string (default to current week 1)
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week') || '1';

  try {
    // Fetch league scoreboard for the specified week
    const scoreboardResponse = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${params.league_key}/scoreboard;week=${week}?format=json`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!scoreboardResponse.ok) {
      return NextResponse.json({ error: scoreboardResponse.statusText, status: scoreboardResponse.status }, { status: scoreboardResponse.status });
    }

    let scoreboardData;
    try {
      scoreboardData = await scoreboardResponse.json();
      console.log('Scoreboard raw response:', JSON.stringify(scoreboardData, null, 2));
      
      if (!scoreboardData?.fantasy_content?.league) {
        throw new Error('Missing fantasy_content.league in scoreboard response');
      }

      const leagueArray = scoreboardData.fantasy_content.league;
      let matchups = null;

      // Find the scoreboard in the league array
      for (const item of leagueArray) {
        if (item.scoreboard) {
          matchups = item.scoreboard[0]?.matchups;
          break;
        }
      }

      if (!matchups) {
        return NextResponse.json([]);
      }

      const result = [];
      for (const key of Object.keys(matchups).filter(key => key !== 'count')) {
        const matchup = matchups[key]?.matchup;
        if (!matchup) continue;

        const teams = matchup[0]?.teams?.team;
        if (!teams || !Array.isArray(teams) || teams.length < 2) continue;

        const team1Data = teams[0]?.team?.[0];
        const team2Data = teams[1]?.team?.[0];

        if (!team1Data || !team2Data) continue;

        // Extract team names and points
        let team1Name = 'Unknown';
        let team1Points = 0;
        let team2Name = 'Unknown';
        let team2Points = 0;

        for (const obj of team1Data) {
          if (obj.name) team1Name = obj.name;
          if (obj.team_points) team1Points = parseFloat(obj.team_points.total) || 0;
        }

        for (const obj of team2Data) {
          if (obj.name) team2Name = obj.name;
          if (obj.team_points) team2Points = parseFloat(obj.team_points.total) || 0;
        }

        result.push({
          team1: team1Name,
          team1_points: team1Points,
          team2: team2Name,
          team2_points: team2Points,
        });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error parsing scoreboard:', error, error instanceof Error ? error.stack : 'No stack');
      return NextResponse.json({ error: 'Failed to parse scoreboard data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return NextResponse.json({ error: 'Failed to fetch scoreboard' }, { status: 500 });
  }
}