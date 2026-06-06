const router = require('express').Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// POST /api/submit — requires login
router.post('/submit', verifyToken, async (req, res) => {
  const { name, age, gender, area, whatsapp, occupation, interests, availability, group_size_pref, bio } = req.body;
  if (!name || !age || !gender || !area || !whatsapp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (account_id, name, age, gender, area, whatsapp, occupation, interests, availability, group_size_pref, bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [req.user.id, name, age, gender, area, whatsapp, occupation, interests, availability || {}, group_size_pref, bio]
    );
    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/profile — check if logged-in user has submitted a profile
router.get('/me/profile', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE account_id = $1', [req.user.id]);
    res.json({ profile: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
