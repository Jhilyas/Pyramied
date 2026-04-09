require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb } = require('./db/init');

async function startServer() {
  // Initialize database first
  await initDatabase();

  const app = express();
  const server = http.createServer(app);

  // Session config
  const sessionMiddleware = session({
    secret: 'pyramied-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  });

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  app.use(cookieParser());
  app.use(sessionMiddleware);

  // Static files for uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ========================
  // AUTH ROUTES
  // ========================
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);

  // ========================
  // PROTECTED ROUTES
  // ========================
  const { requireAuth, requireTeacher } = require('./middleware/auth');
  const usersRouter = require('./routes/users');
  const coursesRouter = require('./routes/courses');
  const dashboardRouter = require('./routes/dashboard');
  const workRouter = require('./routes/work');
  const gradesRouter = require('./routes/grades');
  const forumsRouter = require('./routes/forums');
  const messagesRouter = require('./routes/messages');
  const settingsRouter = require('./routes/settings');
  const aiRouter = require('./routes/ai');

  app.use('/api/users', requireAuth, requireTeacher, usersRouter);
  app.use('/api/courses', requireAuth, coursesRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/work', requireAuth, workRouter);
  app.use('/api/grades', requireAuth, gradesRouter);
  app.use('/api/forums', requireAuth, forumsRouter);
  app.use('/api/messages', requireAuth, messagesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/ai', requireAuth, aiRouter);

  // ========================
  // SOCKET.IO
  // ========================
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  app.set('io', io);

  io.engine.use(sessionMiddleware);

  // Presence store: Map<socketId, { userId, username, currentPage, connectedAt, isTeacher }>
  const presenceStore = new Map();

  io.on('connection', (socket) => {
    const { userId, username, isTeacher } = socket.handshake.auth;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`[Socket] ${username} (${userId}) connected — ${socket.id}`);

    presenceStore.set(socket.id, {
      userId,
      username,
      isTeacher,
      currentPage: 'Dashboard',
      currentWork: null,
      currentWorkTitle: null,
      lastActivity: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      socketId: socket.id,
    });

    broadcastPresence();

    socket.on('student:presence', (data) => {
      const entry = presenceStore.get(socket.id);
      if (entry) {
        entry.currentPage = data.currentPage || 'Unknown';
        entry.lastActivity = new Date().toISOString();
        presenceStore.set(socket.id, entry);
        broadcastPresence();
      }
    });

    // Student viewing work — for live monitoring
    socket.on('student:viewing_work', (data) => {
      const entry = presenceStore.get(socket.id);
      if (entry) {
        entry.currentWork = data.workId || null;
        entry.currentWorkTitle = data.workTitle || null;
        entry.currentPage = data.workId ? 'Viewing Work' : (data.currentPage || 'Dashboard');
        entry.lastActivity = new Date().toISOString();
        presenceStore.set(socket.id, entry);
        broadcastPresence();
      }
    });

    // Periodic activity heartbeat
    socket.on('student:activity', (data) => {
      const entry = presenceStore.get(socket.id);
      if (entry) {
        entry.lastActivity = new Date().toISOString();
        if (data.currentPage) entry.currentPage = data.currentPage;
        presenceStore.set(socket.id, entry);
        broadcastPresence();
      }
    });

    socket.on('student:keystroke', (data) => {
      io.to(`watch:${userId}`).emit('proctor:keystroke', {
        userId,
        username,
        ...data,
      });
    });

    socket.on('admin:watch', (studentId) => {
      socket.join(`watch:${studentId}`);
      console.log(`[Proctor] Admin watching student ${studentId}`);
    });

    socket.on('admin:unwatch', (studentId) => {
      socket.leave(`watch:${studentId}`);
    });

    socket.on('disconnect', () => {
      presenceStore.delete(socket.id);
      broadcastPresence();
      console.log(`[Socket] ${username} disconnected`);
    });
  });

  function broadcastPresence() {
    const users = Array.from(presenceStore.values()).filter((u) => !u.isTeacher);
    io.emit('presence:update', users);
  }

  // ========================
  // SERVE FRONTEND IN PRODUCTION
  // ========================
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });

  // ========================
  // START SERVER
  // ========================
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`\n🟢 Pyramied server running on http://localhost:${PORT}`);
    console.log(`   Default login: admin / admin123`);
    console.log(`   Student login: student / student123\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
