import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { NewSessionPage } from './components/NewSessionPage';
import { SessionView } from './components/SessionView';
import { PostSessionReport } from './components/PostSessionReport';
import { AuthProvider } from './contexts/AuthContext';

type Page = 'landing' | 'login' | 'dashboard' | 'new-session' | 'session' | 'report';

function AppContent() {
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

  switch (currentPage) {
    case 'login':
      return <Dashboard />;
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
