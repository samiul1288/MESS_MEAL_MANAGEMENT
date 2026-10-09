// ============================================================
// MessMate — Routes: Authentication
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Validation helpers
const validateRegistration = (req, res, next) => {
  const { username, email, password, fullName } = req.body;
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters.');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }
  if (!fullName || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (errors.length > 0) {
    req.session.flash = { error: errors.join(' ') };
    return res.redirect('/auth/register');
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    req.session.flash = { error: 'Username and password are required.' };
    return res.redirect('/auth/login');
  }
  next();
};

// GET /auth/register — Show registration form
router.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/register', {
    title: 'Register — MessMate',
    message: res.locals.flash?.error || '',
  });
});

// POST /auth/register — Handle registration
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if username already exists
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (usernameCheck.rowCount > 0) {
      req.session.flash = { error: 'Username is already taken.' };
      return res.redirect('/auth/register');
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rowCount > 0) {
      req.session.flash = { error: 'Email is already registered.' };
      return res.redirect('/auth/register');
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 12);

    // Public registration always creates a member account.
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'member', TRUE)
       RETURNING id, full_name, role, mess_group_id
      `,
      [username.trim(), email.trim(), hashedPassword, fullName.trim()]
    );

    const user = result.rows[0];

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        req.session.flash = { error: 'Could not start your session. Please try again.' };
        return res.redirect('/auth/login');
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.messGroupId = user.mess_group_id || null;
      req.session.username = username;
      req.session.fullName = user.full_name;
      req.session.flash = { success: `Welcome, ${user.full_name}! Your account has been created.` };
      return res.redirect('/');
    });
  } catch (err) {
    console.error('Registration error:', err);
    req.session.flash = { error: 'An error occurred during registration. Please try again.' };
    res.redirect('/auth/register');
  }
});

// GET /auth/login — Show login form
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    title: 'Login — MessMate',
    message: res.locals.flash?.error || '',
  });
});

// POST /auth/login — Handle login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      req.session.flash = { error: 'Invalid username or password' };
      return res.redirect('/auth/login');
    }

    if (!user.is_active) {
      req.session.flash = { error: 'Account is deactivated' };
      return res.redirect('/auth/login');
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        req.session.flash = { error: 'Could not start your session. Please try again.' };
        return res.redirect('/auth/login');
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.messGroupId = user.mess_group_id || null;
      req.session.username = user.username;
      req.session.fullName = user.full_name;
      req.session.flash = { success: 'Welcome back, ' + user.full_name + '!' };
      return res.redirect('/');
    });
  } catch (err) {
    console.error('Login error:', err);
    req.session.flash = { error: 'An error occurred. Please try again.' };
    res.redirect('/auth/login');
  }
});

// POST /auth/logout — State-changing logout action
router.post('/logout', authMiddleware.requireLogin, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res.redirect('/auth/login');
  });
});

module.exports = router;
