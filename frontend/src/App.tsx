import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { SessionView } from './components/SessionView';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type Page = 'landing' | 'login' | 'dashboard' | 'session';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  // Handle URL-based routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/login') {
      setCurrentPage('login');
    } else if (path === '/dashboard') {
      setCurrentPage('dashboard');
    } else if (path.startsWith('/session')) {
      setCurrentPage('session');
    } else {
      setCurrentPage('landing');
    }

    // Listen for popstate events (browser back/forward)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login') {
        setCurrentPage('login');
      } else if (path === '/dashboard') {
        setCurrentPage('dashboard');
      } else if (path.startsWith('/session')) {
        setCurrentPage('session');
      } else {
        setCurrentPage('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirect to dashboard when authenticated and on landing/login pages
  useEffect(() => {
    if (isAuthenticated && (currentPage === 'landing' || currentPage === 'login')) {
      navigate('dashboard');
    }
  }, [isAuthenticated, currentPage]);

  const navigate = (page: Page) => {
    const path = page === 'landing' ? '/' : `/${page}`;
    window.history.pushState({}, '', path);
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Protected routes: redirect to login if trying to access while not authenticated
  if ((currentPage === 'dashboard' || currentPage === 'session') && !isAuthenticated) {
    navigate('login');
    return null;
  }

  switch (currentPage) {
    case 'login':
      return <LoginPage />;
    case 'dashboard':
      return <Dashboard />;
    case 'session':
      return <SessionView />;
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
