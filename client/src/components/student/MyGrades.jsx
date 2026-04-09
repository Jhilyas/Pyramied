import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function MyGrades() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');

  const fetchGrades = useCallback(async () => {
    try {
      const res = await fetch('/api/grades/student');
      const json = await res.json();
      setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">My Grades</h1></div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  const { grades, courses, availableWork } = data;

  const filteredGrades = selectedCourse === 'all'
    ? grades
    : grades.filter(g => g.course_id === Number(selectedCourse));

  // Calculate overall average
  const gradedItems = grades.filter(g => g.score !== null);
  const overallAvg = gradedItems.length > 0
    ? (gradedItems.reduce((acc, g) => acc + (g.score / (g.max_score || 100)) * 100, 0) / gradedItems.length).toFixed(1)
    : null;

  // Per-course averages
  const courseAverages = courses.map(c => {
    const courseGrades = grades.filter(g => g.course_id === c.id && g.score !== null);
    const avg = courseGrades.length > 0
      ? (courseGrades.reduce((acc, g) => acc + (g.score / (g.max_score || 100)) * 100, 0) / courseGrades.length).toFixed(1)
      : null;
    const available = availableWork.find(a => a.course_id === c.id);
    return { ...c, avg, graded: courseGrades.length, total: available?.total || 0, submitted: grades.filter(g => g.course_id === c.id).length };
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">📊 My Grades</h1>
        <p className="page-subtitle">Track your academic progress</p>
      </div>

      {/* Summary cards */}
      <div className="stats-grid fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
        <LiquidGlass variant="elevated">
          <div className="stat-value" style={{ color: overallAvg && Number(overallAvg) >= 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {overallAvg ? `${overallAvg}%` : '—'}
          </div>
          <div className="stat-label">Overall Average</div>
        </LiquidGlass>
        <LiquidGlass>
          <div className="stat-value">{grades.length}</div>
          <div className="stat-label">Submitted</div>
        </LiquidGlass>
        <LiquidGlass>
          <div className="stat-value">{gradedItems.length}</div>
          <div className="stat-label">Graded</div>
        </LiquidGlass>
        <LiquidGlass>
          <div className="stat-value">{grades.length - gradedItems.length}</div>
          <div className="stat-label">Pending</div>
        </LiquidGlass>
      </div>

      {/* Per-course breakdown */}
      {courseAverages.length > 0 && (
        <>
          <h2 className="section-title fade-in-up">Course Breakdown</h2>
          <div className="stats-grid fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
            {courseAverages.map(c => (
              <LiquidGlass
                key={c.id}
                onClick={() => setSelectedCourse(selectedCourse === String(c.id) ? 'all' : String(c.id))}
                style={{ cursor: 'pointer', border: selectedCourse === String(c.id) ? '2px solid var(--color-primary)' : undefined }}
              >
                <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--font-size-md)' }}>📚 {c.title}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {c.submitted}/{c.total} submitted · {c.graded} graded
                    </div>
                  </div>
                  <div className={`grade-badge ${
                    c.avg && Number(c.avg) >= 80 ? 'grade-badge-high' :
                    c.avg && Number(c.avg) >= 50 ? 'grade-badge-mid' :
                    c.avg ? 'grade-badge-low' : ''
                  }`} style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700' }}>
                    {c.avg ? `${c.avg}%` : '—'}
                  </div>
                </div>
                {/* Progress bar */}
                {c.total > 0 && (
                  <div className="progress-bar" style={{ marginTop: 'var(--space-sm)' }}>
                    <div className="progress-fill" style={{ width: `${(c.submitted / c.total) * 100}%` }} />
                  </div>
                )}
              </LiquidGlass>
            ))}
          </div>
        </>
      )}

      {/* Filter */}
      <div className="page-actions fade-in-up">
        <select className="input" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} style={{ maxWidth: '300px' }}>
          <option value="all">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Detailed grade list */}
      <div className="fade-in-up">
        {filteredGrades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No grades yet</div>
            <div className="empty-state-text">Submit your work to see grades here</div>
          </div>
        ) : (
          <LiquidGlass style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map(g => (
                  <tr key={g.id}>
                    <td><strong>{g.work_title}</strong></td>
                    <td className="text-muted">{g.course_title || '—'}</td>
                    <td>
                      <span className="badge">{g.work_type}</span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(g.submitted_at)}
                    </td>
                    <td>
                      {g.score !== null ? (
                        <span className={`grade-badge ${
                          (g.score / (g.max_score || 100)) >= 0.8 ? 'grade-badge-high' :
                          (g.score / (g.max_score || 100)) >= 0.5 ? 'grade-badge-mid' :
                          'grade-badge-low'
                        }`}>
                          {g.score}/{g.max_score || 100}
                        </span>
                      ) : (
                        <span className="grade-badge grade-badge-pending">Pending</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: 'var(--font-size-sm)' }}>
                      {g.feedback || <span className="text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LiquidGlass>
        )}
      </div>
    </div>
  );
}
