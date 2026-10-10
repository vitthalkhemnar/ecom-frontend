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
      {status === 'loading' && <p className="state-msg">Loading profile…</p>}
      {status === 'error' && <p className="state-msg error">Couldn't load your profile.</p>}

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