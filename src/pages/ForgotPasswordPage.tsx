import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset your password</h1>
        {submitted ? (
          <p className="auth-note">
            Password reset isn't live on the backend yet — this form is ready to wire up
            to your <code>/auth/forgot-password</code> endpoint once it exists.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="auth-label">
              Email
              <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button className="auth-submit" type="submit">Send reset link</button>
          </form>
        )}
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}