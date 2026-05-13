import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Role hierarchy: admin > supervisor > cashier
const ROLE_LEVEL = { admin: 3, supervisor: 2, cashier: 1 };

export default function ProtectedRoute({ children, adminOnly = false, minRole = null }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;

  const userLevel = ROLE_LEVEL[user.role] || 0;

  // adminOnly = backward compat (same as minRole="admin")
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

  // minRole check: e.g. minRole="supervisor" allows admin+supervisor
  if (minRole && userLevel < (ROLE_LEVEL[minRole] || 0)) return <Navigate to="/" replace />;

  return children;
}
