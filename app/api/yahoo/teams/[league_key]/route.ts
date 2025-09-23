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

export async function GET(req: NextRequest, { params }: { params: { league_key: string } }) {
  const session = await getSession();

  if (!session || !session.expires_at || Date.now() > session.expires_at) {
    return NextResponse.json({ error: "Token expired, please login again" }, { status: 401 });
  }

  const access_token = session.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  try {
    const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/leagues;league_keys=${params.league_key}/teams?format=json`, {
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
      if (!data?.fantasy_content?.leagues) {
        throw new Error('Missing fantasy_content.leagues in response');
      }
      const leagueKey = Object.keys(data.fantasy_content.leagues)[0];
      const leagueData = data.fantasy_content.leagues[leagueKey];
      const teams = leagueData?.league?.[1]?.teams;
      if (!teams) {
        throw new Error('No teams found in response');
      }
      const result = parseTeams(teams);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error parsing:', error, error instanceof Error ? error.stack : 'No stack', 'Partial data:', data ? JSON.stringify(data).slice(0, 500) : 'No data');
      return NextResponse.json({ error: 'Failed to parse teams data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}