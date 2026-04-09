import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function Gradebook() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editFeedback, setEditFeedback] = useState('');

  const fetchGrades = useCallback(async () => {
    try {
      const res = await fetch('/api/grades');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const handleGradeUpdate = async (submissionId) => {
    try {
      await fetch(`/api/grades/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: editValue, feedback: editFeedback }),
      });
      setEditingCell(null);
      fetchGrades();
    } catch (err) {
      console.error('Failed to update grade:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">Gradebook</h1>
        </div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  const { courses, students, workItems, submissions, enrollments } = data;

  // Filter work items by selected course
  const filteredWork = selectedCourse === 'all'
    ? workItems
    : workItems.filter(w => w.course_id === Number(selectedCourse));

  // Get submission for a specific student + work item
  const getSubmission = (studentId, workId) => {
    return submissions.find(s => s.user_id === studentId && s.work_item_id === workId);
  };

  // Check if student is enrolled in the work item's course
  const isEnrolled = (studentId, courseId) => {
    return enrollments.some(e => e.user_id === studentId && e.course_id === courseId);
  };

  // Calculate student average
  const getStudentAvg = (studentId) => {
    const studentSubs = submissions.filter(s => s.user_id === studentId && s.score !== null);
    if (studentSubs.length === 0) return null;
    const totalPercent = studentSubs.reduce((acc, s) => {
      const work = workItems.find(w => w.id === s.work_item_id);
      return acc + (s.score / (work?.max_score || 100)) * 100;
    }, 0);
    return (totalPercent / studentSubs.length).toFixed(1);
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">📝 Gradebook</h1>
        <p className="page-subtitle">Review and grade student submissions across all courses</p>
      </div>

      {/* Filters */}
      <div className="page-actions fade-in-up">
        <select
          className="input"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          style={{ maxWidth: '300px' }}
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Gradebook Table */}
      <LiquidGlass className="fade-in-up" style={{ marginTop: 'var(--space-lg)', overflow: 'auto' }}>
        <div className="gradebook-scroll">
          <table className="data-table gradebook-table">
            <thead>
              <tr>
                <th className="sticky-col">Student</th>
                {filteredWork.map(w => (
                  <th key={w.id} title={w.course_title}>
                    <div className="gradebook-col-header">
                      <span className="gradebook-work-title">{w.title}</span>
                      <span className="gradebook-work-meta">{w.type} · /{w.max_score}</span>
                    </div>
                  </th>
                ))}
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td className="sticky-col">
                    <div className="gradebook-student">
                      <div className="avatar avatar-sm">{student.full_name.charAt(0)}</div>
                      <span>{student.full_name}</span>
                    </div>
                  </td>
                  {filteredWork.map(work => {
                    const sub = getSubmission(student.id, work.id);
                    const enrolled = isEnrolled(student.id, work.course_id);
                    const cellKey = `${student.id}-${work.id}`;
                    const isEditing = editingCell === cellKey;

                    if (!enrolled) {
                      return <td key={work.id} className="grade-cell grade-na">—</td>;
                    }

                    if (!sub) {
                      return (
                        <td key={work.id} className="grade-cell grade-missing">
                          <span className="grade-badge grade-badge-missing">No sub</span>
                        </td>
                      );
                    }

                    if (isEditing) {
                      return (
                        <td key={work.id} className="grade-cell grade-editing">
                          <div className="grade-edit-inline">
                            <input
                              type="number"
                              className="input input-sm"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              max={work.max_score}
                              min={0}
                              step="0.5"
                              style={{ width: '70px' }}
                              autoFocus
                            />
                            <input
                              type="text"
                              className="input input-sm"
                              placeholder="Feedback..."
                              value={editFeedback}
                              onChange={e => setEditFeedback(e.target.value)}
                              style={{ width: '120px' }}
                            />
                            <button className="btn btn-primary btn-xs" onClick={() => handleGradeUpdate(sub.id)}>✓</button>
                            <button className="btn btn-ghost btn-xs" onClick={() => setEditingCell(null)}>✕</button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={work.id}
                        className={`grade-cell ${sub.score !== null ? 'grade-graded' : 'grade-pending'}`}
                        onClick={() => {
                          setEditingCell(cellKey);
                          setEditValue(sub.score !== null ? sub.score : '');
                          setEditFeedback(sub.feedback || '');
                        }}
                        title={sub.feedback ? `Feedback: ${sub.feedback}` : 'Click to grade'}
                      >
                        {sub.score !== null ? (
                          <span className={`grade-badge ${
                            (sub.score / work.max_score) >= 0.8 ? 'grade-badge-high' :
                            (sub.score / work.max_score) >= 0.5 ? 'grade-badge-mid' :
                            'grade-badge-low'
                          }`}>
                            {sub.score}/{work.max_score}
                          </span>
                        ) : (
                          <span className="grade-badge grade-badge-pending">Pending</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="grade-cell">
                    {(() => {
                      const avg = getStudentAvg(student.id);
                      if (!avg) return <span className="text-muted">—</span>;
                      return (
                        <span className={`grade-badge ${
                          Number(avg) >= 80 ? 'grade-badge-high' :
                          Number(avg) >= 50 ? 'grade-badge-mid' :
                          'grade-badge-low'
                        }`}>
                          {avg}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No students yet</div>
            <div className="empty-state-text">Grades will appear here once students submit work</div>
          </div>
        )}
      </LiquidGlass>
    </div>
  );
}
