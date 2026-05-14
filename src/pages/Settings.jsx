import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { t, settings, fetchSettings, lang } = useApp();
  const [hotelName, setHotelName] = useState('');
  const [logoData, setLogoData] = useState('');
  const [qrEnabled, setQrEnabled] = useState('true');
  const [qrHours, setQrHours] = useState('00:00-23:59');
  const [qrMaxItems, setQrMaxItems] = useState('10');
  const [lanUrl, setLanUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setHotelName(settings.hotel_name || '');
      setLogoData(settings.logo_data || '');
      setQrEnabled(settings.qr_enabled !== 'false' ? 'true' : 'false');
      setQrHours(settings.qr_hours || '00:00-23:59');
      setQrMaxItems(settings.qr_max_items || '10');
      setLanUrl(settings.lan_url || '');
    }
  }, [settings]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be less than 2MB');
    
    const reader = new FileReader();
    reader.onload = (event) => setLogoData(event.target.result);
    reader.readAsDataURL(file);
  };

  const autoDetectLan = async () => {
    try {
      const res = await api.get('/info/ip');
      const ip = res.data.ip;
      if (ip) {
        setLanUrl(`http://${ip}:5190`);
        toast.success(lang === 'ar' ? 'تم تحديد العنوان تلقائياً' : 'LAN URL auto-detected');
      }
    } catch {
      toast.error(lang === 'ar' ? 'فشل التحديد التلقائي' : 'Auto-detect failed');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/settings', { 
        hotel_name: hotelName, 
        logo_data: logoData,
        qr_enabled: qrEnabled,
        qr_hours: qrHours,
        qr_max_items: qrMaxItems,
        lan_url: lanUrl
      });
      toast.success(t('common.save') + '!');
      await fetchSettings(); // refresh global settings
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title={t('nav.settings') || 'Settings'} />
      <div className="page">
        <div className="page-header">
          <div className="page-title">⚙️ {t('nav.settings') || 'Settings'}</div>
        </div>

        <div className="card" style={{ maxWidth: 600 }}>
          <form onSubmit={save}>
            <div className="form-group">
              <label className="form-label">{t('set.cafe_name') || 'Cafe / Hotel Name'}</label>
              <input 
                className="form-input" 
                value={hotelName} 
                onChange={e => setHotelName(e.target.value)} 
                placeholder="e.g Riviera Hotel Cafe"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('set.cafe_logo') || 'Cafe Logo (Optional)'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {logoData ? (
                  <div style={{ position: 'relative' }}>
                    <img src={logoData} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => setLogoData('')} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1px dashed var(--border)' }}>☕</div>
                )}
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="form-input" style={{ padding: '6px' }} />
                  <div className="form-label" style={{ marginTop: 6, fontSize: '0.75rem' }}>Max size: 2MB. Transparent PNG recommended.</div>
                </div>
              </div>
            </div>

            <hr style={{ margin: '30px 0', borderColor: 'var(--border)' }} />
            
            <h3 style={{ marginBottom: 15 }}>{lang === 'ar' ? 'إعدادات خدمة الغرف (QR Menu)' : 'QR Menu Settings'}</h3>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="qrEnabled" checked={qrEnabled === 'true'} onChange={e => setQrEnabled(e.target.checked ? 'true' : 'false')} style={{ width: 20, height: 20 }} />
              <label htmlFor="qrEnabled" className="form-label" style={{ marginBottom: 0 }}>{lang === 'ar' ? 'تفعيل خدمة الغرف عن طريق مسح الكود' : 'Enable QR Room Service'}</label>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'ساعات العمل (مثال: 08:00-02:00)' : 'Working Hours (e.g., 08:00-02:00)'}</label>
                <input className="form-input" value={qrHours} onChange={e => setQrHours(e.target.value)} placeholder="00:00-23:59" />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'أقصى عدد منتجات للطلب الواحد' : 'Max Items per Order'}</label>
                <input className="form-input" type="number" min="1" max="100" value={qrMaxItems} onChange={e => setQrMaxItems(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === 'ar' ? 'رابط الشبكة المحلية (Local LAN URL)' : 'Local Network URL (LAN)'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  className="form-input" 
                  value={lanUrl} 
                  onChange={e => setLanUrl(e.target.value)} 
                  placeholder="http://192.168.x.x:5190" 
                />
                <button type="button" className="btn btn-secondary" onClick={autoDetectLan}>
                  🔍 {lang === 'ar' ? 'تحديد تلقائي' : 'Detect'}
                </button>
              </div>
              <div className="form-label" style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 400 }}>
                {lang === 'ar' 
                  ? 'هذا الرابط سيتم استخدامه في إنشاء أكواد QR للغرف.' 
                  : 'This URL will be used to generate Room Service QR codes.'}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳...' : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
