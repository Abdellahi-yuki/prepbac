import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Loader2, Save, Unlock, Lock, Eye, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function AIExerciseGenerator({ series, onExerciseGenerated }) {
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);

    const [formData, setFormData] = useState({
        subject_id: '',
        chapter: 'Tous les chapitres',
        difficulty: 'medium',
        additional_details: '',
    });

    const [loading, setLoading] = useState(false);
    const [generatedExercise, setGeneratedExercise] = useState(null);
    const [showCorrection, setShowCorrection] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, [series]);

    useEffect(() => {
        if (formData.subject_id) {
            fetchChapters(formData.subject_id);
        } else {
            setChapters([]);
        }
    }, [formData.subject_id]);

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/courses/subjects?series=${series}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.subjects) {
                setSubjects(data.subjects);
                if (data.subjects.length > 0) {
                    setFormData(prev => ({ ...prev, subject_id: data.subjects[0].id }));
                }
            }
        } catch (err) { console.error('Erreur matières', err); }
    };

    const fetchChapters = async (subjectId) => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/courses/chapters/${subjectId}?series=${series}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.chapters) {
                setChapters(data.chapters);
            }
        } catch (err) { console.error('Erreur chapitres', err); }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!formData.subject_id) return;

        setLoading(true);
        setGeneratedExercise(null);
        setShowCorrection(false);

        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/ai/generate-exercise`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, series })
            });

            const data = await res.json();
            if (data.success) {
                setGeneratedExercise(data.exercise);
                if (onExerciseGenerated) onExerciseGenerated();
            } else {
                alert(data.error || 'Erreur lors de la génération');
            }
        } catch (err) {
            alert("Erreur réseau");
        } finally {
            setLoading(false);
        }
    };

    const togglePublic = async () => {
        // In a real scenario we'd call an endpoint to update is_public.
        // For now we'll just toggle it locally.
        if (!generatedExercise) return;
        setGeneratedExercise(prev => ({ ...prev, is_public: !prev.is_public }));
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '2rem', alignItems: 'start' }}>

            {/* ── FORMULAIRE ── */}
            <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(161,140,209,0.3)', position: 'sticky', top: '2rem' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>
                    <Brain size={20} /> Paramètres de l'IA
                </h3>

                <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Matière</label>
                        <select
                            value={formData.subject_id}
                            onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-soft)', outline: 'none', background: 'white' }}
                            disabled={loading}
                        >
                            <option value="" disabled>Choisir une matière</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Chapitre</label>
                        <select
                            value={formData.chapter}
                            onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-soft)', outline: 'none', background: 'white' }}
                            disabled={loading}
                        >
                            <option value="Tous les chapitres">Tous les chapitres</option>
                            {chapters.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Difficulté</label>
                        <select
                            value={formData.difficulty}
                            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-soft)', outline: 'none', background: 'white' }}
                            disabled={loading}
                        >
                            <option value="easy">Facile</option>
                            <option value="medium">Moyen</option>
                            <option value="hard">Difficile</option>
                            <option value="bac">Type Bac</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Détails additionnels (optionnel)</label>
                        <textarea
                            value={formData.additional_details}
                            onChange={e => setFormData({ ...formData, additional_details: e.target.value })}
                            placeholder="Ex: Insiste sur les développements limités..."
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-soft)', outline: 'none', background: 'white', resize: 'vertical' }}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !formData.subject_id}
                        style={{
                            padding: '0.8rem', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
                            color: 'white', fontWeight: 800, fontSize: '0.95rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                            boxShadow: '0 4px 15px rgba(161,140,209,0.3)', transition: 'all 0.2s', marginTop: '0.5rem'
                        }}
                    >
                        {loading ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                        {loading ? 'Génération en cours...' : 'Générer l\'exercice'}
                    </button>
                </form>
            </div>

            {/* ── PREVIEW DE L'EXERCICE ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                {!generatedExercise && !loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, background: 'rgba(255,255,255,0.5)', borderRadius: 20, border: '2px dashed rgba(161,140,209,0.3)', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                        <Sparkles size={48} style={{ color: 'rgba(161,140,209,0.3)', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Prêt à générer</h3>
                        <p style={{ fontSize: '0.9rem', maxWidth: 400 }}>Remplissez les paramètres à gauche pour obtenir un exercice sur-mesure créé par l'IA.</p>
                    </div>
                ) : loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, background: 'rgba(255,255,255,0.7)', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulseGlow 2s infinite', marginBottom: '1.5rem' }}>
                            <Brain size={28} color="white" />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>L'IA réfléchit...</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Création de l'énoncé et de son corrigé.</p>
                    </div>
                ) : generatedExercise && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                                {generatedExercise.title}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={togglePublic}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 12, background: generatedExercise.is_public ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: generatedExercise.is_public ? '#10b981' : '#ef4444', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    {generatedExercise.is_public ? <><Unlock size={14} /> Public</> : <><Lock size={14} /> Privé</>}
                                </button>
                                <div style={{ padding: '0.5rem 1rem', borderRadius: 12, background: 'rgba(79,122,248,0.1)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <CheckCircle size={14} /> Enregistré
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ flex: 1, padding: '2rem', overflowX: 'auto', background: 'white' }}>
                            <div className="math-markdown-content" style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {generatedExercise.statement_markdown || "Aucun énoncé généré."}
                                </ReactMarkdown>
                            </div>

                            <div style={{ marginTop: '3rem', borderTop: '2px dashed var(--border-soft)', paddingTop: '2rem' }}>
                                <button
                                    onClick={() => setShowCorrection(!showCorrection)}
                                    style={{ width: '100%', padding: '1rem', borderRadius: 14, background: showCorrection ? 'var(--primary-soft)' : 'rgba(240,242,248,0.8)', border: '1px solid var(--primary-soft)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Eye size={18} /> {showCorrection ? 'Masquer le corrigé détaillé' : 'Afficher le corrigé détaillé'}
                                </button>

                                {showCorrection && (
                                    <div className="math-markdown-content anim-fade-up" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                        <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle size={20} color="#10b981" /> Corrigé
                                        </h3>
                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {generatedExercise.correction_markdown || "Aucune correction générée."}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
