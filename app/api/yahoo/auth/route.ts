import { NextResponse } from 'next/server';
import { getSession, setSession } from '../../../lib/session';
import { generateCodeVerifier, generateCodeChallenge } from '../../../lib/yahoo/pkce';
import crypto from 'crypto';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';

  const clientId = process.env.YAHOO_CLIENT_ID;
  const redirectUri = process.env.YAHOO_REDIRECT_URI || 'https://nhl-fantasy-assistant.vercel.app/api/yahoo/callback';
  const scope = 'fspt-r';

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  await setSession({
    state,
    code_verifier: codeVerifier,
    returnTo,
  });

  const yahooAuthUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth');
  yahooAuthUrl.searchParams.set('client_id', clientId || '');
  yahooAuthUrl.searchParams.set('redirect_uri', redirectUri);
  yahooAuthUrl.searchParams.set('scope', scope);
  yahooAuthUrl.searchParams.set('response_type', 'code');
  yahooAuthUrl.searchParams.set('state', state);
  yahooAuthUrl.searchParams.set('code_challenge', codeChallenge);
  yahooAuthUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(yahooAuthUrl.toString());
}