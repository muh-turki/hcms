import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

const EMPTY = { username: '', password: '', role: 'staff', full_name: '' };

export default function Users() {
  const { t } = useApp();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetch(); }, []);
  const fetch = () => {
    setLoading(true);
    api.get('/users').then(r => setUsers(r.data)).catch(() => toast.error('Access denied')).finally(() => setLoading(false));
  };

  const f = (k, v) => setForm(frm => ({ ...frm, [k]: v }));
  const open = (u = null) => { setForm(u ? { ...u, password: '' } : EMPTY); setModal(u ? 'edit' : 'add'); };
  const close = () => { setModal(null); setForm(EMPTY); };

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') await api.post('/users', form);
      else await api.put(`/users/${form.id}`, form);
      toast.success(modal === 'add' ? 'User created!' : 'Updated!');
      close(); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!window.confirm(t('common.delete') + '?')) return;
    try { await api.delete(`/users/${id}`); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  return (
    <>
      <TopBar title={t('usr.users')} />
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">{modal === 'add' ? `➕ ${t('usr.add')}` : `✏️ ${t('usr.edit')}`}</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">{t('usr.fullname')}</label>
                <input className="form-input" value={form.full_name || ''} onChange={e => f('full_name', e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('usr.username')} <span className="required">*</span></label>
                <input className="form-input" value={form.username} onChange={e => f('username', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('usr.password')} {modal === 'edit' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('usr.password_hint')}</span>}</label>
                <input className="form-input" type="password" value={form.password || ''} onChange={e => f('password', e.target.value)} placeholder={modal === 'edit' ? '••••••••' : 'Min 6 chars'} required={modal === 'add'} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('usr.role')} <span className="required">*</span></label>
                <select className="form-select" value={form.role} onChange={e => f('role', e.target.value)} required>
                  <option value="admin">{t('usr.admin')}</option>
                  <option value="staff">{t('usr.staff')}</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={close}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : t('usr.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page">
        <div className="page-header">
          <div><div className="page-title">👥 {t('usr.users')}</div><div className="page-subtitle">{users.length} {t('usr.count')}</div></div>
          <button className="btn btn-primary" onClick={() => open()}>➕ {t('usr.add')}</button>
        </div>
        {loading ? <div className="loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('usr.fullname')}</th><th>{t('usr.username')}</th><th>{t('usr.role')}</th><th>{t('usr.created')}</th><th>{t('common.actions')}</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                    <td><code style={{ color: 'var(--blue)' }}>{u.username}</code></td>
                    <td>{u.role === 'admin' ? <span className="badge badge-accent">{t('usr.admin')}</span> : <span className="badge badge-gray">{t('usr.staff')}</span>}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.created_at?.slice(0, 10)}</td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => open(u)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
