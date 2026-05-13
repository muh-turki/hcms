import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

export default function RoomConsumption() {
  const { t, lang } = useApp();
  const [room, setRoom]       = useState('');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');

  const search = async e => {
    e.preventDefault();
    if (!room.trim()) return toast.error(lang === 'ar' ? 'أدخل رقم الغرفة' : 'Enter a room number');
    setLoading(true);
    try {
      let url = `/reports/room/${encodeURIComponent(room.trim())}`;
      const params = [];
      if (from) params.push(`from=${from}`);
      if (to)   params.push(`to=${to}`);
      if (params.length) url += '?' + params.join('&');
      const { data: d } = await api.get(url);
      setData(d);
    } catch {
      toast.error(lang === 'ar' ? 'فشل جلب البيانات' : 'Failed to fetch room data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <TopBar title={t('room.title')} />
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">🏨 {t('room.title')}</div>
            <div className="page-subtitle">{t('room.subtitle')}</div>
          </div>
        </div>

        {/* Search form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={search} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: '0 0 180px' }}>
              <label className="form-label">{t('room.room_number')} <span className="required">*</span></label>
              <input className="form-input" value={room} onChange={e => setRoom(e.target.value)} placeholder={t('pos.room_placeholder')} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('common.from')}</label>
              <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('common.to')}</label>
              <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳' : t('room.search_btn')}
            </button>
          </form>
        </div>

        {data && (
          <>
            {/* Summary cards */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card blue">
                <div className="kpi-label">{t('common.room')}</div>
                <div className="kpi-value" style={{ fontSize: '2.5rem' }}>#{data.room}</div>
              </div>
              <div className="kpi-card accent">
                <div className="kpi-label">{t('room.total_spent')}</div>
                <div className="kpi-value">{fmt(data.total)}</div>
              </div>
              <div className="kpi-card green">
                <div className="kpi-label">{t('room.transactions')}</div>
                <div className="kpi-value">{data.sales.length}</div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
              {/* Product summary */}
              <div className="card">
                <div className="card-header"><span className="card-title">{t('room.items_consumed')}</span></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t('ref.product')}</th><th>{t('invoice.qty')}</th><th>{t('common.total')}</th></tr></thead>
                    <tbody>
                      {data.summary.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{s.product_name}</td>
                          <td><span className="badge badge-accent">{s.total_qty}</span></td>
                          <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmt(s.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.summary.length === 0 && <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-text">{t('room.no_items')}</div></div>}
                </div>
              </div>

              {/* Transaction history */}
              <div className="card">
                <div className="card-header"><span className="card-title">{t('room.tx_history')}</span></div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {data.sales.map(sale => (
                    <div key={sale.sale_id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="badge badge-gray">{sale.invoice_number}</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(sale.total_amount)}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        {new Date(sale.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')} · {sale.payment_method === 'Cash' && lang === 'ar' ? 'كاش' : sale.payment_method} · {sale.cashier}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {sale.items.map((item, j) => (
                          <span key={j} className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                            {item.quantity}× {item.product_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {data.sales.length === 0 && <div className="empty-state" style={{ padding: 30 }}><div className="empty-state-text">{t('room.no_transactions')}</div></div>}
                </div>
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="empty-state card" style={{ padding: 60 }}>
            <div className="empty-state-icon">🏨</div>
            <div className="empty-state-text">{t('room.search_hint')}</div>
            <div className="empty-state-sub">{t('room.hint')}</div>
          </div>
        )}
      </div>
    </>
  );
}
