import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserDetails, updateUser } from '../api';
import type { User } from '../types';
import toast from 'react-hot-toast';

type Status = 'loading' | 'ready' | 'error';

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    getUserDetails()
      .then((data) => {
        const u = Array.isArray(data) ? data[0] : data;
        setUser(u);
        setEmailInput(u?.email || '');
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [isAuthenticated]);

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSavingEmail(true);
    try {
      const updated = await updateUser({
        id: user.id,
        email: emailInput.trim(),
        phone: user.phone,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || user.phone,
        isAdmin: user.isAdmin,
      });
      setUser(updated);
      setEditingEmail(false);
      toast.success('Email updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update email.';
      toast.error(msg);
    } finally {
      setSavingEmail(false);
    }
  }

  const avatarInitials = user
    ? (((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || (user.phone?.slice(-2) || 'U'))
    : 'U';

  const displayName = user
    ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone || 'User')
    : '';

  return (
    <div className="page">
      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      )}
      {status === 'error' && (
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap" style={{ color: 'var(--rust)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-empty-title">Unable to load profile</h2>
          <p className="order-empty-desc">Could not retrieve account details. Please try again.</p>
          <button type="button" className="order-cta-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && user && (
        <div className="profile-card">
          <div className="profile-banner" />
          <div className="profile-avatar">{avatarInitials}</div>
          <div className="profile-identity">
            <h2 className="profile-name">{displayName}</h2>
            <span className="profile-email">{user.email || 'No email associated'}</span>
          </div>
          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-field-label">Mobile Phone</span>
              <span className="profile-field-value">{user.phone || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">First Name</span>
              <span className="profile-field-value">{user.firstName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Last Name</span>
              <span className="profile-field-value">{user.lastName || '—'}</span>
            </div>
            <div className="profile-field" style={{ alignItems: 'flex-start' }}>
              <span className="profile-field-label">Email Address</span>
              {editingEmail ? (
                <form onSubmit={handleSaveEmail} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    className="auth-input"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    autoFocus
                    required
                    style={{ padding: '6px 10px', fontSize: '13.5px', width: '220px' }}
                  />
                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={savingEmail}
                    style={{ padding: '6px 14px', fontSize: '13px', width: 'auto' }}
                  >
                    {savingEmail ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="modal-link-btn"
                    onClick={() => {
                      setEditingEmail(false);
                      setEmailInput(user.email || '');
                    }}
                    style={{ fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="profile-field-value" style={{ color: user.email ? 'inherit' : 'var(--slate)' }}>
                    {user.email || 'Not added yet'}
                  </span>
                  <button
                    type="button"
                    className="modal-link-btn"
                    style={{ fontSize: '12.5px', textDecoration: 'underline', color: 'var(--amber, #d97706)', fontWeight: 600 }}
                    onClick={() => setEditingEmail(true)}
                  >
                    {user.email ? 'Change' : '+ Add Email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}