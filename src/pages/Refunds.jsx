import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

export default function Refunds() {
  const { t, lang } = useApp();
  const [refunds, setRefunds]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [modal, setModal]           = useState(false);
  const [invoiceNum, setInvoiceNum] = useState('');
  const [saleData, setSaleData]     = useState(null);
  const [form, setForm]             = useState({ product_id: '', quantity: 1, reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]         = useState('');

  useEffect(() => { fetchRefunds(); }, []);
  const fetchRefunds = () => {
    api.get('/refunds').then(r => setRefunds(r.data)).catch(() => {});
  };

  const lookupSale = async e => {
    e.preventDefault();
    if (!invoiceNum.trim()) return;
    setLoading(true);
    setSaleData(null);
    try {
      const { data } = await api.get('/sales', { params: { limit: 100 } });
      const sale = data.find(s => s.invoice_number === invoiceNum.trim());
      if (!sale) return toast.error(lang === 'ar' ? 'الفاتورة غير موجودة' : 'Invoice not found');
      const { data: full } = await api.get(`/sales/${sale.id}`);
      setSaleData(full);
      setForm({ product_id: full.items[0]?.product_id || '', quantity: 1, reason: '' });
    } catch {
      toast.error(lang === 'ar' ? 'فشل البحث' : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const submitRefund = async e => {
    e.preventDefault();
    if (!saleData) return;
    setSubmitting(true);
    try {
      await api.post('/refunds', { sale_id: saleData.id, product_id: parseInt(form.product_id), quantity: parseInt(form.quantity), reason: form.reason });
      toast.success(lang === 'ar' ? 'تمت عملية الإرجاع واستعادة المخزون' : 'Refund processed! Stock restored.');
      setModal(false);
      setSaleData(null);
      setInvoiceNum('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.error || (lang === 'ar' ? 'فشلت العملية' : 'Refund failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;
  const filtered = refunds.filter(r =>
    r.invoice_number?.includes(search) ||
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title={t('ref.refunds')} />
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">{t('ref.process_refund')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>

            <form onSubmit={lookupSale} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input className="form-input" placeholder={t('ref.enter_invoice')} value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-secondary" disabled={loading}>{loading ? '⏳' : t('ref.lookup')}</button>
            </form>

            {saleData && (
              <div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, fontSize: '0.85rem' }}>
                  <strong>{saleData.invoice_number}</strong> · {t('common.room')} {saleData.room_number} · {saleData.payment_method === 'Cash' && lang === 'ar' ? 'كاش' : saleData.payment_method}<br />
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(saleData.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>

                <form onSubmit={submitRefund}>
                  <div className="form-group">
                    <label className="form-label">{t('ref.product')} <span className="required">*</span></label>
                    <select className="form-select" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required>
                      {saleData.items.map(it => (
                        <option key={it.product_id} value={it.product_id}>
                          {it.product_name} ({t('ref.quantity')}: {it.quantity}) — {fmt(it.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t('ref.quantity')} <span className="required">*</span></label>
                      <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('ref.reason')} <span className="required">*</span></label>
                      <input className="form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('ref.optional_reason')} required />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-danger" disabled={submitting}>{submitting ? '...' : t('ref.submit')}</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="page">
        <div className="page-header">
          <div><div className="page-title">{t('ref.refunds')}</div><div className="page-subtitle">{refunds.length} {t('ref.total_refunds')}</div></div>
          <button className="btn btn-danger" onClick={() => setModal(true)}>{t('ref.new_refund')}</button>
        </div>

        <div className="filters-bar">
          <div className="search-bar"><span className="search-icon">🔍</span><input className="form-input" placeholder={t('common.search') + '…'} value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('ref.invoice_number')}</th><th>{t('ref.product')}</th><th>{t('ref.quantity')}</th><th>{t('ref.reason')}</th><th>{t('ref.refunded_by')}</th><th>{t('common.date')}</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-gray">{r.invoice_number}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.product_name}</td>
                  <td><span className="badge badge-red">{r.quantity}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.reason || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.refunded_by_name || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state"><div className="empty-state-icon">↩️</div><div className="empty-state-text">{t('ref.no_refunds')}</div></div>}
        </div>
      </div>
    </>
  );
}
