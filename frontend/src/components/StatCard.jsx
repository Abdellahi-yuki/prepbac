import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard — reusable statistic card
 * Props:
 *   icon     : lucide icon component
 *   iconBg   : CSS background for icon container
 *   iconColor: CSS color for icon
 *   value    : string | number
 *   label    : string
 *   trend    : 'up' | 'down' | 'neutral'
 *   trendText: string e.g. "+5% ce mois"
 *   onClick  : optional click handler
 */
export default function StatCard({ icon: Icon, iconBg, iconColor, value, label, trend, trendText, onClick }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div
      className="card card-hover"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-stat">
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {label}
          </p>
          <p style={{
            fontSize: '1.875rem',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {value}
          </p>
          {trendText && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginTop: '0.5rem',
              color: trendColor,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              <TrendIcon size={13} />
              {trendText}
            </div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: iconBg || 'var(--primary-100)',
            color: iconColor || 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
