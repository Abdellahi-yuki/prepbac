import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, TrendingUp, CheckSquare, Calendar, ArrowRight,
  Sparkles, FlaskConical, Ruler, Play, Zap, Brain, GitBranch,
  Target, Trophy, ChevronRight, AlertTriangle, Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProgressRing from '../components/ProgressRing';
import { API_BASE_URL } from '../apiConfig';
import StreakCard from '../components/StreakCard';

const SERIES_DATA = {
  C: {
    label: 'Série C',
    sublabel: 'Mathématiques & Sciences',
    color: '#4f7af8',
    gradient: 'linear-gradient(135deg, #4f7af8 0%, #764ba2 100%)',
    icon: Ruler,
    subjects: [
      { name: 'Mathématiques', color: '#4f7af8', bg: 'rgba(79,122,248,0.1)', icon: '📐' },
      { name: 'Physique-Chimie', color: '#f5576c', bg: 'rgba(245,87,108,0.1)', icon: '⚡' },
      { name: 'Informatique', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '💻' },
    ],
  },
  D: {
    label: 'Série D',
    sublabel: 'Sciences Naturelles',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: FlaskConical,
    subjects: [
      { name: 'Sciences Naturelles', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '🧬' },
      { name: 'Physique-Chimie', color: '#f5576c', bg: 'rgba(245,87,108,0.1)', icon: '⚡' },
      { name: 'Mathématiques', color: '#4f7af8', bg: 'rgba(79,122,248,0.1)', icon: '📐' },
    ],
  },
};

const AI_ACTIONS = [
  { icon: BookOpen, label: 'Expliquer un chapitre', color: '#4f7af8', prompt: 'Explique-moi un chapitre de mon programme.' },
  { icon: Zap, label: 'Générer un exercice', color: '#f5576c', prompt: 'Génère-moi un exercice de révision.' },
  { icon: Calendar, label: 'Optimiser mon planning', color: '#10b981', prompt: 'Aide-moi à optimiser mon planning de révision.' },
  { icon: Brain, label: 'Fiche de révision', color: '#a18cd1', prompt: 'Crée-moi une fiche de révision.' },
];

const TO_REVIEW = [
  { subject: 'Dérivées & Intégrales', reason: 'Dernière tentative < 60%', urgency: 'high', icon: '📐' },
  { subject: 'Électricité', reason: 'Pas révisé depuis 5 jours', urgency: 'medium', icon: '⚡' },
  { subject: 'Génétique', reason: 'QCM non validé', urgency: 'medium', icon: '🧬' },
];

/* ─── Petit sous-composant pour les barres animées ─── */
function AnimProgressBar({ pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color,
        width: `${width}%`, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: `0 0 8px ${color}60`,
      }} />
    </div>
  );
}

/* ─── Carte stat (Exercices / Annales / QCM) ─── */
function StatCard({ title, icon: Icon, done, total, color, gradient, delay }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        border: hovered ? `1px solid ${color}40` : '1px solid rgba(200,210,240,0.5)',
        borderRadius: 20,
        padding: '1.25rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 16px 40px ${color}20, 0 4px 12px rgba(0,0,0,0.06)` : '0 4px 20px rgba(100,120,200,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'default',
        animation: `fadeUp 0.5s ease ${delay}ms both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
            {pct}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
          </div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
          boxShadow: hovered ? `0 4px 12px ${color}30` : 'none',
          transition: 'all 0.3s',
        }}>
          <Icon size={20} />
        </div>
      </div>
      <AnimProgressBar pct={pct} color={gradient} delay={delay} />
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        {done} / {total} terminés
      </div>
    </div>
  );
}

/* ================================================================
   COMPOSANT PRINCIPAL
   ================================================================ */
export default function Dashboard() {
  const { user } = useAuth();
  const seriesKey = user?.series ?? 'C';
  const data = SERIES_DATA[seriesKey] ?? SERIES_DATA.C;
  const SeriesIcon = data.icon;
  const firstName = user?.name?.split(' ')[0] ?? 'Étudiant';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const [stats, setStats] = useState({
    exercise_stats: { total: 0, completed: 0 },
    exam_stats: { total: 0, completed: 0 },
    study_sessions: [],
  });
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [heroPct, setHeroPct] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchResumes();
  }, [seriesKey]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('bac_token');
      const statsRes = await fetch(`${API_BASE_URL}/progress/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsJson = await statsRes.json();
      setStats(statsJson);
      if (statsJson.subjects) {
        setData(prev => ({ ...prev, subjects: statsJson.subjects }));
      }
    } catch (err) { }
    finally { setLoading(false); }
  };

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/courses/resumes?series=${seriesKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.subjects) {
        let allResumes = [];
        data.subjects.forEach(sub => {
          if (sub.resumes) {
            sub.resumes.forEach(r => {
              if (r.pdf_url) allResumes.push({ ...r, subject_name: sub.name, resume_pdf_url: r.pdf_url });
            });
          }
          if (sub.sheets) {
            sub.sheets.forEach(s => {
              if (s.pdf_url) allResumes.push({ ...s, subject_name: sub.name, resume_pdf_url: s.pdf_url });
            });
          }
        });
        allResumes.sort((a, b) => (b.id || 0) - (a.id || 0));
        setResumes(allResumes);
      }
    } catch (err) { }
  };

  const getGlobalProgress = () => {
    let items = 0, total = 0;
    const add = (done, t) => { if (t > 0) { items++; total += (done / t) * 100; } };
    add(stats.exercise_stats.completed, stats.exercise_stats.total);
    add(stats.exam_stats.completed, stats.exam_stats.total);
    return items > 0 ? Math.round(total / items) : 0;
  };

  const globalProgress = getGlobalProgress();

  useEffect(() => {
    const t = setTimeout(() => setHeroPct(globalProgress), 400);
    return () => clearTimeout(t);
  }, [globalProgress]);

  const urgencyConfig = {
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Urgent' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'À réviser' },
    low: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Prévu' },
  };

  const getUrgency = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'high';
    if (diff <= 2) return 'medium';
    return 'low';
  };

  const getSubjectIcon = (name) => {
    const map = {
      'Mathématiques': '📐',
      'Physique-Chimie': '⚡',
      'Sciences Naturelles': '🧬',
      'Informatique': '💻',
      'Anglais': '🇬🇧',
      'Français': '🇫🇷',
      'Philosophie': '⚖️',
    };
    return map[name] || '📚';
  };
  const getSubjectAesthetics = (name) => {
    const config = {
      'Mathématiques': { icon: '📐', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
      'Physique-Chimie': { icon: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      'Sciences Naturelles': { icon: '🧬', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      'Informatique': { icon: '💻', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      'Anglais': { icon: '🇬🇧', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
      'Français': { icon: '🇫🇷', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
      'Philosophie': { icon: '⚖️', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      'Histoire-Géo': { icon: '🌍', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    };
    return config[name] || { icon: '📚', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── HERO CARD ── */}
      <div style={{
        background: `linear-gradient(135deg, #1a1f3a 0%, #2d3261 50%, #1a2a5e 100%)`,
        borderRadius: 28,
        padding: 'clamp(1.75rem, 4vw, 2.5rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem',
        flexWrap: 'wrap',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(26,31,58,0.35), 0 8px 24px rgba(79,122,248,0.2)',
        animation: 'fadeUp 0.5s ease both',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '-40%', right: '-5%',
          width: '45%', paddingBottom: '45%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,122,248,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-50%', left: '20%',
          width: '35%', paddingBottom: '35%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(161,140,209,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 700,
              padding: '0.25rem 0.75rem', borderRadius: 99, letterSpacing: '0.04em',
            }}>
              <SeriesIcon size={12} /> {data.label} — {data.sublabel}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
            fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.2, marginBottom: '0.5rem',
          }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
            {globalProgress >= 80
              ? '🔥 Tu es en excellente forme ! Continue ce rythme.'
              : globalProgress >= 50
                ? '📈 Tu progresses bien ! Ne relâche pas l\'effort.'
                : '🎯 Chaque révision te rapproche du bac. Courage !'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/app/exercises" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', borderRadius: 12,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
              transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none'; }}
            >
              <Play size={14} fill="white" /> Exercices
            </Link>
            <Link to="/app/planning" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', borderRadius: 12,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
              transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Calendar size={14} /> Mon planning
            </Link>
          </div>
        </div>

        {/* Ring de progression */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{ position: 'relative' }}>
            <svg width="0" height="0">
              <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#f093fb" />
                </linearGradient>
              </defs>
            </svg>
            <ProgressRing
              percent={globalProgress}
              size={110}
              strokeWidth={10}
              color="url(#heroGrad)"
              label={`${globalProgress}%`}
              sublabel="global"
            />
            {/* Inner glow */}
            <div style={{
              position: 'absolute', inset: 10,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Progression globale
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1rem',
      }}>
        <StatCard
          title="Exercices" icon={CheckSquare}
          done={stats.exercise_stats.completed} total={stats.exercise_stats.total}
          color="#10b981" gradient="linear-gradient(90deg, #10b981, #34d399)"
          delay={0}
        />
        <StatCard
          title="Annales" icon={TrendingUp}
          done={stats.exam_stats.completed} total={stats.exam_stats.total}
          color="#f59e0b" gradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
          delay={80}
        />
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Streak & Badges */}
        <StreakCard />

        {/* À réviser aujourd'hui */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(200,210,240,0.5)', borderRadius: 20,
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          animation: 'fadeUp 0.5s ease 200ms both',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                Recommandations
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                👉 À réviser aujourd'hui
              </h3>
            </div>
            <div style={{
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              padding: '0.25rem 0.65rem', borderRadius: 99,
              fontSize: '0.7rem', fontWeight: 800,
            }}>
              {stats.study_sessions.length} séances
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stats.study_sessions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Aucune séance prévue. C'est le moment de planifier !
              </div>
            ) : (
              stats.study_sessions.map((item, i) => {
                const urgency = getUrgency(item.scheduled_date);
                const u = urgencyConfig[urgency];
                const icon = getSubjectIcon(item.subject_name);
                const dateLabel = new Date(item.scheduled_date).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short'
                });

                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    padding: '0.85rem 1rem', borderRadius: 14,
                    background: u.bg, border: `1px solid ${u.border}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    onClick={() => navigate('/app/planning')}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.chapter_title || item.subject_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.subject_name} · {item.duration_minutes} min · {dateLabel}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.55rem',
                      borderRadius: 99, background: u.color + '20', color: u.color,
                    }}>
                      {u.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <Link to="/app/courses" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.1rem', borderRadius: 12, alignSelf: 'flex-start',
            background: 'var(--primary-soft)', color: 'var(--primary)',
            fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.2s', border: '1px solid rgba(79,122,248,0.15)',
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(79,122,248,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--primary-soft)'; e.currentTarget.style.transform = 'none'; }}
          >
            <BookOpen size={14} /> Voir les cours <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── SECOND GRID: AI + Résumés + Planning ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

        {/* Résumés de Chapitres */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(200,210,240,0.5)', borderRadius: 20,
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          animation: 'fadeUp 0.5s ease 350ms both',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                Bibliothèque
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                <BookOpen size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--primary)' }} />
                Résumés
              </h3>
            </div>
            <Link to="/app/courses" style={{
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}>
              Tout voir <ChevronRight size={13} />
            </Link>
          </div>

          {resumes.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              padding: '2rem 1rem', textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'rgba(79,122,248,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={22} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                  Aucun résumé disponible
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Les résumés de chapitres apparaîtront ici
                </div>
              </div>
              <Link to="/app/courses" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.1rem', borderRadius: 10,
                background: 'var(--primary-soft)', color: 'var(--primary)',
                fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
              }}>
                Voir les cours <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {resumes.slice(0, 4).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.85rem',
                      padding: '0.75rem 1rem', borderRadius: 14,
                      background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(200,210,240,0.3)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onClick={() => window.open(`${API_BASE_URL.replace('/api', '')}${r.resume_pdf_url}`, '_blank')}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(79,122,248,0.05)'; e.currentTarget.style.borderColor = 'rgba(79,122,248,0.2)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(248,250,252,0.8)'; e.currentTarget.style.borderColor = 'rgba(200,210,240,0.3)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    }}>
                      <BookOpen size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{r.subject_name}</div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
