import { useState, useEffect, useRef } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

const FILE_ICONS = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-powerpoint': '📙',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📙',
  'application/vnd.ms-excel': '📗',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
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

function getDueSeverity(dateStr) {
  if (!dateStr) return 'none';
  const due = new Date(dateStr);
  const now = new Date();
  const diff = (due - now) / (1000 * 60 * 60);
  if (diff < 0) return 'overdue';
  if (diff < 24) return 'urgent';
  if (diff < 72) return 'soon';
  return 'normal';
}

export default function WorkList() {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      loadItems();
    };
    socket.on('content:updated', handleUpdate);
    return () => socket.off('content:updated', handleUpdate);
  }, [socket]);

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

  const openWork = async (item) => {
    setOpenItem(item);
    setSubmitText('');
    setSubmitFile(null);
    setSubmitSuccess('');
    setSubmitError('');

    // Record view
    try {
      await api.post(`/work/${item.id}/view`);
    } catch {
      // ignore
    }

    // Emit socket event for live monitoring
    if (socket) {
      socket.emit('student:viewing_work', { workId: item.id, workTitle: item.title });
    }

    // Load details
    try {
      const data = await api.get(`/work/${item.id}`);
      setAttachments(data.attachments || []);
      setSubmission(data.submission);
    } catch (err) {
      console.error(err);
    }
  };

  const closeWork = () => {
    setOpenItem(null);
    setAttachments([]);
    setSubmission(null);

    // Clear viewing status
    if (socket) {
      socket.emit('student:viewing_work', { workId: null, workTitle: null, currentPage: 'My Work' });
    }

    // Refresh list to update view counts
    loadItems();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (submitText) formData.append('content', submitText);
      if (submitFile) formData.append('file', submitFile);

      await api.upload(`/work/${openItem.id}/submit`, formData);
      setSubmitSuccess('Work submitted successfully! 🎉');
      setSubmission({ submitted_at: new Date().toISOString() });

      // Refresh
      const data = await api.get(`/work/${openItem.id}`);
      setSubmission(data.submission);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'assignment': return { className: 'badge-info', label: '📝 Assignment' };
      case 'resource': return { className: 'badge-success', label: '📚 Resource' };
      case 'reading': return { className: 'badge-warning', label: '📖 Reading' };
      default: return { className: 'badge-neutral', label: type };
    }
  };

  const getDueBadge = (dateStr) => {
    const severity = getDueSeverity(dateStr);
    switch (severity) {
      case 'overdue': return { className: 'badge-danger', label: '⚠️ Overdue' };
      case 'urgent': return { className: 'badge-danger', label: '🔥 Due soon' };
      case 'soon': return { className: 'badge-warning', label: '⏰ Due in < 3 days' };
      case 'normal': return { className: 'badge-neutral', label: `📅 ${new Date(dateStr).toLocaleDateString()}` };
      default: return null;
    }
  };

  // ========== DETAIL VIEW ==========
  if (openItem) {
    const dueBadge = openItem.due_date ? getDueBadge(openItem.due_date) : null;
    const typeBadge = getTypeBadge(openItem.type);

    return (
      <div className="page-enter">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={closeWork} style={{ marginBottom: 'var(--space-md)' }}>
            ← Back to Work
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="page-title">{openItem.title}</h1>
              {openItem.course_title && (
                <p className="page-subtitle">📚 {openItem.course_title}</p>
              )}
            </div>
            <div className="flex gap-sm">
              <span className={`badge ${typeBadge.className}`}>{typeBadge.label}</span>
              {dueBadge && <span className={`badge ${dueBadge.className}`}>{dueBadge.label}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Main content */}
          <div className="flex flex-col gap-lg">
            {/* Description */}
            <LiquidGlass variant="solid">
              <div style={{ padding: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                  📋 Instructions
                </h3>
                <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-relaxed)', whiteSpace: 'pre-wrap' }}>
                  {openItem.description || 'No instructions provided.'}
                </div>
              </div>
            </LiquidGlass>

            {/* Attachments */}
            {attachments.length > 0 && (
              <LiquidGlass variant="elevated">
                <div style={{ padding: 'var(--space-lg)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                    📎 Attached Files
                  </h3>
                  <div className="file-list">
                    {attachments.map((a) => (
                      <a key={a.id} href={a.file_path} download={a.file_name} className="file-item file-item-download">
                        <span className="file-item-icon">{getFileIcon(a.file_type)}</span>
                        <span className="file-item-name">{a.file_name}</span>
                        <span className="file-item-size">{formatBytes(a.file_size)}</span>
                        <span className="file-item-action">⬇️</span>
                      </a>
                    ))}
                  </div>
                </div>
              </LiquidGlass>
            )}
          </div>

          {/* Sidebar — Submission */}
          <div className="flex flex-col gap-lg">
            <LiquidGlass variant="elevated" className="liquid-glass-green">
              <div style={{ padding: 'var(--space-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                  ✍️ Your Submission
                </h3>

                {submission ? (
                  <div>
                    <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-md)' }}>
                      <span className="badge badge-success">✅ Submitted</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </div>

                    {submission.content && (
                      <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)', whiteSpace: 'pre-wrap' }}>
                        {submission.content}
                      </p>
                    )}

                    {submission.file_name && (
                      <a href={submission.file_path} download={submission.file_name} className="btn btn-ghost btn-sm">
                        📎 {submission.file_name}
                      </a>
                    )}

                    {submission.score !== null && submission.score !== undefined && (
                      <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', color: 'var(--color-success)' }}>
                          Score: {submission.score}/100
                        </div>
                        {submission.feedback && (
                          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)', color: 'var(--color-text-secondary)' }}>
                            {submission.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : openItem.type === 'assignment' ? (
                  <form onSubmit={handleSubmit}>
                    {submitError && <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>{submitError}</div>}
                    {submitSuccess && <div style={{ padding: '10px 14px', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>{submitSuccess}</div>}

                    <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                      <label className="input-label">Your Answer</label>
                      <textarea
                        className="input textarea"
                        placeholder="Type your answer..."
                        value={submitText}
                        onChange={(e) => setSubmitText(e.target.value)}
                        style={{ minHeight: 120 }}
                      />
                    </div>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <label className="input-label" style={{ marginBottom: 8 }}>Attach File (optional)</label>
                      <div
                        className="upload-zone upload-zone-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {submitFile ? (
                          <div className="flex items-center gap-sm">
                            <span>📎</span>
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{submitFile.name}</span>
                            <button type="button" className="file-item-remove" onClick={(e) => { e.stopPropagation(); setSubmitFile(null); }}>✕</button>
                          </div>
                        ) : (
                          <div className="upload-zone-text" style={{ fontSize: 'var(--font-size-xs)' }}>Click to attach a file</div>
                        )}
                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => setSubmitFile(e.target.files[0])} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={submitting || (!submitText && !submitFile)}>
                      {submitting ? <span className="spinner spinner-sm" /> : '📤 Submit Work'}
                    </button>
                  </form>
                ) : (
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                    This is a resource—no submission required.
                  </p>
                )}
              </div>
            </LiquidGlass>

            {/* Due date info */}
            {openItem.due_date && (
              <LiquidGlass variant="elevated">
                <div style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Due Date</div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                    {new Date(openItem.due_date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {new Date(openItem.due_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </LiquidGlass>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== LIST VIEW ==========
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">My Work</h1>
        <p className="page-subtitle">Assignments, resources, and readings from your courses</p>
      </div>

      {loading ? (
        <div className="grid grid-2 stagger-children">
          {[1, 2, 3, 4].map((i) => (
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
            <div className="empty-state-title">No work assigned yet</div>
            <div className="empty-state-text">Your supervisor hasn't published any work yet. Check back later!</div>
          </div>
        </LiquidGlass>
      ) : (
        <div className="grid grid-2 stagger-children">
          {items.map((item) => {
            const typeBadge = getTypeBadge(item.type);
            const dueBadge = item.due_date ? getDueBadge(item.due_date) : null;
            const hasSubmitted = !!item.submission_id;
            const isGraded = item.score !== null && item.score !== undefined;

            return (
              <LiquidGlass key={item.id} variant="elevated" interactive onClick={() => openWork(item)}>
                <div style={{ padding: 'var(--space-lg)' }}>
                  {/* Top badges */}
                  <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className={`badge ${typeBadge.className}`}>{typeBadge.label}</span>
                    <div className="flex gap-xs">
                      {hasSubmitted && (
                        <span className={`badge ${isGraded ? 'badge-success' : 'badge-info'}`}>
                          {isGraded ? `✅ ${item.score}/100` : '📤 Submitted'}
                        </span>
                      )}
                      {dueBadge && <span className={`badge ${dueBadge.className}`}>{dueBadge.label}</span>}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                    {item.title}
                  </h3>

                  {/* Course name */}
                  {item.course_title && (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-dark)', marginBottom: 'var(--space-xs)' }}>
                      📚 {item.course_title}
                    </p>
                  )}

                  {/* Description preview */}
                  <p className="text-muted truncate" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                    {item.description || 'No description'}
                  </p>

                  {/* Bottom info */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-sm">
                      {item.attachment_count > 0 && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          📎 {item.attachment_count} file{item.attachment_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <span className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                      Open →
                    </span>
                  </div>
                </div>
              </LiquidGlass>
            );
          })}
        </div>
      )}
    </div>
  );
}
