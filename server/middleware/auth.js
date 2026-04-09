function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireTeacher(req, res, next) {
  if (!req.session || !req.session.isTeacher) {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  next();
}

module.exports = { requireAuth, requireTeacher };
