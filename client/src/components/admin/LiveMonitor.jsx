import { useState, useEffect } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { useSocket } from '../../context/SocketContext';
import KeystrokeMirror from './proctoring/KeystrokeMirror';
import GhostwritingMonitor from './proctoring/GhostwritingMonitor';
import NeuralActivityMap from './proctoring/NeuralActivityMap';
import OraclePanel from './proctoring/OraclePanel';

export default function LiveMonitor() {
  const { onlineUsers } = useSocket();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const getTimeSince = (iso) => {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getSessionDuration = (iso) => {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getActivityStatus = (user) => {
    if (!user.lastActivity) return 'idle';
    const diff = (Date.now() - new Date(user.lastActivity).getTime()) / 1000;
    if (diff < 30) return 'active';
    if (diff < 120) return 'idle';
    return 'away';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--color-success)';
      case 'idle': return 'var(--color-warning)';
      case 'away': return 'var(--color-text-muted)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getPageIcon = (page) => {
    if (page?.includes('Work')) return '📝';
    if (page?.includes('Course')) return '📚';
    if (page?.includes('Dashboard')) return '🏠';
    if (page?.includes('Grade')) return '📊';
    if (page?.includes('Message')) return '✉️';
    return '📱';
  };

  // Auto-refresh every second for live time updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <>
          {onlineUsers.length === 0 ? (
            <LiquidGlass variant="solid">
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No teachers online</div>
                <div className="empty-state-text">Teacher activity will appear here in real-time when they connect to the platform.</div>
              </div>
            </LiquidGlass>
          ) : (
            <div className="grid grid-3 stagger-children">
              {onlineUsers.map((user) => {
                const status = getActivityStatus(user);
                const isSelected = selectedStudent?.userId === user.userId;

                return (
                  <LiquidGlass
                    key={user.socketId}
                    variant="elevated"
                    interactive
                    className={isSelected ? 'monitor-card-selected' : ''}
                    onClick={() => setSelectedStudent(isSelected ? null : user)}
                  >
                    <div className="monitor-card">
                      {/* Header */}
                      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="flex items-center gap-sm">
                          <div className="avatar">{user.username?.charAt(0)?.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{user.username}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                              ID: {user.userId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs">
                          <div
                            className="monitor-status-dot"
                            style={{ backgroundColor: getStatusColor(status) }}
                            title={status}
                          />
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            color: getStatusColor(status),
                            textTransform: 'capitalize',
                          }}>
                            {status}
                          </span>
                        </div>
                      </div>

                      {/* Current activity */}
                      <div className="monitor-activity-row">
                        <span className="monitor-activity-icon">{getPageIcon(user.currentPage)}</span>
                        <span className="monitor-activity-page">{user.currentPage || 'Unknown'}</span>
                      </div>

                      {/* Current work */}
                      {user.currentWorkTitle && (
                        <div className="monitor-work-badge">
                          📝 {user.currentWorkTitle}
                        </div>
                      )}

                      {/* Footer stats */}
                      <div className="monitor-footer">
                        <div className="monitor-footer-item">
                          <span className="monitor-footer-label">Session</span>
                          <span className="monitor-footer-value">{getSessionDuration(user.connectedAt)}</span>
                        </div>
                        <div className="monitor-footer-item">
                          <span className="monitor-footer-label">Last active</span>
                          <span className="monitor-footer-value">{getTimeSince(user.lastActivity)}</span>
                        </div>
                      </div>
                    </div>
                  </LiquidGlass>
                );
              })}
            </div>
          )}

          {/* Expanded student detail panel */}
          {selectedStudent && (
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <LiquidGlass variant="solid">
                <div style={{ padding: 'var(--space-lg)' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                      📋 {selectedStudent.username} — Activity Detail
                    </h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStudent(null)}>✕ Close</button>
                  </div>

                  <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="view-stat-box">
                      <div className="view-stat-value">{selectedStudent.currentPage || '—'}</div>
                      <div className="view-stat-label">Current Page</div>
                    </div>
                    <div className="view-stat-box">
                      <div className="view-stat-value">{selectedStudent.currentWorkTitle || '—'}</div>
                      <div className="view-stat-label">Current Work</div>
                    </div>
                    <div className="view-stat-box">
                      <div className="view-stat-value">{getSessionDuration(selectedStudent.connectedAt)}</div>
                      <div className="view-stat-label">Session Length</div>
                    </div>
                    <div className="view-stat-box">
                      <div className="view-stat-value">{getTimeSince(selectedStudent.lastActivity)}</div>
                      <div className="view-stat-label">Last Activity</div>
                    </div>
                  </div>

                  {/* Keystroke Mirror */}
                  <KeystrokeMirror studentId={selectedStudent.userId} studentName={selectedStudent.username} />
                </div>
              </LiquidGlass>
            </div>
          )}
        </>
      );
    }
    if (activeTab === 'map') return <NeuralActivityMap />;
    if (activeTab === 'ghostwriting') return <GhostwritingMonitor />;
    if (activeTab === 'oracle') return <OraclePanel />;
    return null;
  };

  return (
    <div className="page-enter">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Intelligence & Proctoring</h1>
          <p className="page-subtitle">Real-time engagement, AI analysis, and academic integrity</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="monitor-live-badge">
            <span className="monitor-live-dot" />
            LIVE
          </div>
          <span className="badge badge-info">{onlineUsers.length} online</span>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        <button 
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          👁️ Overview
        </button>
        <button 
          className={`tab ${activeTab === 'map' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('map')}
        >
          🕸️ Neural Map
        </button>
        <button 
          className={`tab ${activeTab === 'ghostwriting' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('ghostwriting')}
        >
          ✍️ Ghostwriting Monitor
        </button>
        <button 
          className={`tab ${activeTab === 'oracle' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('oracle')}
        >
          🔮 Oracle AI
        </button>
      </div>

      {renderContent()}
    </div>
  );
}
