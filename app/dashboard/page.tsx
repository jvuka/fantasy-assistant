import YahooLeagues from '../components/YahooLeagues';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionData {
  access_token?: string;
  refresh_token?: string;
  state?: string;
  code_verifier?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { code?: string; state?: string };
}) {
  const code = searchParams.code;
  const state = searchParams.state;

  if (code && state) {
    const session = await getIronSession<SessionData>(cookies(), {
      password: process.env.SECRET_COOKIE_PASSWORD as string,
      cookieName: 'fantasy-assistant-session',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    });

    if (session.state !== state) {
      throw new Error('Invalid state parameter');
    }

    const code_verifier = session.code_verifier;
    if (!code_verifier) {
      throw new Error('No code verifier found');
    }

    const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
    const client_id = process.env.YAHOO_CLIENT_ID;
    const client_secret = process.env.YAHOO_CLIENT_SECRET;
    const redirect_uri = 'https://nhl-fantasy-assistant.vercel.app/dashboard';

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
        grant_type: 'authorization_code',
        redirect_uri,
        code,
        code_verifier
      })
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw new Error(tokens.error_description || 'Failed to fetch tokens');
    }

    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token;

    await session.save();

    // Clean the URL by redirecting without params
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Dashboard Page</h1>
      <YahooLeagues />
    </main>
  );
}