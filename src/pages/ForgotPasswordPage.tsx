import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, getErrorMessage } from '../api';
import toast from 'react-hot-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Email address is required.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    setLoading(true);

    try {
      await forgotPassword(cleanEmail);
      setSubmitted(true);
      toast.success('Password reset instructions sent!');
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to send reset instructions.');
      toast.error(msg);
      setEmailError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <h1 className="auth-title">Reset your password</h1>
        {submitted ? (
          <div>
            <p className="auth-note" style={{ color: 'var(--slate)', lineHeight: 1.5, margin: '12px 0 24px' }}>
              If an account exists for <strong>{email}</strong>, we have sent password reset instructions to your inbox.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link
                to="/login"
                className="auth-submit"
                style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 24px' }}
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="auth-label">
              Email address
              <input
                className={`auth-input ${emailError ? 'has-error' : ''}`}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={loading}
                autoFocus
                required
              />
              {emailError && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {emailError}
                </span>
              )}
            </label>
            <button className="auth-submit" type="submit" disabled={loading || !email}>
              {loading ? 'Sending instructions…' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="auth-links" style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--slate)', fontSize: '13.5px', textDecoration: 'none' }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
