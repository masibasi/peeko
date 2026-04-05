import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { SessionView } from './components/SessionView';
import { PostSessionReport } from './components/PostSessionReport';
import { AuthProvider } from './contexts/AuthContext';

type Page = 'landing' | 'login' | 'dashboard' | 'session' | 'report';

function AppContent() {
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


  const navigate = (page: Page, path?: string) => {
    const url = path ?? (page === 'landing' ? '/' : `/${page}`);
    window.history.pushState({}, '', url);
    setCurrentPage(page);
  };

  switch (currentPage) {
    case 'login':
      return <Dashboard />;
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
