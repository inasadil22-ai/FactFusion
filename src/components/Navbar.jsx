import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import logo from '../assets/images/logo_00.png'; 

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Sync user state with localStorage on every route change
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    } catch (error) {
      console.error("Auth sync error:", error);
      setUser(null);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/', { replace: true });
  };

  // Define navigation options based on your file structure
  const ALL_NAV_OPTIONS = useMemo(() => ([
    { name: 'Home', path: '/', protected: false },
    { name: 'Detection', path: '/detection', protected: true },
    { name: 'XAI Insights', path: '/xai', protected: true }, 
    { name: 'Analysis History', path: '/analysis-history', protected: true },
    { name: 'About', path: '/about', protected: false },
  ]), []);

  // Filter links: Only show protected links if the user is logged in
  const visibleNavOptions = ALL_NAV_OPTIONS.filter(option => 
    !option.protected || user
  );

  // Logic to determine which dashboard to show based on user role
  const getDashboardLink = () => {
    if (!user) return '/login'; 
    return user.role === 'admin' ? '/admin-dashboard' : '/team-dashboard';
  };

  return (
    <nav className="w-full fixed top-0 z-50 backdrop-blur-xl bg-[#020617]/70 border-b border-blue-500/10">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        
        {/* --- Logo Branding --- */}
        <div className="flex items-center gap-3 group">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <img 
              src={logo} 
              alt="FactFusion Logo" 
              className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
            />
          </div>
          <span className="text-white font-bold text-4xl tracking-tight hidden sm:block">
            Fact<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Fusion</span>
          </span>
        </div>

        {/* --- Central Navigation Links --- */}
        <div className="hidden md:flex items-center gap-8 text-md font-medium text-blue-100/50">
          {visibleNavOptions.map((option) => ( 
            <Link 
              key={option.name}
              to={option.path} 
              className={`hover:text-blue-400 transition-all duration-300 relative group ${
                location.pathname === option.path ? 'text-white font-semibold' : ''
              }`}
            >
              {option.name}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ${
                location.pathname === option.path ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </Link>
          ))}
        </div>

        {/* --- Right Side: Dashboard & Auth --- */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-blue-400/80 font-mono text-[10px] tracking-widest uppercase">FYP 2025</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              {/* This Button dynamically redirects based on role */}
              <Link 
                to={getDashboardLink()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all transform hover:scale-105 active:scale-95"
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-blue-500/20 text-blue-100/60 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="px-6 py-2.5 rounded-full bg-white/5 border border-blue-500/30 text-blue-100 hover:bg-blue-500/10 transition-all text-sm font-bold"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;