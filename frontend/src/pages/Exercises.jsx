import React, { useState, useEffect } from 'react';
import { Clock, CheckSquare, Award, Play, X, ChevronRight, FileSearch, BookOpen, Search, AlertCircle, CheckCircle, Circle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import { useAuth } from '../context/AuthContext';
import FileViewer from '../components/FileViewer';
import AIExerciseGenerator from '../components/AIExerciseGenerator';
import ExerciseViewer from '../components/ExerciseViewer';

const BACKEND_URL = 'http://localhost:8000';

const difficultyConfig = {
  'easy': { color: '#16a34a', bg: 'rgba(46,213,115,0.12)', label: 'Facile' },
  'medium': { color: '#ca8a04', bg: 'rgba(255,165,2,0.12)', label: 'Moyen' },
  'hard': { color: '#dc2626', bg: 'rgba(255,71,87,0.12)', label: 'Difficile' },
};

export default function Exercises() {
  const { user } = useAuth();
  const series = user?.series ?? 'C';

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('Tous');
  const [availableSubjects, setAvailableSubjects] = useState(['Tous']);
  const [viewerPdf, setViewerPdf] = useState(null);
  const [viewerExercise, setViewerExercise] = useState(null);

  // Tabs: 'bank' or 'ai'
  const [activeTab, setActiveTab] = useState('bank');

  useEffect(() => { fetchExercises(); }, [series]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/courses/exercises?series=${series}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExercises(data.exercises);
        const subjectsList = ['Tous', ...new Set(data.exercises.map(e => e.subject))].sort();
        setAvailableSubjects(subjectsList);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleOpenExercise = (ex) => {
    if (ex.pdf_path) {
      setViewerPdf({ url: ex.pdf_path, title: ex.title });
    } else {
      setViewerExercise(ex);
    }
  };

  const toggleExerciseDone = async (e, ex) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('bac_token');
      const newStatus = ex.is_completed ? 'not_started' : 'completed';

      const res = await fetch(`${API_BASE_URL}/progress/exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: ex.id, status: newStatus })
      });
      if (res.ok) {
        setExercises(prev => prev.map(item => item.id === ex.id ? { ...item, is_completed: newStatus === 'completed' } : item));
      }
    } catch (err) { console.error('Erreur progression', err); }
  };

  return (
    <div>
      <div className="page-hero">
        <div>
          <h1 className="page-title">Banque d'Exercices</h1>
          <p className="page-subtitle">Pratiquez avec des exercices réels · Série {series}</p>
        </div>
      </div>

      {/* TABS SCHEME */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-soft)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('bank')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none', background: activeTab === 'bank' ? 'var(--primary)' : 'transparent', color: activeTab === 'bank' ? 'white' : 'var(--text-secondary)', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: activeTab === 'bank' ? '0 4px 12px rgba(79,122,248,0.3)' : 'none' }}
        >
          <BookOpen size={18} /> Banque d'exercices
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none', background: activeTab === 'ai' ? 'linear-gradient(135deg, #a18cd1, #fbc2eb)' : 'transparent', color: activeTab === 'ai' ? 'white' : 'var(--text-secondary)', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: activeTab === 'ai' ? '0 4px 15px rgba(161,140,209,0.3)' : 'none' }}
        >
          <Sparkles size={18} /> Générateur IA
        </button>
      </div>

      {activeTab === 'bank' ? (
        <>
          {/* Search & Filter bar placeholder */}
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Rechercher par titre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '14px', border: '1px solid var(--border-soft)', background: 'white', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              />
            </div>
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              style={{ padding: '0.8rem 1rem', borderRadius: '14px', border: '1px solid var(--border-soft)', background: 'white', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', minWidth: 200 }}
            >
              {availableSubjects.map(s => <option key={s} value={s}>{s === 'Tous' ? 'Toutes les matières' : s}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileSearch size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div>Chargement des exercices...</div>
            </div>
          ) : (
            <>
              {exercises.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'white', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                  Aucun exercice trouvé pour votre série.
                </div>
              ) : (
                <div className="grid stagger anim-fade-up" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  {exercises.filter(ex => {
                    if (filterSubject !== 'Tous' && ex.subject !== filterSubject) return false;
                    if (search && !ex.title.toLowerCase().includes(search.toLowerCase())) return false;
                    return true;
                  }).map(ex => {
                    const diff = difficultyConfig[ex.difficulty] || difficultyConfig.medium;
                    const cardColor = ex.type === 'AI Generated' ? '#a18cd1' : (ex.type === 'Interactif' ? '#8b5cf6' : '#10b981');

                    return (
                      <div key={ex.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 4, background: cardColor }} />
                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: `${cardColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cardColor
                            }}>
                              {ex.type === 'AI Generated' ? <Sparkles size={20} /> : (ex.type === 'Interactif' ? <Play size={20} /> : <BookOpen size={20} />)}
                            </div>
                            <span style={{
                              padding: '0.25rem 0.7rem', borderRadius: 'var(--r-full)',
                              fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                              background: diff.bg, color: diff.color
                            }}>{diff.label}</span>
                          </div>

                          <div style={{ marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cardColor }}>{ex.subject}</span>
                          </div>
                          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{ex.title}</h3>
                          {ex.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {ex.description}
                            </p>
                          )}

                          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-soft)', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, justifyContent: 'center', background: cardColor }}
                              onClick={() => handleOpenExercise(ex)}
                            >
                              <Play size={16} /> {ex.pdf_path ? 'Ouvrir PDF' : 'Démarrer'}
                            </button>
                            <button
                              onClick={(e) => toggleExerciseDone(e, ex)}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1rem',
                                borderRadius: '14px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: 'none',
                                background: ex.is_completed
                                  ? 'linear-gradient(135deg, #10b981, #059669)'
                                  : 'rgba(243, 244, 246, 0.8)',
                                color: ex.is_completed ? 'white' : '#6b7280',
                                boxShadow: ex.is_completed
                                  ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                                  : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                                transform: ex.is_completed ? 'scale(1.02)' : 'scale(1)',
                              }}
                              onMouseOver={(e) => {
                                if (!ex.is_completed) e.currentTarget.style.background = 'rgba(229, 231, 235, 1)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                              }}
                              onMouseOut={(e) => {
                                if (!ex.is_completed) e.currentTarget.style.background = 'rgba(243, 244, 246, 0.8)';
                                e.currentTarget.style.transform = ex.is_completed ? 'scale(1.02)' : 'scale(1)';
                              }}
                            >
                              {ex.is_completed ? (
                                <>
                                  <CheckCircle size={18} fill="rgba(255,255,255,0.2)" />
                                  <span>Validé</span>
                                </>
                              ) : (
                                <>
                                  <Circle size={18} />
                                  <span>Terminer</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Simulation Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #4f7af8, #764ba2)',
            borderRadius: '20px', padding: '2.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(79,122,248,0.2)',
            color: 'white',
            marginTop: '2rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Auto-évaluation Automatisée</h2>
              <p style={{ opacity: 0.9, maxWidth: 500, fontSize: '0.92rem' }}>
                Pratiquez avec des centaines d'exercices classés par chapitre. Pour chaque exercice, vous trouverez l'énoncé et la solution détaillée pour progresser rapidement.
              </p>
            </div>
            <button style={{ background: 'white', color: '#4f7af8', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              Simulation Globale
            </button>
          </div>
        </>
      ) : (
        <AIExerciseGenerator series={series} onExerciseGenerated={fetchExercises} />
      )}

      {viewerPdf && (
        <FileViewer
          file={{ nom: viewerPdf.title, chemin_fichier: viewerPdf.url }}
          onClose={() => setViewerPdf(null)}
        />
      )}

      {viewerExercise && (
        <ExerciseViewer
          exercise={viewerExercise}
          onClose={() => setViewerExercise(null)}
        />
      )}
    </div>
  );
}
