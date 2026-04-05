import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { SessionView } from './components/SessionView';
import { PostSessionReport } from './components/PostSessionReport';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type Page = 'landing' | 'login' | 'dashboard' | 'session' | 'report';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const getPageFromPath = (path: string): Page => {
    if (path === '/login') return 'login';
    if (path === '/dashboard') return 'dashboard';
    if (path.includes('/notebook')) return 'report';
    if (path.startsWith('/session')) return 'session';
    return 'landing';
  };

  // Handle URL-based routing
  useEffect(() => {
    setCurrentPage(getPageFromPath(window.location.pathname));

    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
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

  const navigate = (page: Page, path?: string) => {
    const url = path ?? (page === 'landing' ? '/' : `/${page}`);
    window.history.pushState({}, '', url);
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
  if ((currentPage === 'dashboard' || currentPage === 'session' || currentPage === 'report') && !isAuthenticated) {
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
    case 'report':
      return <PostSessionReport />;
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
