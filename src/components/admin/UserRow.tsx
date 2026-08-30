import { useState } from 'react';
import type { User, UserUpdateRequest } from '../../types';

interface UserRowProps {
  user: User;
  currentUsername: string | null;
  onSave: (payload: UserUpdateRequest) => Promise<void>;
  onDelete: (user: User) => void;
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isAdmin: boolean;
}

export default function UserRow({ user, currentUsername, onSave, onDelete }: UserRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  function startEdit() {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await onSave({ id: user.id, username: user.username, ...form });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing && form) {
    return (
      <div className="admin-user-row editing">
        <div className="admin-user-avatar">{initials}</div>
        <div className="admin-user-edit-fields">
          <div className="admin-name-inputs">
            <input className="auth-input" value={form.firstName} placeholder="First name"
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className="auth-input" value={form.lastName} placeholder="Last name"
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input className="auth-input" value={form.email} placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="auth-input" value={form.phone} placeholder="Phone"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label className="admin-role-toggle">
            <input type="checkbox" checked={form.isAdmin}
              onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
            Admin access
          </label>
        </div>
        <div className="admin-row-actions">
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="admin-cancel-btn" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-user-row">
      <div className="admin-user-avatar">{initials}</div>
      <div className="admin-user-info">
        <div className="admin-user-name-line">
          <span className="admin-user-name">{user.firstName} {user.lastName}</span>
          <span className={`variant-stock ${user.isAdmin ? 'in' : 'low'}`}>
            {user.isAdmin ? 'Admin' : 'User'}
          </span>
        </div>
        <span className="admin-user-username">@{user.username}</span>
        <div className="admin-user-contact">
          <span>{user.email}</span>
          <span className="admin-user-dot">·</span>
          <span>{user.phone}</span>
        </div>
      </div>
      <div className="admin-row-actions">
        <button type="button" className="admin-edit-btn" onClick={startEdit}>Edit</button>
        <button
          type="button"
          className="admin-delete-btn"
          onClick={() => onDelete(user)}
          disabled={user.username === currentUsername}
        >
          Delete
        </button>
      </div>
    </div>
  );
}