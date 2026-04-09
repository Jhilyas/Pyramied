import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const { socket } = useSocket();

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.get('/dashboard/student');
      setCourses(data.courses || []);
      setUpcoming(data.upcoming || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      loadDashboard();
    };
    socket.on('content:updated', handleUpdate);
    return () => socket.off('content:updated', handleUpdate);
  }, [socket, loadDashboard]);

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">My Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening in your courses.</p>
      </div>

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            ⏰ Upcoming Deadlines
          </h2>
          <div className="grid grid-2 stagger-children">
            {upcoming.map((item, i) => (
              <LiquidGlass key={i} variant="elevated" className="liquid-glass-green" interactive>
                <div style={{ padding: 'var(--space-md)' }}>
                  <div className="flex justify-between items-center">
                    <span className={`badge ${item.type === 'quiz' ? 'badge-warning' : 'badge-info'}`}>
                      {item.type === 'quiz' ? '📝 Quiz' : '📄 Assignment'}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginTop: 'var(--space-sm)' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                    {item.course_title}
                  </p>
                </div>
              </LiquidGlass>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Courses */}
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
        📚 My Courses
      </h2>
      {loading ? (
        <div className="grid grid-3 stagger-children">
          {[1, 2, 3].map((i) => (
            <LiquidGlass key={i} variant="elevated">
              <div style={{ padding: 'var(--space-lg)' }}>
                <div className="skeleton" style={{ width: '80%', height: 24 }} />
                <div className="skeleton" style={{ width: '100%', height: 8, marginTop: 16, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: '50%', height: 14, marginTop: 12 }} />
              </div>
            </LiquidGlass>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <LiquidGlass variant="solid">
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <div className="empty-state-title">No courses yet</div>
            <div className="empty-state-text">You haven't been enrolled in any courses yet. Contact your teacher for enrollment.</div>
          </div>
        </LiquidGlass>
      ) : (
        <div className="grid grid-3 stagger-children">
          {courses.map((c) => (
            <LiquidGlass key={c.id} variant="elevated" interactive>
              <div style={{ padding: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                  {c.title}
                </h3>
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                  {c.description || 'No description'}
                </p>
                {/* Progress bar */}
                <div style={{
                  height: 6,
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  marginBottom: 'var(--space-sm)',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${c.progress || 0}%`,
                    background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {c.progress || 0}% complete
                </span>
              </div>
            </LiquidGlass>
          ))}
        </div>
      )}
    </div>
  );
}
