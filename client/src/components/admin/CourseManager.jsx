import { useState, useEffect } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';
import CourseLessonBuilder from './CourseLessonBuilder';

export default function CourseManager({ onOpenCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', format: 'topics' });
  const [error, setError] = useState('');
  const [managingLessonsFor, setManagingLessonsFor] = useState(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditCourse(null);
    setForm({ title: '', description: '', format: 'topics' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditCourse(c);
    setForm({ title: c.title, description: c.description || '', format: c.format || 'topics' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editCourse) {
        await api.put(`/courses/${editCourse.id}`, form);
      } else {
        await api.post('/courses', form);
      }
      setShowModal(false);
      loadCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVisibility = async (c) => {
    try {
      await api.put(`/courses/${c.id}`, { ...c, is_visible: !c.is_visible });
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCourse = async (c) => {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/courses/${c.id}`);
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  };

  if (managingLessonsFor) {
    return <CourseLessonBuilder course={managingLessonsFor} onBack={() => setManagingLessonsFor(null)} />;
  }

  return (
    <div className="page-enter">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">Create and manage your courses</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-create-course">
          + New Course
        </button>
      </div>

      {loading ? (
        <div className="grid grid-3 stagger-children">
          {[1, 2, 3].map((i) => (
            <LiquidGlass key={i} variant="elevated">
              <div style={{ padding: 'var(--space-lg)' }}>
                <div className="skeleton" style={{ width: '80%', height: 24 }} />
                <div className="skeleton" style={{ width: '60%', height: 14, marginTop: 12 }} />
                <div className="skeleton" style={{ width: '40%', height: 14, marginTop: 8 }} />
              </div>
            </LiquidGlass>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <LiquidGlass variant="solid">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-title">No courses yet</div>
            <div className="empty-state-text">Create your first course to start building content.</div>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }} onClick={openCreate}>
              Create Course
            </button>
          </div>
        </LiquidGlass>
      ) : (
        <div className="grid grid-3 stagger-children">
          {courses.map((c) => (
            <LiquidGlass key={c.id} variant="elevated" interactive onClick={() => onOpenCourse && onOpenCourse(c)}>
              <div style={{ padding: 'var(--space-lg)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className={`badge ${c.is_visible ? 'badge-success' : 'badge-neutral'}`}>
                    {c.is_visible ? 'Published' : 'Hidden'}
                  </span>
                  <span className="badge badge-neutral">{c.format}</span>
                </div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                  {c.title}
                </h3>
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                  {c.description || 'No description'}
                </p>
                <div className="flex gap-xs" style={{ marginTop: 'auto' }}>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setManagingLessonsFor(c); }}>📚 Build Lessons</button>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); toggleVisibility(c); }}>
                    {c.is_visible ? 'Hide' : 'Show'}
                  </button>
                  <button className="btn btn-ghost btn-sm text-danger" onClick={(e) => { e.stopPropagation(); deleteCourse(c); }}>Delete</button>
                </div>
              </div>
            </LiquidGlass>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content liquid-glass-modal" style={{ padding: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
              {editCourse ? 'Edit Course' : 'Create Course'}
            </h2>
            {error && <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-md">
              <div className="input-group">
                <label className="input-label">Course Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Introduction to Computer Science" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief course description..." />
              </div>
              <div className="input-group">
                <label className="input-label">Format</label>
                <select className="input select" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                  <option value="topics">Topics</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="flex gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editCourse ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
