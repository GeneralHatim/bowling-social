import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as api from '../lib/api.js'

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="btn btn-sm btn-secondary"
      style={copied ? { background: 'var(--success-bg)', color: 'var(--success-text)', borderColor: 'transparent' } : {}}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

function InfoCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getSession(id)
      .then(data => { setSession(data); setStatus(data.status) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setSaving(true)
    try {
      await api.updateSession(id, { status: newStatus })
      setStatus(newStatus)
      setSession(prev => ({ ...prev, status: newStatus }))
    } catch { /* keep existing */ }
    setSaving(false)
  }

  if (loading) return <div className="empty" style={{ paddingTop: 120 }}>Loading…</div>
  if (!session) return <div className="empty" style={{ paddingTop: 120 }}>Session not found.</div>

  const fmtDate = new Date(session.date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const whatsappList = session.members
    .map(m => `${m.name}: ${m.whatsapp}`)
    .join('\n')

  const textSummary = [
    '🎳 Bowling Session',
    '',
    `Date:    ${fmtDate}`,
    `Time:    ${session.time_slot}`,
    `Venue:   ${session.alley_name}`,
    session.lane_count ? `Lanes:   ${session.lane_count}` : null,
    `Group:   ${session.members.length} people`,
    '',
    'Members:',
    ...session.members.map((m, i) => `${i + 1}. ${m.name} (${m.whatsapp})`),
  ].filter(l => l !== null).join('\n')

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-left">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/admin')}
            style={{ padding: '5px 10px' }}
          >
            ← Back
          </button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Session #{session.id}</span>
          <StatusBadge status={status} />
        </div>
      </header>

      <main className="main" style={{ maxWidth: 960 }}>

        {/* Session info */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, marginBottom: 20 }}>
            <InfoCell label="Date"  value={fmtDate} />
            <InfoCell label="Time"  value={session.time_slot} />
            <InfoCell label="Venue" value={session.alley_name} />
            {session.lane_count && <InfoCell label="Lanes" value={session.lane_count} />}
            <InfoCell label="Members" value={session.members.length} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status</span>
            <select
              value={status}
              onChange={handleStatusChange}
              disabled={saving}
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
            {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saving…</span>}
          </div>
        </div>

        {/* Members table */}
        <div className="table-wrap" style={{ marginBottom: 20 }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Members ({session.members.length})
          </div>
          <table>
            <thead>
              <tr>
                {['#', 'Name', 'Age', 'Gender', 'Area', 'WhatsApp', 'Occupation', 'Interests'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {session.members.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--text-faint)', width: 32 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.age}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.gender}</td>
                  <td>{m.area}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{m.whatsapp}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.occupation || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.interests || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* WhatsApp numbers */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="copy-row">
            <h3>WhatsApp Numbers</h3>
            <CopyButton text={whatsappList} label="Copy all" />
          </div>
          <pre className="copy-block">{whatsappList}</pre>
        </div>

        {/* Session summary */}
        <div className="card" style={{ padding: 20 }}>
          <div className="copy-row">
            <h3>WhatsApp Summary</h3>
            <CopyButton text={textSummary} label="Copy" />
          </div>
          <pre className="copy-block">{textSummary}</pre>
        </div>

      </main>
    </div>
  )
}
