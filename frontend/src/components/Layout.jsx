import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StreakHeader from './StreakHeader';

function AvatarWithDropdown({ user, initials, logout, navigate, isMobile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Utilisateur';

  return (
    <div className="avatar-dropdown-container" ref={ref}>
      <div
        className={`header-avatar ${isMobile ? 'mobile-avatar' : ''}`}
        title="Mon compte"
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer' }}
      >
        {initials}
      </div>

      {open && (
        <div className="avatar-dropdown-menu">
          <div className="avatar-dropdown-header">
            <div className="avatar-dropdown-name">{fullName}</div>
            <div className="avatar-dropdown-email">{user?.email || 'email@example.com'}</div>
          </div>
          <div className="avatar-dropdown-body">
            {/* Using a generic /settings route or simply acting as a placeholder */}
            <button className="avatar-dropdown-item" onClick={() => { setOpen(false); navigate('/app/settings'); }}>
              <Settings size={16} />
              Paramètres
            </button>
            <button className="avatar-dropdown-item danger" onClick={() => { setOpen(false); logout(); navigate('/auth'); }}>
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const routeLabels = {
  '/app/dashboard': 'Tableau de bord',
  '/app/courses': 'Bibliothèque de cours',
  '/app/sheets': 'Fiches de révision',
  '/app/exercises': 'Exercices',
  '/app/quizzes': 'QCM',
  '/app/assistant': 'Assistant IA',
  '/app/planning': 'Planning',
  '/app/progress': 'Mes performances',
  '/app/exams': 'Annales du Bac',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const label = routeLabels[location.pathname] ?? 'Page';

  const firstName = user?.first_name ?? 'Étudiant';
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <div className="app-layout">
      {/* Sidebar — visible on desktop only via CSS */}
      <Sidebar />

      <div className="app-main">
        {/* Desktop header */}
        <div className="top-header-wrap desktop-only">
          <header className="top-header">
            <span className="header-greeting">
              Bonjour, <span>{firstName} !</span>
            </span>
            <div className="header-actions">
              <StreakHeader />
              {user?.role === 'admin' && (
                <button
                  className="header-btn"
                  onClick={() => navigate('/admin')}
                  style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                >
                  <Settings size={14} />
                  <span>Espace Admin</span>
                </button>
              )}
              <AvatarWithDropdown user={user} initials={initials} logout={logout} navigate={navigate} isMobile={false} />
            </div>
          </header>
        </div>

        {/* Mobile header */}
        <header className="mobile-header mobile-only">
          <div className="mobile-header-left">
            <div className="mobile-logo">P</div>
            <span className="mobile-page-title">{label}</span>
          </div>
          <div className="mobile-header-right">
            <StreakHeader />
            <AvatarWithDropdown user={user} initials={initials} logout={logout} navigate={navigate} isMobile={true} />
          </div>
        </header>

        {/* Page content */}
        <main className={`page-content anim-fade-up ${location.pathname === '/assistant' ? 'page-content--full' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
