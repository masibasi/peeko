import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { NewSessionPage } from './components/NewSessionPage';
import { SessionView } from './components/SessionView';
import { PostSessionReport } from './components/PostSessionReport';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type Page = 'landing' | 'login' | 'dashboard' | 'new-session' | 'session' | 'report';

function AppContent() {
  const { isAuthenticated, isGuest, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const getPageFromPath = (path: string): Page => {
    if (path === '/login') return 'login';
    if (path === '/dashboard') return 'dashboard';
    if (path.includes('/notebook')) return 'report';
    // /session/new must be checked before /session/:id
    if (path === '/session/new') return 'new-session';
    if (path.startsWith('/session')) return 'session';
    return 'landing';
  };

  useEffect(() => {
    setCurrentPage(getPageFromPath(window.location.pathname));

    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (page: Page, path?: string) => {
    const defaultPaths: Partial<Record<Page, string>> = {
      landing: '/',
      'new-session': '/session/new',
    };
    const url = path ?? defaultPaths[page] ?? `/${page}`;
    window.history.pushState({}, '', url);
    setCurrentPage(page);
  };

  useEffect(() => {
    if (loading) return;
    const protectedPages: Page[] = ['dashboard', 'new-session', 'session', 'report'];
    if (!isAuthenticated && protectedPages.includes(currentPage)) {
      window.history.pushState({}, '', '/login');
      setCurrentPage('login');
      return;
    }
    if (isAuthenticated && isGuest && currentPage === 'dashboard') {
      window.history.pushState({}, '', '/session/new');
      setCurrentPage('new-session');
    }
  }, [loading, isAuthenticated, isGuest, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🦊</div>
          <div className="text-gray-500 font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  switch (currentPage) {
    case 'login':
      return <LoginPage />;
    case 'dashboard':
      return <Dashboard />;
    case 'new-session':
      return <NewSessionPage onNavigate={navigate} />;
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
