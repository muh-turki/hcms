import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import api from '../api';

export default function QRCodes() {
  const { lang, settings } = useApp();
  const [startRoom, setStartRoom] = useState(101);
  const [endRoom, setEndRoom] = useState(120);
  const [rooms, setRooms] = useState([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [networkOk, setNetworkOk] = useState(null); // null=untested, true=ok, false=fail
  const [testing, setTesting] = useState(false);

  React.useEffect(() => {
    // 1. If admin set a custom LAN URL, use it
    if (settings?.lan_url) {
      setBaseUrl(settings.lan_url);
      return;
    }

    // 2. Fallback: Detect Local IP from backend
    api.get('/info/ip')
      .then(res => {
        const ip = res.data.ip || '127.0.0.1';
        setBaseUrl(`http://${ip}:5190`);
      })
      .catch(() => {
        setBaseUrl(window.location.origin);
      });
  }, [settings]);

  const generate = (e) => {
    e.preventDefault();
    const arr = [];
    const min = parseInt(startRoom);
    const max = parseInt(endRoom);
    if (!min || !max || min > max || max - min > 500) {
      alert(lang === 'ar' ? 'التسلسل غير صالح' : 'Invalid Range');
      return;
    }
    for (let i = min; i <= max; i++) arr.push(i);
    setRooms(arr);
  };

  const testNetwork = async () => {
    setTesting(true);
    setNetworkOk(null);
    try {
      const res = await fetch(`${baseUrl}/menu?room=test`, { mode: 'no-cors', signal: AbortSignal.timeout(4000) });
      setNetworkOk(true);
    } catch {
      setNetworkOk(false);
    } finally {
      setTesting(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <TopBar title={lang === 'ar' ? 'مولد أكواد الغرف (QR)' : 'QR Code Generator'} />
      <div className="page no-print">

        {/* ── Network Info Card ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 32 }}>📡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                {lang === 'ar' ? 'رابط الشبكة المحلية (اللي يُكتب في الباركود)' : 'Local Network URL (encoded in QR)'}
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '1.05rem',
                color: 'var(--accent)', fontWeight: 600,
                background: 'rgba(0,0,0,0.15)', padding: '6px 12px',
                borderRadius: 8, display: 'inline-block',
              }}>
                {baseUrl || '...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={copyUrl}
                disabled={!baseUrl}
                title="Copy URL"
              >
                📋 {lang === 'ar' ? 'نسخ' : 'Copy'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={testNetwork}
                disabled={!baseUrl || testing}
                style={{
                  background: networkOk === true ? '#22c55e' : networkOk === false ? '#ef4444' : 'var(--accent)',
                  color: '#fff', border: 'none',
                }}
              >
                {testing ? '⏳' : networkOk === true ? '✅ ' + (lang === 'ar' ? 'متاح' : 'Reachable') : networkOk === false ? '❌ ' + (lang === 'ar' ? 'تعذّر الوصول' : 'Unreachable') : '🔍 ' + (lang === 'ar' ? 'اختبار الاتصال' : 'Test Connection')}
              </button>
            </div>
          </div>
          {networkOk === false && (
            <div style={{
              marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.9rem'
            }}>
              ⚠️ {lang === 'ar'
                ? 'لا يمكن الوصول للرابط من الشبكة. تأكد أن: (١) الجوال متصل بنفس الـ Wi-Fi (٢) جدار الحماية لا يحجب المنفذ 5190'
                : 'Cannot reach URL from network. Check: (1) Phone is on same Wi-Fi (2) Firewall allows port 5190'}
            </div>
          )}
          {networkOk === true && (
            <div style={{
              marginTop: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#22c55e', fontSize: '0.9rem'
            }}>
              ✅ {lang === 'ar'
                ? 'الرابط متاح. أي جوال متصل بنفس الـ Wi-Fi يمكنه فتح الباركود.'
                : 'URL is reachable. Any phone on the same Wi-Fi can scan the QR codes.'}
            </div>
          )}
        </div>

        {/* ── Generator Form ────────────────────────────────── */}
        <div className="card">
          <form onSubmit={generate} style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
              <label className="form-label">{lang === 'ar' ? 'من غرفة' : 'From Room'}</label>
              <input type="number" className="form-input" value={startRoom} onChange={e => setStartRoom(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
              <label className="form-label">{lang === 'ar' ? 'إلى غرفة' : 'To Room'}</label>
              <input type="number" className="form-input" value={endRoom} onChange={e => setEndRoom(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 250, marginBottom: 0 }}>
              <label className="form-label">{lang === 'ar' ? 'رابط السيرفر (IP)' : 'Server Base URL'}</label>
              <input type="text" className="form-input" value={baseUrl} onChange={e => { setBaseUrl(e.target.value); setNetworkOk(null); }} placeholder="http://192.168.1.x:5190" required />
              <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lang === 'ar' ? 'هذا هو الرابط الذي سيفتح عند مسح الكود' : 'URL scan will open'}</small>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 26, minWidth: 120 }}>
              {lang === 'ar' ? 'توليد الأكواد' : 'Generate'}
            </button>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 26, minWidth: 150 }} onClick={handlePrint} disabled={rooms.length === 0}>
              🖨️ {lang === 'ar' ? 'تصدير / طباعة PDF' : 'Export / Print PDF'}
            </button>
          </form>
        </div>

        {rooms.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3>{rooms.length} {lang === 'ar' ? 'كود جاهز' : 'Codes Ready'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 20 }}>
              {rooms.map(r => {
                const url = `${baseUrl}/menu?room=${r}`;
                return (
                  <div key={r} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '20px', borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#fff', padding: 10, display: 'inline-block', borderRadius: 8, marginBottom: 12 }}>
                      <QRCodeSVG value={url} size={140} level="H" />
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{lang === 'ar' ? 'غرفة' : 'Room'} {r}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>HCMS Room Service</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Print Only View */}
      <div className="print-only">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', padding: '20px' }}>
          {rooms.map(r => {
            const url = `${baseUrl}/menu?room=${r}`;
            return (
              <div key={r} style={{ width: '30%', minWidth: '220px', border: '2px solid #ccc', padding: '20px', textAlign: 'center', borderRadius: 16, pageBreakInside: 'avoid', marginBottom: 20 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 15, fontFamily: 'sans-serif' }}>{lang === 'ar' ? 'خدمة الغرف' : 'Room Service'}</div>
                <div style={{ background: '#fff', padding: 10, display: 'inline-block' }}>
                  <QRCodeSVG value={url} size={160} level="H" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: 15, fontFamily: 'sans-serif' }}>Room {r}</div>
                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: 10, fontFamily: 'sans-serif' }}>Scan to order directly!</div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body, html { background: white; margin: 0; padding: 0; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
