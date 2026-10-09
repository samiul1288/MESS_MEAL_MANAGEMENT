// ============================================================
// MessMate — Authentication Middleware
// ============================================================

// Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

// Check if user is an admin
function isAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/auth/login');
  if (req.session.userRole === 'admin') return next();
  return res.status(403).render('errors/403', { title: '403 — Forbidden' });
}

function isAdminOrMember(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/auth/login');
  if (['admin', 'member'].includes(req.session.userRole)) return next();
  return res.status(403).render('errors/403', { title: '403 — Forbidden' });
}

// Check if user is a manager
function isManager(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'manager') {
    return next();
  }
  res.redirect('/auth/login');
}

// Check if user is a member
function isMember(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'member') {
    return next();
  }
  res.redirect('/auth/login');
}

// Check if user has one of the specified roles
function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.session && req.session.userId && allowedRoles.includes(req.session.userRole)) {
      return next();
    }
    res.status(403).render('errors/403', { title: '403 — Forbidden' });
  };
}

// Require user to be authenticated
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

// Require user to have one of the specified roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.session && req.session.userId && allowedRoles.includes(req.session.userRole)) {
      return next();
    }
    // Redirect based on user's actual role
    const roleMap = {
      admin: '/reports',
      manager: '/reports',
      member: '/reports',
    };
    const redirectTo = roleMap[req.session?.userRole] || '/auth/login';
    res.redirect(redirectTo);
  };
}

// Check if user belongs to a specific mess group
function belongsToMessGroup(messGroupId) {
  return (req, res, next) => {
    if (req.session && req.session.userId && req.session.messGroupId === messGroupId) {
      return next();
    }
    res.status(403).render('errors/403', { title: '403 — Forbidden' });
  };
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isAdminOrMember,
  isManager,
  isMember,
  hasRole,
  requireLogin,
  requireRole,
  belongsToMessGroup,
};
