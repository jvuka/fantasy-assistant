import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  access_token?: string;
  refresh_token?: string;
  state?: string;
  code_verifier?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return new NextResponse('No code or state provided', { status: 400 });
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
    return new NextResponse('Invalid state parameter', { status: 400 });
  }

  const code_verifier = session.code_verifier;
  if (!code_verifier) {
    return new NextResponse('No code verifier found', { status: 400 });
  }

  try {
    const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
    const client_id = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
    const client_secret = process.env.YAHOO_CLIENT_SECRET;
    let redirect_uri = process.env.NEXT_PUBLIC_YAHOO_REDIRECT_URI || '';

    // Ensure redirect URI ends with a trailing slash for Yahoo OAuth compatibility
    if (redirect_uri && !redirect_uri.endsWith('/')) {
      redirect_uri += '/';
    }

    console.log('DEBUG: Environment variables - client_id:', client_id ? 'present' : 'missing', 'client_secret:', client_secret ? 'present' : 'missing', 'redirect_uri:', redirect_uri ? 'present' : 'missing');

    if (!client_id || !client_secret || !redirect_uri) {
      throw new Error('Missing Yahoo environment variables');
    }

    console.log('DEBUG: Token exchange request - URL:', tokenUrl, 'Code:', code, 'Redirect URI:', redirect_uri);

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
        grant_type: 'authorization_code',
        code_verifier
      })
    });

    const tokens = await response.json();

    console.log('DEBUG: Token exchange response - Status:', response.status, 'Tokens received:', tokens);

    if (!response.ok) {
      console.error('Failed to fetch tokens:', tokens);
      throw new Error(tokens.error_description || 'Failed to fetch tokens');
    }

    console.log('DEBUG: Creating session with password:', process.env.SECRET_COOKIE_PASSWORD ? 'present' : 'missing');

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

    console.log('DEBUG: Session updated - Access token:', session.access_token ? 'set' : 'not set', 'Refresh token:', session.refresh_token ? 'set' : 'not set');

    await session.save();

    console.log('DEBUG: Session saved successfully');

    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('DEBUG: Error in Yahoo callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(errorMessage, { status: 500 });
  }
}