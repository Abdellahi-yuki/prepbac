import React, { useState, useEffect } from 'react';
import {
  Users, BookOpen, Layers, CheckCircle,
  TrendingUp, Activity, AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setStats(data);
      } else {
        throw new Error(data.message || data.error);
      }
    } catch (err) {
      setError('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{
        width: 40, height: 40, border: '3px solid rgba(99, 102, 241, 0.2)',
        borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite'
      }} />
    </div>
  );

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <AlertCircle size={20} />
      <span style={{ fontWeight: 500 }}>{error}</span>
    </div>
  );

  const metrics = stats?.metrics || {};
  const recent = stats?.recent_activity || [];

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '1.5rem',
      border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
          <Icon size={20} />
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#10b981', background: '#d1fae5', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
            <TrendingUp size={12} /> {trend}
          </div>
        )}
      </div>
      <h3 style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, margin: 0 }}>{title}</h3>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '0.2rem' }}>
        {value}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)' }}>Vue d'ensemble</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0', fontWeight: 500 }}>
            Statistiques globales de la plateforme PrepBac.
          </p>
        </div>
        <button style={{
          background: '#0f172a', color: 'white', border: 'none', padding: '0.6rem 1rem',
          borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 10px rgba(15,23,42,0.15)', cursor: 'pointer'
        }}>
          Générer un rapport
        </button>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Élèves inscrits" value={metrics.total_users || 0} icon={Users} color="#4f7af8" trend="+12%" />
        {Object.entries(metrics.users_by_series || {}).map(([name, count]) => (
          <StatCard
            key={name}
            title={`Série ${name}`}
            value={count}
            icon={Activity}
            color={name === 'C' ? '#f59e0b' : (name === 'D' ? '#10b981' : '#8b5cf6')}
          />
        ))}
        <StatCard title="Total Cours" value={metrics.total_courses || 0} icon={BookOpen} color="#10b981" />
        <StatCard title="Total Exercices & Quiz" value={(metrics.total_exercises || 0) + (metrics.total_quizzes || 0)} icon={Layers} color="#8b5cf6" trend="+5" />
      </div>

      {/* SECONDARY INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

        {/* RECENT ACTIVITY */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>Activité Récente</h3>
          </div>

          <div style={{ padding: '0 1.5rem' }}>
            {recent.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0',
                borderBottom: idx === recent.length - 1 ? 'none' : '1px solid #f1f5f9'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: item.type === 'user' ? '#dbeafe' : (item.type === 'course' ? '#d1fae5' : '#ede9fe'),
                  color: item.type === 'user' ? '#3b82f6' : (item.type === 'course' ? '#10b981' : '#8b5cf6'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.type === 'user' ? <Users size={16} /> : (item.type === 'course' ? <BookOpen size={16} /> : <CheckCircle size={16} />)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    {item.action} <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.target}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>Raccourcis rapides</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['Créer un cours', 'Ajouter un exercice', 'Publier une annonce'].map(action => (
              <button key={action} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569',
                cursor: 'pointer', transition: '0.2s', textAlign: 'left'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                {action}
                <Activity size={14} style={{ color: '#94a3b8' }} />
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
