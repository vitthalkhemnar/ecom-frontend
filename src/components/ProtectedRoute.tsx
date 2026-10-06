import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, openLoginModal } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      openLoginModal();
    }
  }, [isAuthenticated, openLoginModal]);

  if (!isAuthenticated) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px' }}>Authentication Required</h2>
        <p style={{ color: 'var(--slate)', marginBottom: '24px' }}>
          Please log in to your account to view this page.
        </p>
        <button
          type="button"
          className="auth-submit"
          style={{ width: 'auto', padding: '10px 24px', margin: '0 auto', display: 'inline-block' }}
          onClick={() => openLoginModal()}
        >
          Log in with Email
        </button>
      </div>
    );
  }

  return <>{children}</>;
}