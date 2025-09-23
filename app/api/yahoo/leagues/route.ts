import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';

function parseTeams(teams: any) {
  const result = [];
  for (const key of Object.keys(teams || {}).filter(key => key !== 'count')) {
    const teamArray = teams[key].team[0];
    const team_key = teamArray[0]?.team_key;
    const name = teamArray[2]?.name;
    const manager = teamArray[23]?.managers?.[0]?.manager?.nickname || 'Unknown';
    if (team_key && name) result.push({ team_key, name, manager });
  }
  return result;
}

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session || !session.expires_at || Date.now() > session.expires_at) {
    return NextResponse.json({ error: "Token expired, please login again" }, { status: 401 });
  }

  const access_token = session.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  try {
    const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nhl/leagues;out=teams?format=json', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: response.statusText, status: response.status }, { status: response.status });
    }

    let data;
    try {
      data = await response.json();
      console.log('Full raw Yahoo response:', JSON.stringify(data, null, 2));
      console.log('Raw Yahoo response:', data);
      if (!data?.fantasy_content?.users) {
        throw new Error('Missing fantasy_content.users in response');
      }
      // Extract user key (it's the actual user ID, not 'user')
      const userKey = Object.keys(data.fantasy_content.users)[0];
      const userData = data.fantasy_content.users[userKey].user[1];
      const games = userData.games;
      if (!userKey) {
        throw new Error('No user key found');
      }
      const nhlGame = games['0'].game[1];
      const leagues = nhlGame?.leagues;
      const result = [];
      for (const key of Object.keys(leagues || {}).filter(key => key !== 'count')) {
        const leagueData = leagues[key];
        const league = leagueData?.league?.[0];
        if (league) result.push({ league_key: league.league_key, name: league.name, season: league.season, teams: parseTeams(leagueData.league[1].teams) });
      }
      if (result.length === 0) throw new Error('No leagues found in response');
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error parsing:', error, error instanceof Error ? error.stack : 'No stack', 'Partial data:', data ? JSON.stringify(data).slice(0, 500) : 'No data');
      return NextResponse.json({ error: 'Failed to parse leagues data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
  }
}