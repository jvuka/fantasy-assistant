import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { yahooStatsService } from '../../../../../lib/yahoo/stats-service';

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

      // Fetch rosters for both teams with weekly stats using the shared service
      const fetchTeamRosterWithStats = async (teamKey: string) => {
        try {
          // First get the roster data from Yahoo
          const rosterResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`, {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          });

          if (!rosterResponse.ok) {
            console.error(`Failed to fetch roster for ${teamKey}`);
            return [];
          }

          const rosterData = await rosterResponse.json();

          if (!rosterData?.fantasy_content?.team) {
            console.error(`Invalid roster data for ${teamKey}`);
            return [];
          }

          // Parse player keys and positions from roster data
          const teamArray = rosterData.fantasy_content.team;
          const roster = teamArray[1]?.roster?.["0"]?.players;
          if (!roster) {
            console.error(`No roster found for ${teamKey}`);
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

          console.log('Matchup debug: Found player keys:', playerKeys);

          if (playerKeys.length === 0) {
            return [];
          }

          // Fetch player stats using the shared service
          console.log('Matchup debug: Fetching stats for players:', playerKeys);
          const statsData = await yahooStatsService.fetchPlayerStats(playerKeys, access_token, parseInt(week));
          console.log('Matchup debug: Stats fetched, parsing...');

          // Parse roster with stats using the shared service
          const parsedRoster = yahooStatsService.parseRosterWithStats(playerKeys, playerPositions, statsData);
          console.log('Matchup debug: Parsed roster:', parsedRoster);

          return parsedRoster;

        } catch (error) {
          console.error(`Error fetching roster for ${teamKey}:`, error);
          return [];
        }
      };

      const [team1Roster, team2Roster] = await Promise.all([
        fetchTeamRosterWithStats(team1.team_key),
        fetchTeamRosterWithStats(team2.team_key),
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