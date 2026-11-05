import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, login, getErrorMessage } from '../api';
import toast from 'react-hot-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { isAuthenticated, setAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Helper to determine redirect target and preserve state (e.g. orderItems from "Buy Now")
  const getRedirectTarget = useCallback(() => {
    const fromLocation = (
      location.state as {
        from?: {
          pathname?: string;
          search?: string;
          hash?: string;
          state?: unknown;
        };
      }
    )?.from;

    if (fromLocation?.pathname) {
      return {
        path: `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`,
        state: fromLocation.state,
      };
    }

    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      return { path: redirectParam, state: undefined };
    }

    return { path: '/', state: undefined };
  }, [location.state, location.search]);

  // If already authenticated, redirect to previous page or home
  useEffect(() => {
    if (isAuthenticated) {
      const target = getRedirectTarget();
      navigate(target.path, { state: target.state, replace: true });
    }
  }, [isAuthenticated, getRedirectTarget, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleSendEmailOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setFieldError('Email address is required.');
      setError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFieldError('Please enter a valid email address.');
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    setError(null);
    setFieldError(null);
    setLoading(true);
    try {
      const resp = await sendOtp({ email: cleanEmail, action: 'login' });

      if (resp.status === 'success') {
        toast.success(resp.message || 'Verification code sent to your email!');
        setStep('otp');
        setCountdown(30);
      } else {
        setError(resp.message || 'Failed to send verification code.');
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to send verification code. Please check your email.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setFieldError('Please enter the 6-digit code.');
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setFieldError('Verification code must be 6 digits.');
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setError(null);
    setFieldError(null);
    setLoading(true);
    try {
      const authData = await login({ email: email.trim(), otp: cleanOtp });

      toast.success(`Welcome back, ${authData.username || 'User'}!`);
      setAuth(authData);

      const target = getRedirectTarget();
      navigate(target.path, { state: target.state, replace: true });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Invalid or expired code. Please try again.');
      setError(msg);
      setFieldError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleResend() {
    if (countdown > 0 || loading) return;
    handleSendEmailOtp();
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className="auth-title" style={{ margin: '0 0 8px' }}>
            {step === 'input' ? 'Sign in to Bazaar' : 'Enter Verification Code'}
          </h1>
          <p style={{ color: 'var(--slate)', fontSize: '14px', margin: 0 }}>
            {step === 'input'
              ? 'Enter your email address to receive a one-time verification code'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '16px' }}>
            {error}
            {(error.toLowerCase().includes('not found') || error.toLowerCase().includes('sign up')) && (
              <div style={{ marginTop: '10px' }}>
                <Link
                  to="/signup"
                  state={location.state}
                  className="auth-submit"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px 14px',
                    fontSize: '13.5px',
                    textDecoration: 'none',
                  }}
                >
                  Create new account →
                </Link>
              </div>
            )}
          </div>
        )}

        {step === 'input' ? (
          <form onSubmit={handleSendEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="auth-label">
              Email address
              <input
                className={`auth-input ${fieldError && step === 'input' ? 'has-error' : ''}`}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                  if (error) setError(null);
                }}
                autoFocus
                required
              />
              {fieldError && step === 'input' && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldError}
                </span>
              )}
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={loading || !email}
            >
              {loading ? 'Sending code…' : 'Send Verification Code'}
            </button>
            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '13.5px', color: 'var(--slate)' }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                state={location.state}
                style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
              >
                Sign up
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="auth-label">
              6-Digit Code
              <input
                className={`auth-input otp-code-input ${fieldError && step === 'otp' ? 'has-error' : ''}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  if (fieldError) setFieldError(null);
                  if (error) setError(null);
                }}
                autoFocus
                required
              />
              {fieldError && step === 'otp' && (
                <span className="field-error-msg" style={{ justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldError}
                </span>
              )}
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & Log in'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                className="modal-link-btn"
                onClick={() => {
                  setStep('input');
                  setOtp('');
                  setError(null);
                }}
              >
                ← Change email
              </button>
              <button
                type="button"
                className="modal-link-btn"
                onClick={handleResend}
                disabled={loading || countdown > 0}
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}