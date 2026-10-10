import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, verifyOtp, sendPhoneLoginOtp, verifyPhoneLoginOtp } from '../api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { isAuthenticated, setAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // If already authenticated, redirect to previous page or home
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

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
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendOtp({ email: email.trim() });
      toast.success('Verification code sent to your email!');
      setStep('otp');
      setCountdown(30);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code. Please check your email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await sendPhoneLoginOtp({ phone: cleanPhone });
      toast.success('Verification code sent to your mobile phone!');
      if (res.otp) {
        toast(`Dev OTP: ${res.otp}`, { icon: '🔑', duration: 8000 });
      }
      setStep('otp');
      setCountdown(30);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code to this phone number.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      let authData;
      if (authMethod === 'phone') {
        const cleanPhone = phone.trim().replace(/\s+/g, '');
        authData = await verifyPhoneLoginOtp({ phone: cleanPhone, otp: otp.trim() });
      } else {
        authData = await verifyOtp({ email: email.trim(), otp: otp.trim() });
      }
      toast.success(`Welcome back, ${authData.username || 'User'}!`);
      setAuth(authData);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleResend() {
    if (countdown > 0 || loading) return;
    if (authMethod === 'phone') {
      handleSendPhoneOtp();
    } else {
      handleSendEmailOtp();
    }
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
              ? authMethod === 'phone'
                ? 'Enter your mobile number to receive a one-time verification code'
                : 'Enter your email address to receive a one-time verification code'
              : authMethod === 'phone'
              ? `We sent a 6-digit code via SMS to ${phone}`
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
                  className="auth-submit"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px 14px',
                    fontSize: '13.5px',
                    textDecoration: 'none',
                  }}
                >
                  Create account with Phone OTP →
                </Link>
              </div>
            )}
          </div>
        )}

        {step === 'input' ? (
          authMethod === 'phone' ? (
            <form onSubmit={handleSendPhoneOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="auth-label">
                Mobile Number
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      background: 'var(--sand, #f3f4f6)',
                      border: '1px solid var(--line, #e5e7eb)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--slate)',
                    }}
                  >
                    +91
                  </span>
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="9876543210"
                    maxLength={13}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                    autoFocus
                    required
                    style={{ flex: 1, marginTop: 0 }}
                  />
                </div>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                <button
                  type="button"
                  className="modal-link-btn"
                  style={{ fontSize: '13px', fontWeight: 500 }}
                  onClick={() => {
                    setAuthMethod('email');
                    setError(null);
                  }}
                >
                  Use email instead
                </button>
              </div>

              <button
                className="auth-submit"
                type="submit"
                disabled={loading || phone.trim().length < 10}
              >
                {loading ? 'Sending code…' : 'Send Verification Code'}
              </button>

              <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '13.5px', color: 'var(--slate)' }}>
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
                >
                  Sign up
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="auth-label">
                Email address
                <input
                  className="auth-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                <button
                  type="button"
                  className="modal-link-btn"
                  style={{ fontSize: '13px', fontWeight: 500 }}
                  onClick={() => {
                    setAuthMethod('phone');
                    setError(null);
                  }}
                >
                  Use phone instead
                </button>
              </div>

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
                  style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
                >
                  Sign up
                </Link>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="auth-label">
              6-Digit Code
              <input
                className="auth-input otp-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
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
                ← Change {authMethod === 'phone' ? 'phone number' : 'email'}
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