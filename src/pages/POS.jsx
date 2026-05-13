import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';

export default function POS() {
  const { user } = useAuth();
  const { t, lang, settings } = useApp();
  const [products, setProducts] = useState([]);
  const [cart, setCart]         = useState([]);
  const [search, setSearch]     = useState('');
  const [cat, setCat]           = useState('All');
  const [room, setRoom]         = useState('');
  const [method, setMethod]     = useState('Cash');
  const [includeTax, setIncludeTax] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [invoice, setInvoice]   = useState(null);
  const printRef = useRef();

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(() => {});
  }, []);

  const addToCart = p => {
    if (p.track_stock && p.current_stock <= 0) return toast.error(t('pos.out_of_stock'));
    setCart(curr => {
      const exist = curr.find(it => it.id === p.id);
      if (exist) return curr.map(it => it.id === p.id ? { ...it, qty: it.qty + 1 } : it);
      return [...curr, { id: p.id, name: p.name, price: p.selling_price, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(curr => curr.map(it => it.id === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it));
  };

  const removeFromCart = id => setCart(curr => curr.filter(it => it.id !== id));

  const subtotal = cart.reduce((acc, it) => acc + (it.price * it.qty), 0);
  const tax = includeTax ? subtotal * 0.15 : 0;
  const total = subtotal + tax;

  const completeSale = async () => {
    if (!room.trim()) return toast.error(t('pos.room_number') + ' ' + (lang === 'ar' ? 'مطلوب' : 'is required'));
    if (!cart.length) return toast.error(t('pos.cart_empty'));
    setLoading(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map(it => ({ product_id: it.id, quantity: it.qty })),
        payment_method: method,
        room_number: room,
        apply_tax: includeTax
      });
      setInvoice(data);
      setCart([]);
      setRoom('');
      toast.success(t('pos.sale_complete'));
      // Update local stock
      api.get('/products').then(res => setProducts(res.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => 
    (cat === 'All' || p.category === cat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

  if (invoice) {
    return (
      <div className="modal-overlay">
        <div className="modal modal-md">
          <div className="modal-header">
            <h3 className="modal-title">✅ {t('pos.sale_complete')}</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setInvoice(null)}>✕</button>
          </div>
          
          <div className="invoice-print" ref={printRef}>
            <div className="invoice-header">
              <div className="invoice-brand">
                {settings?.logo_data && (
                  <img src={settings.logo_data} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12 }} />
                )}
                <div className="invoice-hotel-name">{settings?.hotel_name || t('invoice.hotel_name')}</div>
                <div className="invoice-hotel-sub">{t('invoice.system')}</div>
              </div>
              <div className="invoice-meta">
                <div className="invoice-number">{invoice.invoice_number}</div>
                <div className="invoice-date">{new Date(invoice.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</div>
              </div>
            </div>

            <div className="invoice-info-grid">
              <div><strong>{t('invoice.cashier')}:</strong> {invoice.cashier || user.username}</div>
              <div className="text-right"><strong>{t('invoice.payment')}:</strong> {invoice.payment_method === 'Cash' && lang === 'ar' ? 'كاش' : invoice.payment_method}</div>
              <div><strong>{t('invoice.room')}:</strong> {invoice.room_number}</div>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t('invoice.item')}</th>
                  <th>{t('invoice.product')}</th>
                  <th>{t('invoice.qty')}</th>
                  <th>{t('invoice.unit_price')}</th>
                  <th>{t('invoice.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.product_name}</td>
                    <td>{it.quantity}</td>
                    <td>{Number(it.price).toFixed(2)}</td>
                    <td>{(it.quantity * it.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-totals">
              <div className="line"><span>{t('pos.subtotal')}:</span> <span>{fmt(invoice.total_amount - invoice.tax_amount)}</span></div>
              {invoice.tax_amount > 0 && <div className="line"><span>{t('pos.vat')}:</span> <span>{fmt(invoice.tax_amount)}</span></div>}
              <div className="line total-line"><span>{t('invoice.total_row')}:</span> <span>{fmt(invoice.total_amount)}</span></div>
            </div>

            <div className="invoice-footer">{t('invoice.thank_you')}</div>
          </div>

          <div className="modal-footer no-print">
            <button className="btn btn-secondary" onClick={() => setInvoice(null)}>{t('invoice.close')}</button>
            <button className="btn btn-primary" onClick={() => window.print()}>{t('invoice.print')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar title={t('nav.pos')} />
      <div className="pos-layout">
        <div className="pos-products">
          <div className="filters-bar">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input 
                className="form-input" 
                placeholder={t('pos.search')} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button 
                  key={c} 
                  className={`btn btn-sm ${cat === c ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCat(c)}
                >
                  {c === 'All' ? t('common.all') : t('cat.' + c)}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid">
            {filtered.map(p => {
              const tracked = p.track_stock !== 0;
              const outOfStock = tracked && p.current_stock <= 0;
              return (
              <div 
                key={p.id} 
                className={`product-card ${outOfStock ? 'out-of-stock' : ''}`}
                onClick={() => addToCart(p)}
              >
                <div className="product-card-category">{t('cat.' + p.category)}</div>
                <div className="product-card-emoji">
                  {p.category.toLowerCase().includes('bev') ? '☕' : 
                   p.category.toLowerCase().includes('food') ? '🍔' : 
                   p.category.toLowerCase().includes('dess') ? '🍰' : '📦'}
                </div>
                <div className="product-card-name">{p.name}</div>
                <div className="product-card-price">{fmt(p.selling_price)}</div>
                <div className="product-card-stock">
                  {!tracked ? `♾️ ${lang === 'ar' ? 'متاح دائماً' : 'Always available'}` :
                   p.current_stock > 0 ? `${p.current_stock} ${t('pos.available')}` : t('pos.out_of_stock')}
                </div>
              </div>
              );
            })}
          </div>
          {filtered.length === 0 && <div className="empty-state">No products found</div>}
        </div>

        <div className="pos-cart">
          <div className="pos-cart-header">
            <span>🛒 {t('pos.cart')}</span>
            {cart.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>{t('pos.clear_all')}</button>}
          </div>
          
          <div className="pos-cart-items">
            {cart.map(it => (
              <div key={it.id} className="cart-item">
                <div className="cart-item-name">{it.name}</div>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQty(it.id, -1)}>−</button>
                  <span className="qty-display">{it.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(it.id, 1)}>+</button>
                </div>
                <div className="cart-item-price">{fmt(it.price * it.qty)}</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeFromCart(it.id)}>✕</button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛒</div>
                <div className="empty-state-text">{t('pos.cart_empty')}</div>
                <div className="empty-state-sub">{t('pos.click_to_add')}</div>
              </div>
            )}
          </div>

          <div className="pos-cart-footer">
            <div className="cart-totals">
              <div className="row"><span>{t('pos.subtotal')}</span><span>{fmt(subtotal)}</span></div>
              <div className="row" style={{ alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} style={{ width: 16, height: 16 }} />
                  {t('pos.vat')}
                </label>
                <span>{fmt(tax)}</span>
              </div>
              <div className="row total"><span>{t('common.total')}</span><span>{fmt(total)}</span></div>
            </div>

            <div className="divider"></div>

            <div className="form-group">
              <label className="form-label">{t('pos.room_number')} <span className="required">*</span></label>
              <input 
                className="form-input" 
                placeholder={t('pos.room_placeholder')} 
                value={room} 
                onChange={e => setRoom(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('pos.payment_method')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {['Cash', 'Mada', 'Visa', 'MasterCard'].map(m => (
                  <button 
                    key={m} 
                    className={`btn btn-sm ${method === m ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMethod(m)}
                  >
                    {m === 'Cash' ? (lang === 'ar' ? 'كاش' : 'Cash') : m}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="btn btn-primary btn-block btn-lg mt-4" 
              onClick={completeSale}
              disabled={loading || cart.length === 0}
            >
              {loading ? t('pos.processing') : t('pos.complete_sale')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
