import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertCircle, Layers, X, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

export default function AdminSeries() {
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditing, setIsEditing] = useState(null); // ID of series being edited
    const [editName, setEditName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');

    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/series`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSeries(data.series);
            } else {
                setError(data.error || 'Erreur lors du chargement');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/series`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setNewName('');
                setIsAdding(false);
                fetchSeries();
            } else {
                alert(data.error || 'Erreur lors de l\'ajout');
            }
        } catch (err) {
            alert('Erreur de connexion');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async (id) => {
        if (!editName.trim()) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/series?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setIsEditing(null);
                fetchSeries();
            } else {
                alert(data.error || 'Erreur lors de la mise à jour');
            }
        } catch (err) {
            alert('Erreur de connexion');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette série ? Cela peut affecter l'affichage des matières et chapitres associés.")) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/series?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchSeries();
            } else {
                alert(data.error || 'Erreur lors de la suppression');
            }
        } catch (err) {
            alert('Erreur de connexion');
        } finally {
            setActionLoading(false);
        }
    };

    const startEdit = (s) => {
        setIsEditing(s.id);
        setEditName(s.name);
    };

    return (
        <div className="anim-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Gestion des Séries</h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.4rem 0 0 0', fontWeight: 500 }}>
                        Gérez les filières éducatives disponibles sur la plateforme.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            background: 'linear-gradient(135deg, #4f7af8, #764ba2)', color: 'white', border: 'none',
                            padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 15px -3px rgba(79,122,248,0.3)', cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} /> Ajouter une série
                    </button>
                )}
            </div>

            {isAdding && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Nom de la série (ex: Série Technique)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                                autoFocus
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            style={{ padding: '0.75rem 1.5rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {actionLoading ? <Loader2 size={18} className="anim-spin" /> : <Save size={18} />}
                            Enregistrer
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Annuler
                        </button>
                    </form>
                </div>
            )}

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Loader2 size={32} className="anim-spin" style={{ margin: '0 auto 1rem' }} />
                        Chargement des séries...
                    </div>
                ) : error ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#ef4444' }}>
                        <AlertCircle size={32} style={{ margin: '0 auto 1rem' }} />
                        {error}
                    </div>
                ) : series.length === 0 ? (
                    <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>
                        Aucune série configurée.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '80px' }}>ID</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Nom de la Série</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ background: 'white' }}>
                            {series.map((s) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontWeight: 600 }}>#{s.id}</td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {isEditing === s.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #4f7af8', outline: 'none' }}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleUpdate(s.id)} style={{ color: '#10b981', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Sauvegarder">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setIsEditing(null)} style={{ color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Annuler">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#eef2ff', color: '#4f7af8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Layers size={16} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#1e293b' }}>Série {s.name}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button
                                                onClick={() => startEdit(s)}
                                                disabled={isEditing === s.id}
                                                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
