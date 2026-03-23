import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2, Users, BookOpen, Layers, FileText,
  HelpCircle, Copy, LogOut, Settings, Cpu, ArrowUpRight, FileEdit
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const menuItems = [
    { path: '/admin', icon: BarChart2, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { isDivider: true, label: 'Contenu' },
    { path: '/admin/subjects', icon: BookOpen, label: 'Matières' },
    { path: '/admin/resumes', icon: FileEdit, label: 'Résumés' },
    { path: '/admin/courses', icon: FileText, label: 'Cours' },
    { path: '/admin/sheets', icon: Copy, label: 'Fiches Révision' },
    { path: '/admin/exams', icon: Layers, label: 'Annales (Examens)' },
    { path: '/admin/exercises', icon: HelpCircle, label: 'Exercices' },
    { isDivider: true, label: 'Configuration' },
    { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
    { path: '/admin/series', icon: Layers, label: 'Séries' },
  ];

  return (
    <div className="admin-wrapper" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-sans)' }}>

      {/* SIDEBAR SOMBRE TYPE LINEAR/VERCEL */}
      <aside style={{
        width: '260px', background: '#0f172a', color: '#cbd5e1',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        borderRight: '1px solid #1e293b'
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f7af8, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>
            PB
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>PrepBac Admin</span>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0.75rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {menuItems.map((item, index) => {
              if (item.isDivider) {
                return (
                  <li key={index} style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '1.5rem 0.75rem 0.5rem' }}>
                    {item.label}
                  </li>
                );
              }

              const Icon = item.icon;
              return (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                      borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500,
                      color: isActive ? 'white' : '#94a3b8',
                      background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.2s ease', border: '1px solid transparent',
                      borderColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent'
                    })}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #1e293b' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500,
              color: '#f87171', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', transition: '0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={16} />
            Déconnexion Admin
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* TOPBAR */}
        <header style={{
          height: '64px', background: 'white', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0
        }}>
          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            Espace <span style={{ color: '#0f172a', fontWeight: 600 }}>Administrateur</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#f1f5f9', borderRadius: '20px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Système Opérationnel</span>
            </div>
            <button
              onClick={() => navigate('/app/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem',
                background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '20px',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Dashboard Élève <ArrowUpRight size={14} />
            </button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>

      </main>
    </div>
  );
}
