import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, FileText, CheckCircle, BookOpen, Download, ExternalLink, Link as LinkIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';

const BACKEND_URL = 'http://localhost:8000';

export default function Sheets() {
  const { user } = useAuth();
  const series = user?.series ?? 'C';
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchLibrary();
  }, [series]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/courses/library?series=${series}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.subjects && data.subjects.length > 0) {
        setSubjects(data.subjects);
        setActiveId(data.subjects[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const current = subjects.find(s => s.id === activeId) ?? subjects[0];

  const handleLessonClick = async (lesson) => {
    if (lesson.pdf_url) {
      window.open(`${BACKEND_URL}${lesson.pdf_url}`, '_blank');
      try {
        const token = localStorage.getItem('bac_token');
        await fetch(`${API_BASE_URL}/courses/lesson-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ lesson_id: lesson.id, progress_percent: 100 })
        });
        fetchSubjects();
      } catch (err) { }
    } else {
      navigate(`/courses/lesson/${lesson.id}`);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
        <div>Chargement des cours...</div>
      </div>
    );
  }

  if (!subjects.length || !current) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Aucun cours disponible pour la série {series}.</div>;
  }

  return (
    <div>
      <div className="page-hero">
        <div>
          <h1 className="page-title">Fiches de Révision</h1>
          <p className="page-subtitle">
            L'essentiel pour réviser — <strong>Série {series}</strong> · Mauritanie
          </p>
        </div>
      </div>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => { setActiveId(s.id); setExpanded(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.1rem', borderRadius: 'var(--r-full)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              transition: 'var(--t)',
              background: activeId === s.id ? s.gradient : 'var(--bg-glass-white)',
              color: activeId === s.id ? 'white' : 'var(--text-secondary)',
              boxShadow: activeId === s.id ? `0 4px 14px ${s.color}40` : 'var(--shadow-inset)',
              backdropFilter: 'blur(8px)',
              border: activeId === s.id ? 'none' : '1px solid var(--border-glass)',
            }}
          >
            <span>{s.emoji}</span>
            {s.name}
            <span style={{
              padding: '1px 6px', borderRadius: 'var(--r-full)',
              fontSize: '0.65rem', fontWeight: 700,
              background: activeId === s.id ? 'rgba(255,255,255,0.25)' : s.bg,
              color: activeId === s.id ? 'white' : s.color,
            }}>{s.sheets?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Lessons and Sheets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Lessons Section Removed */}

        {/* Revision Sheets Section */}
        {(!current.sheets || current.sheets.length === 0) ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucune fiche de révision disponible pour cette matière.
          </div>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ width: 8, height: 28, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '4px' }}></div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>📋 Fiches & Résumés</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {current.sheets.map((sheet) => (
                <div key={sheet.id} className="card" onClick={() => sheet.pdf_url && window.open(`${BACKEND_URL}${sheet.pdf_url}`, '_blank')}
                  style={{
                    padding: '1.25rem', cursor: 'pointer', transition: 'var(--t)',
                    border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: '1rem'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={22} style={{ color: '#d97706' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>{sheet.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Résumé & Essentiel</p>
                  </div>
                  <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
