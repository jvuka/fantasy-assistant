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
        // Yahoo API uses numeric string keys like "0", "1", etc.
        const matchupWrapper = matchups[key];
        if (!matchupWrapper || !matchupWrapper.matchup) continue;

        const matchup = matchupWrapper.matchup;
        const matchupDetail = matchup["0"];
        if (!matchupDetail) continue;

        const teams = matchupDetail.teams;
        if (!teams) continue;

        // Teams are keyed as "0" and "1"
        const team1Wrapper = teams["0"];
        const team2Wrapper = teams["1"];
        
        if (!team1Wrapper || !team2Wrapper) continue;

        const team1Array = team1Wrapper.team;
        const team2Array = team2Wrapper.team;

        if (!Array.isArray(team1Array) || !Array.isArray(team2Array)) continue;

        // Extract team names and points from team arrays
        let team1Name = 'Unknown';
        let team1Points = 0;
        let team2Name = 'Unknown';
        let team2Points = 0;

        // team[0] contains array of info objects, team[1] contains team_points
        const team1Info = team1Array[0];
        const team1Stats = team1Array[1];
        const team2Info = team2Array[0];
        const team2Stats = team2Array[1];

        if (Array.isArray(team1Info)) {
          for (const obj of team1Info) {
            if (obj.name) team1Name = obj.name;
          }
        }
        if (team1Stats && team1Stats.team_points) {
          team1Points = parseFloat(team1Stats.team_points.total) || 0;
        }

        if (Array.isArray(team2Info)) {
          for (const obj of team2Info) {
            if (obj.name) team2Name = obj.name;
          }
        }
        if (team2Stats && team2Stats.team_points) {
          team2Points = parseFloat(team2Stats.team_points.total) || 0;
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