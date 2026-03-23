import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../apiConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);   // initial check
  const [error, setError] = useState(null);

  // ─── Helpers ────────────────────────────────────────────────
  const saveToken = (t) => localStorage.setItem('bac_token', t);
  const clearToken = () => localStorage.removeItem('bac_token');
  const getToken = () => localStorage.getItem('bac_token');

  const authFetch = useCallback(async (endpoint, options = {}) => {
    const token = getToken();
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }, []);

  // ─── Check existing session on mount ────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    authFetch('/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          // Trigger streak check-in if student
          if (data.user.role === 'student') {
            authFetch('/streak/check-in', { method: 'POST' })
              .then(r => r.json())
              .then(sData => {
                if (sData.success && sData.updated) {
                  // Refresh user data to get updated streak in context if needed
                  // but for now the user object from /auth/me already had the old one, 
                  // we could update it here manually if we want it to be reactive immediately
                  setUser(prev => ({ ...prev, current_streak: sData.current_streak }));
                }
              });
          }
        } else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, [authFetch]);

  // ─── Register ────────────────────────────────────────────────
  const register = async ({ firstName, lastName, email, password, series }) => {
    setError(null);
    const res = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        series,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de l'inscription");
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // ─── Login ───────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    setError(null);
    const res = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Identifiants invalides');
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // ─── Logout ──────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    setUser(null);
  };

  // ─── Update Profile ──────────────────────────────────────────
  const updateProfile = async (updateData) => {
    setError(null);
    const res = await authFetch('/auth/update', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
    setUser(data.user);
    return data.user;
  };

  const value = { user, loading, error, login, register, logout, getToken, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
