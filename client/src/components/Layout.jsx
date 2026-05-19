import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'admin'
    ? [
        { to: '/admin/dashboard', label: 'Dashboard' },
        { to: '/admin/series', label: 'Series' },
        { to: '/admin/reports', label: 'Reports' },
        { to: '/admin/certificates', label: 'Certificates' },
      ]
    : [
        { to: '/disciple/pathway', label: 'My Pathway' },
        { to: '/disciple/milestones', label: 'Milestones' },
        { to: '/disciple/certificates', label: 'Certificates' },
        { to: '/disciple/help', label: 'Help' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-church-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/disciple/pathway'} className="font-bold text-lg truncate">
              CLE Pathway
            </Link>
            <div className="hidden md:flex items-center gap-4">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    location.pathname.startsWith(item.to) ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <span className="text-sm text-white/70 truncate max-w-[150px]">{user?.name}</span>
              <button onClick={handleLogout} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition-colors">
                Logout
              </button>
            </div>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          {menuOpen && (
            <div className="md:hidden pb-3 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded text-sm ${
                    location.pathname.startsWith(item.to) ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-white/20 pt-2 mt-2">
                <span className="block px-3 py-1 text-sm text-white/70">{user?.name}</span>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded">
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
