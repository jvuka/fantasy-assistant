import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  access_token?: string;
  refresh_token?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return new NextResponse('No code provided', { status: 400 });
  }

  try {
    const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
    const client_id = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
    const client_secret = process.env.YAHOO_CLIENT_SECRET;
    const redirect_uri = process.env.YAHOO_REDIRECT_URI;

    if (!client_id || !client_secret || !redirect_uri) {
      throw new Error('Missing Yahoo environment variables');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        redirect_uri,
        code,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch tokens:', tokens);
      throw new Error(tokens.error_description || 'Failed to fetch tokens');
    }

    const session = await getIronSession<SessionData>(cookies(), {
      password: process.env.SECRET_COOKIE_PASSWORD as string,
      cookieName: 'fantasy-assistant-session',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    });

    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token;
    await session.save();

    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('Error in Yahoo callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(errorMessage, { status: 500 });
  }
}