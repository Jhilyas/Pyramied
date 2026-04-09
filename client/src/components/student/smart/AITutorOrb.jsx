import { useState, useRef, useEffect } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function AITutorOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'tutor', text: 'Hello! I am your Pyramied AI Tutor. Ask me anything about your lessons!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const orbStyle = {
    position: 'fixed',
    bottom: 'var(--space-xl)',
    right: 'var(--space-xl)',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(52, 199, 89, 0.4)',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
    color: '#fff',
    zIndex: 1000,
    transition: 'transform 0.3s ease',
    transform: isOpen ? 'scale(0.8)' : 'scale(1)',
  };

  const panelStyle = {
    position: 'fixed',
    bottom: '90px',
    right: 'var(--space-xl)',
    width: '350px',
    height: '450px',
    zIndex: 999,
    display: isOpen ? 'flex' : 'none',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = { sender: 'user', text: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'tutor', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: 'tutor', 
        text: 'Sorry, I could not connect. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        style={orbStyle} 
        onClick={() => setIsOpen(!isOpen)}
        className="orb-pulse"
      >
        ✨
      </div>

      <LiquidGlass variant="solid" className="liquid-glass-green" style={panelStyle}>
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(52, 199, 89, 0.1)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Pyramied AI Tutor</h3>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Powered by Llama 3.3 · Always here to help</p>
        </div>
        
        <div style={{ flex: 1, padding: 'var(--space-md)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ 
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              background: m.sender === 'user' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255,255,255,0.05)',
              padding: '8px 12px',
              borderRadius: '12px',
              maxWidth: '80%',
              fontSize: 'var(--font-size-sm)',
              borderBottomRightRadius: m.sender === 'user' ? '2px' : '12px',
              borderBottomLeftRadius: m.sender === 'tutor' ? '2px' : '12px',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ 
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.05)',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: 'var(--font-size-sm)',
              borderBottomLeftRadius: '2px',
              opacity: 0.7,
            }}>
              <span className="typing-dots">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 'var(--space-sm)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="input" 
              style={{ flex: 1, height: '36px', fontSize: 'var(--font-size-sm)' }} 
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: '36px' }} disabled={loading}>
              {loading ? '...' : '➔'}
            </button>
          </form>
        </div>
      </LiquidGlass>
      
      <style>{`
        @keyframes pulse-orb {
          0% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(52, 199, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0); }
        }
        .orb-pulse {
          animation: pulse-orb 3s infinite;
        }
      `}</style>
    </>
  );
}
