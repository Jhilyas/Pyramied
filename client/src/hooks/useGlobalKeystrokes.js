import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export function useGlobalKeystrokes() {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  useEffect(() => {
    // Only track if user is a student and socket is connected
    if (!user || user.is_teacher || !socket) return;
    
    const handleInput = (e) => {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) return;
      
      const field = target.name || target.id || target.placeholder || 'unknown_field';
      const value = target.value || target.textContent || '';
      
      // Standard input - just broadcast the current string value
      socket.emit('student:keystroke', {
        field,
        value,
        action: 'input',
        timestamp: Date.now()
      });
    };

    const handlePaste = (e) => {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) return;
      
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const field = target.name || target.id || target.placeholder || 'unknown_field';
      
      // Flag large pastes for the Ghostwriting Monitor
      if (pastedText && pastedText.length > 30) {
        socket.emit('student:keystroke', {
          field,
          value: target.value || target.textContent || '',
          action: 'paste',
          pastedLength: pastedText.length,
          timestamp: Date.now()
        });
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('paste', handlePaste);
    };
  }, [socket, user]);
}
