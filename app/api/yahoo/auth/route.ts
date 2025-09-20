import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_YAHOO_REDIRECT_URI || '';
  const scope = 'fspt-r';
  const state = Math.random().toString(36).substring(2, 15);

  const yahooAuthUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth');
  yahooAuthUrl.searchParams.set('client_id', clientId || '');
  yahooAuthUrl.searchParams.set('redirect_uri', redirectUri);
  yahooAuthUrl.searchParams.set('scope', scope);
  yahooAuthUrl.searchParams.set('response_type', 'code');
  yahooAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(yahooAuthUrl.toString());
}