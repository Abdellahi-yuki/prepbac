import React, { useState, useEffect } from 'react';
import { Save, Key, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        GEMINI_API_KEY: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.settings) {
                setSettings(prevState => ({ ...prevState, ...data.settings }));
            }
        } catch (err) {
            setError('Impossible de charger les paramètres.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const token = localStorage.getItem('bac_token');
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Paramètres sauvegardés avec succès.');
            } else {
                setError(data.error || 'Erreur lors de la sauvegarde.');
            }
        } catch (err) {
            setError('Erreur de connexion.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Chargement...</div>;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)' }}>
                Paramètres Système & API
            </h1>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

                {message && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
                        {message}
                    </div>
                )}
                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.25rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                🤖 Clé API IA (Google Gemini)
                            </label>
                            <input
                                type="text"
                                name="GEMINI_API_KEY"
                                value={settings.GEMINI_API_KEY}
                                onChange={handleChange}
                                placeholder="AIzaSy..."
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1.1rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                    boxSizing: 'border-box',
                                    background: '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02) inset'
                                }}
                            />
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.3rem 0 0 0', lineHeight: 1.5 }}>
                                Cette clé unique alimente à la fois l'<strong>Assistant IA</strong> des élèves et les outils d'<strong>automatisation PDF → HTML</strong>. Obtenez une clé gratuite sur <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>Google AI Studio</a>.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{ padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, #0f172a, #334155)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Save size={18} />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                    </button>

                </form>
            </div>
        </div>
    );
}
