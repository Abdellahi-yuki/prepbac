import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, User, ArrowRight,
  BookOpen, Brain, BarChart3, Shield, ChevronRight, Check,
  Users, TrendingUp, Award, AlertTriangle, FlaskConical, Ruler,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';

/* ================================================================
   CONFIGURATION — toutes les données et labels sont ici.
   Le composant ne contient aucune chaîne codée en dur.
   ================================================================ */

const CONFIG = {
  app: {
    name: 'PrepBac',
    badge: 'IA',
    tagline: 'Réussissez votre Baccalauréat avec l\'IA',
    taglineKey: 'Baccalauréat',           // mot mis en surbrillance
    subline: 'La plateforme d\'excellence pour les élèves de toutes les séries en Mauritanie.',
    trustText: 'Données sécurisées · Accès immédiat · Sans engagement',
  },

  symbols: [
    { char: 'π', top: '12%', left: '8%', delay: '0s', size: '1.6rem' },
    { char: '∑', top: '25%', right: '10%', delay: '0.7s', size: '1.4rem' },
    { char: 'Δ', top: '60%', left: '6%', delay: '1.2s', size: '1.3rem' },
    { char: '∞', bottom: '20%', right: '8%', delay: '0.4s', size: '1.5rem' },
    { char: 'ε', top: '40%', right: '14%', delay: '1.8s', size: '1.2rem' },
    { char: 'λ', bottom: '35%', left: '12%', delay: '0.9s', size: '1.4rem' },
  ],

  icons: {
    logo: GraduationCap,
    logoSize: 22,
    featureSize: 16,
    statSize: 13,
    inputSize: 15,
    submitSize: 16,
    trustSize: 13,
    seriesSize: 18,
    checkSize: 10,
  },

  tabs: [
    { key: 'login', label: 'Connexion' },
    { key: 'register', label: 'Inscription' },
  ],

  login: {
    title: 'Bon retour',
    subtitle: 'Continuez votre préparation au Baccalauréat',
    submit: 'Se connecter',
    toggle: 'Nouveau sur PrepBac ?',
    toggleCta: 'S\'inscrire gratuitement',
  },

  register: {
    title: 'Créer un compte',
    subtitle: 'Rejoignez des milliers d\'étudiants mauritaniens',
    submit: 'Créer mon compte',
    toggle: 'Déjà un compte ?',
    toggleCta: 'Se connecter',
  },

  fields: {
    firstName: { key: 'firstName', label: 'Prénom', placeholder: 'Amadou', type: 'text', icon: User },
    lastName: { key: 'lastName', label: 'Nom', placeholder: 'Diallo', type: 'text', icon: User },
    email: { key: 'email', label: 'Adresse email', placeholder: 'amadou@example.com', type: 'email', icon: Mail },
    password: { key: 'password', label: 'Mot de passe', placeholder: '••••••••', type: 'password', icon: Lock },
    forgotLink: 'Mot de passe oublié ?',
    seriesLabel: 'Choisissez votre série',
    minPassword: 6,
  },

  divider: 'ou',

  features: [
    {
      icon: BookOpen,
      gradient: 'linear-gradient(135deg,#4f7af8,#764ba2)',
      glow: 'rgba(79,122,248,0.3)',
      title: 'Cours Structurés',
      desc: 'Tout le programme de votre série, chapitre par chapitre',
    },
    {
      icon: Brain,
      gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
      glow: 'rgba(161,140,209,0.3)',
      title: 'IA Personnalisée',
      desc: 'Assistant disponible 24/7, adapté à votre niveau',
    },
    {
      icon: BarChart3,
      gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
      glow: 'rgba(67,233,123,0.3)',
      title: 'Quiz Intelligents',
      desc: 'Exercices adaptatifs et simulation du Bac',
    },
  ],

  stats: [
    { icon: Users, value: '5 000+', label: 'Étudiants actifs' },
    { icon: TrendingUp, value: '98 %', label: 'Taux de réussite' },
    { icon: Award, value: 'Top 1', label: 'Plateforme Bac' },
  ],

  cardInterval: 2800,  // ms
};

/* ================================================================
   COMPOSANT
   ================================================================ */

export default function Auth() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeCard, setActiveCard] = useState(0);
  const [seriesList, setSeriesList] = useState([]);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    series: '',
  });

  useEffect(() => {
    const t = setInterval(
      () => setActiveCard(c => (c + 1) % CONFIG.features.length),
      CONFIG.cardInterval,
    );
    fetchSeries();
    return () => clearInterval(t);
  }, []);

  const fetchSeries = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/series`);
      const data = await res.json();
      if (data.success) {
        setSeriesList(data.series);
        if (data.series.length > 0) {
          setForm(f => ({ ...f, series: data.series[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching series:', err);
    }
  };

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app/dashboard'} replace />;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      let loggedUser;
      if (isLogin) {
        loggedUser = await login({ email: form.email, password: form.password });
      } else {
        loggedUser = await register({
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, password: form.password, series: form.series,
        });
      }
      // Rediriger selon le rôle
      navigate(loggedUser?.role === 'admin' ? '/admin' : '/app/dashboard');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setIsLogin(v => !v); setApiError(''); };

  /* Raccourcis pour la config en fonction du mode */
  const mode = isLogin ? CONFIG.login : CONFIG.register;
  const { app, icons, fields, tabs, divider, features, stats, symbols } = CONFIG;
  const LogoIcon = icons.logo;

  /* Découpage du tagline pour la mise en surbrillance */
  const taglineParts = app.tagline.split(app.taglineKey);

  return (
    <div className="auth-page">

      {/* ── GAUCHE — Branding ── */}
      <div className="auth-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-grid-overlay" />

        {symbols.map((s, i) => (
          <div key={i} className="auth-symbol" style={{
            top: s.top, left: s.left, right: s.right, bottom: s.bottom,
            animationDelay: s.delay, fontSize: s.size,
          }}>
            {s.char}
          </div>
        ))}

        <div className="auth-left-content">

          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <LogoIcon size={icons.logoSize} color="white" />
            </div>
            <span className="auth-logo-text">{app.name}</span>
            <div className="auth-logo-badge">{app.badge}</div>
          </div>

          {/* Titre principal */}
          <h1 className="auth-headline">
            {taglineParts[0]}
            <span className="auth-headline-gradient">{app.taglineKey}</span>
            {taglineParts[1]}
          </h1>

          <p className="auth-subline">{app.subline}</p>

          {/* Cartes fonctionnalités */}
          <div className="auth-features">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={`auth-feature-card${activeCard === i ? ' auth-feature-card--active' : ''}`}
                  style={{ '--fc-glow': f.glow }}
                >
                  <div className="auth-feature-icon" style={{ background: f.gradient }}>
                    <Icon size={icons.featureSize} color="white" />
                  </div>
                  <div className="auth-feature-text">
                    <div className="auth-feature-title">{f.title}</div>
                    <div className="auth-feature-desc">{f.desc}</div>
                  </div>
                  <ChevronRight size={icons.inputSize} className="auth-feature-arrow" />
                </div>
              );
            })}
          </div>

          {/* Statistiques */}
          <div className="auth-stats">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="auth-stat">
                  <Icon size={icons.statSize} className="auth-stat-icon" />
                  <div className="auth-stat-value">{s.value}</div>
                  <div className="auth-stat-label">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DROITE — Formulaire ── */}
      <div className="auth-right">
        <div className="auth-form-container">

          {/* Tabs */}
          <div className="auth-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`auth-tab${isLogin === (tab.key === 'login') ? ' auth-tab--active' : ''}`}
                onClick={() => { setIsLogin(tab.key === 'login'); setApiError(''); }}
              >
                {tab.label}
              </button>
            ))}
            <div className={`auth-tab-slider${!isLogin ? ' auth-tab-slider--right' : ''}`} />
          </div>

          {/* En-tête */}
          <div className="auth-form-header">
            <h2 className="auth-form-title">{mode.title}</h2>
            <p className="auth-form-subtitle">{mode.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Prénom / Nom (inscription) */}
            {!isLogin && (
              <div className="auth-form-row">
                {[fields.firstName, fields.lastName].map(f => {
                  const FieldIcon = f.icon;
                  return (
                    <div key={f.key} className="auth-field">
                      <label className="auth-field-label">{f.label}</label>
                      <div className="auth-input-wrap">
                        <FieldIcon size={icons.inputSize} className="auth-input-icon" />
                        <input
                          className="auth-input"
                          type={f.type}
                          placeholder={f.placeholder}
                          value={form[f.key]}
                          onChange={set(f.key)}
                          required
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Email */}
            {[fields.email].map(f => {
              const FieldIcon = f.icon;
              return (
                <div key={f.key} className="auth-field">
                  <label className="auth-field-label">{f.label}</label>
                  <div className="auth-input-wrap">
                    <FieldIcon size={icons.inputSize} className="auth-input-icon" />
                    <input
                      className="auth-input"
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={set(f.key)}
                      required
                    />
                  </div>
                </div>
              );
            })}

            {/* Mot de passe */}
            <div className="auth-field">
              <div className="auth-field-row">
                <label className="auth-field-label">{fields.password.label}</label>
                {isLogin && (
                  <a href="#" className="auth-forgot">{fields.forgotLink}</a>
                )}
              </div>
              <div className="auth-input-wrap">
                <Lock size={icons.inputSize} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder={fields.password.placeholder}
                  style={{ paddingRight: '3rem' }}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={fields.minPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="auth-pwd-toggle"
                >
                  {showPwd ? <EyeOff size={icons.inputSize} /> : <Eye size={icons.inputSize} />}
                </button>
              </div>
            </div>

            {/* Sélecteur de série (inscription) */}
            {!isLogin && (
              <div className="auth-field">
                <label className="auth-field-label">{fields.seriesLabel}</label>
                <div className="auth-series-grid">
                  {seriesList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, series: s.id }))}
                      className={`auth-series-btn${form.series === s.id ? ' auth-series-btn--active' : ''}`}
                    >
                      <GraduationCap
                        size={icons.seriesSize}
                        className="auth-series-icon"
                      />
                      <span className="auth-series-label">Série {s.name}</span>
                      {form.series === s.id && (
                        <div className="auth-series-check">
                          <Check size={icons.checkSize} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Erreur API */}
            {apiError && (
              <div className="auth-error">
                <AlertTriangle size={icons.inputSize} />
                <span>{apiError}</span>
              </div>
            )}

            {/* Bouton soumettre */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading
                ? <span className="auth-spinner" />
                : <>{mode.submit}<ArrowRight size={icons.submitSize} /></>
              }
            </button>

            {/* Séparateur */}
            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">{divider}</span>
              <div className="auth-divider-line" />
            </div>

            {/* Bascule login / inscription */}
            <p className="auth-toggle">
              {mode.toggle}{' '}
              <button type="button" onClick={switchMode} className="auth-toggle-btn">
                {mode.toggleCta}
              </button>
            </p>
          </form>

          {/* Badge de confiance */}
          <div className="auth-trust">
            <Shield size={icons.trustSize} />
            <span>{app.trustText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
