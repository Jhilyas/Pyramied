import { useAuth } from '../../context/AuthContext';
import { useFlowState } from '../../context/FlowStateContext';
import { LiquidGlass } from '../ui/liquid-glass';

export default function Navbar({ collapsed }) {
  const { user, logout } = useAuth();
  const { 
    isFlowState, 
    toggleFlowState, 
    timeLeft, 
    isTimerActive, 
    toggleTimer, 
    resetTimer, 
    adjustTimer, 
    formatTime 
  } = useFlowState();

  return (
    <LiquidGlass 
      className={`navbar ${collapsed ? 'sidebar-collapsed' : ''}`}
      variant="nav"
    >
      <div className="navbar-left">
        <span className="navbar-breadcrumb">
          {user?.is_teacher ? 'Admin Panel' : 'Student Portal'}
        </span>
      </div>

      <div className="navbar-right">
        {/* Flow State Timer */}
        {isFlowState && (
          <div className="flow-timer-container">
            <button className="flow-timer-btn" onClick={toggleTimer} title={isTimerActive ? "Pause" : "Start"}>
              {isTimerActive ? '⏸️' : '▶️'}
            </button>
            <div className="flow-timer-display">{formatTime()}</div>
            <button className="flow-timer-btn" onClick={resetTimer} title="Reset">
              🔄
            </button>
            <div className="flow-timer-adjust">
              <button className="flow-timer-adjust-btn" onClick={() => adjustTimer(5)}>▲</button>
              <button className="flow-timer-adjust-btn" onClick={() => adjustTimer(-5)}>▼</button>
            </div>
          </div>
        )}

        {/* Flow State Toggle */}
        <button 
          className={`flow-toggle-btn ${isFlowState ? 'active' : ''}`} 
          onClick={toggleFlowState}
          title="Toggle Flow State"
          style={{ marginRight: '8px' }}
        >
          🧠
        </button>

        {/* Announcements bell */}
        <button className="navbar-icon-btn" title="Announcements" id="btn-announcements">
          🔔
          <span className="navbar-notification-dot" />
        </button>

        {/* User menu */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={logout}
          id="btn-logout"
          style={{ fontSize: 'var(--font-size-sm)' }}
        >
          Sign Out
        </button>
      </div>
    </LiquidGlass>
  );
}
