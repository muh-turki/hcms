import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import * as XLSX from 'xlsx';

const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

export default function Reports() {
  const { user } = useAuth();
  const { t, lang } = useApp();
  const [tab, setTab]         = useState('Daily');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [date, setDate]       = useState(now.toISOString().slice(0, 10));
  const [year, setYear]       = useState(String(now.getFullYear()));
  const [month, setMonth]     = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [profitFrom, setProfitFrom] = useState('');
  const [profitTo, setProfitTo]     = useState('');

  const isAdmin = user?.role === 'admin';
  const TABS = isAdmin ? ['Daily', 'Monthly', 'Inventory', 'Profit'] : ['Daily', 'Monthly'];

  const tabLabels = {
    'Daily': t('rep.daily'),
    'Monthly': t('rep.monthly'),
    'Inventory': t('rep.inventory'),
    'Profit': t('rep.profit')
  };

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      if (tab === 'Daily')     res = await api.get(`/reports/daily?date=${date}`);
      if (tab === 'Monthly')   res = await api.get(`/reports/monthly?year=${year}&month=${month}`);
      if (tab === 'Inventory') res = await api.get('/reports/inventory');
      if (tab === 'Profit')    res = await api.get(`/reports/profit?from=${profitFrom}&to=${profitTo}`);
      setData(res.data);
    } catch { toast.error(lang === 'ar' ? 'فشل تحميل التقرير' : 'Failed to load report'); }
    finally { setLoading(false); }
  }, [tab, date, year, month, profitFrom, profitTo, t, lang]);

  useEffect(() => { load(); }, [tab, load]);

  const exportExcel = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <>
      <TopBar title={t('rep.reports')} />
      <div className="page">
        <div className="page-header">
          <div><div className="page-title">📈 {t('rep.reports')}</div></div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
          {TABS.map(tKey => (
            <button
              key={tKey}
              className={`btn ${tab === tKey ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab(tKey)}
            >
              {tabLabels[tKey]}
            </button>
          ))}
        </div>

        {/* Filters per tab */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {tab === 'Daily' && <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.date')}</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </>}
            {tab === 'Monthly' && <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.year')}</label>
                <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
                  {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.month')}</label>
                <select className="form-select" value={month} onChange={e => setMonth(e.target.value)}>
                  {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={String(m).padStart(2,'0')}>{new Date(2024,m-1).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US',{month:'long'})}</option>)}
                </select>
              </div>
            </>}
            {tab === 'Profit' && <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.from')}</label>
                <input className="form-input" type="date" value={profitFrom} onChange={e => setProfitFrom(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.to')}</label>
                <input className="form-input" type="date" value={profitTo} onChange={e => setProfitTo(e.target.value)} />
              </div>
            </>}
            <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? '⏳' : t('rep.load')}</button>
          </div>
        </div>

        {loading && <div className="loading"><div className="spinner"/></div>}

        {/* DAILY */}
        {tab === 'Daily' && data && (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card accent"><div className="kpi-label">{t('rep.revenue')}</div><div className="kpi-value">{fmt(data.summary.total_revenue)}</div></div>
              {isAdmin && <div className="kpi-card green"><div className="kpi-label">{t('dash.net_profit')}</div><div className="kpi-value">{fmt(data.summary.total_profit)}</div></div>}
              <div className="kpi-card blue"><div className="kpi-label">{t('dash.transactions')}</div><div className="kpi-value">{data.summary.total_transactions || 0}</div></div>
              <div className="kpi-card purple"><div className="kpi-label">{t('dash.vat_15')}</div><div className="kpi-value">{fmt(data.summary.total_tax)}</div></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div className="card">
                <div className="card-header"><span className="card-title">{t('rep.top_items')}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportExcel(data.topItems, `daily-top-items-${date}`)}>📥 Excel</button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topItems.slice(0,8)} margin={{left:-20}}>
                    <XAxis dataKey="name" tick={{fill:'var(--text-secondary)',fontSize:11}} angle={-15} textAnchor="end" height={40} interval={0} />
                    <YAxis tick={{fill:'var(--text-secondary)',fontSize:11}} />
                    <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                    <Bar dataKey="qty_sold" fill="var(--accent)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">{t('rep.all_sales')}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportExcel(data.salesList, `sales-${date}`)}>📥 Excel</button>
                </div>
                <div className="table-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>{t('ref.invoice_number')}</th><th>{t('common.room')}</th><th>{t('pos.payment_method')}</th><th>{t('common.total')}</th></tr></thead>
                    <tbody>
                      {data.salesList.map(s => (
                        <tr key={s.id}>
                          <td><span className="badge badge-gray" style={{fontSize:'0.72rem'}}>{s.invoice_number}</span></td>
                          <td>{s.room_number}</td>
                          <td>{s.payment_method === 'Cash' && lang === 'ar' ? 'كاش' : s.payment_method}</td>
                          <td style={{color:'var(--accent)',fontWeight:700}}>{fmt(s.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.salesList.length===0 && <div className="empty-state" style={{padding:30}}><div className="empty-state-text">{t('dash.no_sales')}</div></div>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* MONTHLY */}
        {tab === 'Monthly' && data && (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card accent"><div className="kpi-label">{t('rep.revenue')}</div><div className="kpi-value">{fmt(data.summary.total_revenue)}</div></div>
              {isAdmin && <div className="kpi-card green"><div className="kpi-label">{t('dash.net_profit')}</div><div className="kpi-value">{fmt(data.summary.total_profit)}</div></div>}
              <div className="kpi-card blue"><div className="kpi-label">{t('dash.transactions')}</div><div className="kpi-value">{data.summary.total_transactions || 0}</div></div>
              <div className="kpi-card purple"><div className="kpi-label">{t('dash.vat_15')}</div><div className="kpi-value">{fmt(data.summary.total_tax)}</div></div>
            </div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title">{t('rep.daily_revenue')} — {new Date(year, month-1).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US',{month:'long'})} {year}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => exportExcel(data.byDay, `monthly-${year}-${month}`)}>📥 Excel</button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.byDay} margin={{left:-10,right:10,top:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{fill:'var(--text-secondary)',fontSize:11}} />
                  <YAxis tick={{fill:'var(--text-secondary)',fontSize:11}} />
                  <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>[`SAR ${Number(v).toFixed(2)}`]} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  {isAdmin && <Line type="monotone" dataKey="profit"  stroke="var(--green)" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* INVENTORY */}
        {isAdmin && tab === 'Inventory' && data && (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card blue"><div className="kpi-label">{t('rep.total_products')}</div><div className="kpi-value">{data.summary.total_products}</div></div>
              <div className="kpi-card red"><div className="kpi-label">{t('rep.low_stock_items')}</div><div className="kpi-value">{data.summary.low_stock_count}</div></div>
              <div className="kpi-card accent"><div className="kpi-label">{t('rep.stock_value')}</div><div className="kpi-value">{fmt(data.summary.total_stock_value)}</div></div>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('rep.inventory_status')}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => exportExcel(data.products.map(p=>({Name:p.name,SKU:p.sku,Category:p.category,Cost:p.cost_price,Price:p.selling_price,Stock:p.current_stock,MinStock:p.min_stock_level,Expiry:p.expiry_date})), 'inventory-report')}>📥 Excel</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t('common.name')}</th><th>{t('common.category')}</th><th>{t('inv.stock')}</th><th>{t('inv.min')}</th><th>{t('inv.cost_price')}</th><th>{t('common.price')}</th><th>{t('inv.margin')}</th><th>{t('inv.expiry')}</th><th>{t('inv.status')}</th></tr></thead>
                  <tbody>
                    {data.products.map(p => (
                      <tr key={p.id}>
                        <td style={{fontWeight:600}}>{p.name}</td>
                        <td><span className="badge badge-gray">{t('cat.' + p.category)}</span></td>
                        <td><span className={`badge ${p.current_stock<=0?'badge-red':p.is_low_stock?'badge-yellow':'badge-green'}`}>{p.current_stock}</span></td>
                        <td style={{color:'var(--text-muted)'}}>{p.min_stock_level}</td>
                        <td>{fmt(p.cost_price)}</td>
                        <td style={{color:'var(--accent)'}}>{fmt(p.selling_price)}</td>
                        <td style={{color: p.margin>=0?'var(--green)':'var(--red)'}}>{fmt(p.margin)}</td>
                        <td style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{p.expiry_date||'—'}</td>
                        <td>
                          {p.current_stock <= 0 ? <span className="badge badge-red">{t('inv.out')}</span>
                           : p.is_low_stock ? <span className="badge badge-yellow">{t('inv.low')}</span>
                           : <span className="badge badge-green">{t('inv.ok')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* PROFIT */}
        {isAdmin && tab === 'Profit' && data && (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card accent"><div className="kpi-label">{t('rep.revenue')}</div><div className="kpi-value">{fmt(data.totals.revenue)}</div></div>
              <div className="kpi-card red"><div className="kpi-label">{t('rep.cost')}</div><div className="kpi-value">{fmt(data.totals.cost)}</div></div>
              <div className="kpi-card green"><div className="kpi-label">{t('dash.net_profit')}</div><div className="kpi-value">{fmt(data.totals.profit)}</div></div>
              <div className="kpi-card blue">
                <div className="kpi-label">{t('rep.margin')}</div>
                <div className="kpi-value">{data.totals.revenue > 0 ? ((data.totals.profit/data.totals.revenue)*100).toFixed(1) : 0}%</div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">{t('rep.profit_by_product')}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => exportExcel(data.rows, 'profit-report')}>📥 Excel</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t('ref.product')}</th><th>{t('common.category')}</th><th>{t('rep.qty_sold')}</th><th>{t('rep.revenue')}</th><th>{t('rep.cost')}</th><th>{t('dash.net_profit')}</th></tr></thead>
                  <tbody>
                    {data.rows.map(r => (
                      <tr key={r.id}>
                        <td style={{fontWeight:600}}>{r.name}</td>
                        <td><span className="badge badge-gray">{t('cat.' + r.category)}</span></td>
                        <td><span className="badge badge-blue">{r.qty_sold}</span></td>
                        <td>{fmt(r.revenue)}</td>
                        <td style={{color:'var(--text-secondary)'}}>{fmt(r.cost)}</td>
                        <td style={{fontWeight:700,color:r.profit>=0?'var(--green)':'var(--red)'}}>{fmt(r.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rows.length===0 && <div className="empty-state" style={{padding:30}}><div className="empty-state-text">{t('rep.no_data')}</div></div>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
