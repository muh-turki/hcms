import React from 'react';
import { useApp } from '../context/AppContext';

export default function LowStockBanner({ items }) {
  const { t } = useApp();
  if (!items || items.length === 0) return null;

  return (
    <div className="low-stock-banner">
      <div className="items-list">
        <span style={{ fontWeight: 700 }}>{t('ls.low_stock')}</span>
        {items.map(item => (
          <span key={item.id} className="low-stock-badge">
            {item.name} ({item.current_stock} {t('ls.left')})
          </span>
        ))}
        {items.length > 5 && <span>... {t('ls.more')}</span>}
      </div>
    </div>
  );
}
