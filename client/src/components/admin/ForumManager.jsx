import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function ForumManager() {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedForum, setSelectedForum] = useState(null);
  const [threads, setThreads] = useState([]);
  const [forumInfo, setForumInfo] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [courses, setCourses] = useState([]);

  // Create form
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCourse, setCreateCourse] = useState('');

  const fetchForums = useCallback(async () => {
    try {
      const res = await fetch('/api/forums');
      const json = await res.json();
      setForums(json.forums);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      const json = await res.json();
      setCourses(json.courses);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchForums(); fetchCourses(); }, [fetchForums, fetchCourses]);

  const openForum = async (forumId) => {
    setSelectedForum(forumId);
    try {
      const res = await fetch(`/api/forums/${forumId}/posts`);
      const json = await res.json();
      setThreads(json.threads);
      setForumInfo(json.forum);
    } catch (err) { console.error(err); }
  };

  const createForum = async () => {
    if (!createTitle.trim()) return;
    try {
      await fetch('/api/forums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle,
          description: createDesc,
          course_id: createCourse || null,
        }),
      });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateCourse('');
      fetchForums();
    } catch (err) { console.error(err); }
  };

  const deleteForum = async (id) => {
    if (!confirm('Delete this forum and all posts?')) return;
    await fetch(`/api/forums/${id}`, { method: 'DELETE' });
    fetchForums();
    if (selectedForum === id) { setSelectedForum(null); setThreads([]); }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    await fetch(`/api/forums/${selectedForum}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPost }),
    });
    setNewPost('');
    openForum(selectedForum);
  };

  const replyToPost = async (parentId) => {
    if (!replyContent.trim()) return;
    await fetch(`/api/forums/${selectedForum}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent, parent_id: parentId }),
    });
    setReplyTo(null);
    setReplyContent('');
    openForum(selectedForum);
  };

  const deletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/forums/${selectedForum}/posts/${postId}`, { method: 'DELETE' });
    openForum(selectedForum);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Forums</h1></div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  // Forum thread view
  if (selectedForum) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => { setSelectedForum(null); setThreads([]); }}>
            ← Back to Forums
          </button>
          <h1 className="page-title">💬 {forumInfo?.title}</h1>
          <p className="page-subtitle">{forumInfo?.description || 'Discussion forum'}</p>
        </div>

        {/* New topic */}
        <LiquidGlass className="fade-in-up" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>New Topic</h3>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <textarea
              className="input"
              placeholder="Start a new discussion..."
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              rows={2}
              style={{ flex: 1, resize: 'vertical' }}
            />
            <button className="btn btn-primary" onClick={createPost} disabled={!newPost.trim()}>Post</button>
          </div>
        </LiquidGlass>

        {/* Threads */}
        {threads.length === 0 ? (
          <div className="empty-state fade-in-up">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No discussions yet</div>
            <div className="empty-state-text">Start the first topic above</div>
          </div>
        ) : (
          <div className="forum-threads">
            {threads.map(thread => (
              <LiquidGlass key={thread.id} className="forum-thread fade-in-up" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="forum-post-main">
                  <div className="forum-post-header">
                    <div className="avatar avatar-sm">{thread.full_name?.charAt(0)}</div>
                    <div>
                      <strong>{thread.full_name}</strong>
                      <span className="text-muted" style={{ marginLeft: 'var(--space-xs)', fontSize: 'var(--font-size-xs)' }}>
                        @{thread.username} · {formatDate(thread.created_at)}
                      </span>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => deletePost(thread.id)} style={{ marginLeft: 'auto' }}>🗑️</button>
                  </div>
                  <div className="forum-post-content">{thread.content}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setReplyTo(replyTo === thread.id ? null : thread.id)}
                  >
                    💬 Reply ({thread.replies?.length || 0})
                  </button>
                </div>

                {/* Replies */}
                {thread.replies && thread.replies.length > 0 && (
                  <div className="forum-replies">
                    {thread.replies.map(reply => (
                      <div key={reply.id} className="forum-reply">
                        <div className="forum-post-header">
                          <div className="avatar avatar-xs">{reply.full_name?.charAt(0)}</div>
                          <strong style={{ fontSize: 'var(--font-size-sm)' }}>{reply.full_name}</strong>
                          <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {formatDate(reply.created_at)}
                          </span>
                          <button className="btn btn-ghost btn-xs" onClick={() => deletePost(reply.id)} style={{ marginLeft: 'auto' }}>🗑️</button>
                        </div>
                        <div className="forum-post-content" style={{ fontSize: 'var(--font-size-sm)' }}>{reply.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {replyTo === thread.id && (
                  <div className="forum-reply-form">
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)' }}>
                      <input
                        className="input input-sm"
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        style={{ flex: 1 }}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && replyToPost(thread.id)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => replyToPost(thread.id)}>Reply</button>
                    </div>
                  </div>
                )}
              </LiquidGlass>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Forum list view
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">💬 Forums</h1>
        <p className="page-subtitle">Manage discussion forums across courses</p>
      </div>

      <div className="page-actions fade-in-up">
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Cancel' : '+ New Forum'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <LiquidGlass className="fade-in-up" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Forum Title</label>
              <input className="input" placeholder="e.g. General Discussion" value={createTitle} onChange={e => setCreateTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Course (optional)</label>
              <select className="input" value={createCourse} onChange={e => setCreateCourse(e.target.value)}>
                <option value="">Global (no course)</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} placeholder="What is this forum about?" value={createDesc} onChange={e => setCreateDesc(e.target.value)} />
            </div>
            <div>
              <button className="btn btn-primary" onClick={createForum}>Create Forum</button>
            </div>
          </div>
        </LiquidGlass>
      )}

      {/* Forums list */}
      <div className="stats-grid fade-in-up">
        {forums.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No forums yet</div>
            <div className="empty-state-text">Create your first discussion forum</div>
          </div>
        ) : forums.map(forum => (
          <LiquidGlass key={forum.id} className="forum-card" onClick={() => openForum(forum.id)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{forum.title}</h3>
                {forum.course_title && (
                  <span className="badge badge-primary" style={{ marginTop: 'var(--space-xs)' }}>{forum.course_title}</span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteForum(forum.id); }}>🗑️</button>
            </div>
            {forum.description && <p className="text-muted" style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--font-size-sm)' }}>{forum.description}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <span>📝 {forum.topic_count || 0} topics</span>
              <span>💬 {forum.post_count || 0} posts</span>
              {forum.last_post_at && <span>🕒 Last: {formatDate(forum.last_post_at)}</span>}
            </div>
          </LiquidGlass>
        ))}
      </div>
    </div>
  );
}
