import React from 'react';
import { Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StreakHeader() {
  const { user } = useAuth();
  
  if (!user || user.role === 'admin') return null;

  const streak = user.current_streak || 0;

  return (
    <div className="streak-header-badge" title={`${streak} jours consécutifs !`}>
      <div className={`streak-icon-wrap ${streak > 0 ? 'active' : ''}`}>
        <Flame size={20} className={streak > 0 ? 'flame-anim' : ''} />
      </div>
      <div className="streak-info">
        <span className="streak-count">{streak}</span>
        <span className="streak-label">{streak === 1 ? 'jour' : 'jours'}</span>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .streak-header-badge {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.8rem;
          background: var(--bg-glass-white);
          border: 1px solid var(--border-glass);
          border-radius: 50px;
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .streak-header-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
          border-color: rgba(245, 158, 11, 0.4);
        }
        .streak-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          transition: all 0.3s ease;
        }
        .streak-icon-wrap.active {
          color: #f59e0b;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.4));
        }
        .streak-info {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .streak-count {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .streak-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .flame-anim {
          animation: flame-pulse 2s infinite ease-in-out;
        }
        @keyframes flame-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.4)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)); }
        }
      `}} />
    </div>
  );
}
