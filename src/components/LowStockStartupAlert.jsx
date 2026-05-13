import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useApp } from '../context/AppContext';

const SESSION_KEY = 'hcms_low_stock_alerted';

// ─── Warning Sound ─────────────────────────────────────────────────────────────
function playWarningSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, ctx.currentTime);
    master.connect(ctx.destination);

    const tone = (start, freq, dur, type = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.9, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };

    const t = ctx.currentTime;
    // Three descending warning tones — distinct from the order alert
    tone(t + 0.00, 660, 0.30, 'triangle');
    tone(t + 0.00, 330, 0.30, 'sawtooth');
    tone(t + 0.40, 550, 0.30, 'triangle');
    tone(t + 0.40, 275, 0.30, 'sawtooth');
    tone(t + 0.80, 440, 0.50, 'triangle');
    tone(t + 0.80, 220, 0.50, 'sawtooth');
  } catch (e) {
    console.warn('Audio failed:', e);
  }
}

export default function LowStockStartupAlert() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [criticalItems, setCriticalItems] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    api.get('/products')
      .then(r => {
        // Critical = current_stock is ≤ 25% of min_stock_level
        const critical = r.data.filter(p => {
          if (!p.min_stock_level || p.min_stock_level <= 0) return false;
          const ratio = p.current_stock / p.min_stock_level;
          return ratio <= 0.25;
        });

        if (critical.length > 0) {
          setCriticalItems(critical);
          setVisible(true);
          sessionStorage.setItem(SESSION_KEY, '1');
          // Play warning sound after a short delay (let the modal render first)
          setTimeout(playWarningSound, 300);
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => setVisible(false);

  const handleGoToInventory = () => {
    setVisible(false);
    navigate('/inventory');
  };

  if (!visible || criticalItems.length === 0) return null;

  const isAr = lang === 'ar';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lsaFadeIn 0.3s ease',
        backdropFilter: 'blur(5px)',
      }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      {/* Modal Card */}
      <div style={{
        background: 'linear-gradient(145deg, #0f0f1a, #1a0f00)',
        border: '2px solid rgba(245,158,11,0.6)',
        borderRadius: 28,
        width: '92%',
        maxWidth: 600,
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '36px 32px',
        boxShadow: '0 0 70px rgba(245,158,11,0.4), 0 0 140px rgba(245,158,11,0.15)',
        animation: 'lsaCardPulse 2s ease-in-out infinite alternate',
        direction: isAr ? 'rtl' : 'ltr',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 72, lineHeight: 1, marginBottom: 14,
            filter: 'drop-shadow(0 0 18px rgba(245,158,11,0.9))',
            animation: 'lsaWobble 0.8s ease-in-out infinite alternate',
            display: 'inline-block',
          }}>📦</div>
          <h1 style={{
            margin: '0 0 8px',
            color: '#f59e0b',
            fontSize: '2rem',
            fontWeight: 900,
            textShadow: '0 0 24px rgba(245,158,11,0.7)',
          }}>
            {isAr ? '⚠️ تحذير: مخزون حرج!' : '⚠️ Critical Stock Alert!'}
          </h1>
          <p style={{
            color: '#e5e7eb',
            margin: 0,
            fontSize: '1rem',
            opacity: 0.85,
          }}>
            {isAr
              ? `${criticalItems.length} منتج وصل مخزونه إلى أقل من 25% من الحد الأدنى`
              : `${criticalItems.length} product(s) dropped below 25% of minimum stock`}
          </p>
        </div>

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {criticalItems.map(item => {
            const pct = item.min_stock_level > 0
              ? Math.round((item.current_stock / item.min_stock_level) * 100)
              : 0;
            const isOut = item.current_stock <= 0;

            return (
              <div key={item.id} style={{
                background: isOut
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(245,158,11,0.10)',
                border: `1px solid ${isOut ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)'}`,
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                justifyContent: 'space-between',
              }}>
                {/* Name + Category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#f3f4f6',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name_ar || item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    {item.name_ar ? item.name + ' · ' : ''}{item.category}
                  </div>
                </div>

                {/* Stock Bar */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginBottom: 4,
                  }}>
                    <span>{isAr ? 'المتبقي' : 'Left'}: <strong style={{ color: isOut ? '#ef4444' : '#f59e0b' }}>{item.current_stock}</strong></span>
                    <span style={{ color: '#6b7280' }}>min: {item.min_stock_level}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 6, borderRadius: 99,
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      borderRadius: 99,
                      background: isOut ? '#ef4444' : '#f59e0b',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{
                    textAlign: 'center',
                    marginTop: 4,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isOut ? '#ef4444' : '#f59e0b',
                  }}>
                    {isOut ? (isAr ? 'نفذ تماماً!' : 'OUT OF STOCK!') : `${pct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleGoToInventory}
            style={{
              width: '100%',
              padding: '17px',
              fontSize: '1.1rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(245,158,11,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            📋 {isAr ? 'الذهاب لصفحة المخزون الآن' : 'Go to Inventory Now'}
          </button>

          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              color: '#9ca3af',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            {isAr ? '✓ تم الاطلاع — إغلاق' : '✓ Acknowledged — Close'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lsaFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lsaCardPulse {
          from { box-shadow: 0 0 50px rgba(245,158,11,0.3), 0 0 100px rgba(245,158,11,0.1); }
          to   { box-shadow: 0 0 90px rgba(245,158,11,0.55), 0 0 180px rgba(245,158,11,0.2); }
        }
        @keyframes lsaWobble {
          from { transform: rotate(-8deg) scale(1); }
          to   { transform: rotate(8deg) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
