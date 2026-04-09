import { useAuth } from '../../context/AuthContext';
import { LiquidGlass } from '../ui/liquid-glass';

const ADMIN_NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'users', icon: '👥', label: 'User Management' },
  { id: 'courses', icon: '📚', label: 'Courses' },
  { id: 'work', icon: '📋', label: 'Work Manager' },
  { id: 'gradebook', icon: '📝', label: 'Gradebook' },
  { id: 'forums', icon: '💬', label: 'Forums' },
  { id: 'messages', icon: '✉️', label: 'Messages' },
  { id: 'proctoring', icon: '👁️', label: 'Live Monitor' },
  { id: 'settings', icon: '⚙️', label: 'Site Settings' },
];

const STUDENT_NAV = [
  { id: 'dashboard', icon: '🏠', label: 'My Dashboard' },
  { id: 'courses', icon: '📚', label: 'My Courses' },
  { id: 'work', icon: '📋', label: 'My Work' },
  { id: 'grades', icon: '📊', label: 'My Grades' },
  { id: 'forums', icon: '💬', label: 'Forums' },
  { id: 'messages', icon: '✉️', label: 'Messages' },
];

export default function Sidebar({ activeView, onNavigate, collapsed, onToggle }) {
  const { user } = useAuth();
  const navItems = user?.is_teacher ? ADMIN_NAV : STUDENT_NAV;

  return (
    <LiquidGlass 
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      variant="sidebar"
    >
      {/* Header */}
      <div className="sidebar-header">
        <img src="/favicon.svg" alt="Pyramied" className="sidebar-logo" />
        <span className="sidebar-brand">Pyramied</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">
          {user?.is_teacher ? 'Administration' : 'Learning'}
        </div>

        {navItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            role="button"
            tabIndex={0}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer user info */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">
              {user?.is_teacher ? 'Supervisor' : 'Teacher'}
            </div>
          </div>
        </div>
      </div>
    </LiquidGlass>
  );
}
