import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserDetails } from '../api';
import type { User } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProfilePage() {
  const { token } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) return;
    getUserDetails(token)
      .then((data) => {
        setUser(Array.isArray(data) ? data[0] : data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="page">
      {/* <h1 className="detail-title">Your profile</h1> */}

      {status === 'loading' && <p className="state-msg">Loading profile…</p>}
      {status === 'error' && <p className="state-msg error">Couldn't load your profile.</p>}

      {status === 'ready' && user && (
        <div className="profile-card">
          <div className="profile-banner" />
          <div className="profile-avatar">{user.firstName.slice(0, 1).toUpperCase() + user.lastName.slice(0, 1).toUpperCase()}</div>
          <div className="profile-identity">
            <h2 className="profile-name">{user.username}</h2>
            <span className="profile-email">{user.email}</span>
          </div>
          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-field-label">Username</span>
              <span className="profile-field-value">{user.username}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">First Name</span>
              <span className="profile-field-value">{user.firstName}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Last Name</span>
              <span className="profile-field-value">{user.lastName}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-value">{user.email}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Phone</span>
              <span className="profile-field-value">{user.phone}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}