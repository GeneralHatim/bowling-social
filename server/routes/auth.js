const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { signToken } = require('../middleware/auth');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, secretWord } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!secretWord || !secretWord.trim()) return res.status(400).json({ error: 'Secret word required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const passwordHash    = await bcrypt.hash(password, 10);
    const secretWordHash  = await bcrypt.hash(secretWord.trim().toLowerCase(), 10);
    const role = email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'user';
    const { rows } = await pool.query(
      'INSERT INTO accounts (email, password_hash, secret_word_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
      [email.toLowerCase(), passwordHash, secretWordHash, role]
    );
    const account = rows[0];
    res.json({ token: signToken({ id: account.id, email: account.email, role: account.role }), role: account.role });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase()]);
    const account = rows[0];
    if (!account) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL && account.role !== 'admin') {
      await pool.query('UPDATE accounts SET role = $1 WHERE id = $2', ['admin', account.id]);
      account.role = 'admin';
    }
    res.json({ token: signToken({ id: account.id, email: account.email, role: account.role }), role: account.role });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/forgot-password — confirm email step (no email sent)
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });
  // Always return success to avoid account enumeration
  res.json({ success: true });
});

// POST /api/auth/verify-secret-word — verify secret word, return short-lived reset token
router.post('/verify-secret-word', async (req, res) => {
  const email      = (req.body.email      || '').toLowerCase().trim();
  const secretWord = (req.body.secretWord || '').trim();
  if (!email || !secretWord) return res.status(400).json({ error: 'Email and secret word required' });

  try {
    const { rows } = await pool.query('SELECT secret_word_hash FROM accounts WHERE email = $1', [email]);
    const account = rows[0];

    if (!account || !account.secret_word_hash) {
      if (account && !account.secret_word_hash) {
        return res.status(400).json({ error: 'This account was created before secret word support was added. Please contact an admin to reset your password.' });
      }
      // Don't reveal whether the email exists
      return res.status(400).json({ error: "That secret word doesn't match our records." });
    }

    const match = await bcrypt.compare(secretWord.toLowerCase(), account.secret_word_hash);
    if (!match) {
      return res.status(400).json({ error: "That secret word doesn't match our records." });
    }

    const resetToken = signToken({ email, purpose: 'password_reset' });
    res.json({ reset_token: resetToken });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/reset-password — set new password using reset token
router.post('/reset-password', async (req, res) => {
  const { reset_token, password } = req.body;
  if (!reset_token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
    let payload;
    try { payload = jwt.verify(reset_token, JWT_SECRET); } catch { return res.status(400).json({ error: 'Reset session expired, please start again' }); }
    if (payload.purpose !== 'password_reset') return res.status(400).json({ error: 'Invalid token' });
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query('UPDATE accounts SET password_hash=$1 WHERE email=$2', [hash, payload.email]);
    if (!rowCount) return res.status(404).json({ error: 'Account not found' });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
