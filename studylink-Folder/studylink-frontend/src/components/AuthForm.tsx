import { useState } from 'react';
import './AuthForm.css';


interface AuthFormProps {
    onLoginSuccess: () => void;
}

export default function AuthForm({ onLoginSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    // Validate password confirmation for registration
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    
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
        // Clear form on success
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        onLoginSuccess();
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }
  
  function handleModeChange(newMode: 'login' | 'register') {
    setMode(newMode);
    setMessage(null);
    // Clear confirm password when switching to login
    if (newMode === 'login') {
      setConfirmPassword('');
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => handleModeChange('register')}
          type="button"
        >
          Register (.edu)
        </button>
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => handleModeChange('login')}
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
            maxLength={100}
            required
          />
          {email.length >= 100 && (
            <div className="email-limit-warning">
              Email should be less than 100 characters
            </div>
          )}
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
        {mode === 'register' && (
          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={8}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <div className="password-mismatch">
                Passwords do not match
              </div>
            )}
          </label>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
        {message && <div className="auth-message">{message}</div>}
      </form>
    </div>
  );
}


