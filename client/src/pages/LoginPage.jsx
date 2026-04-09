import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LiquidGlass } from '@/components/ui/liquid-glass';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sign-up extra fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setEmail('');
    setConfirmPassword('');
    setError('');
  };

  const toggleMode = () => {
    resetForm();
    setIsSignUp((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(username, password, fullName, email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Floating background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <LiquidGlass variant="elevated" distortion className="login-card">
        <img
          src="/favicon.svg"
          alt="Pyramied"
          className="login-logo"
        />

        {/* Tab-like toggle between Sign In and Sign Up */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${!isSignUp ? 'login-tab-active' : ''}`}
            onClick={() => isSignUp && toggleMode()}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${isSignUp ? 'login-tab-active' : ''}`}
            onClick={() => !isSignUp && toggleMode()}
          >
            Sign Up
          </button>
        </div>

        <h1 className="login-heading">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="login-subheading">
          {isSignUp
            ? 'Register as a teacher to start learning'
            : 'Sign in to your Pyramied workspace'}
        </p>

        {error && <div className="login-error">{error}</div>}

        {/* ---- SIGN IN FORM ---- */}
        {!isSignUp && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? <span className="spinner spinner-sm" /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* ---- SIGN UP FORM ---- */}
        {isSignUp && (
          <form className="login-form" onSubmit={handleSignUp}>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-fullname">Full Name</label>
              <input
                id="signup-fullname"
                className="input"
                type="text"
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                className="input"
                type="text"
                placeholder="Choose a username (min 3 characters)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-email">Email <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>(optional)</span></label>
              <input
                id="signup-email"
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-confirm">Confirm Password</label>
              <input
                id="signup-confirm"
                className="input"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? <span className="spinner spinner-sm" /> : 'Create Account'}
            </button>
          </form>
        )}

        <p className="login-footer-text">
          {isSignUp
            ? 'Already have an account? '
            : "Don't have an account? "}
          <button
            type="button"
            className="login-toggle-link"
            onClick={toggleMode}
          >
            {isSignUp ? 'Sign in instead' : 'Sign up as a teacher'}
          </button>
        </p>
      </LiquidGlass>
    </div>
  );
}
