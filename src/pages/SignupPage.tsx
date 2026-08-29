import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext.tsx';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
      const data = await register({ username, firstName, lastName, email, phone, password });
      setAuth(data);
      navigate('/');
    } catch {
      setError('Could not create that account. Username or email may already be taken.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Create an account</h1>
        {error && <p className="auth-error">{error}</p>}
        <div className="auth-field-row">
          <label className="auth-label">
            First name
            <input className="auth-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className="auth-label">
            Last name
            <input className="auth-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
        </div>
        <label className="auth-label">
          Email
          <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="auth-label">
          Phone
          <input className="auth-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="auth-label">
          Username
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="auth-label">
          Password
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
        <div className="auth-links">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </form>
    </div>
  );
}