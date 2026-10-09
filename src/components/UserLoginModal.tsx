import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, verifyOtp } from '../api';
import toast from 'react-hot-toast';

const PROTECTED_PREFIXES = ['/cart', '/checkout', '/orders', '/profile', '/admin'];

export default function UserLoginModal() {
  const { isLoginModalOpen, closeLoginModal, setAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  function handleClose() {
    closeLoginModal();
    const needsAuth = PROTECTED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
    if (needsAuth) {
      navigate('/');
    }
  }

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (isLoginModalOpen) {
      setStep('email');
      setOtp('');
      setError(null);
      setLoading(false);
    }
  }, [isLoginModalOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isLoginModalOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoginModalOpen, location.pathname]);

  if (!isLoginModalOpen) return null;

  async function handleSendOtp(e?: FormEvent) {
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

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const authData = await verifyOtp({ email: email.trim(), otp: otp.trim() });
      toast.success(`Welcome back, ${authData.username || 'User'}!`);
      setAuth(authData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay user-login-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-card user-login-modal-card"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>
              {step === 'email' ? 'Sign in to Bazaar' : 'Enter Verification Code'}
            </h2>
            <p className="modal-subtitle">
              {step === 'email'
                ? 'Enter your email to receive a secure one-time login code'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && <div className="auth-error modal-error">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="modal-fields">
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
            <button
              className="auth-submit modal-submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending code…' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="modal-fields">
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
              className="auth-submit modal-submit-btn"
              type="submit"
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & Log in'}
            </button>
            <div className="otp-modal-footer">
              <button
                type="button"
                className="modal-link-btn"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError(null);
                }}
              >
                Change email
              </button>
              <button
                type="button"
                className="modal-link-btn"
                onClick={() => handleSendOtp()}
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
