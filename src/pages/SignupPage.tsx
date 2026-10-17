import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { register, sendOtp } from '../api';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function SignupPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function validateDetails(): string | null {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim();

    if (!cleanPhone) {
      return 'Phone number is required.';
    }
    if (cleanPhone.length < 10) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    if (!cleanFirstName) {
      return 'First name is required.';
    }
    if (!cleanLastName) {
      return 'Last name is required.';
    }
    if (!cleanEmail) {
      return 'Email address is required.';
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return 'Please enter a valid email address (e.g. name@example.com).';
    }
    return null;
  }

  async function handleSendEmailOtp(e?: FormEvent) {
    if (e) e.preventDefault();

    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendOtp({ email: email.trim(), action: 'signup' });
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

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const authData = await register({
        phone: cleanPhone,
        otp: otp.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      toast.success(`Account created! Welcome, ${authData.username || 'User'}!`);
      setAuth(authData);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isFormIncomplete =
    !phone.trim() ||
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim();

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '460px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="auth-title" style={{ margin: '0 0 8px' }}>
            {step === 'details' ? 'Create an account' : 'Verify Email Address'}
          </h1>
          <p style={{ color: 'var(--slate)', fontSize: '14px', margin: 0 }}>
            {step === 'details'
              ? 'Fill in your details to get started'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: '18px' }}>{error}</div>}

        {step === 'details' ? (
          <form onSubmit={handleSendEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate={false}>
            <label className="auth-label">
              <span>
                Phone Number <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
              </span>
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
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/[^\d+]/g, ''));
                    if (error) setError(null);
                  }}
                  autoFocus
                  required
                  style={{ flex: 1, marginTop: 0 }}
                />
              </div>
            </label>

            <div className="auth-field-row" style={{ display: 'flex', gap: '12px' }}>
              <label className="auth-label" style={{ flex: 1 }}>
                <span>
                  First Name <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
                </span>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Rahul"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
              </label>
              <label className="auth-label" style={{ flex: 1 }}>
                <span>
                  Last Name <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
                </span>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Sharma"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
              </label>
            </div>

            <label className="auth-label">
              <span>
                Email Address <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
              </span>
              <input
                className="auth-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || isFormIncomplete}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Sending OTP…' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label className="auth-label">
              6-Digit Verification Code
              <input
                className="auth-input otp-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  if (error) setError(null);
                }}
                autoFocus
                required
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px' }}
              />
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
              <button
                type="button"
                className="modal-link-btn"
                onClick={() => {
                  setStep('details');
                  setOtp('');
                  setError(null);
                }}
              >
                ← Change details
              </button>
              <button
                type="button"
                className="modal-link-btn"
                onClick={() => handleSendEmailOtp()}
                disabled={loading || countdown > 0}
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-links" style={{ marginTop: '24px', textAlign: 'center', fontSize: '13.5px' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ fontWeight: 600, color: 'var(--ink)' }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}