import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  state?: string;
  code_verifier?: string;
  returnTo?: string;
  access_token?: string;
  refresh_token?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/error?message=Invalid callback parameters', request.url));
  }

  const session = await getIronSession<SessionData>(cookies(), {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: 'fantasy-assistant-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  });

  if (session.state !== state) {
    return NextResponse.redirect(new URL('/error?message=State mismatch', request.url));
  }

  const codeVerifier = session.code_verifier;
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/error?message=Missing code verifier', request.url));
  }

  // Decode returnTo from state
  let returnTo = '/dashboard';
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    returnTo = stateData.returnTo || '/dashboard';
  } catch (error) {
    console.error('Failed to decode state:', error);
  }

  // Exchange code for token
  const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri = process.env.YAHOO_REDIRECT_URI || 'https://nhl-fantasy-assistant.vercel.app/api/yahoo/callback';

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    return NextResponse.redirect(new URL('/error?message=Token exchange failed', request.url));
  }

  const tokenData = await tokenResponse.json();
  session.access_token = tokenData.access_token;
  session.refresh_token = tokenData.refresh_token;

  // Clear sensitive data
  delete session.state;
  delete session.code_verifier;

  await session.save();

  return NextResponse.redirect(new URL(returnTo, request.url));
}