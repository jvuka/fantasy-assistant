'use client';

import { useEffect, useState } from 'react';
import YahooLeagues from './components/YahooLeagues';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth-status')
      .then(res => res.json())
      .then(data => setAuthenticated(data.authenticated))
      .catch(err => console.error(err));
  }, []);

  return (
    <main style={{padding: 24}}>
      <h1>Fantasy Assistant</h1>
      {authenticated ? (
        <YahooLeagues />
      ) : (
        <>
          <p>Connect to Yahoo Fantasy Sports</p>
          <a href="/api/yahoo/auth" style={{display: 'inline-block', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px'}}>
            Connect with Yahoo
          </a>
        </>
      )}
    </main>
  );
}
