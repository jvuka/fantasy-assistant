import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { yahooStatsService } from '../../../../lib/yahoo/stats-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.expires_at || Date.now() > session.expires_at) {
      return NextResponse.json({ error: "Token expired, please login again" }, { status: 401 });
    }

    const access_token = session.access_token;

    if (!access_token) {
      return new NextResponse('Not authenticated', { status: 401 });
    }

    // Get team_key from query params
    const { searchParams } = new URL(req.url);
    const teamKey = searchParams.get('team_key') || '399.l.15937.t.1'; // Default test team
    const week = searchParams.get('week') || '1';

    console.log('Debug matchup: Starting for team:', teamKey, 'week:', week);

    // Step 1: Fetch matchup data
    const matchupResponse = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/matchups;weeks=${week}?format=json`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!matchupResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch matchup',
        status: matchupResponse.status,
        statusText: matchupResponse.statusText
      }, { status: matchupResponse.status });
    }

    const matchupData = await matchupResponse.json();
    console.log('Debug matchup: Matchup data fetched');

    if (!matchupData?.fantasy_content?.team) {
      return NextResponse.json({
        error: 'Invalid matchup data structure',
        matchupData
      }, { status: 500 });
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
      return NextResponse.json({
        error: 'No matchup found for this week',
        matchups
      }, { status: 404 });
    }

    const matchupObj = matchups["0"].matchup;
    const matchupDetail = matchupObj["0"];
    const teams = matchupDetail?.teams;

    if (!teams || !teams["0"] || !teams["1"]) {
      return NextResponse.json({
        error: 'Invalid matchup teams data',
        teams
      }, { status: 500 });
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
      return NextResponse.json({
        error: 'Failed to parse team data',
        team1,
        team2
      }, { status: 500 });
    }

    console.log('Debug matchup: Teams parsed:', team1.name, 'vs', team2.name);

    // Step 2: Fetch rosters for both teams with detailed logging
    const fetchTeamRosterWithStats = async (teamKey: string) => {
      try {
        console.log(`Debug matchup: Fetching roster for ${teamKey}`);

        // First get the roster data from Yahoo
        const rosterResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        });

        if (!rosterResponse.ok) {
          console.error(`Debug matchup: Failed to fetch roster for ${teamKey}, status:`, rosterResponse.status);
          return [];
        }

        const rosterData = await rosterResponse.json();
        console.log(`Debug matchup: Roster data fetched for ${teamKey}`);

        if (!rosterData?.fantasy_content?.team) {
          console.error(`Debug matchup: Invalid roster data for ${teamKey}`);
          return [];
        }

        // Parse player keys and positions from roster data
        const teamArray = rosterData.fantasy_content.team;
        const roster = teamArray[1]?.roster?.["0"]?.players;
        if (!roster) {
          console.error(`Debug matchup: No roster found for ${teamKey}`);
          return [];
        }

        const playerKeys: string[] = [];
        const playerPositions = new Map<string, string>();

        for (const key of Object.keys(roster).filter(key => key !== 'count')) {
          const playerData = roster[key];
          const playerKey = playerData?.player?.[0]?.[0]?.player_key;
          const selectedPosition = playerData?.player?.[1]?.selected_position?.[1]?.position || 'Unknown';
          if (playerKey) {
            playerKeys.push(playerKey);
            playerPositions.set(playerKey, selectedPosition);
          }
        }

        console.log(`Debug matchup: Found ${playerKeys.length} players for ${teamKey}`);

        if (playerKeys.length === 0) {
          return [];
        }

        // Fetch player stats using the shared service
        console.log(`Debug matchup: Fetching stats for ${playerKeys.length} players`);
        const statsData = await yahooStatsService.fetchPlayerStats(playerKeys, access_token, parseInt(week));

        console.log(`Debug matchup: Stats fetched, parsing roster with stats`);
        // Parse roster with stats using the shared service
        return yahooStatsService.parseRosterWithStats(playerKeys, playerPositions, statsData);

      } catch (error) {
        console.error(`Debug matchup: Error fetching roster for ${teamKey}:`, error);
        return [];
      }
    };

    const [team1Roster, team2Roster] = await Promise.all([
      fetchTeamRosterWithStats(team1.team_key),
      fetchTeamRosterWithStats(team2.team_key),
    ]);

    console.log(`Debug matchup: Final rosters - Team1: ${team1Roster.length} players, Team2: ${team2Roster.length} players`);

    return NextResponse.json({
      success: true,
      debug: {
        teamKey,
        week,
        teams: {
          team1: { name: team1.name, points: team1.points },
          team2: { name: team2.name, points: team2.points }
        },
        rosterSizes: {
          team1: team1Roster.length,
          team2: team2Roster.length
        },
        samplePlayer: team1Roster.length > 0 ? {
          name: team1Roster[0].name,
          goals: team1Roster[0].goals,
          assists: team1Roster[0].assists,
          ppp: team1Roster[0].ppp
        } : null
      },
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}