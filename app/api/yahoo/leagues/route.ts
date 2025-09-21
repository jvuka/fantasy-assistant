import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';
import { parseStringPromise } from 'xml2js';

export async function GET(req: NextRequest) {
  const session = await getSession();

  const access_token = session?.access_token;

  if (!access_token) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  try {
    const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nhl/leagues', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch leagues from Yahoo:', await response.text());
      throw new Error('Failed to fetch leagues from Yahoo');
    }

    const xmlData = await response.text();
    const jsonData = await parseStringPromise(xmlData);

    const leagues = jsonData.fantasy_content.users[0].user[1].games[0].game[1].leagues[0].league.map((l: any) => ({
        key: l.league_key[0],
        name: l.name[0]
    }));

    return NextResponse.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(errorMessage, { status: 500 });
  }
}