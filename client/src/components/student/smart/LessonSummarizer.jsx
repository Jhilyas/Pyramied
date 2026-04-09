import { useState } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function LessonSummarizer({ text }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleSummarize = () => {
    if (!text) return;
    setLoading(true);
    
    // Simulate AI delay
    setTimeout(() => {
      // Deterministic mock logic: grab 3 sentences with words like "important", "key", etc. or just first 3
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const keyPoints = sentences
        .sort((a, b) => b.length - a.length) // grab longer/more substantial sentences
        .slice(0, 3)
        .map(s => s.trim());
        
      setSummary(keyPoints);
      setLoading(false);
    }, 1500);
  };

  if (!text) return null;

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      {!summary && !loading ? (
        <button className="btn btn-secondary btn-sm" onClick={handleSummarize} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>✨</span> Smart Summarize
        </button>
      ) : loading ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
          <div className="spinner spinner-sm" /> Analyzing lesson payload...
        </div>
      ) : (
        <LiquidGlass variant="solid" className="liquid-glass-blue fade-in-up" style={{ padding: 'var(--space-md)' }}>
          <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--color-primary)' }}>
            ✨ AI Key Takeaways
          </h4>
          <ul style={{ paddingLeft: 'var(--space-md)', margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: '1.6' }}>
            {summary.map((pt, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>{pt}</li>
            ))}
          </ul>
        </LiquidGlass>
      )}
    </div>
  );
}
