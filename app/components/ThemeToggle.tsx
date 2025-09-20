'use client';

import { useContext } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { ThemeContext } from './ThemeProvider';

const ThemeToggle = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('ThemeToggle must be used within a ThemeProvider');
  }

  const { theme, toggleTheme } = context;
  const isDarkMode = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <SunIcon className="h-6 w-6 text-yellow-400" />
      ) : (
        <MoonIcon className="h-6 w-6 text-gray-500" />
      )}
    </button>
  );
};

export default ThemeToggle;