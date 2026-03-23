import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Sparkles, ChevronDown, ChevronRight, Search, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';

const BACKEND_URL = 'http://localhost:8000';

const gradients = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
];
const colors = ['#667eea', '#f5576c', '#4facfe', '#43e97b', '#fa709a'];

export default function ChapterSummaries() {
    const { user } = useAuth();
    const series = user?.series ?? 'C';

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSubjectId, setActiveSubjectId] = useState(null);
    const [expandedChapter, setExpandedChapter] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, [series]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/courses/resumes?series=${series}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.subjects && data.subjects.length > 0) {
                // Annotate subjects with gradient/color
                const enriched = data.subjects.map((s, i) => ({
                    ...s,
                    gradient: s.gradient || gradients[i % gradients.length],
                    color: s.color_theme || colors[i % colors.length],
                    bg: `${s.color_theme || colors[i % colors.length]}18`,
                }));
                setSubjects(enriched);
                setActiveSubjectId(enriched[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const activeSubject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0];

    // Collect independent resumes (those from the 'resumes' table)
    const resumes = (activeSubject?.resumes || []).filter(r => {
        if (search) return (r.title || '').toLowerCase().includes(search.toLowerCase());
        return true;
    });

    // Sheets (fiches de révision)
    const sheets = (activeSubject?.sheets || []).filter(sh => {
        if (search) return (sh.title || '').toLowerCase().includes(search.toLowerCase());
        return true;
    });

    if (loading) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <div>Chargement des résumés...</div>
            </div>
        );
    }

    if (!subjects.length) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Aucun contenu disponible pour la série {series}.</div>;
    }

    return (
        <div>
            {/* Hero */}
            <div className="page-hero">
                <div>
                    <h1 className="page-title">Résumés & Synthèses</h1>
                    <p className="page-subtitle">Documents de révision et synthèses de cours — <strong>Série {series}</strong></p>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: '2.5rem', width: 220 }}
                        placeholder="Rechercher un résumé..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Subject tabs */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {subjects.map(s => (
                    <button
                        key={s.id}
                        onClick={() => { setActiveSubjectId(s.id); setExpandedChapter(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.55rem 1.1rem', borderRadius: 'var(--r-full)',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                            transition: 'var(--t)',
                            background: activeSubjectId === s.id ? s.gradient : 'var(--bg-glass-white)',
                            color: activeSubjectId === s.id ? 'white' : 'var(--text-secondary)',
                            boxShadow: activeSubjectId === s.id ? `0 4px 14px ${s.color}40` : 'var(--shadow-inset)',
                            backdropFilter: 'blur(8px)',
                            border: activeSubjectId === s.id ? 'none' : '1px solid var(--border-glass)',
                        }}
                    >
                        {s.emoji && <span>{s.emoji}</span>}
                        <BookOpen size={14} />
                        {s.name}
                    </button>
                ))}
            </div>

            {/* Content: Independent resumes + sheets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Column 1: Resumes from new table */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                        <div style={{ width: 6, height: 26, background: activeSubject?.gradient || gradients[0], borderRadius: '4px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Résumés PDF</h2>
                    </div>

                    {resumes.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {search ? `Aucun résumé trouvé pour "${search}".` : 'Aucun résumé PDF disponible pour cette matière.'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {resumes.map((r, i) => (
                                <div key={r.id} className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-soft)', transition: 'var(--t)' }}>
                                    <button
                                        onClick={() => setExpandedChapter(expandedChapter === r.id ? null : r.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            padding: '1rem 1.25rem', width: '100%', textAlign: 'left',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: activeSubject?.bg || 'rgba(102,126,234,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.85rem', fontWeight: 800, color: activeSubject?.color || '#667eea',
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <FileText size={11} /> Document résumé
                                            </div>
                                        </div>
                                        {expandedChapter === r.id ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                                    </button>

                                    {expandedChapter === r.id && (
                                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-soft)' }}>
                                            <a
                                                href={`${BACKEND_URL}${r.pdf_url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                    marginTop: '1rem', padding: '0.6rem 1.25rem',
                                                    borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
                                                    background: `linear-gradient(135deg, ${activeSubject?.color || '#667eea'}, #764ba2)`,
                                                    color: 'white', textDecoration: 'none',
                                                    boxShadow: `0 4px 12px ${activeSubject?.color || '#667eea'}30`,
                                                    transition: 'var(--t)',
                                                }}
                                            >
                                                <ExternalLink size={15} /> Ouvrir le PDF
                                            </a>
                                            {r.description && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
                                                    {r.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Revision Sheets */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                        <div style={{ width: 6, height: 26, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '4px' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Fiches & Synthèses</h2>
                    </div>

                    {sheets.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {search ? `Aucune fiche trouvée pour "${search}".` : 'Aucune fiche disponible pour cette matière.'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {sheets.map(sheet => (
                                <div
                                    key={sheet.id}
                                    className="card card-hover"
                                    onClick={() => sheet.pdf_url && window.open(`${BACKEND_URL}${sheet.pdf_url}`, '_blank')}
                                    style={{
                                        padding: '1rem 1.25rem', cursor: sheet.pdf_url ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        border: '1px solid var(--border-soft)',
                                    }}
                                >
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                                        background: 'rgba(245,158,11,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Sparkles size={20} style={{ color: '#d97706' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>{sheet.title}</h3>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>Fiche de révision</p>
                                    </div>
                                    {sheet.pdf_url && <ExternalLink size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
