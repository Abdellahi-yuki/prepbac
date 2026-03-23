import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Sparkles,
    BookOpen,
    Calendar,
    ArrowRight,
    Cpu,
    Layout,
    ChevronRight,
    Search
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
    const { user } = useAuth();

    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app/dashboard'} replace />;

    const features = [
        {
            icon: <Calendar className="feat-icon" style={{ color: '#f59e0b' }} />,
            title: "Planning Intelligent",
            desc: "L'IA analyse tes forces et tes faiblesses pour te générer un planning de révision personnalisé et réaliste.",
            color: 'rgba(245, 158, 11, 0.1)'
        },
        {
            icon: <BookOpen className="feat-icon" style={{ color: '#6366f1' }} />,
            title: "Résumés Optimisés",
            desc: "Accède à des fiches de cours synthétiques et claires pour retenir l'essentiel en un minimum de temps.",
            color: 'rgba(99, 102, 241, 0.1)'
        },
        {
            icon: <Cpu className="feat-icon" style={{ color: '#ec4899' }} />,
            title: "Assistant IA 24/7",
            desc: "Une question ? Un concept flou ? Notre IA est là pour t'expliquer n'importe quelle notion instantanément.",
            color: 'rgba(236, 72, 153, 0.1)'
        }
    ];

    return (
        <div className="landing-container">
            {/* Background elements */}
            <div className="bg-blob blob-1"></div>
            <div className="bg-blob blob-2"></div>
            <div className="bg-blob blob-3"></div>

            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-content">
                    <div className="logo">
                        <div className="logo-icon">PB</div>
                        <span>PrepBac</span>
                    </div>
                    <div className="nav-links">
                        <Link to="/auth" className="btn-secondary">Connexion</Link>
                        <Link to="/auth" className="btn-primary">S'inscrire</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        <span>La plateforme n°1 pour le Bac</span>
                    </div>
                    <h1>Réussir son Bac n'a jamais été aussi <span>simple</span>.</h1>
                    <p>Une plateforme intelligente conçue pour t'accompagner vers la réussite. Révisions, planning IA et suivi de progrès, tout est là.</p>

                    <div className="hero-ctas">
                        <Link to="/auth" className="btn-hero-primary">
                            Commencer gratuitement <ArrowRight size={20} />
                        </Link>
                    </div>

                </div>

                {/* Floating Mockup Preview */}
                <div className="hero-visual">
                    <div className="mockup-container">
                        <div className="mockup-frame">
                            <div className="mockup-header">
                                <div className="dots"><span></span><span></span><span></span></div>
                            </div>
                            <div className="mockup-content">
                                <div className="mockup-sidebar"></div>
                                <div className="mockup-main">
                                    <div className="mockup-card card-1"></div>
                                    <div className="mockup-card card-2"></div>
                                    <div className="mockup-card card-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2>Tout ce dont tu as besoin</h2>
                    <p>Oublie le stress du Bac. Nous avons regroupé les meilleurs outils pour ton succès.</p>
                </div>

                <div className="features-grid">
                    {features.map((f, i) => (
                        <div key={i} className="feature-card" style={{ '--feat-color': f.color }}>
                            <div className="feat-icon-wrapper">
                                {f.icon}
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Promo Section */}
            <section className="promo-section">
                <div className="promo-card">
                    <div className="promo-text">
                        <h2>Prêt à Transformer tes Révisions ?</h2>
                        <p>Rejoins-nous et commence à réviser intelligemment dès aujourd'hui.</p>
                        <Link to="/auth" className="btn-white">Créer mon compte <ChevronRight size={18} /></Link>
                    </div>
                    <div className="promo-visual">
                        <Layout size={120} strokeWidth={1} color="rgba(255,255,255,0.2)" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-logo">PrepBac</div>
                    <p>&copy; 2026 Plateforme PrepBac. Tous droits réservés.</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>made by PixelCraft</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
