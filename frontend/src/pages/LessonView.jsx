import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, FileText } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const BACKEND_URL = 'http://localhost:8000';

/**
 * Splits HTML content into pages.
 * Boundaries: <hr class="pagebreak">, <h2>, <h1> (except the very first).
 */
function splitIntoPages(html) {
    if (!html) return [''];

    // Try splitting by <hr class='pagebreak'> or <hr class="pagebreak">
    const byHr = html.split(/<hr\s[^>]*class=['"]pagebreak['"][^>]*\/?>/i);
    if (byHr.length > 1) return byHr.map(p => p.trim()).filter(Boolean);

    // Fallback: split before each <h2> (keep opener)
    const byH2 = html.split(/(?=<h2[\s>])/i);
    if (byH2.length > 1) return byH2.map(p => p.trim()).filter(Boolean);

    // Only one page
    return [html];
}

/**
 * Strips full HTML document boilerplate (<html>, <head>, <body>) and returns
 * only the renderable inner content. Prevents nested <html> tags inside React.
 */
function sanitizeHtml(html) {
    if (!html) return '';
    // If it contains a <body> tag, extract only its contents
    const bodyMatch = html.match(/<body[^>]*>([\/\s\S]*?)<\/body>/i);
    if (bodyMatch) return bodyMatch[1].trim();
    // If it starts with <!DOCTYPE or <html, strip those wrappers
    if (/^\s*<!DOCTYPE/i.test(html) || /^\s*<html/i.test(html)) {
        return html
            .replace(/^\s*<!DOCTYPE[^>]*>/i, '')
            .replace(/<\/?html[^>]*>/gi, '')
            .replace(/<head[\s\S]*?<\/head>/gi, '')
            .replace(/<\/?body[^>]*>/gi, '')
            .trim();
    }
    return html;
}

export default function LessonView() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        fetchLesson();
    }, [lessonId]);

    const fetchLesson = async () => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/courses/lesson/${lessonId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.lesson) {
                setLesson(data.lesson);
                const cleanContent = sanitizeHtml(data.lesson.content);
                const splitPages = splitIntoPages(cleanContent);
                setPages(splitPages);
                setCurrentPage(0);
            } else {
                setError('Leçon introuvable');
            }
        } catch (err) {
            setError('Impossible de charger la leçon');
        } finally {
            setLoading(false);
        }
    };

    const saveProgress = useCallback(async (pageIdx, totalPages) => {
        if (!lesson) return;
        const percent = totalPages > 1 ? Math.round(((pageIdx + 1) / totalPages) * 100) : 100;
        try {
            const token = localStorage.getItem('bac_token');
            await fetch(`${API_BASE_URL}/courses/lesson-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ lesson_id: lesson.id, progress_percent: percent })
            });
        } catch { /* silent fail */ }
    }, [lesson]);

    const goToPage = (idx) => {
        setCurrentPage(idx);
        saveProgress(idx, pages.length);
        window.scrollTo(0, 0);
    };

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <div>Chargement de la leçon...</div>
        </div>
    );

    if (error || !lesson) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444', flexDirection: 'column', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>{error || 'Leçon introuvable'}</div>
            <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Retour
            </button>
        </div>
    );

    const totalPages = pages.length;
    const progress = totalPages > 0 ? Math.round(((currentPage + 1) / totalPages) * 100) : 100;
    const currentContent = pages[currentPage] || '';

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#f1f5f9', border: 'none', borderRadius: '50%', color: '#475569', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)' }}>
                            {lesson.title}
                        </h1>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Page {currentPage + 1} / {totalPages} &nbsp;·&nbsp; {progress}% terminé
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ flex: 1, maxWidth: 300, height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #4f7af8, #764ba2)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, maxWidth: 860, margin: '2rem auto', width: '100%', padding: '0 1.5rem', boxSizing: 'border-box' }}>
                {currentContent ? (
                    <div
                        className="lesson-html-content"
                        dangerouslySetInnerHTML={{ __html: currentContent }}
                    />
                ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <FileText size={48} style={{ opacity: 0.3 }} />
                        <p style={{ fontWeight: 500 }}>Aucun contenu disponible pour cette leçon.</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            {totalPages > 1 && (
                <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', position: 'sticky', bottom: 0 }}>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: currentPage === 0 ? '#f1f5f9' : '#0f172a', color: currentPage === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    >
                        <ArrowLeft size={16} /> Précédent
                    </button>

                    {/* Page dots */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {pages.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goToPage(i)}
                                style={{ width: i === currentPage ? 20 : 8, height: 8, borderRadius: 99, border: 'none', background: i === currentPage ? '#4f7af8' : '#cbd5e1', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages - 1}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: currentPage === totalPages - 1 ? '#f1f5f9' : 'linear-gradient(135deg, #4f7af8, #764ba2)', color: currentPage === totalPages - 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    >
                        Suivant <ArrowRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
