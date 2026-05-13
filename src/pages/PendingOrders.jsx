import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PendingOrders() {
  const { t, lang } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchOrders = () => {
    api.get('/orders')
      .then(r => {
        setOrders(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const int = setInterval(fetchOrders, 5000);
    return () => clearInterval(int);
  }, []);

  const acceptOrder = async (id) => {
    setProcessing(id);
    try {
      await api.post(`/orders/${id}/accept`);
      toast.success(lang === 'ar' ? 'تم قبول الطلب وجارِ تحضيره' : 'Order accepted');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to accept');
    } finally {
      setProcessing(false);
    }
  };

  const completeOrder = async (id) => {
    setProcessing(id);
    try {
      const res = await api.post(`/orders/${id}/complete`);
      toast.success(lang === 'ar' ? `تم التنفيذ وتحويله لفاتورة ${res.data.invoice_number}` : 'Order completed to ' + res.data.invoice_number);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to complete');
    } finally {
      setProcessing(false);
    }
  };

  const rejectOrder = async (id) => {
    setProcessing(id);
    const toastId = toast.loading(lang === 'ar' ? 'جارٍ الإلغاء...' : 'Cancelling...');
    try {
      await api.post(`/orders/${id}/reject`);
      toast.success(lang === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully', { id: toastId });
      fetchOrders();
    } catch (e) {
      console.error('Reject error:', e);
      toast.error(e.response?.data?.error || 'Failed to reject', { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const printTicket = (order) => {
    const printWindow = window.open('', '', 'width=350,height=600');
    printWindow.document.write(`
      <html><head><title>Print Ticket</title>
      <style>
        body { font-family: monospace; font-size: 14px; padding: 10px; text-align: center; direction: rtl; }
        .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
        hr { border: 1px dashed #000; }
        .notes { border: 1px dotted #000; padding: 5px; margin-top: 10px; text-align: right; }
      </style>
      </head><body>
        <h2>ORDER TICKET</h2>
        <h3>غرفة: ${order.room_number}</h3>
        <p>${new Date(order.created_at).toLocaleTimeString()}</p>
        <hr/>
        ${order.items.map(it => `<div class="item"><span>${it.product_name}</span> <span>x${it.quantity}</span></div>`).join('')}
        ${order.notes ? `<div class="notes">ملاحظات:<br/>${order.notes}</div>` : ''}
        <hr/>
        <p>System Ref: ${order.id}</p>
        <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <TopBar title={lang === 'ar' ? 'شاشة طلبات النزلاء' : 'Guest Orders'} />
      <div className="page">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <div className="page-title">{lang === 'ar' ? 'شاشة طلبات النزلاء الحية' : 'Live Guest Orders'}</div>
            <div className="page-subtitle">{orders.length} {lang === 'ar' ? 'تحديث تلقائي مستمر' : 'auto updating'}</div>
          </div>
          <button className="btn btn-secondary" onClick={fetchOrders}>🔄 {lang === 'ar' ? 'تحديث الآن' : 'Refresh'}</button>
        </div>

        {loading && orders.length === 0 ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📱</div>
            <div className="empty-state-text">{lang === 'ar' ? 'لا توجد طلبات معلقة من النزلاء' : 'No pending guest orders'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {orders.map(o => {
              const isAccepted = o.status === 'accepted';
              return (
                <div key={o.id} className="card" style={{ borderTop: `4px solid ${isAccepted ? '#e67e22' : '#e74c3c'}`, position: 'relative', overflow: 'hidden' }}>
                  
                  {o.status === 'pending' && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderBottomLeftRadius: 8, animation: 'pulse 1s infinite' }}>
                      NEW
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', color: isAccepted ? '#e67e22' : '#c0392b' }}>{lang === 'ar' ? 'غرفة' : 'Room'} {o.room_number}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                      {fmt(o.total_amount)}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-default)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    {o.items.map((it, i) => (
                      <div key={it.id + '_' + i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i === o.items.length-1 ? 0 : 8 }}>
                        <span>{it.product_name} <span style={{ color: 'var(--text-muted)' }}>x{it.quantity}</span></span>
                      </div>
                    ))}
                  </div>

                  {o.notes && (
                    <div style={{ background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: 4, fontSize: '0.9rem', marginBottom: 16 }}>
                      <strong>📝 ملاحظات:</strong> {o.notes}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {o.status === 'pending' ? (
                      <button 
                        className="btn" 
                        style={{ background: '#f39c12', color: '#fff', border: 'none' }}
                        onClick={() => acceptOrder(o.id)}
                        disabled={processing === o.id}
                      >
                        {processing === o.id ? '...' : (lang === 'ar' ? '⏳ قبول وتحضير' : 'Accept')}
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => completeOrder(o.id)}
                        disabled={processing === o.id}
                      >
                        {processing === o.id ? '...' : (lang === 'ar' ? '✔️ تنفيد وإنهاء' : 'Complete')}
                      </button>
                    )}
                    
                    <button 
                      className="btn btn-danger" 
                      onClick={() => rejectOrder(o.id)}
                      disabled={processing === o.id}
                    >
                      {lang === 'ar' ? '❌ إلغاء' : 'Reject'}
                    </button>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '0.9rem' }}
                    onClick={() => printTicket(o)}
                  >
                    🖨️ {lang === 'ar' ? 'طباعة التذكرة للمطبخ' : 'Print Kitchen Ticket'}
                  </button>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}
