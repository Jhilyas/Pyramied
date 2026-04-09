import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function SiteSettings() {
  const [settings, setSettings] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/announcements'),
      ]);
      const sData = await sRes.json();
      const aData = await aRes.json();
      setSettings(sData.settings || {});
      setAnnouncements(aData.announcements || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const createAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    await fetch('/api/settings/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: annTitle, content: annContent }),
    });
    setAnnTitle('');
    setAnnContent('');
    fetchAll();
  };

  const deleteAnnouncement = async (id) => {
    await fetch(`/api/settings/announcements/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Site Settings</h1></div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">⚙️ Site Settings</h1>
        <p className="page-subtitle">Configure your Pyramied platform</p>
      </div>

      {/* General Settings */}
      <LiquidGlass className="fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ margin: '0 0 var(--space-lg)', fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          🏫 General Settings
        </h2>
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">Site Name</label>
            <input
              className="input"
              value={settings.site_name || ''}
              onChange={e => updateSetting('site_name', e.target.value)}
              placeholder="Your platform name"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Primary Color</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <input
                type="color"
                value={settings.primary_color || '#34C759'}
                onChange={e => updateSetting('primary_color', e.target.value)}
                style={{ width: '48px', height: '40px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              />
              <input
                className="input"
                value={settings.primary_color || '#34C759'}
                onChange={e => updateSetting('primary_color', e.target.value)}
                placeholder="#34C759"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Welcome Message</label>
            <textarea
              className="input"
              rows={3}
              value={settings.welcome_message || ''}
              onChange={e => updateSetting('welcome_message', e.target.value)}
              placeholder="Displayed on the teacher dashboard..."
            />
          </div>
          <div className="input-group">
            <label className="input-label">Contact Email</label>
            <input
              className="input"
              type="email"
              value={settings.contact_email || ''}
              onChange={e => updateSetting('contact_email', e.target.value)}
              placeholder="admin@school.com"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Timezone</label>
            <select className="input" value={settings.timezone || 'UTC'} onChange={e => updateSetting('timezone', e.target.value)}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : saved ? '✓ Saved!' : '💾 Save Settings'}
          </button>
          {saved && <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>Settings saved successfully</span>}
        </div>
      </LiquidGlass>

      {/* Announcements */}
      <LiquidGlass className="fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ margin: '0 0 var(--space-lg)', fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          📢 Announcements
        </h2>

        {/* New announcement */}
        <div className="form-grid" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="input-group">
            <label className="input-label">Title</label>
            <input className="input" placeholder="Announcement title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Content</label>
            <textarea className="input" rows={3} placeholder="Write your announcement..." value={annContent} onChange={e => setAnnContent(e.target.value)} />
          </div>
          <div>
            <button className="btn btn-primary" onClick={createAnnouncement} disabled={!annTitle.trim() || !annContent.trim()}>
              📢 Post Announcement
            </button>
          </div>
        </div>

        {/* Existing announcements */}
        {announcements.length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
            No announcements posted yet
          </div>
        ) : (
          <div className="announcement-list">
            {announcements.map(ann => (
              <div key={ann.id} className="announcement-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{ann.title}</strong>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
                      {formatDate(ann.created_at)}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => deleteAnnouncement(ann.id)}>🗑️</button>
                </div>
                <p style={{ margin: 'var(--space-xs) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </LiquidGlass>
    </div>
  );
}
