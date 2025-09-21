'use client';

export default function Home() {
  const handleConnectYahoo = () => {
    window.location.href = '/api/yahoo/auth';
  };

  const handleLoadLeagues = async () => {
    try {
      const response = await fetch('/api/yahoo/leagues');
      const data = await response.json();
      console.log('Leagues:', data);
      alert('Leagues loaded, check console');
    } catch (error) {
      console.error('Error loading leagues:', error);
      alert('Error loading leagues');
    }
  };

  return (
    <main style={{padding: 24}}>
      <h1>Fantasy Assistant</h1>
      <p>Next.js is set up and running.</p>
      <button onClick={handleConnectYahoo}>Connect Yahoo</button>
      <button onClick={handleLoadLeagues}>Load My Leagues</button>
    </main>
  );
}
