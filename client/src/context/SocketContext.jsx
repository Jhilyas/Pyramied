import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const s = io('/', {
      transports: ['websocket'],
      auth: { userId: user.id, username: user.full_name, isTeacher: user.is_teacher },
    });

    s.on('connect', () => {
      console.log('[Socket] Connected:', s.id);
    });

    s.on('presence:update', (users) => {
      setOnlineUsers(users);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socketRef.current = s;
    setSocket(s);

    // Periodic activity heartbeat (every 10s)
    const heartbeat = setInterval(() => {
      if (s.connected) {
        s.emit('student:activity', { currentPage: document.title || 'Pyramied' });
      }
    }, 10000);

    return () => {
      clearInterval(heartbeat);
      s.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
