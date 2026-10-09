// ============================================================
// MessMate — Routes: Index (Dashboard)
// ============================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard');
const profileController = require('../controllers/profile');

router.get('/hello', (req, res) => {
  res.type('text').send('Hello from MessMate!');
});

// Home page
router.get('/', (req, res) => {
  if (req.session?.userId) {
    const primaryHref = req.session.userRole === 'admin'
      ? '/reports'
      : req.session.userRole === 'member' ? '/dashboard' : '/meals';
    return res.render('index', {
      title: 'MessMate — Meals and accounts, made clear',
      primaryHref,
      primaryLabel: 'Open your dashboard',
    });
  }
  return res.render('index', {
    title: 'MessMate — Meals and accounts, made clear',
    primaryHref: '/auth/register',
    primaryLabel: 'Get started',
  });
});

router.get('/dashboard', auth.isMember, dashboardController.member);

router.get('/profile', auth.requireLogin, profileController.show);

module.exports = router;
