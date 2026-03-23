import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Filter, FileText, Upload, CheckCircle, Search } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

const BACKEND_URL = 'http://localhost:8000';

export default function AdminResumes() {
    const [resumes, setResumes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('');
    const [seriesList, setSeriesList] = useState([]);
    const [search, setSearch] = useState('');

    const [isAdding, setIsAdding] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject_id: '',
        series: []
    });

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
                    setSelectedSeriesFilter(dataS.series[0].id);
                }
            }
        } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (selectedSeriesFilter) {
            fetchResumes();
            fetchSubjects();
        }
    }, [selectedSeriesFilter]);

    const fetchResumes = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/resumes?series=${selectedSeriesFilter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setResumes(data.resumes);
            } else {
                setError(data.error || 'Erreur inconnue');
            }
        } catch (err) {
            setError('Impossible de se connecter au serveur');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/subjects?series=${selectedSeriesFilter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSubjects(data.subjects);
            }
        } catch (err) { }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'series') {
            const current = [...formData.series];
            const valInt = parseInt(value);
            if (checked) {
                if (!current.includes(valInt)) current.push(valInt);
            } else {
                const index = current.indexOf(valInt);
                if (index > -1) current.splice(index, 1);
            }
            setFormData({ ...formData, series: current });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pdfFile && !formData.id) {
            setFormError('Le fichier PDF est requis pour un nouveau résumé.');
            return;
        }
        setFormError('');
        setFormLoading(true);

        try {
            const token = localStorage.getItem('bac_token');
            const fd = new FormData();
            fd.append('title', formData.title);
            fd.append('description', formData.description);
            fd.append('subject_id', formData.subject_id);
            formData.series.forEach(s => fd.append('series[]', s));
            if (pdfFile) {
                fd.append('pdf_file', pdfFile);
            }

            const res = await fetch(`${API_BASE_URL}/admin/resumes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd
            });
            const data = await res.json();

            if (data.success) {
                setIsAdding(false);
                setFormData({ title: '', description: '', subject_id: '', series: seriesList.map(s => s.id) });
                setPdfFile(null);
                fetchResumes();
            } else {
                setFormError(data.error || 'Erreur lors de l\'enregistrement.');
            }
        } catch (err) {
            setFormError('Erreur : ' + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer ce résumé ?")) return;
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/resumes?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setResumes(resumes.filter(r => r.id !== id));
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Erreur réseau");
        }
    };

    const filteredResumes = resumes.filter(r => {
        const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.subject_name.toLowerCase().includes(search.toLowerCase());

        return matchSearch;
    });

    if (isAdding) {
        return (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <button onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Retour
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>Nouveau Résumé Indépendant</h1>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {formError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>{formError}</div>}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Titre du Résumé</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="Ex: Résumé de Mécanique Newtonienne" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Matière</label>
                                <select name="subject_id" value={formData.subject_id} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>
                                    <option value="">Choisir...</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Filières</label>
                                <div style={{ display: 'flex', gap: '1rem', background: 'white', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
                                    {seriesList.map(s => (
                                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                                            <input type="checkbox" name="series" value={s.id} checked={formData.series.includes(s.id)} onChange={handleChange} />
                                            Série {s.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Fichier PDF du résumé</label>
                            <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ width: '100%', padding: '0.6rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }} />
                        </div>
                        <button type="submit" disabled={formLoading} style={{ padding: '0.85rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>
                            {formLoading ? 'Enregistrement...' : 'Publier le Résumé'}
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gestion des Résumés</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Gérez les synthèses PDF indépendantes des chapitres de cours.</p>
                </div>
                <button onClick={() => setIsAdding(true)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Ajouter un résumé
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc' }}>
                    <Filter size={16} color="#94a3b8" />
                    <select value={selectedSeriesFilter} onChange={(e) => setSelectedSeriesFilter(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                        {seriesList.map(s => <option key={s.id} value={s.id}>Série {s.name}</option>)}
                    </select>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }} />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Chargement des résumés...</div>
                ) : filteredResumes.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Aucun résumé indépendant trouvé.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Résumé</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Matière</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Fichier</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResumes.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.title}</div>
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                                {(() => {
                                                    let seriesArr = [];
                                                    try {
                                                        seriesArr = typeof r.series === 'string' ? JSON.parse(r.series) : (r.series || []);
                                                    } catch (e) {
                                                        seriesArr = r.series === 'both' ? ['C', 'D'] : [r.series];
                                                    }
                                                    if (!Array.isArray(seriesArr)) seriesArr = [seriesArr];
                                                    return seriesArr.map(sid => {
                                                        const sObj = seriesList.find(sl => sl.id === parseInt(sid));
                                                        return (
                                                            <span key={sid} style={{ display: 'inline-block', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#e0e7ff', color: '#4f46e5', fontSize: '0.6rem', fontWeight: 800 }}>
                                                                {sObj ? sObj.name : sid}
                                                            </span>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>{r.subject_name}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {r.pdf_url && (
                                                <a href={`${BACKEND_URL}${r.pdf_url}`} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    <FileText size={16} /> PDF
                                                </a>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button onClick={() => handleDelete(r.id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
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
