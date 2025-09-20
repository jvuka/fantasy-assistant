import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface SessionData {
  state?: string;
  code_verifier?: string;
  returnTo?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';

  const clientId = process.env.YAHOO_CLIENT_ID;
  const redirectUri = process.env.YAHOO_REDIRECT_URI || 'https://nhl-fantasy-assistant.vercel.app/api/yahoo/callback';
  const scope = 'fspt-r';

  // Encode returnTo in state with expiry
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
  const stateData = { returnTo, nonce: Math.random().toString(36).substring(2, 15), expiry };
  const statePayload = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Sign the state with HMAC
  const hmac = crypto.createHmac('sha256', process.env.STATE_HMAC_SECRET as string);
  hmac.update(statePayload);
  const signature = hmac.digest('base64url');
  const state = `${statePayload}.${signature}`;

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
  session.returnTo = returnTo;
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