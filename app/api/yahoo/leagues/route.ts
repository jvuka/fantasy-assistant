import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';

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
    const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nhl/leagues?format=json', {
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
      console.log('Full Yahoo API data:', JSON.stringify(data, null, 2));
      if (!data?.fantasy_content?.users) {
        throw new Error('Missing fantasy_content.users in response');
      }
      // Extract user key (it's the actual user ID, not 'user')
      const userKey = Object.keys(data.fantasy_content.users)[0];
      console.log('userKey:', userKey);
      const games = data.fantasy_content.users[userKey]?.games;
      if (!userKey) {
        throw new Error('No user key found');
      }
      console.log('Accessing nhlGame:', games?.['0']?.game?.[1]);
      const nhlGame = games['0'].game[1];
      const leagues = nhlGame?.leagues;
      const result = [];
      for (const key of Object.keys(leagues || {})) {
        if (key === 'count') continue;
        const leagueData = leagues[key];
        const league = leagueData?.league?.[0];
        if (league) result.push({ league_key: league.league_key, name: league.name, season: league.season });
      }
      console.log('Parsed leagues:', result);
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