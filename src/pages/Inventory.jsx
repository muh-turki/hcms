import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';

const EMPTY = { name: '', name_ar: '', sku: '', category: 'General', cost_price: 0, selling_price: 0, current_stock: 0, min_stock_level: 5, expiry_date: '', track_stock: 1, image_data: null };

export default function Inventory() {
  const { user } = useAuth();
  const { t, lang } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => { fetch(); }, []);
  const fetch = () => {
    setLoading(true);
    api.get('/products').then(r => setProducts(r.data)).finally(() => setLoading(false));
  };

  const open = (p = null) => { setForm(p || EMPTY); setModal(p ? 'edit' : 'add'); };
  const close = () => { setModal(null); setForm(EMPTY); };
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error(isAr ? 'الصورة كبيرة جداً (الحد 500KB)' : 'Image too large (max 500KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => f('image_data', reader.result);
    reader.readAsDataURL(file);
  };

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') await api.post('/products', form);
      else await api.put(`/products/${form.id}`, form);
      toast.success(modal === 'add' ? 'Added!' : 'Updated!');
      close(); fetch();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!window.confirm(t('common.delete') + '?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const isAr = lang === 'ar';

  return (
    <>
      <TopBar title={t('nav.inventory')} />
      
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">{modal === 'add' ? `➕ ${t('inv.add_product')}` : `✏️ ${t('inv.edit_product')}`}</h3>
              <button className="btn btn-ghost btn-icon" onClick={close}>✕</button>
            </div>
            <form onSubmit={save}>

              {/* ── Product Image ── */}
              <div className="form-group" style={{ textAlign: 'center' }}>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 100, height: 100, margin: '0 auto 8px',
                    borderRadius: 16,
                    border: `2px dashed ${form.image_data ? 'transparent' : 'var(--border)'}`,
                    background: form.image_data ? 'transparent' : 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = form.image_data ? 'transparent' : 'var(--border)'}
                >
                  {form.image_data ? (
                    <img src={form.image_data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 28 }}>📷</div>
                      <div style={{ fontSize: '0.7rem' }}>{isAr ? 'أضف صورة' : 'Add Image'}</div>
                    </div>
                  )}
                </div>
                {form.image_data && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); f('image_data', null); }}
                    style={{ fontSize: '0.75rem', color: 'var(--red)' }}>
                    🗑️ {isAr ? 'حذف الصورة' : 'Remove'}
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('common.name')} (English) <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. Arabic Coffee" value={form.name} onChange={e => f('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">الاسم بالعربي <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>(يظهر للنزيل في قائمة الغرف)</span></label>
                <input
                  className="form-input"
                  placeholder="مثال: قهوة عربية"
                  value={form.name_ar || ''}
                  onChange={e => f('name_ar', e.target.value)}
                  dir="rtl"
                  style={{ textAlign: 'right', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('inv.sku')}</label>
                  <input className="form-input" value={form.sku} onChange={e => f('sku', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('common.category')}</label>
                  <select className="form-select" value={form.category} onChange={e => f('category', e.target.value)}>
                    {['Beverages', 'Food', 'Desserts', 'Snacks', 'General'].map(cat => (
                      <option key={cat} value={cat}>{t('cat.' + cat)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('inv.cost_price')}</label>
                  <input className="form-input" type="number" step="0.01" value={form.cost_price} onChange={e => f('cost_price', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('inv.selling_price')}</label>
                  <input className="form-input" type="number" step="0.01" value={form.selling_price} onChange={e => f('selling_price', e.target.value)} />
                </div>
              </div>

              {/* ── Track Stock Toggle ── */}
              <div className="form-group" style={{
                background: form.track_stock ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${form.track_stock ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.25)'}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }} onClick={() => f('track_stock', form.track_stock ? 0 : 1)}>
                <div style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: form.track_stock ? '#10b981' : '#94a3b8',
                  position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2,
                    left: form.track_stock ? 22 : 2,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {form.track_stock
                      ? (isAr ? '📦 منتج بمخزون محدود' : '📦 Track Stock')
                      : (isAr ? '♾️ منتج بدون مخزون (غير معدود)' : '♾️ Unlimited (No Stock Tracking)')
                    }
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {form.track_stock
                      ? (isAr ? 'يتم خصم الكمية تلقائياً عند كل عملية بيع' : 'Stock is deducted automatically on each sale')
                      : (isAr ? 'مثل القهوة والشاي — لا يُحسب لها مخزون' : 'Like coffee & tea — never runs out of stock')
                    }
                  </div>
                </div>
              </div>

              {form.track_stock ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('inv.current_stock')}</label>
                    <input className="form-input" type="number" value={form.current_stock} onChange={e => f('current_stock', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('inv.min_stock')}</label>
                    <input className="form-input" type="number" value={form.min_stock_level} onChange={e => f('min_stock_level', e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="form-group">
                <label className="form-label">{t('inv.expiry_date')}</label>
                <input className="form-input" type="date" value={form.expiry_date || ''} onChange={e => f('expiry_date', e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={close}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : t('inv.save_product')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page">
        <div className="page-header">
          <div><div className="page-title">{t('nav.inventory')}</div><div className="page-subtitle">{products.length} {products.length === 1 ? 'item' : 'items'} total</div></div>
          {canEdit && <button className="btn btn-primary" onClick={() => open()}>➕ {t('inv.add_product')}</button>}
        </div>

        <div className="filters-bar">
          <div className="search-bar"><span className="search-icon">🔍</span><input className="form-input" placeholder={t('common.search') + '…'} value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>{t('common.name')}</th>
                  <th>{t('common.category')}</th>
                  <th>{t('inv.stock')}</th>
                  <th>{t('inv.min')}</th>
                  <th>{t('common.price')}</th>
                  <th>{t('inv.margin')}</th>
                  <th>{t('inv.expiry')}</th>
                  <th>{t('inv.status')}</th>
                  {canEdit && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const margin = p.selling_price - p.cost_price;
                  const tracked = p.track_stock !== 0;
                  const isLow = tracked && p.current_stock <= p.min_stock_level;
                  const isOut = tracked && p.current_stock <= 0;
                  const catEmoji = p.category?.toLowerCase().includes('bev') ? '☕'
                    : p.category?.toLowerCase().includes('food') ? '🍔'
                    : p.category?.toLowerCase().includes('dess') ? '🍰' : '📦';
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.image_data ? (
                          <img src={p.image_data} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            {catEmoji}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {p.name}
                        {p.name_ar && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', direction: 'rtl', textAlign: 'right' }}>{p.name_ar}</div>}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.sku}</span>
                      </td>
                      <td><span className="badge badge-gray">{t('cat.' + p.category)}</span></td>
                      <td>
                        {tracked
                          ? <span className={`badge ${isOut ? 'badge-red' : isLow ? 'badge-yellow' : 'badge-green'}`}>{p.current_stock}</span>
                          : <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>♾️</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{tracked ? p.min_stock_level : '—'}</td>
                      <td>{Number(p.selling_price).toFixed(2)}</td>
                      <td style={{ color: margin >= 0 ? 'var(--green)' : 'var(--red)' }}>{margin.toFixed(2)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.expiry_date || '—'}</td>
                      <td>
                        {!tracked
                          ? <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{isAr ? '♾️ غير محدود' : '♾️ Unlimited'}</span>
                          : isOut ? <span className="badge badge-red">{t('inv.out')}</span>
                          : isLow ? <span className="badge badge-yellow">{t('inv.low')}</span>
                          : <span className="badge badge-green">{t('inv.ok')}</span>
                        }
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => open(p)}>✏️</button>
                            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>🗑️</button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state"><div className="empty-state-text">{t('inv.no_products')}</div></div>}
          </div>
        )}
      </div>
    </>
  );
}
