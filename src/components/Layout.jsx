import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

export default function Layout({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ gap: '0.75rem' }}>
          <Logo size={32} />
          Smita Enterprises
        </div>
        
        <nav className="sidebar-nav">
          <NavLink 
            to="/" 
            className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
            end
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink 
            to="/records" 
            className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <FileText size={20} />
            Unload Records
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" style={{width: '100%'}} onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="user-profile">
            <div className="avatar">
              {user?.role ? user.role.charAt(0).toUpperCase() : 'S'}
            </div>
            <span>{user?.role || 'Staff'}</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
