import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, CheckCircle, Download,
  Search, ChevronRight, ChevronLeft, Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import FileViewer from '../components/FileViewer';

const BACKEND_URL = 'http://localhost:8000';

// Gradient palette for subject cards
const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#ffecd2,#fcb69f)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
];

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // user.series is now a single INT ID referencing the series table
  const seriesId = user?.series ?? 1;

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Two-phase nav
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [viewerPdf, setViewerPdf] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => { fetchSubjects(); }, [seriesId]);

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/courses/library?series=${seriesId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.subjects) {
        setSubjects(data.subjects);
      } else {
        setError('Impossible de charger les matières.');
      }
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = async (subject) => {
    setSelectedSubject(subject);
    setLessonsLoading(true);
    setLessons([]);
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/courses/library?series=${seriesId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Find the clicked subject in the fresh data to get its lessons
      const found = (data.subjects || []).find(s => s.id === subject.id);
      setLessons(found?.lessons || []);
    } catch {
      setLessons([]);
    } finally {
      setLessonsLoading(false);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleLessonClick = async (lesson) => {
    if (lesson.pdf_url) {
      setViewerPdf({ url: `${BACKEND_URL}${lesson.pdf_url}`, title: lesson.title });
      try {
        const token = localStorage.getItem('bac_token');
        await fetch(`${API_BASE_URL}/courses/lesson-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ lesson_id: lesson.id, progress_percent: 100 })
        });
      } catch { }
    } else {
      navigate(`/courses/lesson/${lesson.id}`);
    }
  };

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Hero */}
      <div className="page-hero">
        <div>
          <h1 className="page-title">Bibliothèque de Cours</h1>
          <p className="page-subtitle">Programme officiel · Mauritanie</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Rechercher une matière..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.75rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', fontSize: '0.9rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* Subject grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
          <Loader2 size={36} style={{ margin: '0 auto 1rem', display: 'block' }} className="anim-spin" />
          Chargement des matières…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
          <AlertCircle size={32} style={{ marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
          {error}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Aucune matière disponible.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}>
          {filteredSubjects.map((subject, idx) => {
            const grad = GRADIENTS[idx % GRADIENTS.length];
            const isActive = selectedSubject?.id === subject.id;
            const total = subject.lessons?.length ?? 0;
            const done = (subject.lessons || []).filter(l => (l.progress ?? 0) >= 100).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div
                key={subject.id}
                onClick={() => handleSubjectClick(subject)}
                style={{
                  background: isActive ? grad : 'white',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: isActive ? 'none' : '1px solid #e8edf5',
                  boxShadow: isActive
                    ? '0 12px 30px rgba(102,126,234,0.35)'
                    : '0 2px 12px rgba(0,0,0,0.05)',
                  transform: isActive ? 'translateY(-4px)' : 'none',
                  transition: 'all 0.25s ease',
                  userSelect: 'none',
                }}
                onMouseOver={e => { if (!isActive) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)'; } }}
                onMouseOut={e => { if (!isActive) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; } }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 52, height: 52, borderRadius: '14px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : `rgba(102,126,234,0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', fontSize: '1.65rem'
                }}>
                  📘
                </div>

                <div style={{ fontWeight: 800, fontSize: '1rem', color: isActive ? 'white' : '#0f172a', marginBottom: '0.3rem' }}>
                  {subject.name}
                </div>

                <div style={{ fontSize: '0.8rem', color: isActive ? 'rgba(255,255,255,0.75)' : '#64748b', marginBottom: '1rem' }}>
                  {total} leçon{total !== 1 ? 's' : ''}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div>
                    <div style={{ height: 4, borderRadius: 4, background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: isActive ? 'white' : grad, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', marginTop: '0.4rem', color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8', fontWeight: 600 }}>
                      {pct}% complété
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <ChevronRight size={18} style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson panel — shown when a subject is selected */}
      {selectedSubject && (
        <div ref={panelRef} style={{
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          marginBottom: '3rem',
          animation: 'fadeInUp 0.3s ease'
        }}>
          {/* Panel header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#f8fafc'
          }}>
            <button
              onClick={() => setSelectedSubject(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', fontWeight: 600, gap: '0.4rem', fontSize: '0.9rem', padding: 0 }}
            >
              <ChevronLeft size={18} /> Retour
            </button>
            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
              🎓 {selectedSubject.name}
            </span>
          </div>

          {/* Lessons list */}
          <div style={{ padding: '1.5rem' }}>
            {lessonsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Loader2 size={28} className="anim-spin" style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                Chargement des leçons…
              </div>
            ) : lessons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                Aucune leçon disponible pour cette matière.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {lessons.map((lesson, idx) => {
                  const progress = lesson.progress ?? 0;
                  return (
                    <div
                      key={lesson.id}
                      style={{
                        borderRadius: '14px',
                        border: '1px solid #e8edf5',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        background: 'white'
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.07)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* Progress stripe at top */}
                      {progress > 0 && (
                        <div style={{ position: 'absolute', top: 0, left: 0, height: 3, width: `${progress}%`, background: 'linear-gradient(135deg,#667eea,#764ba2)' }} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '12px', flexShrink: 0, background: 'rgba(102,126,234,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={20} style={{ color: '#667eea' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{lesson.title}</span>
                            {progress >= 100 && <CheckCircle size={15} style={{ color: '#22c55e', flexShrink: 0 }} />}
                          </div>
                          {lesson.description && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lesson.description}
                            </div>
                          )}
                          {lesson.type && (
                            <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#667eea', background: '#eef2ff', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                              {lesson.type}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <button
                            onClick={() => handleLessonClick(lesson)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(102,126,234,0.3)' }}
                          >
                            <BookOpen size={15} /> Lire
                          </button>

                          {lesson.pdf_url && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = `${BACKEND_URL}${lesson.pdf_url}`;
                                a.download = lesson.title + '.pdf';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              style={{ display: 'flex', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: '0.82rem', cursor: 'pointer' }}
                              title="Télécharger le PDF"
                            >
                              <Download size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewerPdf && <FileViewer file={{ nom: viewerPdf.title, chemin_fichier: viewerPdf.url }} onClose={() => setViewerPdf(null)} />}
    </div>
  );
}
