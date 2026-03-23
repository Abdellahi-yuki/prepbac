import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Eye, EyeOff, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ExerciseViewer = ({ exercise, onClose }) => {
    const [showCorrection, setShowCorrection] = useState(false);

    if (!exercise) return null;

    return ReactDOM.createPortal(
        <div className="fv-overlay" style={{ zIndex: 9999 }}>
            {/* Header */}
            <header className="fv-header">
                <div className="fv-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {exercise.type === 'AI Generated' ? <Sparkles size={20} color="#a18cd1" /> : <BookOpen size={20} color="#10b981" />}
                    <span className="fv-filename" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{exercise.title}</span>
                </div>
                <div className="fv-actions">
                    <button onClick={onClose} className="fv-btn-close" title="Fermer">
                        <X size={22} />
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="fv-body" onClick={onClose} style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
                <div
                    className="card"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '800px', background: 'white', borderRadius: 24,
                        overflowY: 'auto', maxHeight: '100%', padding: '2.5rem',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                            padding: '0.25rem 0.7rem', borderRadius: 'var(--r-full)',
                            fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                            background: 'var(--primary-soft)', color: 'var(--primary)'
                        }}>{exercise.subject}</span>
                    </div>

                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>
                        {exercise.title}
                    </h1>

                    <div className="math-markdown-content" style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                        {exercise.statement_content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {exercise.statement_content}
                            </ReactMarkdown>
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {exercise.description || "Aucun détail supplémentaire pour cet exercice."}
                            </div>
                        )}
                    </div>

                    {(exercise.correction_content || (exercise.type !== 'AI Generated' && exercise.correction)) && (
                        <div style={{ marginTop: '3rem', borderTop: '2px dashed var(--border-soft)', paddingTop: '2rem' }}>
                            <button
                                onClick={() => setShowCorrection(!showCorrection)}
                                style={{
                                    width: '100%', padding: '1rem', borderRadius: 14,
                                    background: showCorrection ? 'var(--primary-soft)' : 'rgba(240,242,248,0.8)',
                                    border: '1px solid var(--primary-soft)', color: 'var(--primary)',
                                    fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {showCorrection ? <EyeOff size={18} /> : <Eye size={18} />}
                                {showCorrection ? 'Masquer le corrigé détaillé' : 'Afficher le corrigé détaillé'}
                            </button>

                            {showCorrection && (
                                <div className="math-markdown-content anim-fade-up" style={{ marginTop: '2rem', padding: '2rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {exercise.correction_content || exercise.correction}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ExerciseViewer;
