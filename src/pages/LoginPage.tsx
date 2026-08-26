import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext.tsx';

export default function LoginPage() {
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
      const data = await login({ username, password });
      setAuth(data);
      navigate('/');
    } catch {
      setError('Incorrect username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Log in</h1>
        {error && <p className="auth-error">{error}</p>}
        <label className="auth-label">
          Username
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="auth-label">
          Password
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/signup">Create an account</Link>
        </div>
      </form>
    </div>
  );
}