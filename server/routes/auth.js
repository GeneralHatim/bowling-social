const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { signToken } = require('../middleware/auth');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const role = email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'user';
    const { rows } = await pool.query(
      'INSERT INTO accounts (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email.toLowerCase(), hash, role]
    );
    const account = rows[0];
    const token = signToken({ id: account.id, email: account.email, role: account.role });
    res.json({ token, role: account.role });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

    // If this is the super admin email, ensure role is admin
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL && account.role !== 'admin') {
      await pool.query('UPDATE accounts SET role = $1 WHERE id = $2', ['admin', account.id]);
      account.role = 'admin';
    }

    const token = signToken({ id: account.id, email: account.email, role: account.role });
    res.json({ token, role: account.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
