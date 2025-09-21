import { NextResponse } from 'next/server';
import { getSession } from '../../lib/session';

export async function GET() {
  const session = await getSession();
  const isAuthenticated = !!session?.access_token;

  return NextResponse.json({ authenticated: isAuthenticated });
}