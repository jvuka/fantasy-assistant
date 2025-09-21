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

  const { searchParams } = new URL(req.url);
  const league_key = searchParams.get('league_key');

  if (!league_key) {
    return NextResponse.json({ error: 'league_key is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/leagues;league_keys=${league_key}/teams?format=json`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: response.statusText, status: response.status }, { status: response.status });
    }

    const data = await response.json();

    // Assuming the structure: data.fantasy_content.leagues.league[0].teams.team
    const league = data.fantasy_content.leagues.league;
    const teamsData = league.teams?.team || [];

    // Ensure teamsData is an array
    const teamsArray = Array.isArray(teamsData) ? teamsData : [teamsData];

    const teams = teamsArray.map((team: any) => ({
      team_key: team.team_key,
      name: team.name,
      manager: team.managers?.manager?.nickname || 'Unknown',
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}