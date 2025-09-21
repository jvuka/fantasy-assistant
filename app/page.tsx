'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [leagues, setLeagues] = useState(null);

  useEffect(() => {
    fetch('/api/auth-status')
      .then(res => res.json())
      .then(data => {
        setIsConnected(data.authenticated);
      })
      .catch(err => console.error(err));
  }, []);

  const handleConnectYahoo = () => {
    window.location.href = '/api/yahoo/auth';
  };

  const handleLoadLeagues = async () => {
    try {
      const response = await fetch('/api/yahoo/leagues');
      const data = await response.json();
      setLeagues(data);
    } catch (error) {
      console.error('Error loading leagues:', error);
    }
  };

  return (
    <main style={{padding: 24}}>
      <h1>Fantasy Assistant</h1>
      <p>Next.js is set up and running.</p>
      {!isConnected ? (
        <button onClick={handleConnectYahoo}>Connect Yahoo</button>
      ) : (
        <>
          <button onClick={handleLoadLeagues}>Load My Leagues</button>
          {leagues && <pre>{JSON.stringify(leagues, null, 2)}</pre>}
        </>
      )}
    </main>
  );
}
