import { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function GhostwritingMonitor() {
  const { socket, onlineUsers } = useSocket();
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    if (!socket) return;
    
    // We listen to all keystrokes globally here just to catch pastes
    // Note: In a real architecture, the server would track this and emit 'admin:proctor_alert' for anomalies
    const handleKeystroke = (data) => {
      if (data.action === 'paste' && data.pastedLength > 30) {
        setFlags(prev => [{
          id: Date.now() + Math.random(),
          userId: data.userId,
          username: data.username,
          field: data.field,
          length: data.pastedLength,
          timestamp: data.timestamp,
        }, ...prev].slice(0, 50));
      }
    };

    socket.on('proctor:keystroke', handleKeystroke);
    
    // Watch all online users to get their keystrokes globally (heuristic)
    onlineUsers.forEach(u => socket.emit('admin:watch', u.userId));

    return () => {
      socket.off('proctor:keystroke', handleKeystroke);
      onlineUsers.forEach(u => socket.emit('admin:unwatch', u.userId));
    };
  }, [socket, onlineUsers]);

  return (
    <div className="ghostwriting-monitor" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-lg)' }}>
      {/* Left panel: Stats */}
      <div className="flex flex-col gap-md">
        <LiquidGlass variant="solid" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid var(--color-warning)' }}>
          <div className="view-stat-value">{flags.length}</div>
          <div className="view-stat-label">Total Paste Anomalies</div>
        </LiquidGlass>
        
        <LiquidGlass variant="solid" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid var(--color-danger)' }}>
          <div className="view-stat-value">
            {new Set(flags.map(f => f.userId)).size}
          </div>
          <div className="view-stat-label">Suspect Students</div>
        </LiquidGlass>
        
        <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
          This monitor flags anomalous pasting events. Copy-pasting massive blocks of text can indicate generative AI use or unauthorized external sourcing.
        </p>
      </div>

      {/* Right panel: Live flags log */}
      <LiquidGlass variant="elevated" style={{ padding: 'var(--space-lg)', minHeight: 400 }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
          🚨 Anomaly Stream
        </h3>
        
        {flags.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">No anomalies detected</div>
            <div className="empty-state-text">Monitoring live keystroke cadence...</div>
          </div>
        ) : (
          <div className="flex flex-col gap-sm" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {flags.map(flag => (
              <div key={flag.id} className="monitor-activity-row" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                    {flag.username} pasted {flag.length} characters
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Field: {flag.field} — {new Date(flag.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs text-danger">Review</button>
              </div>
            ))}
          </div>
        )}
      </LiquidGlass>
    </div>
  );
}
