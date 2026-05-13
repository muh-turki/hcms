import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useApp } from '../context/AppContext';

// ─── Ultra-Loud Alert Sound Engine ────────────────────────────────────────────
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const playTone = (startTime, freq, dur, type = 'square') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1.0, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    };

    const t = ctx.currentTime;
    // First burst — high urgency double beep
    playTone(t + 0.00, 1047, 0.18, 'square');
    playTone(t + 0.00,  523, 0.18, 'sawtooth');
    playTone(t + 0.22, 1047, 0.18, 'square');
    playTone(t + 0.22,  523, 0.18, 'sawtooth');

    // Second burst
    playTone(t + 0.55, 1319, 0.20, 'square');
    playTone(t + 0.55,  659, 0.20, 'sawtooth');
    playTone(t + 0.78, 1319, 0.20, 'square');
    playTone(t + 0.78,  659, 0.20, 'sawtooth');

    // Final long confirmation tone
    playTone(t + 1.10, 1568, 0.40, 'square');
    playTone(t + 1.10,  784, 0.40, 'sawtooth');
  } catch (e) {
    console.warn('Audio failed:', e);
  }
}

// ─── Alert Modal Component ─────────────────────────────────────────────────────
function OrderAlertModal({ orders, onClose, onGoToOrders, lang }) {
  const intervalRef = useRef(null);

  useEffect(() => {
    playAlertSound();
    intervalRef.current = setInterval(playAlertSound, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleClose = () => {
    clearInterval(intervalRef.current);
    onClose();
  };

  const handleGoToOrders = () => {
    clearInterval(intervalRef.current);
    onGoToOrders();
  };

  const isAr = lang === 'ar';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'gaFadeIn 0.25s ease',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      {/* Pulsing rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 500, height: 500, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', animation: 'gaRing 2s ease-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)', animation: 'gaRing 2s ease-out infinite 0.4s' }} />
      </div>

      {/* Modal Card */}
      <div
        style={{
          background: 'linear-gradient(145deg, #0f0f1a, #1a0a0a)',
          border: '2px solid rgba(239,68,68,0.7)',
          borderRadius: 28,
          width: '92%',
          maxWidth: 580,
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '36px 32px',
          boxShadow: '0 0 80px rgba(239,68,68,0.5), 0 0 160px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: 'gaCardPulse 1.5s ease-in-out infinite alternate',
          direction: isAr ? 'rtl' : 'ltr',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 80, lineHeight: 1, marginBottom: 16,
            filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))',
            animation: 'gaBell 0.5s ease-in-out infinite alternate',
            display: 'inline-block',
          }}>🔔</div>
          <h1 style={{
            margin: '0 0 8px',
            color: '#ef4444',
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '-0.5px',
            textShadow: '0 0 30px rgba(239,68,68,0.8)',
          }}>
            {isAr ? '🚨 طلب جديد من النزيل!' : '🚨 New Guest Order!'}
          </h1>
          <p style={{
            color: '#f59e0b',
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 600,
            animation: 'gaTextBlink 1s ease infinite alternate',
          }}>
            {isAr ? 'يستلزم موافقتك الفورية' : 'Requires your immediate attention'}
          </p>
        </div>

        {/* Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {orders.map(order => (
            <div key={order.id} style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 18,
              padding: '20px 24px',
              boxShadow: '0 4px 20px rgba(239,68,68,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{
                    color: '#ef4444', fontWeight: 900,
                    fontSize: '1.6rem',
                    textShadow: '0 0 10px rgba(239,68,68,0.5)',
                  }}>
                    {isAr ? '🛏️ غرفة' : '🛏️ Room'} {order.room_number}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: 3 }}>
                    #{order.id} • {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  padding: '10px 18px',
                  borderRadius: 14,
                  boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                }}>
                  SAR {Number(order.total_amount || 0).toFixed(2)}
                </div>
              </div>

              {/* Items */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 16px',
              }}>
                {order.items?.map((it, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#e5e7eb',
                    padding: '6px 0',
                    borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    fontSize: '0.95rem',
                  }}>
                    <span>{it.product_name}</span>
                    <span style={{
                      background: 'rgba(245,158,11,0.2)',
                      color: '#f59e0b',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: 8,
                    }}>×{it.quantity}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div style={{
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginTop: 12,
                  fontSize: '0.9rem',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                }}>
                  <span>📝</span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleGoToOrders}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '1.15rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(239,68,68,0.5)',
              transition: 'all 0.2s',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(239,68,68,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(239,68,68,0.5)'; }}
          >
            🍽️ {isAr ? 'الذهاب لشاشة الطلبات الآن' : 'Go to Orders Screen Now'}
          </button>

          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'rgba(255,255,255,0.06)',
              color: '#9ca3af',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            ✓ {isAr ? 'تم الاطلاع — إغلاق' : 'Acknowledged — Dismiss'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gaFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gaCardPulse {
          from { box-shadow: 0 0 60px rgba(239,68,68,0.4), 0 0 120px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.05); }
          to   { box-shadow: 0 0 100px rgba(239,68,68,0.7), 0 0 200px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.05); }
        }
        @keyframes gaRing {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes gaBell {
          from { transform: rotate(-12deg); }
          to   { transform: rotate(12deg); }
        }
        @keyframes gaTextBlink {
          from { opacity: 0.7; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Global Alert Controller (runs on all staff pages) ────────────────────────
export default function GlobalOrderAlert() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [alertOrders, setAlertOrders] = useState([]);
  const prevIds = useRef(new Set());
  const isFirstFetch = useRef(true);

  const fetchOrders = useCallback(() => {
    api.get('/orders')
      .then(r => {
        const pending = r.data.filter(o => o.status === 'pending');
        const pendingIds = new Set(pending.map(o => o.id));
        const newOrders = pending.filter(o => !prevIds.current.has(o.id));

        // ── Add newly arrived pending orders to the alert ──
        if (newOrders.length > 0 && !isFirstFetch.current) {
          setAlertOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const unique = newOrders.filter(o => !existingIds.has(o.id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
        }

        // ── Auto-remove orders that are no longer pending (accepted / rejected) ──
        setAlertOrders(prev => {
          if (prev.length === 0) return prev;
          const stillPending = prev.filter(o => pendingIds.has(o.id));
          // Only update state if something actually changed
          return stillPending.length === prev.length ? prev : stillPending;
        });

        prevIds.current = pendingIds;
        isFirstFetch.current = false;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (alertOrders.length === 0) return null;

  return (
    <OrderAlertModal
      orders={alertOrders}
      lang={lang}
      onClose={() => setAlertOrders([])}
      onGoToOrders={() => {
        setAlertOrders([]);
        navigate('/orders');
      }}
    />
  );
}
