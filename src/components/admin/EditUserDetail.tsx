import { useState } from 'react';
import type { User, UserUpdateRequest } from '../../types';

interface EditUserModalProps {
  user: User;
  onSave: (payload: UserUpdateRequest) => Promise<void>;
  onClose: () => void;
}

export default function EditUserModal({ user, onSave, onClose }: EditUserModalProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ id: user.id, username: user.username, firstName, lastName, email, phone, isAdmin });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit user</h2>

        <div className="modal-fields">
          <label className="auth-label">
            Username
            <input className="auth-input" value={user.username} disabled />
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              First name
              <input className="auth-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="auth-label">
              Last name
              <input className="auth-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>

          <label className="auth-label">
            Email
            <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="auth-label">
            Phone
            <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label className="admin-role-toggle">
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            Admin access
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}