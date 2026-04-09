import { useSocket } from '../../../context/SocketContext';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function OraclePanel() {
  const { onlineUsers } = useSocket();

  // Synthetic heuristic to determine "risk"
  const determineRisk = (user) => {
    if (!user.lastActivity) return { score: 10, label: 'Low', color: 'var(--color-success)' };
    const diffHours = (Date.now() - new Date(user.connectedAt).getTime()) / 3600000;
    
    // High risk if they are idle but connected for > 3 hours
    if (diffHours > 3) return { score: 85, label: 'High', color: 'var(--color-danger)' };
    
    // Moderate risk if idle > 5 mins
    const diffActive = (Date.now() - new Date(user.lastActivity).getTime()) / 1000;
    if (diffActive > 300) return { score: 45, label: 'Moderate', color: 'var(--color-warning)' };
    
    return { score: 10, label: 'Low', color: 'var(--color-success)' };
  };

  const riskyUsers = onlineUsers.map(u => ({ ...u, risk: determineRisk(u) }))
                                .filter(u => u.risk.score > 20)
                                .sort((a,b) => b.risk.score - a.risk.score);

  return (
    <div className="oracle-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-lg)' }}>
      {/* Left panel: The Oracle Eye (aesthetic) */}
      <LiquidGlass variant="solid" style={{ 
        padding: 'var(--space-2xl)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(86, 204, 242, 0.1) 0%, rgba(47, 128, 237, 0.1) 100%)'
      }}>
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)',
          boxShadow: '0 0 40px rgba(47, 128, 237, 0.4), inset 0 0 20px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-lg)',
          animation: 'oracle-pulse 4s ease-in-out infinite'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--color-info)',
            boxShadow: '0 0 20px var(--color-info)'
          }} />
        </div>
        
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, letterSpacing: '0.1em', background: 'linear-gradient(to right, #56CCF2, #2F80ED)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          ORACLE AI
        </h3>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
          Processing behavioral patterns, session lengths, and heuristics to predict academic dishonesty.
        </p>

        <style>{`
          @keyframes oracle-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(47, 128, 237, 0.4), inset 0 0 20px rgba(0,0,0,0.1); }
            50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(47, 128, 237, 0.6), inset 0 0 20px rgba(0,0,0,0.1); }
          }
        `}</style>
      </LiquidGlass>

      {/* Right panel: Alerts */}
      <div className="flex flex-col gap-md">
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Predicted Anomalies</h3>
        
        {riskyUsers.length === 0 ? (
          <LiquidGlass variant="solid" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>✨</span>
            <div style={{ fontWeight: 600 }}>All Clear</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              No suspicious patterns detected in current sessions.
            </div>
          </LiquidGlass>
        ) : (
          <div className="flex flex-col gap-sm">
            {riskyUsers.map(user => (
              <LiquidGlass key={user.userId} variant="elevated" style={{ padding: 'var(--space-md)', borderLeft: `4px solid ${user.risk.color}` }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.username}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {user.risk.score > 80 ? 'Unusually long idle session detected.' : 'Moderate idle time during active proctoring.'}
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: user.risk.color }}>
                      {user.risk.score}% RISK
                    </span>
                    <button className="btn btn-secondary btn-sm">Investigate</button>
                  </div>
                </div>
              </LiquidGlass>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
