import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';

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

    console.log('Debug: Fetching roster for team:', teamKey);

    // Fetch roster data
    const rosterResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!rosterResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch roster',
        status: rosterResponse.status,
        statusText: rosterResponse.statusText
      }, { status: rosterResponse.status });
    }

    const rosterData = await rosterResponse.json();

    // Extract player keys
    const teamArray = rosterData?.fantasy_content?.team;
    if (!teamArray || !teamArray[1]?.roster?.["0"]?.players) {
      return NextResponse.json({
        error: 'Invalid roster structure',
        rosterData
      }, { status: 500 });
    }

    const roster = teamArray[1].roster["0"].players;
    const playerKeys: string[] = [];

    for (const key of Object.keys(roster).filter(key => key !== 'count')) {
      const playerData = roster[key];
      const playerKey = playerData?.player?.[0]?.[0]?.player_key;
      if (playerKey) {
        playerKeys.push(playerKey);
      }
    }

    if (playerKeys.length === 0) {
      return NextResponse.json({
        error: 'No player keys found',
        roster
      }, { status: 500 });
    }

    console.log('Debug: Found player keys:', playerKeys.slice(0, 3)); // Log first 3

    // Fetch stats for first few players
    const testPlayerKeys = playerKeys.slice(0, 2); // Test with just 2 players
    const playerKeysStr = testPlayerKeys.join(',');

    const statsResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/players;player_keys=${playerKeysStr}/stats;type=week;week=1?format=json`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!statsResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch stats',
        status: statsResponse.status,
        statusText: statsResponse.statusText
      }, { status: statsResponse.status });
    }

    const statsData = await statsResponse.json();

    return NextResponse.json({
      success: true,
      debug: {
        teamKey,
        playerKeys: testPlayerKeys,
        rosterStructure: {
          hasFantasyContent: !!rosterData?.fantasy_content,
          hasTeam: !!rosterData?.fantasy_content?.team,
          teamLength: rosterData?.fantasy_content?.team?.length,
          rosterPath: 'fantasy_content.team[1].roster["0"].players',
          samplePlayer: roster ? roster[Object.keys(roster).filter(key => key !== 'count')[0]] : null
        },
        statsStructure: {
          hasFantasyContent: !!statsData?.fantasy_content,
          hasPlayers: !!statsData?.fantasy_content?.players,
          playersKeys: statsData?.fantasy_content?.players ? Object.keys(statsData.fantasy_content.players).filter(key => key !== 'count') : [],
          samplePlayerStats: statsData?.fantasy_content?.players ?
            statsData.fantasy_content.players[Object.keys(statsData.fantasy_content.players).filter(key => key !== 'count')[0]] : null
        }
      },
      rawData: {
        roster: rosterData,
        stats: statsData
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}