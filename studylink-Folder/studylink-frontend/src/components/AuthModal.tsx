import React, { useState } from 'react';
import './AuthModal.css';

// Lightweight auth modal used by bookmark/upload flows to gate actions without leaving the page.
interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
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
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        setMessage(mode === 'register' ? `Registered: ${data.email || data.user?.email}` : `Logged in: ${data.email || data.user?.email}`);
        setTimeout(() => {
          onLoginSuccess();
          onClose();
        }, 1000);
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>
        <h2 className="auth-modal-title">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="auth-modal-subtitle">
          {mode === 'login' 
            ? 'Sign in to access your files and bookmarks'
            : 'Join StudyLink to share and discover course materials'}
        </p>
        
        <form onSubmit={handleSubmit} className="auth-modal-form">
          <div className="form-field">
            <label htmlFor="modal-email">Email address*</label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              maxLength={100}
              required
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="modal-password">Password*</label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>
          
          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="modal-confirm-password">Confirm Password*</label>
              <input
                id="modal-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                minLength={8}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <div className="field-error">
                  Passwords do not match
                </div>
              )}
            </div>
          )}
          
          <button type="submit" className="auth-modal-submit-btn" disabled={loading}>
            {loading ? 'Working…' : 'Continue'}
          </button>
          
          {message && (
            <div className={`auth-modal-message ${message.includes('error') || message.includes('Failed') || message.includes('do not match') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </form>
        
        <div className="auth-modal-switch">
          {mode === 'login' ? (
            <>
              <span>Don't have an account?</span>
              <button 
                type="button" 
                onClick={() => {
                  setMode('register');
                  setMessage(null);
                }}
                className="auth-modal-link"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button 
                type="button" 
                onClick={() => {
                  setMode('login');
                  setMessage(null);
                }}
                className="auth-modal-link"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

