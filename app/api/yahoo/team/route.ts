import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { parseStringPromise } from 'xml2js';

interface SessionData {
  access_token?: string;
  refresh_token?: string;
}

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: 'fantasy-assistant-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  });

  const access_token = session.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueKey = searchParams.get('leagueKey');

  if (!leagueKey) {
    return new NextResponse('Missing leagueKey', { status: 400 });
  }

  try {
    const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nhl/leagues;league_keys=${leagueKey}/teams`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch team from Yahoo:', await response.text());
      throw new Error('Failed to fetch team from Yahoo');
    }

    const xmlData = await response.text();
    const jsonData = await parseStringPromise(xmlData);

    const team = jsonData.fantasy_content.users[0].user[1].games[0].game[1].leagues[0].league[1].teams[0].team[0];
    const teamData = {
      id: team.team_id[0],
      name: team.name[0]
    };

    return NextResponse.json(teamData);
  } catch (error) {
    console.error('Error fetching team:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(errorMessage, { status: 500 });
  }
}