import { useState, useEffect } from 'react';
import './AuthForm.css';

// AuthForm doubles as the account dashboard and login/create-account flow used by other pages.
interface AuthFormProps {
    onLoginSuccess: () => void;
    onNavigateHome?: () => void;
    onNavigateToBookmarks?: () => void;
    onNavigateToMyUploads?: () => void;
}

type AccountSection = 'menu' | 'change-password';

export default function AuthForm({ onLoginSuccess, onNavigateHome, onNavigateToBookmarks, onNavigateToMyUploads }: AuthFormProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Account settings state
  const [accountSection, setAccountSection] = useState<AccountSection>('menu');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  
  // Unified password visibility toggle - controls all password fields
  const [showPasswords, setShowPasswords] = useState(false);
  

  function getEmailFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.email || payload?.id || null;
    } catch (err) {
      console.error('Failed to decode token', err);
      return null;
    }
  }

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    setUserEmail(getEmailFromToken(token));
  }, []);

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
        // Store JWT token in localStorage for authenticated requests
        if (data.token) {
          localStorage.setItem('token', data.token);
          setIsLoggedIn(true);
          setUserEmail(getEmailFromToken(data.token));
        }
        setMessage(mode === 'register' ? `Registered: ${data.email || data.user?.email}` : `Logged in: ${data.email || data.user?.email}`);
        // Clear form on success
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        onLoginSuccess();
      }
    } catch (err) {
      setMessage('Network error'+ err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setChangePasswordLoading(true);
    setMessage(null);
    
    // Validate password confirmation
    if (newPassword !== confirmNewPassword) {
      setMessage('New passwords do not match');
      setChangePasswordLoading(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters');
      setChangePasswordLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Password change failed');
      } else {
        setMessage('Password changed successfully');
        // Clear form on success
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setChangePasswordLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserEmail(null);
    setMessage('Logged out successfully');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    onLoginSuccess();
  }
  
  function handleModeChange(newMode: 'login' | 'register') {
    setMode(newMode);
    setMessage(null);
    // Clear confirm password when switching to login
    if (newMode === 'login') {
      setConfirmPassword('');
    }
  }


  // Show account settings if logged in
  if (isLoggedIn) {
  return (
      <div className="auth-page-container">
        {onNavigateHome && (
          <div className="auth-back-link">
            <button type="button" onClick={onNavigateHome} className="back-home-btn">
              ← Go back to home page
            </button>
          </div>
        )}
    <div className="auth-card">
          <div className="account-header">
            <h1 className="auth-welcome">Account Settings</h1>
            {userEmail && (
              <p className="account-email">
                Signed in as <strong>{userEmail}</strong>
              </p>
            )}
          </div>
          
          {accountSection === 'menu' && (
            <div className="account-settings-menu">
              <ul className="account-menu-list">
                <li>
                  <button 
                    type="button"
                    onClick={() => setAccountSection('change-password')}
                    className="account-menu-item"
                  >
                    Change Password
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => {
                      if (onNavigateToBookmarks) {
                        onNavigateToBookmarks();
                      }
                    }}
                    className="account-menu-item"
                  >
                    See Bookmarks
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => {
                      if (onNavigateToMyUploads) {
                        onNavigateToMyUploads();
                      }
                    }}
                    className="account-menu-item"
                  >
                    All Uploads
                  </button>
                </li>
                <li>
        <button
          type="button"
                    onClick={handleLogout}
                    className="account-menu-item logout-item"
        >
                    Log Out
        </button>
                </li>
              </ul>
            </div>
          )}
          
          {accountSection === 'change-password' && (
            <div className="account-settings">
        <button
          type="button"
                onClick={() => setAccountSection('menu')}
                className="back-to-menu-btn"
              >
                ← Back to menu
              </button>
              <h3>Change Password</h3>
              <form onSubmit={handlePasswordChange} className="auth-form">
                <div className="form-field">
                  <label htmlFor="currentPassword">Current Password*</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPasswords(!showPasswords)}
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="newPassword">New Password*</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPasswords(!showPasswords)}
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="confirmNewPassword">Confirm New Password*</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmNewPassword"
                      type={showPasswords ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPasswords(!showPasswords)}
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <div className="field-error">
                      Passwords do not match
                    </div>
                  )}
                </div>
                <button type="submit" className="auth-submit-btn" disabled={changePasswordLoading}>
                  {changePasswordLoading ? 'Changing…' : 'Change Password'}
        </button>
              </form>
              
              {message && (
                <div className={`auth-message ${
                  message.toLowerCase().includes('error') || 
                  message.toLowerCase().includes('failed') || 
                  message.toLowerCase().includes('do not match') || 
                  message.toLowerCase().includes('invalid') || 
                  message.toLowerCase().includes('network error') ||
                  message.toLowerCase().includes('must be at least')
                    ? 'error' 
                    : 'success'
                }`}>
                  {message}
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    );
  }

  // Show login/register form if not logged in
  return (
    <div className="auth-page-container">
      {onNavigateHome && (
        <div className="auth-back-link">
          <button type="button" onClick={onNavigateHome} className="back-home-btn">
            ← Don't want to login? Go back to home page
          </button>
        </div>
      )}
      <div className="auth-card">
        <h1 className="auth-welcome">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login' 
            ? 'Sign in to access your files and bookmarks'
            : 'Join StudyLink to share and discover course materials'}
        </p>
        
      <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Email address*</label>
          <input
              id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            maxLength={100}
            required
          />
          {email.length >= 100 && (
              <div className="field-error">
              Email should be less than 100 characters
            </div>
          )}
          </div>
          
          <div className="form-field">
            <label htmlFor="password">Password*</label>
            <div className="password-input-wrapper">
          <input
                id="password"
            type={showPasswords ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPasswords(!showPasswords)}
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              >
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          
        {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <div className="password-input-wrapper">
            <input
                  id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={8}
              required
            />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPasswords(!showPasswords)}
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              >
                {showPasswords ? "Hide" : "Show"}
              </button>
              </div>
            {confirmPassword && password !== confirmPassword && (
                <div className="field-error">
                Passwords do not match
              </div>
            )}
            </div>
        )}
          
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Working…' : 'Continue'}
        </button>
          
          {message && (
            <div className={`auth-message ${
              message.toLowerCase().includes('error') || 
              message.toLowerCase().includes('failed') || 
              message.toLowerCase().includes('do not match') || 
              message.toLowerCase().includes('invalid') ||
              message.toLowerCase().includes('network error')
                ? 'error' 
                : 'success'
            }`}>
              {message}
            </div>
          )}
      </form>
        
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              <span>Don't have an account?</span>
              <button 
                type="button" 
                onClick={() => handleModeChange('register')}
                className="auth-link"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button 
                type="button" 
                onClick={() => handleModeChange('login')}
                className="auth-link"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


