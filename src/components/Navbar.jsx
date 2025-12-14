import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import logo from '../assets/images/logo_000.png'; 

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // --- 1. Check login status ---
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      setUser(null);
    }
  }, [location.pathname]); // Re-run when navigation happens

  // --- LOGOUT HANDLER (Added) ---
  const handleLogout = () => {
    localStorage.removeItem('user'); // Clear the session
    setUser(null); // Update local state
    navigate('/', { replace: true }); // Redirect to home page
  };
  // -------------------------------

  // Define ALL navigation links (Updated paths/names to match project)
  const ALL_NAV_OPTIONS = useMemo(() => ([
    { name: 'Home', path: '/', protected: false },
    { name: 'Detection', path: '/detection', protected: true },
    { name: 'XAI Insights', path: '/xai', protected: true }, // Corrected path from App.js
    { name: 'Analysis History', path: '/analysis-history', protected: true },
    { name: 'About', path: '/about', protected: false },
  ]), []);

  // Filter the links based on the user's login status
  const visibleNavOptions = ALL_NAV_OPTIONS.filter(option => 
    !option.protected || user
  );

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    if (!user) return '/login'; 
    return user.role === 'admin' ? '/admin-dashboard' : '/team-dashboard';
  };

  return (
    <nav className="w-full fixed top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* --- Logo Section (Updated Branding/Colors) --- */}
        <div className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden">
            <img 
              src={logo} 
              alt="FactFusion Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight hidden sm:block">
            Fact<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">Fusion</span>
          </span>
        </div>

        {/* Center Links (Updated Hover Color) */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          {visibleNavOptions.map((option) => ( 
            <Link 
              key={option.name}
              to={option.path} 
              className={`hover:text-red-400 transition-colors ${ // Changed hover color to red
                location.pathname.startsWith(option.path) && option.path !== '/'
                  ? 'text-white font-semibold' 
                  : location.pathname === '/' && option.path === '/' 
                  ? 'text-white font-semibold' 
                  : ''
              }`}
            >
              {option.name}
            </Link>
          ))}
        </div>

        {/* --- Right Side: Dynamic Buttons (Updated) --- */}
        <div className="flex items-center gap-4">
          <span className="hidden lg:block text-red-500/80 font-mono text-sm">FINAL YEAR PROJECT</span> {/* Updated Date/Text */}
          
          {user ? (
            <div className="flex items-center gap-4">
              {/* 1. My Dashboard Button (Updated Colors) */}
              <Link 
                to={getDashboardLink()}
                className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-all transform hover:scale-105"
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">My Dashboard</span>
              </Link>

              {/* 2. Logout Button (Added) */}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all text-sm font-semibold"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Sign In Button (Updated Colors) */
            <Link 
              to="/login"
              className="px-5 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm font-semibold"
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