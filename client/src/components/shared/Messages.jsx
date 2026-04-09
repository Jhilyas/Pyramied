import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { useAuth } from '../../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [users, setUsers] = useState([]);

  // Compose form
  const [toUser, setToUser] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const json = await res.json();
      setInbox(json.inbox);
      setSent(json.sent);
      setUnreadCount(json.unreadCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/users');
      const json = await res.json();
      setUsers(json.users);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchMessages(); fetchUsers(); }, [fetchMessages, fetchUsers]);

  const sendMessage = async () => {
    if (!toUser || !content.trim()) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: toUser, subject, content }),
      });
      setComposing(false);
      setToUser('');
      setSubject('');
      setContent('');
      fetchMessages();
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const markRead = async (msgId) => {
    await fetch(`/api/messages/${msgId}/read`, { method: 'PUT' });
    fetchMessages();
  };

  const deleteMessage = async (msgId) => {
    await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
    setSelectedMsg(null);
    fetchMessages();
  };

  const openMessage = (msg) => {
    setSelectedMsg(msg);
    if (!msg.is_read && msg.to_user_id === user?.id) {
      markRead(msg.id);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Messages</h1></div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  // Message detail view
  if (selectedMsg) {
    const isInbound = selectedMsg.to_user_id === user?.id;
    return (
      <div className="page-enter">
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => setSelectedMsg(null)}>← Back</button>
          <h1 className="page-title">{selectedMsg.subject || '(No subject)'}</h1>
        </div>
        <LiquidGlass className="fade-in-up" style={{ marginTop: 'var(--space-md)' }}>
          <div className="msg-detail-header">
            <div className="avatar">{(isInbound ? selectedMsg.from_name : selectedMsg.to_name)?.charAt(0)}</div>
            <div>
              <strong>{isInbound ? selectedMsg.from_name : selectedMsg.to_name}</strong>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                {isInbound ? 'From' : 'To'} · {formatDate(selectedMsg.created_at)}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-xs)' }}>
              {isInbound && (
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setComposing(true);
                  setSelectedMsg(null);
                  setToUser(selectedMsg.from_user_id);
                  setSubject(`Re: ${selectedMsg.subject || ''}`);
                }}>
                  ↩ Reply
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => deleteMessage(selectedMsg.id)}>🗑️</button>
            </div>
          </div>
          <div className="msg-detail-body">{selectedMsg.content}</div>
        </LiquidGlass>
      </div>
    );
  }

  const currentList = tab === 'inbox' ? inbox : sent;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">✉️ Messages</h1>
        <p className="page-subtitle">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Direct messaging'}
        </p>
      </div>

      <div className="page-actions fade-in-up">
        <button className="btn btn-primary" onClick={() => setComposing(!composing)}>
          {composing ? '✕ Cancel' : '✏️ Compose'}
        </button>
        <div className="tab-bar">
          <button className={`tab ${tab === 'inbox' ? 'tab-active' : ''}`} onClick={() => setTab('inbox')}>
            Inbox {unreadCount > 0 && <span className="badge badge-danger">{unreadCount}</span>}
          </button>
          <button className={`tab ${tab === 'sent' ? 'tab-active' : ''}`} onClick={() => setTab('sent')}>
            Sent
          </button>
        </div>
      </div>

      {/* Compose */}
      {composing && (
        <LiquidGlass className="fade-in-up" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: 'var(--font-size-md)' }}>New Message</h3>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">To</label>
              <select className="input" value={toUser} onChange={e => setToUser(e.target.value)}>
                <option value="">Select recipient...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} (@{u.username}) {u.is_teacher ? '· Teacher' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Subject</label>
              <input className="input" placeholder="Message subject..." value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Message</label>
              <textarea className="input" rows={4} placeholder="Write your message..." value={content} onChange={e => setContent(e.target.value)} />
            </div>
            <div>
              <button className="btn btn-primary" onClick={sendMessage} disabled={sending || !toUser || !content.trim()}>
                {sending ? <span className="spinner spinner-sm" /> : '📨 Send'}
              </button>
            </div>
          </div>
        </LiquidGlass>
      )}

      {/* Messages list */}
      <div className="msg-list fade-in-up">
        {currentList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✉️</div>
            <div className="empty-state-title">No messages</div>
            <div className="empty-state-text">{tab === 'inbox' ? 'Your inbox is empty' : 'You haven\'t sent any messages'}</div>
          </div>
        ) : currentList.map(msg => (
          <LiquidGlass
            key={msg.id}
            className={`msg-item ${tab === 'inbox' && !msg.is_read ? 'msg-unread' : ''}`}
            onClick={() => openMessage(msg)}
            style={{ cursor: 'pointer', marginBottom: 'var(--space-sm)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div className="avatar avatar-sm">
                {(tab === 'inbox' ? msg.from_name : msg.to_name)?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                    {tab === 'inbox' ? msg.from_name : msg.to_name}
                  </strong>
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', flexShrink: 0 }}>
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: tab === 'inbox' && !msg.is_read ? '600' : '400' }}>
                  {msg.subject || '(No subject)'}
                </div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.content}
                </div>
              </div>
              {tab === 'inbox' && !msg.is_read && (
                <div className="msg-unread-dot" />
              )}
            </div>
          </LiquidGlass>
        ))}
      </div>
    </div>
  );
}
