import React from 'react';

/**
 * ProgressRing — SVG donut chart (Liquid Glass 2026 style)
 * Props:
 *   percent     : 0-100
 *   size        : px (default 80)
 *   strokeWidth : px (default 8)
 *   color       : CSS color or SVG gradient id (e.g. "url(#gradProgress)")
 *   label       : center text (percent string like "75%")
 *   sublabel    : smaller text below label
 */
export default function ProgressRing({
  percent = 0,
  size = 80,
  strokeWidth = 8,
  color = '#6366f1',
  label,
  sublabel,
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(100,120,200,0.1)" strokeWidth={strokeWidth} />
        {/* Fill */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Center content */}
      {(label !== undefined || sublabel) && (
        <div style={{ position: 'relative', textAlign: 'center', userSelect: 'none' }}>
          {label !== undefined && (
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: size > 100 ? '1.4rem' : size > 70 ? '1.05rem' : '0.85rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}>
              {label}
            </div>
          )}
          {sublabel && (
            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: 1 }}>
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
