import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LowStockBanner from './components/LowStockBanner';
import GlobalOrderAlert from './components/GlobalOrderAlert';
import LowStockStartupAlert from './components/LowStockStartupAlert';
import LoginPage from './auth/LoginPage';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import RoomConsumption from './pages/RoomConsumption';
import Reports from './pages/Reports';
import Refunds from './pages/Refunds';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import QRCodes from './pages/QRCodes';
import GuestMenu from './pages/GuestMenu';
import PendingOrders from './pages/PendingOrders';
import api from './api';

function MainLayout() {
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    const load = () =>
      api.get('/products?lowstock=1')
        .then(r => {
          setLowStock(r.data);
          document.documentElement.style.setProperty('--banner-h', r.data.length > 0 ? '36px' : '0px');
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <GlobalOrderAlert />
      <LowStockStartupAlert />
      <Sidebar lowStockCount={lowStock.length} />
      <div className="main-content">
        <LowStockBanner items={lowStock} />
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/pos"      element={<POS />} />
          <Route path="/inventory"element={<Inventory />} />
          <Route path="/suppliers"element={<Suppliers />} />
          <Route path="/customers"element={<Customers />} />
          <Route path="/rooms"    element={<RoomConsumption />} />
          <Route path="/orders"   element={<PendingOrders />} />
          <Route path="/reports"  element={<Reports />} />
          <Route path="/refunds"  element={<Refunds />} />
          <Route path="/users"    element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="/audit"    element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />
          <Route path="/qrcodes"  element={<ProtectedRoute adminOnly><QRCodes /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/menu" element={<GuestMenu />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
