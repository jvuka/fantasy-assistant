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

  // Get week parameter from query string (default to current week 1)
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week') || '1';

  try {
    // Fetch team matchup for the specified week
    const matchupResponse = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/team/${params.team_key}/matchups;weeks=${week}?format=json`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!matchupResponse.ok) {
      return NextResponse.json({ error: matchupResponse.statusText, status: matchupResponse.status }, { status: matchupResponse.status });
    }

    let matchupData;
    try {
      matchupData = await matchupResponse.json();
      console.log('Matchup raw response:', JSON.stringify(matchupData, null, 2));
      
      if (!matchupData?.fantasy_content?.team) {
        throw new Error('Missing fantasy_content.team in matchup response');
      }

      const teamArray = matchupData.fantasy_content.team;
      let matchups = null;

      // Find matchups in team array
      for (const item of teamArray) {
        if (item.matchups) {
          matchups = item.matchups;
          break;
        }
      }

      if (!matchups || !matchups["0"]?.matchup) {
        return NextResponse.json({ error: 'No matchup found for this week' }, { status: 404 });
      }

      const matchupObj = matchups["0"].matchup;
      const matchupDetail = matchupObj["0"];
      const teams = matchupDetail?.teams;

      if (!teams || !teams["0"] || !teams["1"]) {
        return NextResponse.json({ error: 'Invalid matchup data' }, { status: 500 });
      }

      // Parse both teams' data
      const parseTeamData = (teamData: any) => {
        const teamArray = teamData?.team;
        if (!teamArray || teamArray.length < 2) return null;

        const teamInfo = teamArray[0]; // Array of team info objects
        const teamStats = teamArray[1]; // Object with stats and points

        let name = 'Unknown';
        let team_key = '';

        for (const obj of teamInfo) {
          if (obj.name) name = obj.name;
          if (obj.team_key) team_key = obj.team_key;
        }

        const points = parseFloat(teamStats?.team_points?.total) || 0;

        return { name, points, team_key };
      };

      const team1 = parseTeamData(teams["0"]);
      const team2 = parseTeamData(teams["1"]);

      if (!team1 || !team2) {
        return NextResponse.json({ error: 'Failed to parse team data' }, { status: 500 });
      }

      // Fetch rosters for both teams with weekly stats
      const fetchTeamRoster = async (teamKey: string) => {
        const rosterRes = await fetch(
          `${req.nextUrl.protocol}//${req.nextUrl.host}/api/yahoo/roster/${teamKey}?week=${week}`,
          {
            headers: {
              'Cookie': req.headers.get('cookie') || '',
            },
          }
        );

        if (!rosterRes.ok) {
          console.error(`Failed to fetch roster for ${teamKey}`);
          return [];
        }

        return await rosterRes.json();
      };

      const [team1Roster, team2Roster] = await Promise.all([
        fetchTeamRoster(team1.team_key),
        fetchTeamRoster(team2.team_key),
      ]);

      return NextResponse.json({
        week: parseInt(week),
        team1: {
          name: team1.name,
          points: team1.points,
          roster: team1Roster,
        },
        team2: {
          name: team2.name,
          points: team2.points,
          roster: team2Roster,
        },
      });
    } catch (error) {
      console.error('Error parsing matchup:', error, error instanceof Error ? error.stack : 'No stack');
      return NextResponse.json({ error: 'Failed to parse matchup data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching matchup:', error);
    return NextResponse.json({ error: 'Failed to fetch matchup' }, { status: 500 });
  }
}