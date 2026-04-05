import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { Plus, Clock, FileText, LogOut, Calendar, ChevronRight, Search, Flame, Zap, Target, Trophy, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
  cardCount: number;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const { xp, level, recoveryStreak, quests } = useStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {}
  };

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const xpToNextLevel = 300;
  const xpInLevel = xp % xpToNextLevel;
  const xpPct = (xpInLevel / xpToNextLevel) * 100;

  return (
    <div className="min-h-screen bg-base">

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 border-b border-ink-100"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">🦊</span>
            <span className="text-xl font-black text-ink-900 tracking-tight">peeko</span>
          </div>

          {/* XP bar */}
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'var(--bg-subtle)' }}
          >
            <span className="text-xs font-black text-brand tabular">Lvl {level}</span>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ink-100)' }}>
              <div
                className="h-full xp-fill rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <span className="text-xs font-black tabular text-ink-400">{xp} XP</span>
            {recoveryStreak > 0 && (
              <div className="flex items-center gap-1 text-brand text-xs font-black">
                <Flame className="w-3.5 h-3.5" />
                {recoveryStreak}
              </div>
            )}
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                style={{ backgroundColor: 'var(--brand-subtle)', color: 'var(--brand-text)' }}
              >
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            <span className="text-sm font-semibold text-ink-500 hidden sm:block max-w-[120px] truncate">
              {user?.name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-ink-400 hover:text-ink-900 hover:bg-subtle rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">

        {/* ── Hero row: greeting + quests ── */}
        <div className="grid lg:grid-cols-3 gap-5 mb-8">

          {/* Greeting card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between min-h-[160px]"
            style={{
              backgroundColor: 'var(--brand-subtle)',
              border: '1px solid oklch(88% 0.07 70)',
            }}
          >
            <div className="flex items-start gap-4">
              <span className="text-5xl leading-none">🦊</span>
              <div>
                <h1 className="text-2xl font-black text-ink-900 leading-tight mb-1">
                  Hey{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-sm font-semibold text-ink-500">
                  {recoveryStreak > 0
                    ? `${recoveryStreak}-session recovery streak. Keep it going.`
                    : 'Ready to focus?'}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/session/new'}
              className="mt-5 self-start flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-black text-sm transition-all btn-depth-brand hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New session
            </button>
          </motion.div>

          {/* Daily quests */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--ink-100)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-ink-400 mb-4 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Daily quests
            </h3>
            <div className="space-y-3">
              {quests.length > 0 ? quests.slice(0, 3).map(q => (
                <div key={q.id} className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      backgroundColor: q.completed ? 'oklch(60% 0.15 145)' : 'var(--ink-100)',
                      border: q.completed ? 'none' : '1.5px solid var(--ink-200)',
                    }}
                  >
                    {q.completed && <span className="text-white text-[9px] font-black">✓</span>}
                  </div>
                  <span
                    className="text-xs font-semibold flex-1 leading-snug"
                    style={{
                      color: q.completed ? 'var(--ink-300)' : 'var(--ink-700)',
                      textDecoration: q.completed ? 'line-through' : 'none',
                    }}
                  >
                    {q.title}
                  </span>
                  <span className="text-xs font-black text-brand shrink-0">+{q.xp}</span>
                </div>
              )) : (
                <p className="text-xs text-ink-400 font-semibold">Start a session to unlock quests</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {[
            { icon: Zap,      label: 'Total XP',  value: xp,                    color: 'oklch(65% 0.17 82)' },
            { icon: Trophy,   label: 'Level',     value: level,                 color: 'oklch(58% 0.16 295)' },
            { icon: Flame,    label: 'Streak',    value: recoveryStreak,        color: 'var(--brand)' },
            { icon: FileText, label: 'Sessions',  value: sessions.length,       color: 'oklch(55% 0.14 165)' },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.14 + i * 0.04 }}
              className="rounded-xl p-4 text-center"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--ink-100)',
              }}
            >
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
              <div className="text-xl font-black tabular text-ink-900">{value}</div>
              <div className="text-[11px] font-bold text-ink-400 mt-0.5">{label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Sessions list ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-ink-900">Past sessions</h2>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300"
            />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm font-semibold rounded-xl border border-ink-100 bg-surface focus:outline-none focus:border-brand transition-colors text-ink-900 placeholder:text-ink-300 w-44"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full animate-spin border-2 border-ink-100" style={{ borderTopColor: 'var(--brand)' }} />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--ink-100)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5"
              style={{ backgroundColor: 'var(--brand-subtle)' }}
            >
              🦊
            </div>
            <h3 className="text-lg font-black text-ink-900 mb-2">
              {sessions.length === 0 ? 'No sessions yet' : 'Nothing matching'}
            </h3>
            <p className="text-sm font-semibold text-ink-400 mb-6">
              {sessions.length === 0
                ? 'Start your first lecture session to begin'
                : 'Try a different search term'}
            </p>
            {sessions.length === 0 && (
              <button
                onClick={() => window.location.href = '/session/new'}
                className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-black text-sm btn-depth-brand"
              >
                <Plus className="w-4 h-4" />
                Start first session
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map(session => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => window.location.href = `/session/${session.id}/notebook`}
                className="text-left rounded-2xl p-5 group transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--ink-100)',
                  boxShadow: 'var(--shadow-sm)',
                }}
                whileHover={{ boxShadow: 'var(--shadow-md)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: 'var(--brand-subtle)' }}
                  >
                    🦊
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleDeleteSession(e, session.id)}
                      className="p-1.5 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand transition-colors" />
                  </div>
                </div>

                <h3 className="font-black text-sm text-ink-900 mb-2.5 line-clamp-2 leading-snug">
                  {session.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-ink-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(session.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(session.duration)}
                  </span>
                </div>

                {session.cardCount > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--ink-100)' }}>
                    <span className="text-xs font-black text-brand">
                      {session.cardCount} card{session.cardCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-semibold text-ink-400 ml-1.5">
                      · +{session.cardCount * 15} XP
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
