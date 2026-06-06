const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const { verifyAdmin } = require('../middleware/auth')

router.use(verifyAdmin)

// POST /api/admin/sessions
router.post('/api/admin/sessions', async (req, res) => {
  const { date, time_slot, alley_name, lane_count, user_ids } = req.body

  if (!date || !time_slot || !alley_name) {
    return res.status(400).json({ error: 'date, time_slot, and alley_name are required' })
  }
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'user_ids must be a non-empty array' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO sessions (date, time_slot, alley_name, lane_count)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [date, time_slot, alley_name, lane_count || null]
    )
    const session = rows[0]

    for (const uid of user_ids) {
      await client.query(
        'INSERT INTO session_members (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [session.id, uid]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(session)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// GET /api/admin/sessions
router.get('/api/admin/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, COUNT(sm.user_id)::int AS member_count
       FROM sessions s
       LEFT JOIN session_members sm ON s.id = sm.session_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/admin/sessions/:id
router.get('/api/admin/sessions/:id', async (req, res) => {
  try {
    const [sessionRes, membersRes] = await Promise.all([
      pool.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]),
      pool.query(
        `SELECT u.* FROM users u
         JOIN session_members sm ON u.id = sm.user_id
         WHERE sm.session_id = $1
         ORDER BY u.name`,
        [req.params.id]
      )
    ])

    if (!sessionRes.rows.length) return res.status(404).json({ error: 'Not found' })

    res.json({ ...sessionRes.rows[0], members: membersRes.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/admin/sessions/:id
router.patch('/api/admin/sessions/:id', async (req, res) => {
  const { date, time_slot, alley_name, lane_count, status } = req.body
  const allowed = { date, time_slot, alley_name, lane_count, status }

  const updates = []
  const params = []
  let idx = 1

  for (const [key, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      updates.push(`${key} = $${idx++}`)
      params.push(val)
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' })

  params.push(req.params.id)

  try {
    const result = await pool.query(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
