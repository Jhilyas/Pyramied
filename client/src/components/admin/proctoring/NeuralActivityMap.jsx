import { useSocket } from '../../../context/SocketContext';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function NeuralActivityMap() {
  const { onlineUsers } = useSocket();

  // Create deterministic coordinates for students so they don't jump around randomly
  const getCoordinates = (userId) => {
    // Very simple hash to plot them on a 2D map
    const id = parseInt(userId);
    const x = ((id * 37) % 80) + 10; // 10% to 90%
    const y = ((id * 53) % 80) + 10; // 10% to 90%
    return { x, y };
  };

  const getActivityPulseSize = (lastActivity) => {
    if (!lastActivity) return '0px';
    const diff = (Date.now() - new Date(lastActivity).getTime()) / 1000;
    if (diff < 5) return '20px';    // Hyperactive
    if (diff < 30) return '10px';   // Active
    return '0px';                   // Idle
  };

  const getStatusColor = (lastActivity) => {
    if (!lastActivity) return 'var(--color-warning)';
    const diff = (Date.now() - new Date(lastActivity).getTime()) / 1000;
    if (diff < 30) return 'var(--color-success)';
    if (diff < 120) return 'var(--color-warning)';
    return 'var(--color-text-muted)';
  };

  return (
    <div className="neural-activity-map">
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Spatial Activity Matrix</h3>
        <span className="badge badge-primary">{onlineUsers.length} Nodes Connected</span>
      </div>

      <LiquidGlass variant="solid" style={{ 
        position: 'relative', 
        height: '400px', 
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, rgba(52, 199, 89, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)'
      }}>
        {/* Plot axis / decorations */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.05)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(0,0,0,0.05)' }} />

        {/* Nodes */}
        {onlineUsers.map(user => {
          const { x, y } = getCoordinates(user.userId);
          const color = getStatusColor(user.lastActivity);
          const pulse = getActivityPulseSize(user.lastActivity);
          
          return (
            <div 
              key={user.userId}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 1s ease-in-out'
              }}
              title={`${user.username} - ${user.currentPage}`}
            >
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                boxShadow: pulse !== '0px' ? `0 0 ${pulse} ${color}` : 'none',
                border: '2px solid white',
              }} />
              <div style={{
                marginTop: '4px',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap'
              }}>
                {user.username}
              </div>
            </div>
          );
        })}

        {onlineUsers.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: 'var(--font-size-sm)' }}>
            Map offline: No nodes tracked.
          </div>
        )}
      </LiquidGlass>
    </div>
  );
}
