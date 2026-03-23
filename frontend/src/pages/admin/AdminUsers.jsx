import React, { useState, useEffect } from 'react';
import { Users, Search, Trash2, ShieldCheck, ShieldOff, RefreshCw, Filter } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

const thStyle = {
    padding: '0.85rem 1.25rem',
    fontSize: '0.72rem', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    textAlign: 'left',
};

const tdStyle = {
    padding: '0.9rem 1.25rem',
    fontSize: '0.85rem',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
};

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [seriesFilter, setSeriesFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [seriesFilter]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/series`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSeriesList(data.series || []);
            }
        } catch (err) {
            console.error("Failed to fetch series", err);
        }
        // fetchUsers will be called by the second useEffect since seriesFilter is initial empty
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('bac_token');
            const url = seriesFilter
                ? `${API_BASE_URL}/admin/users?series=${seriesFilter}`
                : `${API_BASE_URL}/admin/users`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setUsers(data.users);
            else setError(data.error || 'Erreur inconnue');
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Supprimer l'utilisateur ${user.first_name} ${user.last_name} ?`)) return;
        setActionLoading(user.id);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/users?id=${user.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setUsers(prev => prev.filter(u => u.id !== user.id));
            else alert(data.error || 'Erreur lors de la suppression');
        } catch {
            alert('Erreur de connexion');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRoleToggle = async (user) => {
        const newRole = user.role === 'admin' ? 'student' : 'admin';
        if (!window.confirm(`Changer le rôle de ${user.first_name} ${user.last_name} en "${newRole}" ?`)) return;
        setActionLoading(user.id);
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: user.id, role: newRole }),
            });
            const data = await res.json();
            if (data.success) {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            } else {
                alert(data.error || 'Erreur');
            }
        } catch {
            alert('Erreur de connexion');
        } finally {
            setActionLoading(null);
        }
    };

    // Local filtering
    const filtered = users.filter(u => {
        const matchSearch =
            `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter ? u.role === roleFilter : true;
        return matchSearch && matchRole;
    });

    const admins = users.filter(u => u.role === 'admin').length;

    // SERIES OPTIONS computed from fetched series
    const seriesOptions = [
        { value: '', label: 'Toutes les séries' },
        ...seriesList.map(s => ({ value: String(s.id), label: `Série ${s.name}` }))
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-display)' }}>
                        Gestion des Utilisateurs
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.3rem 0 0', fontWeight: 500 }}>
                        {users.length} utilisateur{users.length !== 1 ? 's' : ''} au total
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1rem', borderRadius: '8px',
                        border: '1px solid #e2e8f0', background: 'white',
                        color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    }}
                >
                    <RefreshCw size={15} /> Actualiser
                </button>
            </div>

            {/* Stats cards - DYNAMIC */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '1.1rem 1.25rem',
                    border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(79,122,248,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} style={{ color: '#4f7af8' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4f7af8', lineHeight: 1 }}>{users.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total</div>
                    </div>
                </div>

                {seriesList.map(s => {
                    const count = users.filter(u => u.series === s.name).length;
                    return (
                        <div key={s.id} style={{
                            background: 'white', borderRadius: '12px', padding: '1.1rem 1.25rem',
                            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                        }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(168,85,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} style={{ color: '#a855f7' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a855f7', lineHeight: 1 }}>{count}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Série {s.name}</div>
                            </div>
                        </div>
                    );
                })}

                <div style={{
                    background: 'white', borderRadius: '12px', padding: '1.1rem 1.25rem',
                    border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{admins}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Admins</div>
                    </div>
                </div>
            </div>

            {/* Filters bar */}
            <div style={{
                background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden', marginBottom: '0',
            }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '0.55rem 1rem 0.55rem 2.25rem',
                                borderRadius: '8px', border: '1px solid #e2e8f0',
                                fontSize: '0.85rem', outline: 'none', background: 'white', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Series filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Filter size={14} style={{ color: '#94a3b8' }} />
                        <select
                            value={seriesFilter}
                            onChange={e => setSeriesFilter(e.target.value)}
                            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', background: 'white', fontWeight: 600, color: '#334155' }}
                        >
                            {seriesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Role filter */}
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', background: 'white', fontWeight: 600, color: '#334155' }}
                    >
                        <option value="">Tous les rôles</option>
                        <option value="student">Étudiants</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>
                ) : error ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Aucun utilisateur trouvé.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Nom</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Série</th>
                                    <th style={thStyle}>Rôle</th>
                                    <th style={thStyle}>Inscrit le</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, idx) => (
                                    <tr key={u.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <td style={{ ...tdStyle, color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                                    background: u.role === 'admin'
                                                        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                                        : 'linear-gradient(135deg,#4f7af8,#764ba2)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 800, fontSize: '0.78rem',
                                                }}>
                                                    {(u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{u.first_name} {u.last_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, color: '#64748b' }}>{u.email}</td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                                background: u.series === 'C' ? 'rgba(79,122,248,0.1)' : (u.series === 'D' ? 'rgba(16,185,129,0.1)' : 'rgba(168,85,247,0.1)'),
                                                color: u.series === 'C' ? '#4f7af8' : (u.series === 'D' ? '#10b981' : '#a855f7'),
                                            }}>
                                                Série {u.series ?? '?'}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                                background: u.role === 'admin' ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.1)',
                                                color: u.role === 'admin' ? '#d97706' : '#64748b',
                                            }}>
                                                {u.role === 'admin' ? 'Admin' : 'Étudiant'}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.78rem' }}>
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                {/* Toggle role */}
                                                <button
                                                    onClick={() => handleRoleToggle(u)}
                                                    disabled={actionLoading === u.id}
                                                    title={u.role === 'admin' ? 'Rétrograder en étudiant' : 'Promouvoir en admin'}
                                                    style={{
                                                        padding: '0.35rem 0.6rem', borderRadius: '6px', border: 'none',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                        background: u.role === 'admin' ? 'rgba(245,158,11,0.1)' : 'rgba(79,122,248,0.1)',
                                                        color: u.role === 'admin' ? '#d97706' : '#4f7af8',
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                    }}
                                                >
                                                    {u.role === 'admin' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                                                    {u.role === 'admin' ? 'Rétrograder' : 'Admin'}
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    disabled={actionLoading === u.id || u.role === 'admin'}
                                                    title={u.role === 'admin' ? 'Impossible de supprimer un admin' : 'Supprimer'}
                                                    style={{
                                                        padding: '0.35rem 0.5rem', borderRadius: '6px', border: 'none',
                                                        cursor: u.role === 'admin' ? 'not-allowed' : 'pointer',
                                                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                                        opacity: u.role === 'admin' ? 0.4 : 1,
                                                    }}
                                                >
                                                    <Trash2 size={14} />
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
