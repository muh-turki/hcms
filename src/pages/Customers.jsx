import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';

const EMPTY = { name: '', phone: '', notes: '' };

export default function Customers() {
  const { user } = useAuth();
  const { t } = useApp();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetch(); }, []);
  const fetch = () => {
    setLoading(true);
    api.get('/customers').then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  const open = (i = null) => { setForm(i || EMPTY); setModal(i ? 'edit' : 'add'); };
  const close = () => { setModal(null); setForm(EMPTY); };

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') await api.post('/customers', form);
      else await api.put(`/customers/${form.id}`, form);
      toast.success(modal === 'add' ? 'Customer added!' : 'Updated!');
      close(); fetch();
    } catch { toast.error('Error saving customer'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!window.confirm(t('common.delete') + '?')) return;
    try { await api.delete(`/customers/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.phone?.includes(search));

  return (
    <>
      <TopBar title={t('cust.customers')} />
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">{modal === 'add' ? t('cust.add') : t('cust.edit')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">{t('common.name')} <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.phone')}</label>
                <input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
                <textarea className="form-input" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={close}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : t('cust.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page">
        <div className="page-header">
          <div><div className="page-title">{t('cust.customers')}</div><div className="page-subtitle">{items.length} {t('cust.count')}</div></div>
          {isAdmin && <button className="btn btn-primary" onClick={() => open()}>➕ {t('common.add')}</button>}
        </div>

        <div className="filters-bar">
          <div className="search-bar"><span className="search-icon">🔍</span><input className="form-input" placeholder={t('common.search') + '…'} value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('common.phone')}</th>
                  <th>{t('common.notes')}</th>
                  <th>{t('common.joined')}</th>
                  {isAdmin && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.name}</td>
                    <td>{i.phone || '—'}</td>
                    <td><div style={{ maxWidth: 260, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{i.notes || '—'}</div></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{i.created_at?.slice(0, 10)}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => open(i)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(i.id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state"><div className="empty-state-text">{t('cust.no_results')}</div></div>}
          </div>
        )}
      </div>
    </>
  );
}
