import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

// Using relative API path for network flexibility
const API_URL = '/api';

export default function GuestMenu() {
  const [params] = useSearchParams();
  const room = params.get('room');
  const lang = 'ar'; // Default to Arabic for guest menu
  
  const [menu, setMenu] = useState([]);
  const [settings, setSettings] = useState({});
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null); // { id, status }
  const lastStatus = React.useRef(null);

  // Check for existing order on load
  useEffect(() => {
    const savedId = localStorage.getItem('hcms_active_order_id');
    if (savedId) {
      setActiveOrder({ id: savedId, status: 'pending' });
    }
  }, []);

  // Polling for status
  useEffect(() => {
    if (!activeOrder?.id) return;
    
    const checkStatus = async () => {
      try {
        const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
        const res = await fetch(`${baseUrl}/guest/orders/${activeOrder.id}/status`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data.status !== activeOrder.status) {
          setActiveOrder(prev => ({ ...prev, status: data.status }));
          
          if (data.status === 'accepted') {
            toast.success(lang === 'ar' ? 'تم قبول طلبك' : 'Order accepted!', { duration: 5000 });
          } else if (data.status === 'completed') {
            toast.success(lang === 'ar' ? 'تم الانتهاء من طلبك وسوف يتم ارساله للغرفة' : 'Order finished, on its way!', { duration: 8000 });
            localStorage.removeItem('hcms_active_order_id');
            setTimeout(() => setActiveOrder(null), 20000);
          }
        }
      } catch (err) {
        console.error('Poller error', err);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [activeOrder, lang]);

  useEffect(() => {
    // Determine dynamic API URL (relative to current host)
    const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
    
    fetch(`${baseUrl}/guest/menu`)
      .then(r => r.json())
      .then(data => { 
        setMenu(data.menu || []); 
        setSettings(data.settings || {});
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, []);

  const isServiceOpen = () => {
    if (settings.qr_enabled === 'false') return false;
    if (!settings.qr_hours) return true;
    
    // Parse "08:00-02:00"
    const [start, end] = settings.qr_hours.split('-');
    if (!start || !end) return true;
    
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const currentMins = h * 60 + m;
    
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    let endMins = h2 * 60 + m2;
    
    if (endMins <= startMins) {
      endMins += 24 * 60; // next day
    }
    
    let checkMins = currentMins;
    if (endMins > 24 * 60 && currentMins < endMins - 24 * 60) {
      checkMins += 24 * 60;
    }
    
    return checkMins >= startMins && checkMins <= endMins;
  };

  const maxItems = parseInt(settings.qr_max_items || '10');
  const cartTotalQuantity = cart.reduce((s, i) => s + i.quantity, 0);

  const adjustQty = (product, delta) => {
    if (delta > 0 && cartTotalQuantity >= maxItems) {
      return toast.error(`الحد الأقصى للطلب هو ${maxItems} منتجات`);
    }
    
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (!ex && delta > 0) return [...prev, { ...product, quantity: 1 }];
      
      return prev.map(i => {
        if (i.id === product.id) {
          const newQ = i.quantity + delta;
          if (newQ > product.current_stock) {
            toast.error('الكمية المطلوبة تتجاوز المخزون');
            return i;
          }
          return { ...i, quantity: newQ };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  };

  const getQty = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const placeOrder = async () => {
    if (!room) return toast.error('رقم الغرفة غير متوفر! يرجى مسح الكود الصحيح.');
    if (cart.length === 0) return toast.error('السلة فارغة');
    
    setSubmitting(true);
    try {
      const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
      const res = await fetch(`${baseUrl}/guest/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_number: room, cart, notes })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل الطلب');
      }
      setSuccess(true);
      const data = await res.json();
      localStorage.setItem('hcms_active_order_id', data.id);
      setActiveOrder({ id: data.id, status: 'pending' });
      
      setCart([]);
      setCartOpen(false);
      toast.success(lang === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Order sent successfully');
    } catch (err) {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>جاري تحميل القائمة...</div>;

  if (!isServiceOpen() && !success) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', dir: 'rtl' }}>
      <h1 style={{ fontSize: 60, margin: '20px 0' }}>🌙</h1>
      <h2>الخدمة غير متوفرة حالياً</h2>
      <p style={{ color: '#666' }}>أوقات العمل المتاحة لخدمة الغرف هي من {settings.qr_hours?.split('-')[0]} إلى {settings.qr_hours?.split('-')[1]}. نرجو زيارتنا لاحقاً.</p>
    </div>
  );

  // Removed the full-screen success return to keep the status banner visible.

  const isNew = (dateStr) => {
    if (!dateStr) return false;
    const created = new Date(dateStr);
    const now = new Date();
    const diff = (now - created) / (1000 * 60 * 60); // hours
    return diff < 48; // Product is "New" for 48 hours
  };

  const total = cart.reduce((s, i) => s + i.selling_price * i.quantity, 0);

  // Group by category
  const categories = [...new Set(menu.map(m => m.category))];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Alexandria', sans-serif", paddingBottom: 100, direction: 'rtl' }}>
      <header className="guest-header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{settings.hotel_name || 'HCMS Menu'}</h1>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{lang === 'ar' ? 'غرفة' : 'Room'} {room}</div>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      {activeOrder && (
        <div style={{ 
          background: activeOrder.status === 'completed' ? '#27ae60' : activeOrder.status === 'accepted' ? '#f39c12' : 'var(--accent)',
          color: '#fff',
          padding: '12px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          transition: 'all 0.3s'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {activeOrder.status === 'pending' && (lang === 'ar' ? '⏳ تم إرسال طلبك بنجاح وقيد الانتظار' : 'Order pending...')}
            {activeOrder.status === 'accepted' && (lang === 'ar' ? '✅ تم قبول طلبك' : 'Order accepted')}
            {activeOrder.status === 'completed' && (lang === 'ar' ? '🚚 تم الانتهاء من طلبك وسوف يتم ارساله للغرفة' : 'Order finished')}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.9 }}>
            #{activeOrder.id} • {lang === 'ar' ? 'الغرفة' : 'Room'} {room}
          </div>
        </div>
      )}

      <main className="container" style={{ paddingBottom: '100px' }}>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', color: '#34495e', borderBottom: '2px solid #ecf0f1', paddingBottom: 6 }}>{cat}</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {menu.filter(m => m.category === cat).map(item => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', opacity: item.out_of_stock ? 0.5 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                            {item.name_ar || item.name}
                          </h4>
                          {item.name_ar && (
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 1 }}>{item.name}</div>
                          )}
                        </div>
                        {isNew(item.created_at) && <span style={{ background: '#059669', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>جديد ✨</span>}
                        {item.out_of_stock && <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>(نفذ)</span>}
                      </div>
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem' }}>SAR {item.selling_price.toFixed(2)}</span>
                    </div>
                    {!item.out_of_stock && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8f9fa', borderRadius: 20, padding: '4px 8px' }}>
                        {qty > 0 ? (
                          <>
                            <button onClick={() => adjustQty(item, -1)} style={{ background: '#34495e', color: '#fff', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>−</button>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{qty}</span>
                            <button onClick={() => adjustQty(item, 1)} style={{ background: '#34495e', color: '#fff', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                          </>
                        ) : (
                          <button onClick={() => adjustQty(item, 1)} style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>إضافة</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          {cartOpen && (
            <div style={{ background: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>مراجعة الطلب</h3>
                <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
              </div>
              
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '1rem' }}>
                  <span>{item.name} <span style={{ color: '#7f8c8d' }}>x{item.quantity}</span></span>
                  <span style={{ fontWeight: 'bold' }}>SAR {(item.selling_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr style={{ borderColor: '#ecf0f1', margin: '16px 0' }} />
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#7f8c8d' }}>ملاحظات إضافية (اختياري)</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="مثال: بدون سكر، ساخن جداً..." 
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdc3c7', fontFamily: 'inherit', resize: 'vertical' }}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 20 }}>
                <span>الإجمالي:</span>
                <span style={{ color: '#e67e22' }}>SAR {total.toFixed(2)}</span>
              </div>
              <button 
                onClick={placeOrder} 
                disabled={submitting}
                style={{ width: '100%', background: '#27ae60', color: '#fff', border: 'none', padding: 16, borderRadius: 12, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب للغرفة'}
              </button>
            </div>
          )}
          
          {!cartOpen && (
            <div 
              onClick={() => setCartOpen(true)}
              style={{ background: '#34495e', color: '#fff', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>السلة ({cartTotalQuantity} منتج)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SAR {total.toFixed(2)}</div>
              </div>
              <div style={{ background: '#e67e22', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold' }}>
                عرض السلة 🛒
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
