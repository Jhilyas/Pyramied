import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function StudentForums() {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForum, setSelectedForum] = useState(null);
  const [threads, setThreads] = useState([]);
  const [forumInfo, setForumInfo] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const { socket } = useSocket();

  const fetchForums = useCallback(async () => {
    try {
      const res = await api.get('/forums');
      // For now, students can see all published forums in this view.
      setForums(res.forums || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchForums(); }, [fetchForums]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchForums();
      if (selectedForum) {
         openForum(selectedForum, false);
      }
    };
    socket.on('content:updated', handleUpdate);
    return () => socket.off('content:updated', handleUpdate);
  }, [socket, fetchForums, selectedForum]);

  const openForum = async (forumId, setLoad=true) => {
    if (setLoad) setSelectedForum(forumId);
    try {
      const res = await api.get(`/forums/${forumId}/posts`);
      setThreads(res.threads || []);
      setForumInfo(res.forum || null);
    } catch (err) { console.error(err); }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    await api.post(`/forums/${selectedForum}/posts`, { content: newPost });
    setNewPost('');
    openForum(selectedForum, false);
  };

  const replyToPost = async (parentId) => {
    if (!replyContent.trim()) return;
    await api.post(`/forums/${selectedForum}/posts`, { content: replyContent, parent_id: parentId });
    setReplyTo(null);
    setReplyContent('');
    openForum(selectedForum, false);
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
        <h1 className="page-title">💬 Student Forums</h1>
        <p className="page-subtitle">Join discussions with your classmates</p>
      </div>

      <div className="stats-grid fade-in-up">
        {forums.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No forums available</div>
            <div className="empty-state-text">There are currently no active discussion forums.</div>
          </div>
        ) : forums.map(forum => (
          <LiquidGlass key={forum.id} className="forum-card" onClick={() => openForum(forum.id)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{forum.title}</h3>
                {forum.course_title ? (
                  <span className="badge badge-primary" style={{ marginTop: 'var(--space-xs)' }}>{forum.course_title}</span>
                ) : (
                  <span className="badge badge-info" style={{ marginTop: 'var(--space-xs)' }}>Global Discussion</span>
                )}
              </div>
            </div>
            {forum.description && <p className="text-muted" style={{ margin: 'var(--space-sm) 0 0', fontSize: 'var(--font-size-sm)' }}>{forum.description}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <span>📝 {forum.topic_count || 0} topics</span>
              <span>💬 {forum.post_count || 0} posts</span>
            </div>
          </LiquidGlass>
        ))}
      </div>
    </div>
  );
}
