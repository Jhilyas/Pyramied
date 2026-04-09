import { useState, useEffect, useRef } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';

const FILE_ICONS = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-powerpoint': '📙',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📙',
  'application/vnd.ms-excel': '📗',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'video/mp4': '🎬',
  'audio/mpeg': '🎵',
  'application/zip': '📦',
  'text/plain': '📄',
};

function getFileIcon(type) {
  return FILE_ICONS[type] || '📎';
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function WorkManager() {
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewsPanel, setShowViewsPanel] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [views, setViews] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [viewStats, setViewStats] = useState({ totalEnrolled: 0, totalViewed: 0 });
  const [form, setForm] = useState({
    title: '', description: '', course_id: '', type: 'assignment', due_date: '', is_published: false,
  });
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadItems();
    loadCourses();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.get('/work');
      setItems(data.items.filter(item => item.type !== 'lesson'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', course_id: '', type: 'assignment', due_date: '', is_published: false });
    setFiles([]);
    setExistingAttachments([]);
    setError('');
    setShowModal(true);
  };

  const openEdit = async (item) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      course_id: item.course_id || '',
      type: item.type || 'assignment',
      due_date: item.due_date ? item.due_date.slice(0, 16) : '',
      is_published: !!item.is_published,
    });
    setFiles([]);
    setError('');
    // Load existing attachments
    try {
      const data = await api.get(`/work/${item.id}`);
      setExistingAttachments(data.attachments || []);
    } catch {
      setExistingAttachments([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      if (form.course_id) formData.append('course_id', form.course_id);
      formData.append('type', form.type);
      if (form.due_date) formData.append('due_date', form.due_date);
      formData.append('is_published', form.is_published ? '1' : '0');

      for (const f of files) {
        formData.append('files', f);
      }

      if (editItem) {
        await api.upload(`/work/${editItem.id}`, formData, 'PUT');
      } else {
        await api.upload('/work', formData);
      }

      setShowModal(false);
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Override api.upload to use PUT for edits
  const uploadWork = async (url, formData, method = 'POST') => {
    const res = await fetch(`/api${url}`, { method, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  };

  const togglePublish = async (item) => {
    try {
      const formData = new FormData();
      formData.append('is_published', item.is_published ? '0' : '1');
      await uploadWork(`/work/${item.id}`, formData, 'PUT');
      loadItems();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/work/${item.id}`);
      loadItems();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAttachment = async (workId, attachId) => {
    try {
      await api.delete(`/work/${workId}/attachment/${attachId}`);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachId));
    } catch (err) {
      console.error(err);
    }
  };

  const openViews = async (item) => {
    setShowViewsPanel(item);
    try {
      const data = await api.get(`/work/${item.id}/views`);
      setViews(data.views);
      setViewStats({ totalEnrolled: data.totalEnrolled, totalViewed: data.totalViewed });
    } catch (err) {
      console.error(err);
    }
  };

  const openSubmissions = async (item) => {
    setShowSubmissions(item);
    try {
      const data = await api.get(`/work/${item.id}/submissions`);
      setSubmissions(data.submissions);
    } catch (err) {
      console.error(err);
    }
  };

  const gradeSubmission = async (subId, score, feedback) => {
    try {
      await api.put(`/work/${showSubmissions.id}/submissions/${subId}/grade`, { score, feedback });
      const data = await api.get(`/work/${showSubmissions.id}/submissions`);
      setSubmissions(data.submissions);
    } catch (err) {
      console.error(err);
    }
  };

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'assignment': return { className: 'badge-info', label: '📝 Assignment' };
      case 'resource': return { className: 'badge-success', label: '📚 Resource' };
      case 'reading': return { className: 'badge-warning', label: '📖 Reading' };
      default: return { className: 'badge-neutral', label: type };
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Work Manager</h1>
          <p className="page-subtitle">Create, publish, and track student work</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-create-work">
          + New Work
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
      ) : items.length === 0 ? (
        <LiquidGlass variant="solid">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No work items yet</div>
            <div className="empty-state-text">Create your first assignment or resource for your students.</div>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }} onClick={openCreate}>
              Create Work
            </button>
          </div>
        </LiquidGlass>
      ) : (
        <div className="grid grid-3 stagger-children">
          {items.map((item) => {
            const badge = getTypeBadge(item.type);
            return (
              <LiquidGlass key={item.id} variant="elevated" interactive>
                <div style={{ padding: 'var(--space-lg)' }}>
                  {/* Header badges */}
                  <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className={`badge ${item.is_published ? 'badge-success' : 'badge-neutral'}`}>
                      {item.is_published ? '🟢 Published' : '⚪ Draft'}
                    </span>
                    <span className={`badge ${badge.className}`}>{badge.label}</span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                    {item.title}
                  </h3>

                  {/* Course */}
                  {item.course_title && (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-dark)', marginBottom: 'var(--space-xs)' }}>
                      📚 {item.course_title}
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-muted truncate" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                    {item.description || 'No description'}
                  </p>

                  {/* Stats row */}
                  <div className="flex gap-md" style={{ marginBottom: 'var(--space-md)' }}>
                    <span className="work-stat" onClick={(e) => { e.stopPropagation(); openViews(item); }} title="View analytics">
                      👁️ {item.view_count || 0} views
                    </span>
                    <span className="work-stat" onClick={(e) => { e.stopPropagation(); openSubmissions(item); }} title="Submissions">
                      📄 {item.submission_count || 0} submitted
                    </span>
                    {item.attachment_count > 0 && (
                      <span className="work-stat-muted">📎 {item.attachment_count} files</span>
                    )}
                  </div>

                  {/* Due date */}
                  {item.due_date && (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                      ⏰ Due: {new Date(item.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-xs" style={{ marginTop: 'auto' }}>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); togglePublish(item); }}>
                      {item.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={(e) => { e.stopPropagation(); deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </LiquidGlass>
            );
          })}
        </div>
      )}

      {/* ========== CREATE / EDIT MODAL ========== */}
      {showModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content liquid-glass-modal" style={{ padding: 'var(--space-xl)', maxWidth: 640 }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
              {editItem ? 'Edit Work' : 'Create Work'}
            </h2>
            {error && <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-md">
              <div className="input-group">
                <label className="input-label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Week 3 — Essay on Photosynthesis" />
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Instructions for students..." />
              </div>

              <div className="flex gap-md">
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Course</label>
                  <select className="input select" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                    <option value="">— No course —</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Type</label>
                  <select className="input select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="assignment">📝 Assignment</option>
                    <option value="resource">📚 Resource</option>
                    <option value="reading">📖 Reading</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-md">
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Due Date (optional)</label>
                  <input className="input" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="input-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <label className="checkbox-wrapper" style={{ paddingBottom: 10 }}>
                    <div className={`checkbox ${form.is_published ? 'checked' : ''}`} onClick={() => setForm({ ...form, is_published: !form.is_published })}>
                      {form.is_published && '✓'}
                    </div>
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Publish immediately</span>
                  </label>
                </div>
              </div>

              {/* Existing attachments (edit mode) */}
              {existingAttachments.length > 0 && (
                <div>
                  <label className="input-label" style={{ marginBottom: 8 }}>Current Attachments</label>
                  <div className="file-list">
                    {existingAttachments.map((a) => (
                      <div key={a.id} className="file-item">
                        <span className="file-item-icon">{getFileIcon(a.file_type)}</span>
                        <span className="file-item-name">{a.file_name}</span>
                        <span className="file-item-size">{formatBytes(a.file_size)}</span>
                        <button type="button" className="file-item-remove" onClick={() => deleteAttachment(editItem.id, a.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File upload zone */}
              <div>
                <label className="input-label" style={{ marginBottom: 8 }}>
                  {editItem ? 'Add More Files' : 'Attach Files'} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(PDF, Word, PowerPoint, Excel, Images, etc.)</span>
                </label>
                <div
                  className={`upload-zone ${dragOver ? 'upload-zone-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-zone-icon">📂</div>
                  <div className="upload-zone-text">Drop files here or click to browse</div>
                  <div className="upload-zone-hint">Max 100MB per file</div>
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])} />
                </div>

                {/* New files preview */}
                {files.length > 0 && (
                  <div className="file-list" style={{ marginTop: 8 }}>
                    {files.map((f, i) => (
                      <div key={i} className="file-item">
                        <span className="file-item-icon">{getFileIcon(f.type)}</span>
                        <span className="file-item-name">{f.name}</span>
                        <span className="file-item-size">{formatBytes(f.size)}</span>
                        <button type="button" className="file-item-remove" onClick={() => removeFile(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                  {uploading ? <span className="spinner spinner-sm" /> : (editItem ? 'Save Changes' : 'Create Work')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ========== VIEW ANALYTICS PANEL ========== */}
      {showViewsPanel && (
        <>
          <div className="modal-backdrop" onClick={() => setShowViewsPanel(null)} />
          <div className="modal-content liquid-glass-modal" style={{ padding: 'var(--space-xl)', maxWidth: 600 }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
              👁️ View Analytics
            </h2>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
              {showViewsPanel.title}
            </p>

            {/* Stats bar */}
            <div className="flex gap-lg" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="view-stat-box">
                <div className="view-stat-value">{viewStats.totalViewed}</div>
                <div className="view-stat-label">Viewed</div>
              </div>
              <div className="view-stat-box">
                <div className="view-stat-value">{viewStats.totalEnrolled}</div>
                <div className="view-stat-label">Enrolled</div>
              </div>
              <div className="view-stat-box">
                <div className="view-stat-value">{viewStats.totalEnrolled > 0 ? Math.round((viewStats.totalViewed / viewStats.totalEnrolled) * 100) : 0}%</div>
                <div className="view-stat-label">Reach</div>
              </div>
            </div>

            {views.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <div className="empty-state-icon">👀</div>
                <div className="empty-state-title">No views yet</div>
                <div className="empty-state-text">No students have viewed this work item yet.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Views</th>
                    <th>First Viewed</th>
                    <th>Last Viewed</th>
                  </tr>
                </thead>
                <tbody>
                  {views.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="avatar avatar-sm">{v.full_name?.charAt(0)}</div>
                          {v.full_name}
                        </div>
                      </td>
                      <td><span className="badge badge-info">{v.view_count}×</span></td>
                      <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {new Date(v.first_viewed_at).toLocaleString()}
                      </td>
                      <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {new Date(v.last_viewed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-lg)' }} onClick={() => setShowViewsPanel(null)}>Close</button>
          </div>
        </>
      )}

      {/* ========== SUBMISSIONS PANEL ========== */}
      {showSubmissions && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSubmissions(null)} />
          <div className="modal-content liquid-glass-modal" style={{ padding: 'var(--space-xl)', maxWidth: 700 }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
              📄 Submissions
            </h2>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
              {showSubmissions.title}
            </p>

            {submissions.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No submissions yet</div>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {submissions.map((s) => (
                  <LiquidGlass key={s.id} variant="elevated">
                    <div style={{ padding: 'var(--space-md)' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-sm)' }}>
                        <div className="flex items-center gap-sm">
                          <div className="avatar avatar-sm">{s.full_name?.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                              Submitted {new Date(s.submitted_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {s.score !== null && s.score !== undefined ? (
                          <span className="badge badge-success">Score: {s.score}</span>
                        ) : (
                          <span className="badge badge-warning">Ungraded</span>
                        )}
                      </div>

                      {s.content && <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}>{s.content}</p>}

                      {s.file_path && (
                        <a href={s.file_path} download={s.file_name} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>
                          📎 {s.file_name || 'Download file'}
                        </a>
                      )}

                      {/* Quick grade */}
                      <div className="flex gap-sm items-center" style={{ marginTop: 'var(--space-sm)' }}>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Score"
                          defaultValue={s.score ?? ''}
                          style={{ width: 80 }}
                          id={`score-${s.id}`}
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Quick feedback..."
                          defaultValue={s.feedback ?? ''}
                          style={{ flex: 1 }}
                          id={`feedback-${s.id}`}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const score = document.getElementById(`score-${s.id}`).value;
                            const feedback = document.getElementById(`feedback-${s.id}`).value;
                            gradeSubmission(s.id, score, feedback);
                          }}
                        >
                          Grade
                        </button>
                      </div>
                    </div>
                  </LiquidGlass>
                ))}
              </div>
            )}

            <button className="btn btn-secondary w-full" style={{ marginTop: 'var(--space-lg)' }} onClick={() => setShowSubmissions(null)}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}
