import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Save, CheckCircle, AlertCircle, Trash2, Smartphone } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

export default function Settings() {
    const { user, updateProfile } = useAuth();

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        series: '',
        password: ''
    });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [seriesList, setSeriesList] = useState([]);

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                series: user.series || '',
                password: ''
            });
        }
        fetchAvailableSeries();
    }, [user]);

    const fetchAvailableSeries = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/series`);
            const data = await res.json();
            if (data.success) {
                setSeriesList(data.series);
            }
        } catch (err) {
            console.error('Error fetching series in settings:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await updateProfile({
                first_name: formData.first_name,
                last_name: formData.last_name,
                series: formData.series,
                password: formData.password
            });
            setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
            // Reset password field after update
            setFormData(prev => ({ ...prev, password: '' }));
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Une erreur est survenue' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="page-hero">
                <div>
                    <h1 className="page-title">Paramètres du compte</h1>
                    <p className="page-subtitle">Gérez vos informations personnelles et préférences</p>
                </div>
            </div>

            <div className="settings-container anim-fade-up">
                <form onSubmit={handleSubmit} className="settings-card card">
                    <div className="settings-section">
                        <h3 className="settings-section-title">
                            <User size={18} />
                            Informations Personnelles
                        </h3>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Prénom</label>
                                <div className="input-with-icon">
                                    <User size={16} />
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="Votre prénom"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Nom</label>
                                <div className="input-with-icon">
                                    <User size={16} />
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Votre nom"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email (Non modifiable)</label>
                                <div className="input-with-icon disabled">
                                    <Mail size={16} />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        style={{ cursor: 'not-allowed', background: '#f9fafb' }}
                                    />
                                </div>
                                <p className="field-hint">L'email ne peut pas être modifié pour des raisons de sécurité.</p>
                            </div>

                            <div className="form-group">
                                <label>Nouveau mot de passe</label>
                                <div className="input-with-icon">
                                    <Shield size={16} />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Laisser vide pour ne pas changer"
                                    />
                                </div>
                                <p className="field-hint">L'email ne peut pas être modifié. Laissez le mot de passe vide pour le conserver.</p>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section" style={{ marginTop: '2.5rem' }}>
                        <h3 className="settings-section-title">
                            <Shield size={18} />
                            Baccalauréat
                        </h3>

                        <div className="form-group" style={{ maxWidth: '400px' }}>
                            <label>Série actuelle</label>
                            <div className="series-selector-modern">
                                {seriesList.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`series-option-btn ${formData.series == s.id ? 'active' : ''}`}
                                        onClick={() => setFormData(p => ({ ...p, series: s.id }))}
                                    >
                                        Série {s.name}
                                    </button>
                                ))}
                            </div>
                            <p className="field-hint">Changer de série mettra à jour vos cours et exercices recommandés.</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`form-message ${message.type === 'success' ? 'success' : 'error'}`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {message.text}
                        </div>
                    )}

                    <div className="settings-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Enregistrement...' : (
                                <>
                                    <Save size={18} />
                                    Enregistrer les modifications
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="settings-card card danger-card" style={{ marginTop: '2rem', borderColor: '#fee2e2' }}>
                    <div className="settings-section">
                        <h3 className="settings-section-title" style={{ color: '#dc2626' }}>
                            <Trash2 size={18} />
                            Zone de danger
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Une fois votre compte supprimé, toutes vos données (progression, badges, favoris) seront définitivement effacées. Cette action est irréversible.
                        </p>
                        <button className="btn" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            Supprimer mon compte
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
}
