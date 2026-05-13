import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';

export default function Sidebar({ lowStockCount }) {
  const { user, logout } = useAuth();
  const { t, lang, isRTL, settings } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon, label, badge }) => (
    <NavLink to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
      {badge > 0 && <span className="badge-count">{badge}</span>}
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {settings?.logo_data ? (
          <img src={settings.logo_data} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
        ) : (
          <span className="sidebar-logo-icon">☕</span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sidebar-logo-text">{settings?.hotel_name || t('auth.title')}</div>
          <div className="sidebar-logo-sub">{t('auth.subtitle')}</div>
        </div>
      </div>

      <nav className="sidebar-section">
        <div className="sidebar-section-label">{t('nav.operations')}</div>
        <NavItem to="/" icon="📊" label={t('nav.dashboard')} />
        <NavItem to="/pos" icon="🛒" label={t('nav.pos')} />
        <NavItem to="/orders" icon="🔔" label={lang === 'ar' ? 'طلبات النزلاء' : 'Guest Orders'} />
        <NavItem to="/refunds" icon="↩️" label={t('nav.refunds')} />
        <NavItem to="/rooms" icon="🏨" label={t('nav.rooms')} />
      </nav>

      <nav className="sidebar-section">
        <div className="sidebar-section-label">{t('nav.inventory')}</div>
        <NavItem to="/inventory" icon="📦" label={t('nav.products')} badge={lowStockCount} />
        <NavItem to="/suppliers" icon="🚚" label={t('nav.suppliers')} />
        <NavItem to="/customers" icon="👥" label={t('nav.customers')} />
      </nav>

      <nav className="sidebar-section">
        <div className="sidebar-section-label">{t('nav.analytics')}</div>
        <NavItem to="/reports" icon="📈" label={t('nav.reports')} />
      </nav>

      {user?.role === 'admin' && (
        <nav className="sidebar-section">
          <div className="sidebar-section-label">{t('nav.admin')}</div>
          <NavItem to="/users" icon="🔐" label={t('nav.users')} />
          <NavItem to="/audit" icon="🛡️" label={t('nav.audit') || (isRTL ? 'التدقيق' : 'Audit Logs')} />
          <NavItem to="/qrcodes" icon="🔲" label={isRTL ? 'توليد كود QR' : 'QR Codes Generator'} />
          <NavItem to="/settings" icon="⚙️" label={t('nav.settings')} />
        </nav>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || user?.username}</div>
            <div className="sidebar-user-role">{user?.role === 'admin' ? t('usr.admin') : t('usr.staff')}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', border: 'none', background: 'transparent', marginTop: 8 }}>
          <span className="icon">🚪</span>
          <span className="label">{t('nav.signout')}</span>
        </button>
      </div>
    </aside>
  );
}
