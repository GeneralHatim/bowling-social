import { useState, useEffect } from 'react';
import { submitForm, getMyProfile } from '../lib/api';
import logo from '../assets/logo.png';

const MUMBAI_AREAS = ['Andheri','Bandra','Borivali','Chembur','Colaba','Dadar','Ghatkopar',
  'Goregaon','Juhu','Kandivali','Kurla','Malad','Mulund','Powai','Santacruz','Thane','Vasai','Virar','Worli'];
const DAYS = ['wednesday'];
// const TIMES = ['morning','afternoon','evening','night'];

export default function IntakeForm() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name:'', age:'', gender:'', area:'', whatsapp:'', occupation:'',
    interests:'', bio:'', group_size_pref:'', availability:{ days:['wednesday'], times:[] }
  });

  useEffect(() => {
    getMyProfile().then(d => {
      if (d.profile) setProfile(d.profile);
      setLoading(false);
    });
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleAvail(type, val) {
    setForm(f => {
      const arr = f.availability[type];
      return { ...f, availability: { ...f.availability, [type]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] } };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await submitForm({ ...form, age: parseInt(form.age) });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  if (loading) return <div className="auth-page"><p>Loading…</p></div>;

  if (profile) return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <img src={logo} alt="The Bowling Circle" className="auth-logo" />
        <h1>You're on the list!</h1>
        <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>
          We have your profile, <strong>{profile.name}</strong>. We'll WhatsApp you when we find a good match.
        </p>
        <div className="copy-block">
          <div><strong>Area:</strong> {profile.area}</div>
          <div><strong>Availability:</strong> {(profile.availability?.days || []).join(', ')}</div>
        </div>
        <button className="btn" style={{ marginTop: 24 }} onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logo} alt="The Bowling Circle" className="auth-logo" />
        <h1>You're in!</h1>
        <p style={{ color: 'var(--text-2)' }}>We'll WhatsApp you when we find a good group for you.</p>
        <button className="btn" style={{ marginTop: 24 }} onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 32 }}>
          <img src={logo} alt="The Bowling Circle" style={{ height: 56 }} />
          <button className="btn" onClick={handleLogout} style={{ fontSize: 13 }}>Sign Out</button>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Join The Bowling Circle</h2>
          <p style={{ color:'var(--text-2)', marginBottom: 24 }}>Tell us about yourself so we can find you the right group.</p>
          <form onSubmit={handleSubmit}>
            <div className="field"><label>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="field"><label>Age *</label>
                <input type="number" min={16} max={80} value={form.age} onChange={e => set('age', e.target.value)} required /></div>
              <div className="field"><label>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
                </select></div>
            </div>
            <div className="field"><label>Area in Mumbai *</label>
              <input list="areas" value={form.area} onChange={e => set('area', e.target.value)} required />
              <datalist id="areas">{MUMBAI_AREAS.map(a => <option key={a} value={a} />)}</datalist></div>
            <div className="field"><label>WhatsApp Number *</label>
              <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required /></div>
            <div className="field"><label>Occupation</label>
              <input value={form.occupation} onChange={e => set('occupation', e.target.value)} /></div>
            <div className="field"><label>Interests / Hobbies</label>
              <input value={form.interests} onChange={e => set('interests', e.target.value)} /></div>
            <div className="field"><label>Available Days</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {DAYS.map(d => (
                  <button type="button" key={d}
                    className='btn btn-primary'
                    style={{ fontSize:12, padding:'4px 12px', textTransform:'capitalize', cursor:'default' }}
                    disabled>{d}</button>
                ))}</div>
              <p style={{ fontSize:12, color:'var(--text-2)', marginTop:8 }}>More days coming soon</p></div>
            <div className="field"><label>Preferred Times</label>
              <p style={{ fontSize:12, color:'var(--text-2)', marginTop:8 }}>Time slots coming soon</p></div>
            <div className="field"><label>Group Size Preference</label>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                {['small (2-4)','medium (5-8)','large (9+)','any'].map(s => (
                  <button type="button" key={s}
                    className={`btn ${form.group_size_pref === s ? 'btn-primary' : ''}`}
                    style={{ fontSize:12, padding:'4px 12px' }}
                    onClick={() => set('group_size_pref', s)}>{s}</button>
                ))}</div></div>
            <div className="field"><label>Anything else to know about you?</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" style={{ width:'100%', padding:'12px' }}>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
