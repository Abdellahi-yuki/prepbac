import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protège les routes Admin contre les élèves
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="auth-spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--primary)' }}></span>
      </div>
    );
  }

  // Vérifie s'il est connecté ET s'il a le role 'admin'
  if (!user || user.role !== 'admin') {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
