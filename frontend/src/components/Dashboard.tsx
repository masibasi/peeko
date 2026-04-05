import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { Plus, Clock, FileText, LogOut, Calendar, ChevronRight, Search, Flame, Zap, Target, Trophy, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  duration: number; // in minutes
  cardCount: number;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const { xp, level, recoveryStreak, quests } = useStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    window.location.href = '/session/new';
  };

  const handleSessionClick = (sessionId: string) => {
    window.location.href = `/session/${sessionId}/notebook`;
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this session? This cannot be undone.')) return;
    try {
      await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦊</span>
            <span className="text-xl font-bold text-gray-900">Peeko</span>
          </div>
          
          {/* XP Bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-orange-500">Lvl {level}</span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all" 
                  style={{ width: `${(xp % 300) / 3}%` }}
                />
              </div>
              <span className="text-gray-500">{xp} XP</span>
            </div>
            <div className="flex items-center gap-1 text-orange-500 font-medium">
              <Flame className="w-5 h-5" />
              <span>{recoveryStreak}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-medium text-sm">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-700 hidden sm:block">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome & Stats Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">🦊</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Hey{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Ready to focus?
                  </h1>
                  <p className="text-gray-600">You're on a {recoveryStreak} recovery streak. Keep it up!</p>
                </div>
              </div>
              <button
                onClick={handleNewSession}
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-orange-200 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                Start New Session
              </button>
            </motion.div>
          </div>
          
          {/* Daily Quests */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100"
          >
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-500" /> Daily Quests
            </h3>
            <div className="space-y-3">
              {quests.length > 0 ? quests.slice(0, 3).map(q => (
                <div key={q.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${q.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                      {q.completed && <span className="text-xs">✓</span>}
                    </div>
                    <span className={`text-sm ${q.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {q.title}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-orange-500">+{q.xp} XP</span>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Start a session to get quests!</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 border border-gray-100 text-center"
          >
            <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{xp}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total XP</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 border border-gray-100 text-center"
          >
            <Trophy className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{level}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Level</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-4 border border-gray-100 text-center"
          >
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{recoveryStreak}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Streak</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl p-4 border border-gray-100 text-center"
          >
            <FileText className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Sessions</div>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Sessions Grid */}
        <h2 className="font-bold text-gray-900 mb-4">Past Sessions</h2>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">🦊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
            </h3>
            <p className="text-gray-600 mb-6">
              {sessions.length === 0 
                ? 'Start your first lecture session to earn XP!'
                : 'Try a different search term'
              }
            </p>
            {sessions.length === 0 && (
              <button
                onClick={handleNewSession}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Start First Session
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handleSessionClick(session.id)}
                className="bg-white rounded-2xl p-6 text-left hover:shadow-lg transition-all duration-200 border border-gray-100 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                    🦊
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {session.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(session.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(session.duration)}
                  </span>
                </div>
                
                {session.cardCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-orange-600 font-medium">
                      {session.cardCount} flashcard{session.cardCount !== 1 ? 's' : ''} • +{session.cardCount * 15} XP
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
