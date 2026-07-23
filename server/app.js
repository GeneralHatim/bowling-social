require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

// ── Security headers (XSS, clickjacking, MIME sniffing, CSP) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],   // Vite bundles need inline
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());

// ── Body size cap — 20kb is more than enough for a form ──
app.use(express.json({ limit: '20kb' }));

// ── Rate limiters ──
// Auth: 10 attempts per IP per 15 min (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
});

// Secret word: 5 attempts per email per 15 min (tighter, keyed by email not IP)
const secretWordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
  keyGenerator: (req) => (req.body?.email || req.ip).toLowerCase(),
});

// Submit: 8 submissions per IP per hour (spam protection)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' },
  skip: (req) => req.path !== '/submit',   // only /api/submit
});

// Reveal secret: 5 attempts per IP per 15 min (brute-force protection on reveal password)
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reveal attempts. Please wait 15 minutes and try again.' },
});

app.use('/api/auth/verify-secret-word', secretWordLimiter);
app.use('/api/auth',                    authLimiter,   require('./routes/auth'));
app.use('/api',                         submitLimiter, require('./routes/public'));
app.use('/api/admin/reveal-secret',     revealLimiter);
app.use('/api/admin',                                  require('./routes/admin'));

module.exports = app;
