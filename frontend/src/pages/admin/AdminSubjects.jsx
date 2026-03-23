import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, Plus, Search, Trash2, X, PlusCircle, ArrowLeft, Filter, Edit, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

export default function AdminSubjects() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isAdding, setIsAdding] = useState(false);
    const [seriesList, setSeriesList] = useState([]);
    const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('');

    // Chapter Modal State
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);
    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [newChapterSeries, setNewChapterSeries] = useState([]);
    const [addingChapter, setAddingChapter] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        series_map: {},
        description: '',
    });

    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedSeriesFilter) fetchSubjects();
    }, [selectedSeriesFilter]);

    const fetchInitialData = async () => {
        const token = localStorage.getItem('bac_token');
        try {
            const res = await fetch(`${API_BASE_URL}/admin/series`, {
                headers: { 'Authorization': `Bearer ${token} ` }
            });
            const data = await res.json();
            if (data.success) {
                setSeriesList(data.series);
                if (data.series.length > 0) {
                    setSelectedSeriesFilter(data.series[0].id);
                    const initMap = {};
                    data.series.forEach(s => { initMap[s.id] = 1 });
                    setFormData(prev => ({ ...prev, series_map: initMap }));
                }
            }
        } catch (e) { console.error("Error fetching series", e); }
    };

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/subjects?series=${selectedSeriesFilter}`, {
                headers: { 'Authorization': `Bearer ${token} ` }
            });
            const data = await res.json();
            if (data.success) {
                setSubjects(data.subjects);
            } else {
                setError(data.error || 'Erreur inconnue');
            }
        } catch (err) {
            setError('Impossible de se connecter au serveur');
        } finally {
            setLoading(false);
        }
    };

    // Chapter Logic
    const openChaptersModal = (subject) => {
        setSelectedSubject(subject);
        setNewChapterTitle('');
        // Get valid series IDs from series_map keys
        const validIds = subject.series_map ? Object.keys(subject.series_map).map(Number) : [];
        setNewChapterSeries(validIds);
        fetchChapters(subject.id);
    };

    const fetchChapters = async (subjectId) => {
        setChaptersLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/chapters?subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token} ` }
            });
            const data = await res.json();
            if (data.success) {
                setChapters(data.chapters);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setChaptersLoading(false);
        }
    };

    const handleAddChapter = async (e) => {
        e.preventDefault();
        if (!newChapterTitle.trim() || addingChapter) return;
        setAddingChapter(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify({
                    title: newChapterTitle.trim(),
                    subject_id: selectedSubject.id,
                    series: newChapterSeries
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewChapterTitle('');
                fetchChapters(selectedSubject.id);
            } else {
                alert(data.error || 'Erreur lors de l\'ajout du chapitre');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAddingChapter(false);
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!window.confirm("Supprimer ce chapitre ?")) return;
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/chapters?id=${chapterId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token} ` }
            });
            const data = await res.json();
            if (data.success) {
                setChapters(chapters.filter(c => c.id !== chapterId));
            }
        } catch (err) {
            alert("Erreur lors de la suppression");
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'series') {
            const val = parseInt(value);
            const currentMap = { ...formData.series_map };
            if (checked) {
                currentMap[val] = 1; // default coefficient
            } else {
                delete currentMap[val];
            }
            setFormData({ ...formData, series_map: currentMap });
        } else if (name === 'coefficient') {
            const seriesId = parseInt(e.target.dataset.seriesid);
            const currentMap = { ...formData.series_map };
            currentMap[seriesId] = parseFloat(value) || 0;
            setFormData({ ...formData, series_map: currentMap });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleChapterSeriesChange = (val) => {
        const id = parseInt(val);
        const currentSeries = [...newChapterSeries];
        if (currentSeries.includes(id)) {
            setNewChapterSeries(currentSeries.filter(s => s !== id));
        } else {
            setNewChapterSeries([...currentSeries, id]);
        }
    };

    const handleEdit = (subject) => {
        setFormData({
            id: subject.id,
            name: subject.name,
            description: subject.description || '',
            color_theme: subject.color_theme || '#667eea',
            series_map: subject.series_map || {}
        });
        setIsAdding(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/subjects${formData.id ? `?id=${formData.id}` : ''}`, {
                method: formData.id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsAdding(false);
                const initMap = {};
                seriesList.forEach(s => { initMap[s.id] = 1 });
                setFormData({ name: '', series_map: initMap, description: '' });

                const selectedSeriesIds = Object.keys(formData.series_map).map(Number);
                if (selectedSeriesIds.includes(parseInt(selectedSeriesFilter)) || formData.id) {
                    fetchSubjects();
                } else {
                    alert(`La matière a été ajoutée avec succès.`);
                }
            } else {
                setFormError(data.error || 'Erreur lors de l\'ajout.');
            }
        } catch (err) {
            setFormError('Erreur de connexion : ' + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette matière ?")) return;
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/subjects?action=delete&id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSubjects(subjects.filter(s => s.id !== id));
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Erreur lors de la suppression.");
        }
    };

    if (isAdding) {
        return (
            <div className="anim-fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
                <button
                    onClick={() => setIsAdding(false)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}
                >
                    <ArrowLeft size={16} /> Retour à la liste
                </button>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)' }}>{formData.id ? 'Modifier la Matière' : 'Ajouter une Matière'}</h1>

                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                    {formError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Nom de la matière</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ex: Mathématiques"
                                    style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Filière ciblée</label>
                                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                    {seriesList.map(s => {
                                        const isChecked = formData.series_map.hasOwnProperty(s.id);
                                        return (
                                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: isChecked ? '#f1f5f9' : 'transparent', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                                                    <input type="checkbox" name="series" value={s.id} checked={isChecked} onChange={handleChange} />
                                                    Série {s.name}
                                                </label>
                                                {isChecked && (
                                                    <input
                                                        type="number"
                                                        name="coefficient"
                                                        data-seriesid={s.id}
                                                        value={formData.series_map[s.id]}
                                                        onChange={handleChange}
                                                        min="0.5" step="0.5"
                                                        style={{ width: '60px', padding: '0.2rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                                                        title="Coefficient de la matière"
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Description (Optionnel)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Petite description de la matière..."
                                style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', fontSize: '1rem' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={formLoading}
                                style={{ padding: '0.85rem 2rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
                            >
                                {formLoading ? 'Enregistrement...' : 'Enregistrer la matière'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="anim-fade-up" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Gestion des Matières</h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.4rem 0 0 0', fontWeight: 500 }}>
                        Administrez les matières et leurs chapitres associés.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    style={{
                        background: 'linear-gradient(135deg, #4f7af8, #764ba2)', color: 'white', border: 'none',
                        padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 15px -3px rgba(79,122,248,0.3)', cursor: 'pointer'
                    }}
                >
                    <Plus size={18} /> Ajouter une matière
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Filter size={18} color="#64748b" />
                        <select
                            value={selectedSeriesFilter}
                            onChange={(e) => setSelectedSeriesFilter(e.target.value)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                        >
                            {seriesList.map(s => <option key={s.id} value={s.id}>Série {s.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8', fontSize: '1rem' }}>Chargement...</div>
                ) : error ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#ef4444', fontSize: '1rem' }}>{error}</div>
                ) : subjects.length === 0 ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b', fontSize: '1rem' }}>
                        Aucune matière trouvée pour la série {selectedSeriesFilter}.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Matière</th>
                                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Filières & Coefs</th>
                                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ background: 'white' }}>
                                {subjects.map((subject) => (
                                    <tr
                                        key={subject.id}
                                        className="subject-row-hover"
                                        onClick={() => openChaptersModal(subject)}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '12px', background: `${subject.color_theme} 15`, color: subject.color_theme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <BookOpen size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{subject.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>{subject.description || 'Pas de description'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {subject.series_map && Object.entries(subject.series_map).map(([sid, coef]) => {
                                                    const sObj = seriesList.find(sl => sl.id === parseInt(sid));
                                                    return (
                                                        <span key={sid} style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #e0e7ff', textTransform: 'uppercase' }}>
                                                            Série {sObj ? sObj.name : sid} : {coef}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                                <button onClick={() => openChaptersModal(subject)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }} title="Gérer les chapitres">
                                                    <Layers size={18} />
                                                </button>
                                                <button onClick={() => handleEdit(subject)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }} title="Modifier la matière">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(subject.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#fee2e2' }} onMouseOut={e => { e.currentTarget.style.background = '#fef2f2' }} title="Supprimer">
                                                    <Trash2 size={18} />
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

            {/* CHAPTERS MODAL */}
            {selectedSubject && (
                <div style={{ position: 'fixed', inset: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="anim-fade-up" style={{ background: 'white', width: '95%', maxWidth: '850px', borderRadius: '24px', boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gérer les Chapitres</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                                    {selectedSubject.name} - {(() => {
                                        const validIds = selectedSubject.series_map ? Object.keys(selectedSubject.series_map).map(Number) : [];
                                        return seriesList
                                            .filter(s => validIds.includes(s.id))
                                            .map(s => s.name)
                                            .join(' & ');
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSubject(null)} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* New Chapter Form */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                            <form onSubmit={handleAddChapter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Nouveau chapitre (ex: Nombres Complexes)"
                                        value={newChapterTitle}
                                        onChange={e => setNewChapterTitle(e.target.value)}
                                        style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={addingChapter || !newChapterTitle.trim()}
                                        style={{ padding: '0.65rem 1.5rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: addingChapter ? 'not-allowed' : 'pointer' }}
                                    >
                                        {addingChapter ? <Loader2 size={16} className="anim-spin" /> : <Plus size={16} />}
                                        Ajouter
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingLeft: '0.2rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Filières :</span>
                                    {(() => {
                                        const validIds = selectedSubject.series_map ? Object.keys(selectedSubject.series_map).map(Number) : [];

                                        return seriesList
                                            .filter(s => validIds.includes(s.id))
                                            .map(s => (
                                                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                                                    <input type="checkbox" checked={newChapterSeries.includes(s.id)} onChange={() => handleChapterSeriesChange(s.id)} />
                                                    Série {s.name}
                                                </label>
                                            ));
                                    })()}
                                </div>
                            </form>
                        </div>

                        {/* Chapters List */}
                        <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
                            {chaptersLoading ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <Loader2 size={32} className="anim-spin" style={{ margin: '0 auto 1rem' }} />
                                    <span>Chargement des chapitres...</span>
                                </div>
                            ) : chapters.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                    Aucun chapitre pour le moment.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {chapters.map((chapter, idx) => (
                                        <div key={chapter.id} style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx === chapters.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                    {chapters.length - idx}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{chapter.title}</span>
                                                    {(() => {
                                                        try {
                                                            const ids = typeof chapter.series === 'string' ? JSON.parse(chapter.series || '[]') : (chapter.series || []);
                                                            return ids.map(sid => {
                                                                const s = seriesList.find(sl => sl.id === parseInt(sid));
                                                                return s ? (
                                                                    <span key={sid} style={{ fontSize: '0.65rem', fontWeight: 700, px: '0.4rem', py: '0.1rem', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                                        {s.name}
                                                                    </span>
                                                                ) : null;
                                                            });
                                                        } catch (e) { return null; }
                                                    })()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '0.4rem', cursor: 'pointer', borderRadius: '6px' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                            <button onClick={() => setSelectedSubject(null)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .subject-row-hover:hover { background-color: #f8fafc !important; }
            `}</style>
        </div>
    );
}
