import React, { useState, useEffect } from 'react';

export function ThemeToggleButton() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cowcalc_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cowcalc_theme', theme);
  }, [theme]);

  return (
    <button
      className="toolbar-btn toolbar-btn-theme"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      title="Toggle light/dark mode"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{display:'block'}}>
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{display:'block'}}>
          <path d="M12 7.93A5 5 0 016.07 2a5 5 0 100 10 5 5 0 005.93-4.07z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}
