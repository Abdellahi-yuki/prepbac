import React, { useState, useEffect } from 'react';
import { Flame, Award, Calendar, Target, Shield, Trophy, CheckCircle, Zap } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const iconMap = {
  'Flame': Flame, 'Award': Award, 'Calendar': Calendar,
  'Target': Target, 'Shield': Shield, 'Trophy': Trophy,
};

export default function StreakCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/streak/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (err) {
      console.error('Erreur stats streak:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!stats) return;
    const { streak, next_badge } = stats;
    const pct = next_badge ? Math.min(100, (streak.current / next_badge.milestone_days) * 100) : 100;
    const t = setTimeout(() => setBarWidth(pct), 400);
    return () => clearTimeout(t);
  }, [stats]);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(200,210,240,0.5)', borderRadius: 20,
        padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 180,
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          Chargement...
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { streak, badges, next_badge } = stats;
  const isActive = streak.current > 0;
  const progress = next_badge ? Math.min(100, (streak.current / next_badge.milestone_days) * 100) : 100;

  const motivationMsg = isActive
    ? streak.current >= 7
      ? '🏆 Incroyable ! 7 jours consécutifs !'
      : streak.current >= 3
      ? '🔥 Tu es en feu ! Continue !'
      : '⚡ Belle série, garde le rythme !'
    : '🎯 Commence ta série aujourd\'hui !';

  return (
    <div style={{
      background: isActive
        ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.04) 100%)'
        : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      border: isActive ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(200,210,240,0.5)',
      borderRadius: 20,
      padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1.25rem',
      transition: 'all 0.3s',
      animation: 'fadeUp 0.5s ease 100ms both',
    }}>

      {/* Header streak */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Flame icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: isActive
              ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
              : 'rgba(148,163,184,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? '0 8px 24px rgba(245,158,11,0.35)' : 'none',
            position: 'relative',
          }}>
            <Flame
              size={28}
              fill={isActive ? 'white' : 'none'}
              color={isActive ? 'white' : '#94a3b8'}
            />
            {isActive && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)',
                pointerEvents: 'none',
              }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
              Série actuelle
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{
                fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-display)',
                color: isActive ? '#f59e0b' : 'var(--text-muted)', lineHeight: 1,
              }}>
                {streak.current}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>jours</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 12, padding: '0.5rem 0.85rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Record
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {streak.max}j
          </div>
        </div>
      </div>

      {/* Motivation message */}
      <div style={{
        background: isActive ? 'rgba(245,158,11,0.06)' : 'rgba(148,163,184,0.06)',
        border: `1px solid ${isActive ? 'rgba(245,158,11,0.15)' : 'rgba(200,210,240,0.3)'}`,
        borderRadius: 12, padding: '0.65rem 1rem',
        fontSize: '0.82rem', fontWeight: 600,
        color: isActive ? '#92400e' : 'var(--text-secondary)',
      }}>
        {motivationMsg}
      </div>

      {/* Barre de progression vers prochain badge */}
      {next_badge && (
        <div style={{
          background: 'rgba(248,250,252,0.7)', border: '1px solid rgba(200,210,240,0.3)',
          borderRadius: 14, padding: '0.85rem 1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Prochain : <span style={{ color: '#f59e0b' }}>{next_badge.name}</span>
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {streak.current} / {next_badge.milestone_days}j
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              width: `${barWidth}%`,
              transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 8px rgba(245,158,11,0.5)',
            }} />
          </div>
        </div>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Badges
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {badges.map(badge => {
              const Icon = iconMap[badge.icon] || Award;
              const isUnlocked = !!badge.unlocked_at;
              return (
                <div
                  key={badge.id}
                  title={badge.description}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: 50, height: 50, borderRadius: 16,
                    background: isUnlocked ? `${badge.color}15` : '#f1f5f9',
                    border: isUnlocked ? `2px solid ${badge.color}30` : '2px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', transition: 'all 0.3s',
                    filter: isUnlocked ? 'none' : 'grayscale(1)',
                    opacity: isUnlocked ? 1 : 0.45,
                    boxShadow: isUnlocked ? `0 4px 12px ${badge.color}25` : 'none',
                  }}>
                    <Icon size={22} color={isUnlocked ? badge.color : '#94a3b8'} />
                    {isUnlocked && (
                      <CheckCircle
                        size={14}
                        style={{
                          position: 'absolute', bottom: -4, right: -4,
                          background: 'white', borderRadius: '50%', color: '#22c55e',
                        }}
                      />
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: isUnlocked ? badge.color : '#94a3b8', lineHeight: 1.2,
                  }}>
                    {badge.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
