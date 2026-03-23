import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, CheckSquare, Calendar, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/app/dashboard', icon: Home, label: 'Accueil' },
  { to: '/app/courses', icon: BookOpen, label: 'Cours' },
  { to: '/app/exercises', icon: CheckSquare, label: 'Exercices' },
  { to: '/app/planning', icon: Calendar, label: 'Planning' },
  { to: '/app/assistant', icon: Sparkles, label: 'IA' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav mobile-only">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          {({ isActive }) => (
            <div className={`bottom-nav-item${isActive ? ' bottom-nav-item--active' : ''}`}>
              <div className="bottom-nav-icon-wrap">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && <span className="bottom-nav-dot" />}
              </div>
              <span className="bottom-nav-label">{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
