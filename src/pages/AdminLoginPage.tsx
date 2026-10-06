import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await adminLogin({ username: username.trim(), password });
      setAuth(data);
      toast.success(`Welcome, Admin ${data.username}!`);
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid admin credentials or unauthorized account.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card admin-auth-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--mango-deep)', fontWeight: 700 }}>
            Restricted Access
          </span>
        </div>
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Admin Portal</h1>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--slate)', margin: '0 0 20px' }}>
          Please authenticate with your administrative credentials.
        </p>
        {error && <p className="auth-error">{error}</p>}
        <label className="auth-label">
          Username
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="auth-label">
          Password
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Authenticating…' : 'Log in as Admin'}
        </button>
      </form>
    </div>
  );
}
