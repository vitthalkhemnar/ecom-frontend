import { useState } from 'react';
import type { User, UserUpdateRequest } from '../../types';
import { getErrorMessage, ApiError } from '../../api';

interface EditUserModalProps {
  user: User;
  onSave: (payload: UserUpdateRequest) => Promise<void>;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

export default function EditUserModal({ user, onSave, onClose }: EditUserModalProps) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [isAdmin, setIsAdmin] = useState(user.isAdmin ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!firstName.trim()) {
      errs.firstName = 'First name is required.';
    } else if (firstName.trim().length < 2) {
      errs.firstName = 'First name must be at least 2 characters.';
    }

    if (!lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!PHONE_REGEX.test(phone.trim().replace(/^(\+91|0)/, ''))) {
      errs.phone = 'Phone must be a valid 10-digit number.';
    }

    return errs;
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const valErrs = validate();
    if (Object.keys(valErrs).length > 0) {
      setFieldErrors(valErrs);
      setError(Object.values(valErrs)[0]);
      return;
    }

    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await onSave({
        id: user.id,
        username: user.username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        isAdmin,
      });
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Could not update user.');
      setError(msg);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Edit User</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--slate)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="modal-form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="modal-fields" noValidate>
          <label className="auth-label">
            Username
            <input className="auth-input" value={user.username} disabled style={{ background: 'var(--sand, #f8f8f8)', cursor: 'not-allowed' }} />
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              First name *
              <input
                className={`auth-input ${fieldErrors.firstName ? 'has-error' : ''}`}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.firstName && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.firstName}
                </span>
              )}
            </label>

            <label className="auth-label">
              Last name *
              <input
                className={`auth-input ${fieldErrors.lastName ? 'has-error' : ''}`}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.lastName && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.lastName}
                </span>
              )}
            </label>
          </div>

          <label className="auth-label">
            Email *
            <input
              className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                if (error) setError(null);
              }}
              required
            />
            {fieldErrors.email && (
              <span className="field-error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.email}
              </span>
            )}
          </label>

          <label className="auth-label">
            Phone *
            <input
              className={`auth-input ${fieldErrors.phone ? 'has-error' : ''}`}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                if (error) setError(null);
              }}
              required
            />
            {fieldErrors.phone && (
              <span className="field-error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.phone}
              </span>
            )}
          </label>

          <label className="admin-role-toggle">
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            Admin access
          </label>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}