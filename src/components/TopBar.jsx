import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function TopBar({ title }) {
  const { t, lang, theme, toggleLang, toggleTheme } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{title}</h2>
      </div>

      <div className="topbar-right">
        <div className="topbar-clock">
          {time.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
          })}
        </div>
        
        <div className="divider-v" style={{ backgroundColor: 'var(--border-light)', width: '1px', height: '24px', margin: '0 8px' }}></div>

        {/* Theme Toggle */}
        <button 
          className="btn btn-secondary btn-icon" 
          onClick={toggleTheme}
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Language Toggle */}
        <button 
          className="btn btn-secondary" 
          onClick={toggleLang}
          style={{ minWidth: '80px', justifyContent: 'center' }}
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>
    </header>
  );
}
