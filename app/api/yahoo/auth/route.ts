import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface SessionData {
  state?: string;
  code_verifier?: string;
}

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_YAHOO_REDIRECT_URI || '';
  const scope = 'fspt-r';
  const state = Math.random().toString(36).substring(2, 15);
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');

  const session = await getIronSession<SessionData>(cookies(), {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: 'fantasy-assistant-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  });

  session.state = state;
  session.code_verifier = code_verifier;
  await session.save();

  const yahooAuthUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth');
  yahooAuthUrl.searchParams.set('client_id', clientId || '');
  yahooAuthUrl.searchParams.set('redirect_uri', redirectUri);
  yahooAuthUrl.searchParams.set('scope', scope);
  yahooAuthUrl.searchParams.set('response_type', 'code');
  yahooAuthUrl.searchParams.set('state', state);
  yahooAuthUrl.searchParams.set('code_challenge', code_challenge);
  yahooAuthUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(yahooAuthUrl.toString());
}