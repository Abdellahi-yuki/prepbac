import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Filter,
    FileText, CheckCircle, ArrowLeft,
    Upload, X, Calendar, BookOpen
} from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

// Replaced hardcoded BACKEND_URL with API_BASE_URL
const MEDIA_URL = API_BASE_URL;
const EMPTY_FORM = {
    id: null,
    subject_id: '',
    series: [],
    year: new Date().getFullYear(),
    session: 'normale',
    solution_content: ''
};

export default function AdminExams() {
    const [exams, setExams] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedSeries, setSelectedSeries] = useState('');
    const [filterSubject, setFilterSubject] = useState('Tous');

    // View state: 'list' | 'add' | 'edit'
    const [view, setView] = useState('list');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [subjects, setSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // Files
    const [pdfStatement, setPdfStatement] = useState(null);
    const [pdfCorrection, setPdfCorrection] = useState(null);
    const [existingStatement, setExistingStatement] = useState(null);
    const [existingCorrection, setExistingCorrection] = useState(null);
    // ── Fetch all ──────────────────────────────────────────────────
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const token = localStorage.getItem('bac_token');
        try {
            const resS = await fetch(`${API_BASE_URL}/admin/series`, { headers: { 'Authorization': `Bearer ${token}` } });
            const dataS = await resS.json();
            if (dataS.success) {
                setSeriesList(dataS.series);
                if (dataS.series.length > 0) {
                    setSelectedSeries(dataS.series[0].id);
                }
            }
        } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
    };

    // Fetch subjects whenever the active series changes (either list filter or form)
    useEffect(() => {
        const seriesArr = (view === 'add' || view === 'edit') ? formData.series : [selectedSeries];
        if (seriesArr && seriesArr.length > 0) {
            // Fetch subjects for the first selected series as a baseline
            fetchSubjects(seriesArr[0]);
        }
    }, [selectedSeries, formData.series, view]);

    useEffect(() => {
        if (selectedSeries) {
            fetchExams(selectedSeries);
            setFilterSubject('Tous');
        }
    }, [selectedSeries]);

    const fetchExams = async (series) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/exams?series=${series}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setExams(data.exams);
            } else {
                setError(data.error || "Une erreur est survenue");
            }
        } catch (err) {
            setError("Erreur de connexion au serveur");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async (series) => {
        setSubjectsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/subjects?series=${series}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setSubjects(data.subjects);
                if (data.subjects.length === 0) {
                    console.warn(`Aucune matière trouvée pour la série ${series}`);
                }
            } else {
                console.error("Erreur subjects:", data.error);
            }
        } catch (err) {
            console.error("Erreur réseau subjects:", err);
        } finally {
            setSubjectsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette annale ?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/exams?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` }
            });
            const data = await res.json();
            if (data.success) fetchExams(selectedSeries);
        } catch (err) { alert("Erreur lors de la suppression"); }
    };

    const handleEdit = (exam) => {
        let seriesArr = [];
        try {
            seriesArr = typeof exam.series === 'string' ? JSON.parse(exam.series) : (exam.series || []);
        } catch (e) {
            seriesArr = [exam.series];
        }
        if (!Array.isArray(seriesArr)) seriesArr = [seriesArr];

        setFormData({
            id: exam.id,
            subject_id: exam.subject_id,
            series: seriesArr,
            year: exam.year,
            session: exam.session,
            solution_content: exam.solution_content || ''
        });
        setExistingStatement(exam.pdf_statement_url);
        setExistingCorrection(exam.pdf_correction_url);
        setView('edit');
    };

    const resetForm = () => {
        setFormData({ ...EMPTY_FORM, series: seriesList.map(s => s.id) });
        setPdfStatement(null);
        setPdfCorrection(null);
        setExistingStatement(null);
        setExistingCorrection(null);
        setFormError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        const body = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'series') {
                formData.series.forEach(s => body.append('series[]', s));
            } else if (formData[key] !== null) {
                body.append(key, formData[key]);
            }
        });

        if (pdfStatement) body.append('pdf_statement', pdfStatement);
        if (pdfCorrection) body.append('pdf_correction', pdfCorrection);

        if (existingStatement) body.append('existing_pdf_statement', existingStatement);
        if (existingCorrection) body.append('existing_pdf_correction', existingCorrection);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/exams`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('bac_token')}` },
                body
            });
            const data = await res.json();
            if (data.success) {
                resetForm();
                setView('list');
                fetchExams(selectedSeries);
            } else {
                setFormError(data.error);
            }
        } catch (err) {
            setFormError("Erreur lors de l'enregistrement");
        } finally {
            setFormLoading(false);
        }
    };

    const filteredExams = exams.filter(e => {
        const matchSearch = e.subject.toLowerCase().includes(search.toLowerCase()) ||
            e.year.toString().includes(search);
        const matchSubject = filterSubject === 'Tous' || e.subject === filterSubject;
        return matchSearch && matchSubject;
    });

    if (view === 'add' || view === 'edit') {
        const isEdit = view === 'edit';
        return (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <button onClick={() => { resetForm(); setView('list'); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Retour à la liste
                </button>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0' }}>
                    {isEdit ? 'Modifier l\'Annale' : 'Ajouter une Annale (Examen)'}
                </h1>

                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    {formError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={lbl}>Matière</label>
                                <select
                                    value={formData.subject_id}
                                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                    style={sel}
                                    required
                                    disabled={subjectsLoading}
                                >
                                    <option value="">
                                        {subjectsLoading ? "Chargement des matières..." : subjects.length === 0 ? "Aucune matière trouvée pour cette série" : "Choisir une matière..."}
                                    </option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <label style={lbl}>Filières</label>
                                <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
                                    {seriesList.map(s => (
                                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.series.includes(s.id)}
                                                onChange={() => {
                                                    const newSeries = formData.series.includes(s.id) ? formData.series.filter(curr => curr !== s.id) : [...formData.series, s.id];
                                                    setFormData({ ...formData, series: newSeries });
                                                }}
                                            />
                                            Série {s.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={lbl}>Année</label>
                                <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} style={inputStyle} required />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={lbl}>Session</label>
                                <select value={formData.session} onChange={e => setFormData({ ...formData, session: e.target.value })} style={sel} required>
                                    <option value="normale">Session Normale</option>
                                    <option value="complementaire">Session Complémentaire</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* PDF Statement */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={lbl}>Fichier de l'énoncé (PDF)</label>
                                {isEdit && existingStatement && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem' }}>
                                        <FileText size={14} /> PDF Énoncé Actuel
                                        <button type="button" onClick={() => setExistingStatement(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                )}
                                <input type="file" accept=".pdf" onChange={e => setPdfStatement(e.target.files[0])} style={inputStyle} />
                            </div>

                            {/* PDF Correction */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={lbl}>Fichier de correction (PDF Optionnel)</label>
                                {isEdit && existingCorrection && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem' }}>
                                        <FileText size={14} /> PDF Correction Actuel
                                        <button type="button" onClick={() => setExistingCorrection(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                )}
                                <input type="file" accept=".pdf" onChange={e => setPdfCorrection(e.target.files[0])} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={lbl}>Solution / Indications (HTML)</label>
                            <textarea
                                value={formData.solution_content}
                                onChange={e => setFormData({ ...formData, solution_content: e.target.value })}
                                style={{ ...inputStyle, minHeight: '150px', fontFamily: 'monospace' }}
                                placeholder="Texte de la solution pour affichage direct..."
                            />
                        </div>

                        <button type="submit" disabled={formLoading}
                            style={{ padding: '0.9rem 1.5rem', background: 'linear-gradient(135deg,#4f7af8,#764ba2)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
                            {formLoading ? 'Enregistrement...' : (isEdit ? '💾 Mettre à jour l\'annale' : '✓ Enregistrer l\'annale')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gestion des Annales</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Organisez les anciens sujets du baccalauréat.</p>
                </div>
                <button onClick={() => { resetForm(); setView('add'); }}
                    style={{ background: 'linear-gradient(135deg, #4f7af8, #764ba2)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <Plus size={16} /> Ajouter une annale
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
                    </div>

                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: 'white', maxWidth: '180px' }}>
                        <option value="Tous">Toutes les matières</option>
                        {[...new Set(exams.map(e => e.subject))].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                        {seriesList.map(s => (
                            <button key={s.id} onClick={() => setSelectedSeries(s.id)} style={{ padding: '0.4rem 1rem', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: parseInt(selectedSeries) === s.id ? 'white' : 'transparent', color: parseInt(selectedSeries) === s.id ? '#4f7af8' : '#64748b', boxShadow: parseInt(selectedSeries) === s.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                Série {s.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sujet</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Configuration</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fichiers</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</td></tr>
                            ) : filteredExams.length === 0 ? (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Aucune annale trouvée</td></tr>
                            ) : filteredExams.map(ex => (
                                <tr key={ex.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Bac {ex.year}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Session {ex.session}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.subject}</div>
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                            {(() => {
                                                let seriesArr = [];
                                                try {
                                                    seriesArr = typeof ex.series === 'string' ? JSON.parse(ex.series) : (ex.series || []);
                                                } catch (e) {
                                                    seriesArr = ex.series === 'both' ? ['C', 'D'] : [ex.series];
                                                }
                                                if (!Array.isArray(seriesArr)) seriesArr = [seriesArr];
                                                return seriesArr.map(sid => {
                                                    const sObj = seriesList.find(sl => sl.id === parseInt(sid));
                                                    return (
                                                        <span key={sid} style={{ display: 'inline-block', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#e0e7ff', color: '#4f46e5', fontSize: '0.6rem', fontWeight: 800 }}>
                                                            SÉRIE {sObj ? sObj.name : sid}
                                                        </span>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <a href={`${MEDIA_URL}${ex.pdf_statement_url}`} target="_blank" rel="noreferrer" style={{ padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#4f46e5', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textDecoration: 'none' }}>Énoncé</a>
                                            {ex.pdf_correction_url && <a href={`${MEDIA_URL}${ex.pdf_correction_url}`} target="_blank" rel="noreferrer" style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textDecoration: 'none' }}>Corrigé</a>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(ex)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(ex.id)} style={{ background: '#fef2f2', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const lbl = { fontSize: '0.85rem', fontWeight: 600, color: '#475569' };
const sel = { width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
const inputStyle = { width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' };
