// ============================================================
// MessMate — Express Application Configuration
// ============================================================

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ============================================================
// Security Middleware
// ============================================================

// Per-response nonces allow the dashboard's inline chart initialization securely.
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        'https://cdn.jsdelivr.net',
      ],
      'style-src': [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        'https://cdn.jsdelivr.net',
      ],
    },
  },
}));

// ============================================================
// Body Parsing Middleware
// ============================================================

app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 1000 }));
app.use(express.json({ limit: '10kb' }));

// ============================================================
// Session Middleware
// ============================================================

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
  },
};

if (process.env.NODE_ENV === 'production' || process.env.SESSION_STORE === 'postgres') {
  const PgSession = require('connect-pg-simple')(session);
  const { pool } = require('./config/db');
  sessionOptions.store = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: false,
  });
}

app.use(session(sessionOptions));

// ============================================================
// View Engine Setup
// ============================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============================================================
// Static Files
// ============================================================

app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// Flash Messages (using session)
// ============================================================

app.use((req, res, next) => {
  res.locals.flash = {
    success: req.session?.flash?.success || null,
    error: req.session?.flash?.error || null,
  };
  res.locals.currentUser = req.session || null;
  delete req.session.flash;

  const originalRender = res.render.bind(res);
  res.render = (view, options, callback) => {
    let renderOptions = options;
    let renderCallback = callback;
    if (typeof renderOptions === 'function') {
      renderCallback = renderOptions;
      renderOptions = {};
    }
    renderOptions = renderOptions || {};
    originalRender(view, renderOptions, (err, html) => {
      if (err) {
        if (renderCallback) return renderCallback(err);
        return next(err);
      }
      return originalRender('layouts/main', { ...renderOptions, body: html }, renderCallback);
    });
  };
  next();
});

// ============================================================
// Routes
// ============================================================

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const mealsRouter = require('./routes/meals');
const expensesRouter = require('./routes/expenses');
const membersRouter = require('./routes/members');
const reportsRouter = require('./routes/reports');
const paymentsRouter = require('./routes/payments');

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/meals', mealsRouter);
app.use('/expenses', expensesRouter);
app.use('/members', membersRouter);
app.use('/reports', reportsRouter);
app.use('/payments', paymentsRouter);

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
  res.status(404).render('errors/404', { title: '404 — Page Not Found' });
});

// ============================================================
// Error Handler
// ============================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('errors/500', {
    title: '500 — Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message,
  });
});

module.exports = app;
