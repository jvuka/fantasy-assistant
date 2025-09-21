import { NextResponse } from 'next/server';
import { getSession, setSession } from '../../../../lib/session';
import { exchangeCodeForTokens } from '../../../../lib/yahoo/tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=Invalid callback parameters', request.url));
  }

  const session = await getSession();
  if (!session || session.state !== state) {
    return NextResponse.redirect(new URL('/?error=State mismatch', request.url));
  }

  const codeVerifier = session.code_verifier;
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=Missing code verifier', request.url));
  }

  const redirectUri = process.env.YAHOO_REDIRECT_URI || 'https://nhl-fantasy-assistant.vercel.app/api/yahoo/callback';

  try {
    const tokenData = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    await setSession({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      returnTo: session.returnTo || '/',
    });

    return NextResponse.redirect(new URL(session.returnTo || '/', request.url));
  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.redirect(new URL('/?error=Token exchange failed', request.url));
  }
}