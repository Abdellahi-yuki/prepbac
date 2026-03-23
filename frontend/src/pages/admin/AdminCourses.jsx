import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Filter,
  FileText, CheckCircle, ArrowLeft,
  BookOpen, BarChart2, Sparkles, AlertCircle, Loader2, Tag
} from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

const EMPTY_FORM = { title: '', type: '', description: '', subject_id: '' };

export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // View states: null | 'add' | 'edit'
  const [view, setView] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [filterSeries, setFilterSeries] = useState('all');
  const [filterSubject, setFilterSubject] = useState('');

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState(null);
  const [existingPdf, setExistingPdf] = useState(null);

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
      }
      await fetchCourses();
    } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('bac_token');
    fetch(`${API_BASE_URL}/admin/subjects`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.subjects) setSubjects(data.subjects); });
  }, [view]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/admin/courses`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCourses(data.courses);
      else setError(data.error || 'Erreur inconnue');
    } catch { setError('Impossible de se connecter'); } finally { setLoading(false); }
  };

  const handleEdit = async (course) => {
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/admin/courses/${course.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.lesson) {
        const l = data.lesson;
        setEditingCourse(l);
        setSelectedSubject(l.subject_id);
        setFormData({
          title: l.title,
          type: l.type || '',
          description: l.description || '',
          subject_id: l.subject_id
        });
        setExistingPdf(l.pdf_url || null);
        setView('edit');
      }
    } catch (e) { alert('Erreur lors du chargement'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette leçon ?')) return;
    try {
      const token = localStorage.getItem('bac_token');
      await fetch(`${API_BASE_URL}/admin/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCourses();
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
      setFormError('Le titre du cours est obligatoire');
      setFormLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('bac_token');
      const url = isEdit
        ? `${API_BASE_URL}/admin/courses/${editingCourse.id}`
        : `${API_BASE_URL}/admin/courses`;

      const body = new FormData();
      body.append('title', formData.title);
      body.append('type', formData.type);
      body.append('description', formData.description);
      body.append('subject_id', isEdit ? editingCourse.subject_id : selectedSubject);
      body.append('_method', isEdit ? 'PUT' : 'POST');

      if (pdfFile) body.append('pdf_file', pdfFile);
      if (existingPdf) body.append('existing_pdf_url', existingPdf);

      const res = await fetch(url, {
        method: 'POST', // using _method
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: body,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        resetForm();
        fetchCourses();
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
    setEditingCourse(null);
    setFormData(EMPTY_FORM);
    setPdfFile(null);
    setExistingPdf(null);
    setFormError('');
    setSelectedSubject('');
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const filteredCourses = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase());

    const matchSubject = filterSubject === '' || c.subject_id == filterSubject;

    let matchSeries = true;
    if (filterSeries !== 'all' && subjects.length > 0) {
      const sub = subjects.find(s => s.id == c.subject_id);
      if (sub) {
        try {
          const sArr = typeof sub.series === 'string' ? JSON.parse(sub.series) : (sub.series || []);
          matchSeries = sArr.includes(parseInt(filterSeries));
        } catch { matchSeries = false; }
      }
    }

    return matchSearch && matchSeries && matchSubject;
  });

  if (view === 'add' || view === 'edit') {
    const isEdit = view === 'edit';
    return (
      <div className="anim-fade-up" style={{ maxWidth: 800, margin: '0 auto' }}>
        <button onClick={resetForm} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Retour à la liste
        </button>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          {isEdit ? `Modifier : ${editingCourse?.title}` : 'Ajouter un Cours'}
        </h1>

        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} /> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={lbl}>Matière</label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  style={sel}
                  disabled={isEdit}
                  required
                >
                  <option value="">Sélectionner une matière...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={lbl}>Type de cours</label>
                <input type="text" name="type" value={formData.type} onChange={handleChange} placeholder="Ex: Vidéo, PDF, Texte..." style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={lbl}>Titre du cours</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Ex: Théorème de Pythagore" style={inputStyle} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={lbl}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Ex: Ce cours couvre les bases de..." style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}></textarea>
            </div>

            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ ...lbl, display: 'block', marginBottom: '0.75rem' }}>Support PDF (Optionnel)</label>

              {isEdit && existingPdf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '1rem' }}>
                  <FileText size={18} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46', flex: 1 }}>Fichier actuel : {existingPdf.split('/').pop()}</span>
                  <button type="button" onClick={() => setExistingPdf(null)} style={{ border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Supprimer</button>
                </div>
              )}

              <input
                type="file"
                accept=".pdf"
                onChange={e => setPdfFile(e.target.files[0])}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Taille max : 10MB. Format : PDF uniquement.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{ flex: 1, padding: '1rem', background: 'linear-gradient(135deg,#4f7af8,#764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: '0 10px 15px -3px rgba(79,122,248,0.3)' }}
              >
                {formLoading ? <Loader2 size={20} className="anim-spin" /> : <Plus size={20} />}
                {isEdit ? 'Mettre à jour le cours' : 'Enregistrer le cours'}
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/editor/${editingCourse.id}`)}
                  style={{ padding: '0 1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  <Edit2 size={18} /> Éditeur HTML
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Gestion des Cours</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.4rem 0 0 0', fontWeight: 500 }}>Créez et organisez le contenu d'apprentissage.</p>
        </div>
        <button onClick={() => { resetForm(); setView('add'); }}
          style={{ background: 'linear-gradient(135deg, #4f7af8, #764ba2)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 15px -3px rgba(79,122,248,0.3)', cursor: 'pointer' }}>
          <Plus size={18} /> Ajouter un cours
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" placeholder="Rechercher un cours..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', background: 'white' }} />
          </div>

          <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)}
            style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, background: 'white', minWidth: '160px' }}>
            <option value="all">Série : Toutes</option>
            {seriesList.map(s => <option key={s.id} value={s.id}>Série {s.name}</option>)}
          </select>

          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, background: 'white', minWidth: '200px' }}>
            <option value="">Matière : Toutes</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="anim-spin" style={{ margin: '0 auto 1rem' }} />
            Chargement des cours...
          </div>
        ) : error ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 1rem' }} />
            {error}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Aucun cours trouvé.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Cours</th>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Matière</th>
                  <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#eef2ff', color: '#4f7af8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{course.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>ID: #{course.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      {course.type ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#667eea', fontWeight: 700, fontSize: '0.85rem' }}>
                          <Tag size={14} /> {course.type}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Non défini</span>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.85rem', fontWeight: 700 }}>
                        {course.subject}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        {course.pdf_url && <FileText size={18} style={{ color: '#10b981' }} title="Possède un PDF" />}
                        <button onClick={() => handleEdit(course)}
                          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', padding: '0.6rem', borderRadius: '10px' }} title="Modifier les infos">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(course.id)}
                          style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', cursor: 'pointer', padding: '0.6rem', borderRadius: '10px' }} title="Supprimer">
                          <Trash2 size={16} />
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

const lbl = { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' };
const sel = { width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.9rem' };
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' };
