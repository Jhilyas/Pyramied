import { useState, useEffect, useCallback } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import LessonSummarizer from './smart/LessonSummarizer';
import AITutorOrb from './smart/AITutorOrb';

export default function CourseView() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [courseWork, setCourseWork] = useState([]);
  const [forums, setForums] = useState([]);
  
  const [activeItem, setActiveItem] = useState(null);
  const [activeAttachments, setActiveAttachments] = useState([]);
  
  // Forum state
  const [activeForumData, setActiveForumData] = useState(null);
  const [postContent, setPostContent] = useState('');

  const { socket } = useSocket();

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.courses || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const loadCourseContent = useCallback(async (course) => {
    let loadedWork = [];
    let loadedForums = [];

    try {
      const res = await api.get('/work');
      loadedWork = res.items?.filter(w => w.course_id === course.id) || [];
      loadedWork.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      setCourseWork(loadedWork);
    } catch (err) { console.error(err); }

    try {
      const res = await api.get('/forums');
      loadedForums = res.forums?.filter(f => f.course_id === course.id || !f.course_id).map(f => ({ ...f, type: 'forum' })) || [];
      setForums(loadedForums);
    } catch (err) { console.error(err); }
    
    if (!activeItem && (loadedWork.length > 0 || loadedForums.length > 0)) {
       const firstItem = loadedWork.length > 0 ? loadedWork[0] : loadedForums[0];
       openWorkItem(firstItem);
    }
  }, [activeItem]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchCourses();
      if (selectedCourse) {
        loadCourseContent(selectedCourse);
        // Refresh active forum if open
        if (activeItem && activeItem.type === 'forum') {
           api.get(`/forums/${activeItem.id}/posts`).then(res => {
              setActiveForumData(res.threads || []);
           }).catch(()=>{});
        }
      }
    };
    socket.on('content:updated', handleUpdate);
    return () => socket.off('content:updated', handleUpdate);
  }, [socket, fetchCourses, loadCourseContent, selectedCourse, activeItem]);

  const openCourse = async (course) => {
    setSelectedCourse(course);
    setActiveItem(null);
    loadCourseContent(course);
  };

  const closeCourse = () => {
    setSelectedCourse(null);
    setActiveItem(null);
    setCourseWork([]);
    setForums([]);
  };

  const openWorkItem = async (item) => {
    setActiveItem(item);
    setActiveAttachments([]);
    setActiveForumData(null);
    setPostContent('');

    if (item.type === 'forum') {
      try {
        const res = await api.get(`/forums/${item.id}/posts`);
        setActiveForumData(res.threads || []);
      } catch(e) { console.error(e) }
    } else {
      try {
        const res = await api.get(`/work/${item.id}`);
        setActiveAttachments(res.attachments || []);
        api.post(`/work/${item.id}/view`).catch(()=>{});
      } catch(e) { console.error(e) }
    }
  };

  const submitForumPost = async (e, parentId = null) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    try {
      await api.post(`/forums/${activeItem.id}/posts`, { content: postContent, parent_id: parentId });
      setPostContent('');
      const res = await api.get(`/forums/${activeItem.id}/posts`);
      setActiveForumData(res.threads || []);
    } catch(err) { console.error(err); }
  };

  const deletePost = async (postId) => {
    if(!confirm('Delete this message?')) return;
    try {
      await api.delete(`/forums/${activeItem.id}/posts/${postId}`);
      const res = await api.get(`/forums/${activeItem.id}/posts`);
      setActiveForumData(res.threads || []);
    } catch(err) { console.error(err); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">My Courses</h1></div>
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  // Course IMMERSIVE View
  if (selectedCourse) {
    const totalWords = courseWork.reduce((acc, w) => acc + (w.description ? w.description.split(' ').length : 0), 0);
    const readingTimeMins = Math.max(1, Math.ceil(totalWords / 200));
    const pathItems = [...courseWork, ...forums];

    return (
      <div className="page-enter flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        <AITutorOrb />
        
        <div className="page-header flex justify-between items-center" style={{ flexShrink: 0, marginBottom: 'var(--space-md)' }}>
          <div>
             <button className="btn btn-ghost btn-sm" onClick={closeCourse} style={{ marginBottom: 'var(--space-xs)' }}>
              ← Return to Dashboard
            </button>
            <h1 className="page-title">📚 {selectedCourse.title}</h1>
          </div>
          <div className="flex gap-md text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
             <div className="flex items-center gap-xs">⏱️ Est. {readingTimeMins} mins</div>
             <div className="flex items-center gap-xs">📋 {courseWork.length} lessons</div>
             <div className="flex items-center gap-xs">💬 {forums.length} forums</div>
          </div>
        </div>

        <div className="grid grid-2" style={{ flex: 1, gridTemplateColumns: 'minmax(250px, 1fr) 3fr', height: '100%', overflow: 'hidden' }}>
          
          <LiquidGlass variant="elevated" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Learning Path</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }} className="flex flex-col gap-sm">
              {pathItems.length === 0 ? (
                <p className="text-muted" style={{fontSize: 'var(--font-size-sm)'}}>No materials available yet.</p>
              ) : (
                pathItems.map((item, idx) => {
                  const isActive = activeItem?.id === item.id && activeItem?.type === item.type;
                  let icon = '📄';
                  if (item.type === 'lesson' || item.type === 'reading') icon = '📖';
                  if (item.type === 'quiz') icon = '📝';
                  if (item.type === 'assignment') icon = '📋';
                  if (item.type === 'forum') icon = '💬';

                  return (
                    <div 
                      key={`${item.type}-${item.id}`}
                      onClick={() => openWorkItem(item)}
                      style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        background: isActive ? 'var(--color-primary-transparent)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                       <div className="flex justify-between items-center">
                         <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: isActive ? 600 : 400, textTransform: 'capitalize' }}>
                           {icon} {item.type === 'forum' ? 'Discussion' : item.type === 'lesson' ? `Lesson ${idx + 1}` : `${item.type} ${idx + 1}`}
                         </span>
                       </div>
                       <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: isActive ? 600 : 400, marginTop: '2px', opacity: isActive ? 1 : 0.7 }}>
                          {item.title}
                       </div>
                    </div>
                  );
                })
              )}
            </div>
          </LiquidGlass>

          <LiquidGlass variant="solid" style={{ height: '100%', overflowY: 'auto', padding: '0' }}>
            {!activeItem ? (
               <div className="flex items-center justify-center h-full">
                 <p className="text-muted text-center">Select a lesson or forum from the Learning Path to begin.</p>
               </div>
            ) : activeItem.type === 'forum' ? (
                // ========== FORUM VIEW ==========
                <div className="fade-in-up flex flex-col h-full" style={{ padding: 'var(--space-xl)', maxWidth: '900px', margin: '0 auto' }}>
                  <div className="flex gap-sm items-center" style={{ marginBottom: 'var(--space-xs)' }}>
                    <span className="badge badge-success">💬 Forum Discussion</span>
                  </div>
                  
                  <h2 style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 700, marginBottom: 'var(--space-sm)', color: 'var(--color-text-base)' }}>
                    {activeItem.title}
                  </h2>
                  <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
                    {activeItem.description || 'Welcome to the course discussion! Ask questions and share thoughts here.'}
                  </p>

                  <div className="forum-threads" style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--space-lg)' }}>
                    {activeForumData === null ? (
                      <div className="spinner" />
                    ) : activeForumData.length === 0 ? (
                      <p className="text-muted text-center" style={{ marginTop: 'var(--space-xl)' }}>No messages yet. Be the first to post!</p>
                    ) : (
                      <div className="flex flex-col gap-lg">
                        {activeForumData.map(thread => (
                          <LiquidGlass key={thread.id} variant="elevated" className="fade-in-up" style={{ padding: 'var(--space-md)' }}>
                            <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-sm)' }}>
                              <div className="flex items-center gap-sm">
                                <div className="avatar avatar-sm">{thread.full_name?.charAt(0)}</div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{thread.full_name}</div>
                                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    {formatDate(thread.created_at)} at {formatTime(thread.created_at)}
                                  </div>
                                </div>
                              </div>
                              <button className="btn btn-ghost btn-sm text-danger" onClick={() => deletePost(thread.id)}>Remove</button>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-md)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                              {thread.content}
                            </div>
                          </LiquidGlass>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={submitForumPost} className="flex gap-sm shrink-0" style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ flex: 1 }} 
                      placeholder="Share your thoughts with the class..." 
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!postContent.trim()}>Send</button>
                  </form>
                </div>
            ) : (
               // ========== LESSON VIEW ==========
               <div className="fade-in-up" style={{ padding: 'var(--space-xl)', maxWidth: '800px', margin: '0 auto' }}>
                  <div className="flex gap-sm items-center" style={{ marginBottom: 'var(--space-xs)' }}>
                    <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                      {activeItem.type === 'lesson' ? '📖 Lesson' : activeItem.type}
                    </span>
                    {activeItem.due_date && <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)'}}>Due: {formatDate(activeItem.due_date)}</span>}
                  </div>
                  
                  <h2 style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 700, marginBottom: 'var(--space-lg)', color: 'var(--color-text-base)' }}>
                    {activeItem.title}
                  </h2>
                  
                  {(activeItem.type === 'lesson' || activeItem.type === 'reading') && activeItem.description && (
                    <LessonSummarizer text={activeItem.description} />
                  )}

                  <div style={{ 
                    fontSize: 'var(--font-size-md)', 
                    lineHeight: '1.8', 
                    whiteSpace: 'pre-wrap', 
                    color: 'var(--color-text-base)',
                    marginTop: 'var(--space-xl)'
                  }}>
                    {activeItem.description || 'No lesson text provided.'}
                  </div>

                  {activeAttachments.length > 0 && (
                    <div style={{ marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                        📎 Provided Materials
                      </h3>
                      <div className="grid grid-2 stagger-children">
                        {activeAttachments.map(a => (
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

                  {(activeItem.type === 'assignment' || activeItem.type === 'quiz') && (
                    <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'rgba(52, 199, 89, 0.1)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Ready to submit your work?</h3>
                      <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>Head over to the <strong>Assignments</strong> tab to complete this requirement.</p>
                    </div>
                  )}
               </div>
            )}
          </LiquidGlass>
        </div>
      </div>
    );
  }

  // Dashboard List View
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">📚 My Courses</h1>
        <p className="page-subtitle">Your enrolled courses and materials</p>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state fade-in-up">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">No courses yet</div>
          <div className="empty-state-text">You haven't been enrolled in any courses. Contact your supervisor.</div>
        </div>
      ) : (
        <div className="stats-grid fade-in-up">
          {courses.map(course => (
            <LiquidGlass
              key={course.id}
              className="course-card"
              onClick={() => openCourse(course)}
              style={{ cursor: 'pointer' }}
            >
              <div className="course-card-icon">📚</div>
              <h3 style={{ margin: 'var(--space-sm) 0 var(--space-xs)', fontSize: 'var(--font-size-lg)' }}>
                {course.title}
              </h3>
              {course.description && (
                <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: '1.4' }}>
                  {course.description}
                </p>
              )}
            </LiquidGlass>
          ))}
        </div>
      )}
    </div>
  );
}
