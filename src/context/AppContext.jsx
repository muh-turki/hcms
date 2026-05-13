import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import translations from '../i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang]   = useState(() => localStorage.getItem('hcms_lang')  || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('hcms_theme') || 'dark');
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data || {});
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  // Apply RTL / language
  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('hcms_lang', lang);
  }, [lang]);

  // Apply theme class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('hcms_theme', theme);
  }, [theme]);

  const t = key => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  const toggleLang  = () => setLang(l  => l  === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(t => t  === 'dark' ? 'light' : 'dark');
  const isRTL = lang === 'ar';

  return (
    <AppContext.Provider value={{ lang, theme, t, toggleLang, toggleTheme, isRTL, settings, fetchSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
