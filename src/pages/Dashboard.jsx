import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../api';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useApp();
  const [stats, setStats] = useState(null);
  const [smart, setSmart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/daily'),
      api.get('/reports/smart')
    ]).then(([resDaily, resSmart]) => {
      setStats(resDaily.data);
      setSmart(resSmart.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const COLORS = ['#f6a623', '#3fb950', '#388bfd', '#bc8cff'];
  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dash.greeting_morning');
    if (hour < 17) return t('dash.greeting_afternoon');
    return t('dash.greeting_evening');
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <>
      <TopBar title={t('nav.dashboard')} />
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">{t('dash.welcome').replace('{time}', getGreeting())}</div>
            <div className="page-subtitle">{t('dash.today')}, {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card accent">
            <div className="kpi-label">{t('dash.total_revenue')}</div>
            <div className="kpi-value">{fmt(stats?.summary?.total_revenue)}</div>
            <div className="kpi-sub">{t('dash.incl_vat')}</div>
            <span className="kpi-icon">💰</span>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">{t('dash.net_profit')}</div>
            <div className="kpi-value">{fmt(stats?.summary?.total_profit)}</div>
            <div className="kpi-sub">{t('dash.excl_tax')}</div>
            <span className="kpi-icon">📈</span>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-label">{t('dash.transactions')}</div>
            <div className="kpi-value">{stats?.summary?.total_transactions || 0}</div>
            <div className="kpi-sub">{t('dash.sales_today')}</div>
            <span className="kpi-icon">🧾</span>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-label">{t('dash.vat_collected')}</div>
            <div className="kpi-value">{fmt(stats?.summary?.total_tax)}</div>
            <div className="kpi-sub">{t('dash.vat_15')}</div>
            <span className="kpi-icon">🏛️</span>
          </div>
        </div>

        {smart && (
          <div className="card mb-4" style={{ background: 'var(--blue-dim)', borderColor: 'var(--blue)', padding: '24px 28px' }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <span className="card-title text-blue" style={{ fontSize: '1rem', fontWeight: 800 }}>💡 {t('dash.smart_insights')}</span>
            </div>
            <div className="grid-3" style={{ gap: 24 }}>
              <div className="kpi-card" style={{ background: 'var(--bg-surface)', padding: 16 }}>
                <div className="kpi-label" style={{ color: 'var(--blue)' }}>🏆 {t('dash.most_sold')}</div>
                <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{smart.mostSold.name}</div>
                <div className="kpi-sub">{smart.mostSold.qty} {t('invoice.qty')}</div>
              </div>
              <div className="kpi-card" style={{ background: 'var(--bg-surface)', padding: 16 }}>
                <div className="kpi-label" style={{ color: 'var(--red)' }}>📉 {t('dash.least_sold')}</div>
                <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{smart.leastSold.name}</div>
                <div className="kpi-sub">{smart.leastSold.qty} {t('invoice.qty')}</div>
              </div>
              <div className="kpi-card" style={{ background: 'var(--bg-surface)', padding: 16, height: 110 }}>
                <div className="kpi-label" style={{ color: 'var(--green)', marginBottom: 8 }}>📊 {t('dash.daily_profits')}</div>
                <div style={{ width: '100%', height: 50 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={smart.byDay}>
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-elevated)', border: 'none', borderRadius: 8, fontSize: 12, padding: 8 }} 
                        formatter={(value) => [fmt(value), t('dash.net_profit')]}
                        labelFormatter={(label) => label}
                      />
                      <Line type="monotone" dataKey="profit" stroke="var(--green)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('dash.top_items')}</span></div>
            <div style={{ height: 300 }}>
              {stats?.topItems?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topItems.slice(0, 5)} margin={{ left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-25} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="qty_sold" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-text">{t('dash.no_items')}</div></div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">{t('dash.payment_methods')}</span></div>
            <div style={{ height: 300 }}>
              {stats?.paymentStats?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.paymentStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {stats.paymentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-text">{t('dash.no_transactions')}</div></div>
              )}
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">{t('dash.recent_tx')}</span>
            <button className="btn btn-ghost btn-sm">{t('dash.view_all')}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('ref.invoice_number')}</th>
                  <th>{t('common.room')}</th>
                  <th>{t('pos.payment_method')}</th>
                  <th>{t('dash.cashier')}</th>
                  <th>{t('dash.time')}</th>
                  <th>{t('common.total')}</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentSales?.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="badge badge-gray">{sale.invoice_number}</span></td>
                    <td>{sale.room_number}</td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sale.payment_method}</span></td>
                    <td>{sale.cashier}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats?.recentSales || stats.recentSales.length === 0) && (
              <div className="empty-state">
                <div className="empty-state-text">{t('dash.no_sales')}</div>
                <div className="empty-state-sub">{t('dash.no_sales_hint')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
