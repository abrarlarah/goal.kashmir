import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Trophy, Shield, Users, BarChart2, LayoutDashboard, LogOut, ChevronRight, User, Newspaper, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'News', path: '/news', icon: Newspaper },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Teams', path: '/teams', icon: Shield },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Leaderboard', path: '/leaderboard', icon: BarChart2 },
  ];

  if (currentUser) {
    navItems.push({ name: 'Admin', path: '/admin', icon: User });
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b",
          scrolled
            ? "bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-slate-200 dark:border-white/5 shadow-lg shadow-black/5 dark:shadow-black/20"
            : "bg-transparent backdrop-blur-sm border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-slate-900 dark:text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Trophy size={20} className="text-slate-900 dark:text-white fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">Goal<span className="text-brand-400">Kashmir</span></span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Premium League</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="relative px-4 py-2 rounded-lg group"
                  >
                    <span className={cn(
                      "relative z-10 flex items-center gap-2 text-sm font-medium transition-colors",
                      isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-400 group-hover:text-brand-500 dark:group-hover:text-white"
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/5"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Auth & Search */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/search" className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-white transition-colors">
                <Search size={22} />
              </Link>
              <ThemeToggle />
              <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1" />
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95">Login</Link>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center gap-2">
              <Link to="/search" className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-white transition-colors">
                <Search size={22} />
              </Link>
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-dark-bg/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 overflow-hidden"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center justify-between p-4 rounded-xl border border-transparent transition-all",
                      isActive
                        ? "bg-brand-500/10 border-brand-500/20 text-brand-600 dark:text-brand-400"
                        : "bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronRight size={16} className="opacity-50" />
                  </NavLink>
                ))}

                <div className="h-px bg-white/10 my-4" />

                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut size={20} />
                    Logout
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex justify-center p-4 rounded-xl bg-brand-600 text-white font-medium shadow-lg hover:bg-brand-500"
                    >
                      Login
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
      {/* Spacer for fixed navbar */}
      <div className="h-16 md:h-20" />
    </>
  );
};

export default Navbar;
