import { useState } from 'react';
import './AuthForm.css';

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Request failed');
      } else {
        setMessage(mode === 'register' ? `Registered: ${data.email}` : `Logged in: ${data.email}`);
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
          type="button"
        >
          Register (.edu)
        </button>
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
          type="button"
        >
          Login
        </button>
      </div>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
        {message && <div className="auth-message">{message}</div>}
      </form>
    </div>
  );
}


