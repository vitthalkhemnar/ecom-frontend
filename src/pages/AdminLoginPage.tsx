import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, getErrorMessage, ApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!username.trim()) {
      errs.username = 'Admin username is required.';
    } else if (username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 4) {
      errs.password = 'Password must be at least 4 characters.';
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const valErrs = validate();
    if (Object.keys(valErrs).length > 0) {
      setFieldErrors(valErrs);
      setError(Object.values(valErrs)[0]);
      return;
    }

    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await adminLogin({ username: username.trim(), password });
      setAuth(data);
      toast.success(`Welcome, Admin ${data.username}!`);
      navigate('/admin');
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Invalid admin credentials or unauthorized account.');
      setError(msg);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFieldErrors({ password: msg });
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card admin-auth-card" onSubmit={handleSubmit} noValidate>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--mango-deep)', fontWeight: 700 }}>
            Restricted Access
          </span>
        </div>
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Admin Portal</h1>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--slate)', margin: '0 0 20px' }}>
          Please authenticate with your administrative credentials.
        </p>

        {error && (
          <div className="auth-error" style={{ marginBottom: '16px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <label className="auth-label">
          Username
          <input
            className={`auth-input ${fieldErrors.username ? 'has-error' : ''}`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
              if (error) setError(null);
            }}
            autoFocus
            required
          />
          {fieldErrors.username && (
            <span className="field-error-msg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {fieldErrors.username}
            </span>
          )}
        </label>

        <label className="auth-label">
          Password
          <input
            className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              if (error) setError(null);
            }}
            required
          />
          {fieldErrors.password && (
            <span className="field-error-msg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {fieldErrors.password}
            </span>
          )}
        </label>

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Authenticating…' : 'Log in as Admin'}
        </button>
      </form>
    </div>
  );
}
