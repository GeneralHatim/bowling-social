import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../lib/api';
import { LogoStacked } from '../components/Logo';

export default function SignUp() {
  const nav = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (!secretWord.trim()) return setError('Secret word is required');
    setLoading(true);
    try {
      const data = await register(email, password, secretWord.trim());
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      nav(data.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function continueAsGuest() {
    localStorage.setItem('guest_ok', '1');
    nav('/');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <LogoStacked />
        <h1>Create Account</h1>
        <p className="auth-sub">An account keeps your profile synced across devices, so you never fill the form twice.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <div className="field">
            <label>Secret Word <span style={{ fontWeight: 400, color: 'var(--muted, #6f675a)' }}>(for password recovery — remember this!)</span></label>
            <input type="text" value={secretWord} onChange={e => setSecretWord(e.target.value)} required
              placeholder="e.g. a word only you know" autoComplete="off" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="btn btn-ghost" onClick={continueAsGuest} style={{ width: '100%' }}>
          Continue without signing up →
        </button>
        <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
