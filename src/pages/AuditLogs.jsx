import React, { useEffect, useState } from 'react';
import api from '../api';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

export default function AuditLogs() {
  const { t, lang } = useApp();
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState('logs'); // 'logs' or 'employees'

  useEffect(() => {
    api.get('/reports/logs').then(r => setLogs(r.data)).catch(() => {});
    api.get('/reports/employees').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const fmt = n => `SAR ${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <TopBar title={lang === 'ar' ? 'سجل التدقيق وتقييم الموظفين' : 'Audit Logs & Evaluation'} />
      <div className="page" style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button 
            className={`btn ${tab === 'logs' ? 'btn-danger' : 'btn-ghost'}`} 
            onClick={() => setTab('logs')}
            style={tab === 'logs' ? { background: 'var(--red)' } : {}}
          >
            {lang === 'ar' ? 'سجل العمليات (من باع ومتى)' : 'Audit Logs'}
          </button>
          <button 
            className={`btn ${tab === 'employees' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setTab('employees')}
          >
            {lang === 'ar' ? 'تقييم كفاءة الموظفين' : 'Employee Evaluation'}
          </button>
        </div>

        {tab === 'logs' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{lang === 'ar' ? 'نوع العملية' : 'Type'}</th>
                    <th>{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th>{lang === 'ar' ? 'المرجع' : 'Reference'}</th>
                    <th>{lang === 'ar' ? 'التفاصيل / السبب' : 'Details / Reason'}</th>
                    <th>{t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((L, i) => (
                    <tr key={i}>
                      <td><span className={`badge ${L.type === 'Sale' ? 'badge-gray' : 'badge-red'}`}>{L.type === 'Sale' ? (lang === 'ar' ? 'بيع' : 'Sale') : (lang === 'ar' ? 'استرجاع' : 'Refund')}</span></td>
                      <td style={{ fontWeight: 600 }}>{L.user || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{L.reference}</td>
                      <td>{L.details || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(L.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'employees' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('usr.fullname')}</th>
                    <th>{t('usr.role')}</th>
                    <th>{lang === 'ar' ? 'إجمالي المبيعات (عدد)' : 'Sales Count'}</th>
                    <th>{lang === 'ar' ? 'الإيرادات المحققة' : 'Revenue Generated'}</th>
                    <th>{lang === 'ar' ? 'الأخطاء / المرتجعات' : 'Mistakes / Refunds'}</th>
                    <th>{lang === 'ar' ? 'نسبة الأخطاء' : 'Error Rate'}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => {
                    const errorRate = e.total_sales_count > 0 ? (e.total_refunds / e.total_sales_count * 100).toFixed(1) + '%' : '0%';
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>{e.full_name || e.username}</td>
                        <td><span className="badge badge-gray">{e.role === 'admin' ? t('usr.admin') : t('usr.staff')}</span></td>
                        <td>{e.total_sales_count}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(e.total_revenue)}</td>
                        <td><span className={e.total_refunds > 0 ? 'badge badge-red' : ''}>{e.total_refunds}</span></td>
                        <td><span style={{ color: parseFloat(errorRate) > 5 ? 'var(--red)' : 'var(--text-secondary)' }}>{errorRate}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
