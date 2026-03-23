import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CheckSquare, FileText,
  BarChart2, MessageSquare, Calendar, LogOut, Sparkles, BookMarked,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/courses', label: 'Cours', icon: BookOpen },
  { path: '/app/summaries', label: 'Résumés', icon: BookMarked },
  { path: '/app/sheets', label: 'Fiches', icon: FileText },
  { path: '/app/exercises', label: 'Exercices', icon: CheckSquare },
  { path: '/app/exams', label: 'Annales', icon: FileText },
  { path: '/app/assistant', label: 'Assistant IA', icon: MessageSquare, badge: 'IA' },
  { path: '/app/planning', label: 'Planning', icon: Calendar },
];

// Badge couleur par série
// Badge couleur par série
const getSeriesBadge = (series, name) => {
  if (series === 'C' || name === 'C') return { label: 'Série C', bg: 'rgba(79,122,248,0.15)', color: '#4f7af8' };
  if (series === 'D' || name === 'D') return { label: 'Série D', bg: 'rgba(67,233,123,0.15)', color: '#2ed573' };
  return { label: `Série ${name || series}`, bg: 'rgba(168,85,247,0.15)', color: '#a855f7' };
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Utilisateur';
  const series = user?.series ?? 'C';
  const seriesName = user?.series_name || (series === '1' ? 'C' : (series === '2' ? 'D' : series));
  const badge = getSeriesBadge(series, seriesName);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link to="/app/dashboard" className="sidebar-logo" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo-icon">
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem' }}>S3C</span>
        </div>
        <div>
          <div className="sidebar-logo-name">PrepBac</div>
          <div className="sidebar-logo-sub">Mauritanie · 2026</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Navigation</p>
        <ul className="nav-list">
          {navItems.map(({ path, label, icon: Icon, badge: b }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon"><Icon size={17} /></span>
                <span style={{ flex: 1 }}>{label}</span>
                {b && <span className="nav-badge">{b}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>


    </aside>
  );
}
