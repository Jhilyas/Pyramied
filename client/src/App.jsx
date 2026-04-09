import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FlowStateProvider } from './context/FlowStateContext';
import LoginPage from './pages/LoginPage';
import AppShell from './components/layout/AppShell';
import AdminDashboard from './components/admin/Dashboard';
import UserManager from './components/admin/UserManager';
import CourseManager from './components/admin/CourseManager';
import WorkManager from './components/admin/WorkManager';
import LiveMonitor from './components/admin/LiveMonitor';
import Gradebook from './components/admin/Gradebook';
import ForumManager from './components/admin/ForumManager';
import SiteSettings from './components/admin/SiteSettings';
import StudentDashboard from './components/student/Dashboard';
import WorkList from './components/student/WorkList';
import CourseView from './components/student/CourseView';
import MyGrades from './components/student/MyGrades';
import StudentForums from './components/student/StudentForums';
import Messages from './components/shared/Messages';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      setActiveView('dashboard');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderView = () => {
    if (user.is_teacher) {
      switch (activeView) {
        case 'dashboard': return <AdminDashboard />;
        case 'users': return <UserManager />;
        case 'courses': return <CourseManager />;
        case 'work': return <WorkManager />;
        case 'proctoring': return <LiveMonitor />;
        case 'gradebook': return <Gradebook />;
        case 'forums': return <ForumManager />;
        case 'messages': return <Messages />;
        case 'settings': return <SiteSettings />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (activeView) {
        case 'dashboard': return <StudentDashboard />;
        case 'work': return <WorkList />;
        case 'courses': return <CourseView />;
        case 'grades': return <MyGrades />;
        case 'forums': return <StudentForums />;
        case 'messages': return <Messages />;
        default: return <StudentDashboard />;
      }
    }
  };

  return (
    <SocketProvider>
      <AppShell activeView={activeView} onNavigate={setActiveView}>
        {renderView()}
      </AppShell>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FlowStateProvider>
        <AppContent />
      </FlowStateProvider>
    </AuthProvider>
  );
}
