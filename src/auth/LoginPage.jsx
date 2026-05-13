import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const { t, toggleLang, lang, toggleTheme, theme } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || (lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'var(--bg-base)' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary btn-icon" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="btn btn-secondary" onClick={toggleLang} style={{ minWidth: 80 }}>
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      <div className="flex flex-col items-center w-full">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>☕</div>
          <h1 className="fw-700">{t('auth.title')}</h1>
          <p className="fs-sm">{t('auth.subtitle')}</p>
        </div>

        <div className="card modal-sm" style={{ padding: 32 }}>
          <h3 style={{ marginBottom: 4 }}>{t('auth.signin')}</h3>
          <p className="fs-sm mb-4">{t('auth.enter_creds')}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('auth.username')}</label>
              <input 
                className="form-input" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <input 
                className="form-input" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoComplete="current-password"
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-block btn-lg mt-4" 
              disabled={loading}
            >
              {loading ? t('auth.signing_in') : t('auth.btn')}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div className="form-label" style={{ marginBottom: 8, fontSize: '0.75rem' }}>{t('auth.default_creds')}:</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Admin: admin / admin123<br/>
              Staff: staff / staff123
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: 40, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          HCMS v1.0 — {t('auth.subtitle')}
        </div>
      </div>
    </div>
  );
}
