import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Circle, Eye, Search, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';
import { useAuth } from '../context/AuthContext';
import FileViewer from '../components/FileViewer';

const subjectMeta = {
  'Mathématiques': { emoji: '📘', gradient: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#667eea', bg: 'rgba(102,126,234,0.1)' },
  'Physique': { emoji: '⚛️', gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', color: '#f5576c', bg: 'rgba(245,87,108,0.1)' },
  'Sciences naturelles': { emoji: '🌿', gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', color: '#4facfe', bg: 'rgba(79,172,254,0.1)' },
  'Physique et Chimie': { emoji: '🧪', gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', color: '#f5576c', bg: 'rgba(245,87,108,0.1)' },
};

export default function Exams() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('Tous');
  const [filterSeries, setFilterSeries] = useState(user?.series || 1);
  const [filterSubject, setFilterSubject] = useState('Tous');
  const [filterSession, setFilterSession] = useState('Tous');
  const [viewerPdf, setViewerPdf] = useState(null);

  const [series, setSeries] = useState([]);
  const [availableYears, setAvailableYears] = useState(['Tous']);
  const [availableSubjects, setAvailableSubjects] = useState(['Tous']);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (filterSeries) {
      fetchExams();
    }
  }, [filterSeries]);

  const fetchMetadata = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` };

      const [resSeries, resSubjects] = await Promise.all([
        fetch(`${API_BASE_URL}/exams/series`, { headers }),
        fetch(`${API_BASE_URL}/exams/subjects`, { headers })
      ]);

      const dataSeries = await resSeries.json();
      const dataSubjects = await resSubjects.json();

      if (dataSeries.success) {
        setSeries(dataSeries.series);
        // If user series isn't in the list (e.g. if we have only C and D but user is T), default to the first one
        if (dataSeries.series.length > 0 && !dataSeries.series.find(s => s.id === filterSeries)) {
          setFilterSeries(dataSeries.series[0].id);
        }
      }
      if (dataSubjects.success) {
        setAvailableSubjects(['Tous', ...dataSubjects.subjects.map(s => s.name)]);
      }
    } catch (err) {
      console.error("Erreur métadonnées", err);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/exams/list?series_id=${filterSeries}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setExams(data.exams);
        const years = ['Tous', ...new Set(data.exams.map(e => e.year.toString()))].sort((a, b) => b - a);
        setAvailableYears(years);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Impossible de charger les annales");
    } finally {
      setLoading(false);
    }
  };

  const toggleExamDone = async (e, exam) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('bac_token');
      const newStatus = exam.is_completed ? 'not_started' : 'completed';

      const res = await fetch(`${API_BASE_URL}/progress/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ exam_id: exam.id, status: newStatus })
      });
      if (res.ok) {
        setExams(prev => prev.map(item => item.id === exam.id ? { ...item, is_completed: newStatus === 'completed' } : item));
      }
    } catch (err) { console.error('Erreur progression exam', err); }
  };

  const filtered = exams.filter(a => {
    if (filterYear !== 'Tous' && a.year.toString() !== filterYear) return false;
    if (filterSubject !== 'Tous' && a.subject !== filterSubject) return false;
    if (filterSession !== 'Tous') {
      const s = (a.session || '').toLowerCase();
      if (filterSession === 'Normale' && !s.includes('normal')) return false;
      if (filterSession === 'Complémentaire' && !s.includes('compl')) return false;
    }
    if (search && !a.subject.toLowerCase().includes(search.toLowerCase()) && !a.year.toString().includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-hero">
        <div>
          <h1 className="page-title">Annales du Bac</h1>
          <p className="page-subtitle">Sujets officiels des examens précédents avec corrections et solutions.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 250 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Series filter */}
        <div style={{ display: 'flex', background: 'var(--bg-glass)', padding: '0.2rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)' }}>
          {series.map(s => (
            <button
              key={s.id}
              onClick={() => { setFilterSeries(s.id); setFilterYear('Tous'); }}
              className={`btn ${filterSeries === s.id ? 'btn-primary' : 'btn-glass'} btn-sm`}
              style={{ minWidth: 80, border: 'none', background: filterSeries === s.id ? '' : 'transparent' }}
            >
              Série {s.name}
            </button>
          ))}
        </div>

        {/* Session filter */}
        <div style={{ display: 'flex', background: 'var(--bg-glass)', padding: '0.2rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)' }}>
          {['Tous', 'Normale', 'Complémentaire'].map(sess => (
            <button
              key={sess}
              onClick={() => setFilterSession(sess)}
              className={`btn ${filterSession === sess ? 'btn-primary' : 'btn-glass'} btn-sm`}
              style={{ border: 'none', background: filterSession === sess ? '' : 'transparent', fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
            >
              {sess === 'Tous' ? 'Toutes sessions' : sess}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border-soft)' }} />

        {/* Year filter */}
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: 120, height: 42 }}
        >
          {availableYears.map(y => <option key={y} value={y}>{y === 'Tous' ? 'Toutes les années' : y}</option>)}
        </select>

        <div style={{ width: 1, height: 24, background: 'var(--border-soft)' }} />

        {/* Subject filter */}
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: 150, height: 42 }}
        >
          {availableSubjects.map(s => <option key={s} value={s}>{s === 'Tous' ? 'Toutes les matières' : s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>Chargement...</div>
      ) : error ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #fee2e2', color: '#b91c1c' }}>
          <AlertCircle size={32} style={{ marginBottom: '1rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(item => {
            const meta = subjectMeta[item.subject] || { emoji: '📄', gradient: 'linear-gradient(135deg,#94a3b8,#475569)', color: '#475569', bg: 'rgba(148,163,184,0.1)' };
            return (
              <div key={item.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 4, background: meta.gradient }} />
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem',
                      }}>{meta.emoji}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>{item.subject}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Bac {item.year}
                        </div>
                      </div>
                    </div>
                    {item.pdf_correction_url && (
                      <span className="badge badge-green" style={{ flexShrink: 0, fontSize: '0.65rem' }}>
                        <CheckCircle size={10} /> Corrigé
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', gap: '0.75rem', marginBottom: '1rem',
                    padding: '0.65rem', borderRadius: 'var(--r-md)',
                    background: 'rgba(238,241,248,0.6)',
                  }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: meta.color, fontFamily: 'var(--font-display)' }}>{item.year}</div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session</div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-soft)' }} />
                    <div style={{ textAlign: 'center', flex: 1.2 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', height: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{item.session}</div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto', marginBottom: '0.6rem' }}>
                    <button
                      onClick={() => setViewerPdf({ url: item.pdf_statement_url, title: `Sujet ${item.subject} ${item.year}` })}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', border: 'none' }}
                    >
                      <FileText size={14} /> Sujet
                    </button>
                    {item.pdf_correction_url && (
                      <button
                        onClick={() => setViewerPdf({ url: item.pdf_correction_url, title: `Corrigé ${item.subject} ${item.year}` })}
                        className="btn btn-glass btn-sm"
                        style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', border: 'none', color: '#10b981' }}
                      >
                        <CheckCircle size={14} /> Corrigé
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => toggleExamDone(e, item)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: 'none',
                      background: item.is_completed
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'rgba(243, 244, 246, 0.7)',
                      color: item.is_completed ? 'white' : '#6b7280',
                      boxShadow: item.is_completed
                        ? '0 4px 12px rgba(16, 185, 129, 0.25)'
                        : 'none',
                      transform: item.is_completed ? 'scale(1.02)' : 'scale(1)',
                    }}
                    onMouseOver={(e) => {
                      if (!item.is_completed) e.currentTarget.style.background = 'rgba(229, 231, 235, 0.9)';
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      if (!item.is_completed) e.currentTarget.style.background = 'rgba(243, 244, 246, 0.7)';
                      e.currentTarget.style.transform = item.is_completed ? 'scale(1.02)' : 'scale(1)';
                    }}
                  >
                    {item.is_completed ? (
                      <>
                        <CheckCircle size={16} fill="rgba(255,255,255,0.2)" />
                        <span>Terminé</span>
                      </>
                    ) : (
                      <>
                        <Circle size={16} />
                        <span>Marquer fait</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !loading && !error && (
        <div className="empty-state card" style={{ marginTop: '2rem' }}>
          <FileText size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: 600 }}>Aucune annale trouvée</p>
          <p style={{ fontSize: '0.85rem' }}>Nous ajoutons régulièrement de nouveaux contenus. Revenez bientôt !</p>
        </div>
      )}

      {viewerPdf && (
        <FileViewer
          file={{ nom: viewerPdf.title, chemin_fichier: viewerPdf.url }}
          onClose={() => setViewerPdf(null)}
        />
      )}
    </div>
  );
}
