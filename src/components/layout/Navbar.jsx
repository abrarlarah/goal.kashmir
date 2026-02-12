import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-white font-bold text-xl" onClick={closeMobileMenu}>
                ⚽ SoccerHub
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/tournaments"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Tournaments
              </NavLink>
              <NavLink
                to="/teams"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Teams
              </NavLink>
              <NavLink
                to="/players"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Players
              </NavLink>
              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Leaderboard
              </NavLink>
              {currentUser && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-gray-900 text-white shadow-inner border-b-2 border-green-500'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  Admin Panel
                </NavLink>
              )}
            </div>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors"
                >
                  Logout
                </button>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white border-l-4 border-green-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/tournaments"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white border-l-4 border-green-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Tournaments
            </NavLink>
            <NavLink
              to="/teams"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white border-l-4 border-green-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Teams
            </NavLink>
            <NavLink
              to="/players"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white border-l-4 border-green-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Players
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white border-l-4 border-green-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Leaderboard
            </NavLink>
            {currentUser && (
              <NavLink
                to="/admin"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive
                    ? 'bg-gray-900 text-white border-l-4 border-green-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                Admin Panel
              </NavLink>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="px-2 space-y-1">
              {currentUser ? (
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
