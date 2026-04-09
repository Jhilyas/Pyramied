import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useGlobalKeystrokes } from '../../hooks/useGlobalKeystrokes';
import { useFlowState } from '../../context/FlowStateContext';

export default function AppShell({ activeView, onNavigate, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { isFlowState } = useFlowState();
  
  const isCollapsed = collapsed || isFlowState;
  
  // Activate global keystroke tracking for students
  useGlobalKeystrokes();

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        collapsed={isCollapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <Navbar collapsed={isCollapsed} />
      <main className={`app-main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}
