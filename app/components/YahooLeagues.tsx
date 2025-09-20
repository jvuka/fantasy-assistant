'use client';

import { useEffect, useState } from 'react';

export default function YahooLeagues() {
  const [leagues, setLeagues] = useState<string>('');

  useEffect(() => {
    fetch('/api/yahoo/leagues')
      .then(res => res.text())
      .then(data => setLeagues(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Your Leagues</h2>
      <pre>{leagues}</pre>
    </div>
  );
}