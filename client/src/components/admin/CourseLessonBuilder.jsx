import { useState, useEffect, useRef } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';

export default function CourseLessonBuilder({ course, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', is_published: true });
  const [files, setFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadLessons();
  }, [course.id]);

  const loadLessons = async () => {
    try {
      const res = await api.get('/work');
      // Filter by the current course and type 'lesson'
      const courseLessons = res.items.filter(w => w.course_id === course.id && w.type === 'lesson');
      // Sort by creation or sort_order if added later
      courseLessons.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setLessons(courseLessons);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonDetails = async (id) => {
    try {
      const data = await api.get(`/work/${id}`);
      setAttachments(data.attachments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setForm({ 
      title: lesson.title, 
      description: lesson.description || '', 
      is_published: lesson.is_published === 1 
    });
    setIsEditing(false);
    setFiles([]);
    loadLessonDetails(lesson.id);
  };

  const startNewLesson = () => {
    setSelectedLesson(null);
    setForm({ title: '', description: '', is_published: true });
    setIsEditing(true);
    setFiles([]);
    setAttachments([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('type', 'lesson');
    formData.append('course_id', course.id);
    formData.append('is_published', form.is_published ? '1' : '0');
    
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      if (selectedLesson) {
        await api.upload(`/work/${selectedLesson.id}`, formData, 'PUT');
        setIsEditing(false);
        loadLessons();
        loadLessonDetails(selectedLesson.id);
      } else {
        const result = await api.upload('/work', formData);
        setIsEditing(false);
        loadLessons();
        // optionally select the newly created lesson
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save lesson: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;
    try {
      await api.delete(`/work/${selectedLesson.id}`);
      setSelectedLesson(null);
      loadLessons();
    } catch (err) {
      console.error(err);
    }
  };

  const removeDeviceFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const removeServerAttachment = async (attachId) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await api.delete(`/work/${selectedLesson.id}/attachment/${attachId}`);
      loadLessonDetails(selectedLesson.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-enter flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="page-header flex justify-between items-center" style={{ flexShrink: 0, marginBottom: 'var(--space-md)' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 'var(--space-xs)' }}>
            ← Back to Courses
          </button>
          <h1 className="page-title">Lesson Builder: {course.title}</h1>
        </div>
        <button className="btn btn-primary" onClick={startNewLesson}>
          + Add Lesson
        </button>
      </div>

      <div className="grid grid-2" style={{ flex: 1, gridTemplateColumns: 'minmax(250px, 1fr) 3fr', height: '100%', overflow: 'hidden' }}>
        
        {/* Left Sidebar: Timeline/List */}
        <LiquidGlass variant="elevated" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Curriculum Timeline</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }} className="flex flex-col gap-sm">
            {loading ? (
              <div className="spinner" />
            ) : lessons.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>No lessons created yet.</p>
            ) : (
              lessons.map((lesson, idx) => (
                <div 
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: selectedLesson?.id === lesson.id ? 'var(--color-primary-transparent)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${selectedLesson?.id === lesson.id ? 'var(--color-primary)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <strong style={{ fontSize: 'var(--font-size-sm)' }}>{idx + 1}. {lesson.title}</strong>
                    {!lesson.is_published && <span className="badge badge-warning" style={{ zoom: 0.8 }}>Draft</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </LiquidGlass>

        {/* Right Pane: Lesson Editor / Viewer */}
        <LiquidGlass variant="solid" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          
          {!selectedLesson && !isEditing ? (
            <div className="flex items-center justify-center" style={{ height: '100%', opacity: 0.5 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>📝</div>
                <p>Select a lesson from the timeline or create a new one.</p>
              </div>
            </div>
          ) : isEditing ? (
            // Form Editor
            <form onSubmit={handleSave} className="flex flex-col h-full fade-in-up" style={{ padding: 'var(--space-lg)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
                  {selectedLesson ? '✏️ Edit Lesson' : '✨ New Lesson'}
                </h2>
                <div className="flex gap-sm items-center">
                  <label className="flex items-center gap-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={form.is_published}
                      onChange={(e) => setForm({...form, is_published: e.target.checked})}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Publish Immediately</span>
                  </label>
                  <button type="submit" className="btn btn-primary">Save Lesson</button>
                  {selectedLesson && (
                    <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                  )}
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                <input 
                  className="input" 
                  style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}
                  placeholder="Lesson Title..." 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  required 
                />
              </div>

              <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-md)' }}>
                <textarea 
                  className="input textarea" 
                  style={{ flex: 1, minHeight: '300px', fontSize: 'var(--font-size-base)', lineHeight: '1.6' }}
                  placeholder="Write your rich lesson content here..." 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                />
              </div>

              {/* Box to attach files */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>📎 Lesson Materials</h3>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current.click()}>
                    + Add File
                  </button>
                  <input multiple type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
                </div>
                
                <div className="flex flex-col gap-xs">
                  {/* Existing Server Attachments */}
                  {attachments.map(a => (
                    <div key={a.id} className="file-item file-item-download" style={{ background: 'rgba(0,0,0,0.03)' }}>
                      <span className="file-item-icon">📄</span>
                      <span className="file-item-name">{a.file_name}</span>
                      <button type="button" className="text-danger" onClick={() => removeServerAttachment(a.id)}>Delete</button>
                    </div>
                  ))}
                  
                  {/* New files to upload */}
                  {files.map((f, i) => (
                    <div key={i} className="file-item" style={{ background: 'rgba(52, 199, 89, 0.1)', borderColor: 'var(--color-primary)' }}>
                      <span className="file-item-icon">📤</span>
                      <span className="file-item-name">{f.name}</span>
                      <button type="button" onClick={() => removeDeviceFile(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            // Viewer
            <div className="flex flex-col fade-in-up" style={{ padding: 'var(--space-lg)', height: '100%', overflowY: 'auto' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-xl)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                    {selectedLesson.title}
                  </h2>
                  <div className="flex gap-sm items-center">
                    <span className={`badge ${selectedLesson.is_published ? 'badge-success' : 'badge-warning'}`}>
                      {selectedLesson.is_published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      Last updated: {new Date(selectedLesson.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>✏️ Edit</button>
                  <button className="btn btn-ghost btn-sm text-danger" onClick={handleDelete}>🗑️ Delete</button>
                </div>
              </div>

              {/* Content body */}
              <div className="lesson-body" style={{ 
                  fontSize: 'var(--font-size-md)', 
                  lineHeight: '1.8', 
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-text-base)',
                  marginBottom: 'var(--space-xl)' 
              }}>
                {selectedLesson.description || <span style={{opacity: 0.5}}>No text content...</span>}
              </div>

              {attachments.length > 0 && (
                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                    📎 Attached Materials
                  </h3>
                  <div className="grid grid-2 stagger-children">
                    {attachments.map(a => (
                      <a key={a.id} href={a.file_path} download={a.file_name} className="file-item file-item-download" style={{textDecoration: 'none'}}>
                        <span className="file-item-icon">📎</span>
                        <div className="flex flex-col">
                          <span className="file-item-name">{a.file_name}</span>
                          <span className="file-item-size" style={{ fontSize: '10px' }}>{(a.file_size/1024).toFixed(1)} KB</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
        </LiquidGlass>
      </div>
    </div>
  );
}
