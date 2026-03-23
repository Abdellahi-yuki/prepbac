import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Filter,
    FileText, CheckCircle, ArrowLeft,
    Upload, X
} from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

const BACKEND_URL = 'http://localhost:8000';
const EMPTY_FORM = { title: '', subject_id: '' };

export default function AdminSheets() {
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    // View states: null | 'add' | 'edit'
    const [view, setView] = useState(null);
    const [editingSheet, setEditingSheet] = useState(null);

    const [subjects, setSubjects] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [selectedSeries, setSelectedSeries] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [filterSeries, setFilterSeries] = useState('both');
    const [filterSubject, setFilterSubject] = useState('');

    const [formData, setFormData] = useState(EMPTY_FORM);
    const [pdfFile, setPdfFile] = useState(null);
    const [existingPdf, setExistingPdf] = useState(null);
    const [pdfSource, setPdfSource] = useState('upload'); // 'upload' | 'html'
    const [htmlContent, setHtmlContent] = useState('');

    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

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
                    // fetchSheets would be called by the other useEffect when filterSeries changes (if it changes)
                    // But filterSeries defaults to 'both'.
                }
            }
        } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchSheets(); }, [filterSeries]);

    useEffect(() => {
        if (view) {
            fetchSubjects(view === 'add' || view === 'edit' ? selectedSeries : filterSeries);
        }
    }, [selectedSeries, filterSeries, view]);

    const fetchSheets = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/sheets?series=${filterSeries}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setSheets(data.sheets);
            else setError(data.error || 'Erreur inconnue');
        } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
    };

    const fetchSubjects = async (serie) => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/courses/subjects?series=${serie}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.subjects) setSubjects(data.subjects);
        } catch { }
    };

    const handleEdit = async (sheet) => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/sheets/${sheet.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.sheet) {
                const s = data.sheet;
                setEditingSheet(s);
                setSelectedSubject(s.subject_id);
                setFormData({ title: s.title, subject_id: s.subject_id });
                setExistingPdf(s.pdf_url || null);
                setHtmlContent(s.summary_content || '');
                setPdfSource(s.summary_content ? 'html' : 'upload');
                setPdfFile(null);
                setView('edit');
            }
        } catch (e) { alert('Erreur lors du chargement'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette fiche de révision ?')) return;
        try {
            const token = localStorage.getItem('bac_token');
            await fetch(`${API_BASE_URL}/admin/sheets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchSheets();
        } catch { alert('Erreur lors de la suppression'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        const isEdit = view === 'edit';

        if (!isEdit && !selectedSubject) {
            setFormError('Veuillez sélectionner une matière');
            setFormLoading(false);
            return;
        }
        if (!formData.title.trim()) {
            setFormError('Le titre est obligatoire');
            setFormLoading(false);
            return;
        }
        if (pdfSource === 'upload' && !pdfFile && !existingPdf) {
            setFormError('Veuillez uploader un fichier PDF');
            setFormLoading(false);
            return;
        }
        if (pdfSource === 'html' && !htmlContent.trim() && !existingPdf) {
            setFormError('Veuillez écrire le contenu HTML pour générer le PDF');
            setFormLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('bac_token');
            const url = isEdit
                ? `${API_BASE_URL}/admin/sheets/${editingSheet.id}`
                : `${API_BASE_URL}/admin/sheets`;

            let res;

            if (pdfSource === 'upload' && pdfFile) {
                const payload = new FormData();
                payload.append('title', formData.title);
                payload.append('summary_content', '');
                payload.append('subject_id', isEdit ? editingSheet.subject_id : selectedSubject);
                const currentSeries = isEdit ? (typeof editingSheet.series === 'string' ? JSON.parse(editingSheet.series)[0] : (Array.isArray(editingSheet.series) ? editingSheet.series[0] : selectedSeries)) : selectedSeries;
                payload.append('series', currentSeries);
                payload.append('pdf', pdfFile);
                if (isEdit) {
                    payload.append('existing_pdf', existingPdf || '');
                    payload.append('_method', 'PUT');
                }
                res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: payload,
                });
            } else {
                const currentSeries = isEdit ? (typeof editingSheet.series === 'string' ? JSON.parse(editingSheet.series)[0] : (Array.isArray(editingSheet.series) ? editingSheet.series[0] : selectedSeries)) : selectedSeries;
                const body = {
                    title: formData.title,
                    summary_content: pdfSource === 'html' ? htmlContent : '',
                    subject_id: isEdit ? editingSheet.subject_id : selectedSubject,
                    series: currentSeries,
                    ...(isEdit ? { existing_pdf: existingPdf || '', _method: 'PUT' } : {}),
                };
                res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(body),
                });
            }

            const data = await res.json();
            if (res.ok && data.success) {
                resetForm();
                fetchSheets();
            } else {
                setFormError(data.error || "Une erreur s'est produite");
            }
        } catch (err) {
            setFormError('Erreur de connexion : ' + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const resetForm = () => {
        setView(null);
        setEditingSheet(null);
        setFormData(EMPTY_FORM);
        setPdfFile(null);
        setExistingPdf(null);
        setFormError('');
        setSelectedSubject('');
    };

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const filteredSheets = sheets.filter(s => {
        const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.subject?.toLowerCase().includes(search.toLowerCase());

        let seriesArr = [];
        try {
            seriesArr = typeof s.series === 'string' ? JSON.parse(s.series) : (s.series || []);
        } catch (e) {
            seriesArr = [s.series];
        }
        if (!Array.isArray(seriesArr)) seriesArr = [seriesArr];

        const matchSeries = filterSeries === 'both' || seriesArr.includes(parseInt(filterSeries));
        const matchSubject = filterSubject === '' || s.subject_id == filterSubject;
        return matchSearch && matchSeries && matchSubject;
    });

    if (view === 'add' || view === 'edit') {
        const isEdit = view === 'edit';
        return (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <button onClick={resetForm} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Retour à la liste
                </button>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)' }}>
                    {isEdit ? `Modifier : ${editingSheet?.title}` : 'Ajouter une Fiche de Révision'}
                </h1>

                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    {formError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {!isEdit && (
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={lbl}>Série</label>
                                    <select value={selectedSeries} onChange={e => { setSelectedSeries(e.target.value); setSelectedSubject(''); }} style={sel} required>
                                        {seriesList.map(s => <option key={s.id} value={s.id}>Série {s.name}</option>)}
                                    </select>
                                </div>

                                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={lbl}>Matière</label>
                                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ ...sel, background: selectedSeries ? 'white' : '#e2e8f0' }} disabled={!selectedSeries} required>
                                        <option value="">Sélectionner une matière...</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={lbl}>Titre de la fiche</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Ex: Résumé Algèbre" style={inputStyle} required />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Fichier Fiche de révision (PDF) :</span>

                            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {isEdit && existingPdf && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.78rem', color: '#166534' }}>
                                        <FileText size={13} />
                                        <a href={`${BACKEND_URL}${existingPdf}`} target="_blank" rel="noreferrer" style={{ color: '#166534' }}>PDF actuel</a>
                                        <button type="button" onClick={() => setExistingPdf(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><X size={13} /></button>
                                    </div>
                                )}
                                <div style={{ position: 'relative' }}>
                                    <Upload size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', boxSizing: 'border-box' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Un fichier PDF est requis pour cet affichage.</span>
                            </div>
                        </div>


                        <button type="submit" disabled={formLoading}
                            style={{ padding: '0.9rem 1.5rem', background: 'linear-gradient(135deg,#4f7af8,#764ba2)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', fontSize: '0.92rem' }}>
                            {formLoading ? 'Enregistrement...' : (isEdit ? '💾 Mettre à jour la fiche' : '✓ Enregistrer la fiche')}
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)' }}>Fiches de Révision</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0', fontWeight: 500 }}>Créez, modifiez et organisez les fiches de révision.</p>
                </div>
                <button onClick={() => { resetForm(); setView('add'); }}
                    style={{ background: 'linear-gradient(135deg, #4f7af8, #764ba2)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(79,122,248,0.25)', cursor: 'pointer' }}>
                    <Plus size={16} /> Ajouter une fiche
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" placeholder="Rechercher une fiche..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                    </div>

                    <select value={filterSeries} onChange={e => { setFilterSeries(e.target.value); setFilterSubject(''); }}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: 'white' }}>
                        <option value="both">Toutes les Séries</option>
                        {seriesList.map(s => <option key={s.id} value={s.id}>Série {s.name}</option>)}
                    </select>

                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: 'white', maxWidth: '180px' }}>
                        <option value="">Toutes les matières</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
                ) : error ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
                ) : filteredSheets.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Aucune fiche trouvée.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    {['Fiche', 'Classification', 'Statut', 'Actions'].map((h, i) => (
                                        <th key={h} style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSheets.map((sheet, idx) => (
                                    <tr key={sheet.id} style={{ borderBottom: idx === filteredSheets.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{sheet.title}</div>
                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                                        {(() => {
                                                            let seriesArr = [];
                                                            try {
                                                                seriesArr = typeof sheet.series === 'string' ? JSON.parse(sheet.series) : (sheet.series || []);
                                                            } catch (e) {
                                                                seriesArr = sheet.series === 'both' ? ['C', 'D'] : [sheet.series];
                                                            }
                                                            if (!Array.isArray(seriesArr)) seriesArr = [seriesArr];
                                                            return seriesArr.map(sid => {
                                                                const sObj = seriesList.find(sl => sl.id === parseInt(sid));
                                                                return (
                                                                    <span key={sid} style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: '#fef3c7', color: '#d97706', borderRadius: '4px', fontWeight: 800 }}>
                                                                        {sObj ? sObj.name : sid}
                                                                    </span>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{sheet.subject}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.6rem', borderRadius: '20px', background: '#d1fae5', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                                                <CheckCircle size={12} /> Publiée
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button onClick={() => handleEdit(sheet)}
                                                    style={{ background: '#eff6ff', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <Edit2 size={14} /> Modifier
                                                </button>
                                                <button onClick={() => handleDelete(sheet.id)}
                                                    style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const lbl = { fontSize: '0.85rem', fontWeight: 600, color: '#334155' };
const sel = { width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' };
