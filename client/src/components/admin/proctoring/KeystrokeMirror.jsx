import { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function KeystrokeMirror({ studentId, studentName }) {
  const { socket } = useSocket();
  const [activeFields, setActiveFields] = useState({});

  useEffect(() => {
    if (!socket || !studentId) return;

    // Start watching this student
    socket.emit('admin:watch', studentId);

    const handleKeystroke = (data) => {
      if (data.userId !== studentId) return;

      setActiveFields(prev => {
        const newFields = { ...prev };
        if (!newFields[data.field]) {
          newFields[data.field] = {
            value: '',
            lastUpdate: Date.now(),
            isHighlight: false
          };
        }
        
        // If paste event, highlight differently briefly
        const isPaste = data.action === 'paste';
        
        newFields[data.field] = {
          value: data.value,
          lastUpdate: Date.now(),
          isHighlight: isPaste,
          pasteLength: data.pastedLength
        };

        return newFields;
      });

      // Clear highlight after a moment
      setTimeout(() => {
        setActiveFields(current => {
          if (!current[data.field]) return current;
          return {
            ...current,
            [data.field]: { ...current[data.field], isHighlight: false }
          };
        });
      }, 1000);
    };

    socket.on('proctor:keystroke', handleKeystroke);

    return () => {
      socket.off('proctor:keystroke', handleKeystroke);
      socket.emit('admin:unwatch', studentId);
    };
  }, [socket, studentId]);

  const fields = Object.entries(activeFields).sort((a, b) => b[1].lastUpdate - a[1].lastUpdate);

  return (
    <div className="keystroke-mirror">
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
        <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Keystroke Mirror</h4>
        <div className="monitor-live-badge">
          <span className="monitor-live-dot" /> RECORDING
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
          <div className="empty-state-icon" style={{ fontSize: 32, opacity: 0.3 }}>⌨️</div>
          <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Waiting for input...</div>
          <p className="empty-state-text" style={{ fontSize: 'var(--font-size-xs)' }}>
            The student hasn't typed anything yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {fields.map(([fieldName, fieldData]) => {
            const timeAgo = Math.floor((Date.now() - fieldData.lastUpdate) / 1000);
            return (
              <LiquidGlass key={fieldName} variant="solid" style={{ padding: 'var(--space-sm)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-primary-dark)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {fieldName}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {timeAgo === 0 ? 'just now' : `${timeAgo}s ago`}
                  </span>
                </div>
                
                <div style={{
                  padding: '10px',
                  background: 'rgba(0,0,0,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: fieldData.isHighlight ? 'var(--color-danger)' : 'var(--color-text-primary)',
                  transition: 'color 0.3s ease',
                  borderLeft: fieldData.isHighlight ? '3px solid var(--color-danger)' : '3px solid transparent'
                }}>
                  {fieldData.value || <span className="text-muted">{'<empty>'}</span>}
                </div>
                
                {fieldData.isHighlight && (
                  <div style={{ fontSize: '10px', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 600 }}>
                    ⚠️ {fieldData.pasteLength} characters pasted!
                  </div>
                )}
              </LiquidGlass>
            );
          })}
        </div>
      )}
    </div>
  );
}
