import { useState, useEffect } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ courses: 0, students: 0, submissions: 0, quizAttempts: 0, workItems: 0, workSubmissions: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.get('/dashboard/admin');
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading your overview...</p>
        </div>
        <div className="grid grid-4 stagger-children">
          {[1, 2, 3, 4].map((i) => (
            <LiquidGlass key={i} variant="elevated">
              <div className="stat-card">
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
                <div className="skeleton" style={{ width: 80, height: 36, marginTop: 16 }} />
                <div className="skeleton" style={{ width: 120, height: 14, marginTop: 8 }} />
              </div>
            </LiquidGlass>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your platform at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4 stagger-children">
        <LiquidGlass variant="elevated" interactive>
          <div className="stat-card">
            <div className="stat-card-icon">📚</div>
            <div className="stat-card-value count-up">{stats.courses}</div>
            <div className="stat-card-label">Active Courses</div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="elevated" interactive>
          <div className="stat-card">
            <div className="stat-card-icon">👥</div>
            <div className="stat-card-value count-up">{stats.students}</div>
            <div className="stat-card-label">Enrolled Teachers</div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="elevated" interactive>
          <div className="stat-card">
            <div className="stat-card-icon">📄</div>
            <div className="stat-card-value count-up">{stats.submissions}</div>
            <div className="stat-card-label">Submissions</div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="elevated" interactive>
          <div className="stat-card">
            <div className="stat-card-icon">🎯</div>
            <div className="stat-card-value count-up">{stats.quizAttempts}</div>
            <div className="stat-card-label">Quiz Attempts</div>
          </div>
        </LiquidGlass>
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
          Recent Activity
        </h2>
        <LiquidGlass variant="solid">
          <div style={{ padding: 'var(--space-md)' }}>
            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No recent activity</div>
                <div className="empty-state-text">
                  Activity will appear here as teachers interact with your courses.
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="avatar avatar-sm">
                            {log.user_name?.charAt(0) || '?'}
                          </div>
                          {log.user_name}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          log.action === 'login' ? 'badge-info' :
                          log.action === 'submit_assignment' ? 'badge-success' :
                          log.action === 'submit_quiz' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-muted">{log.target_type || '—'}</td>
                      <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
}
