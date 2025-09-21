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
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leagues');
    }

    const data = await response.text();
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
  }
}