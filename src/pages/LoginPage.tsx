import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    } else {
      openLoginModal();
    }
  }, [isAuthenticated, navigate, openLoginModal]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 className="auth-title">Welcome to Bazaar</h1>
        <p style={{ color: 'var(--slate)', marginBottom: '20px' }}>
          Please sign in using your email address.
        </p>
        <button
          type="button"
          className="auth-submit"
          onClick={() => openLoginModal()}
        >
          Sign in with Email
        </button>
      </div>
    </div>
  );
}