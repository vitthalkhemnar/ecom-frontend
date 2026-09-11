import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getAdminUsers, updateUser, deleteUser } from '../../api';
import type { User, UserUpdateRequest } from '../../types';
import EditUserModal from './EditUserDetail';

type Status = 'loading' | 'ready' | 'error';
type SortKey = 'name' | 'username' | 'role';

export default function UsersTab() {
  const { token, username: currentUsername } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) return;
    getAdminUsers(token)
      .then((data) => {
        setUsers(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? users.filter((u) =>
          `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase().includes(term)
        )
      : users;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortKey === 'username') return a.username.localeCompare(b.username);
      return Number(b.isAdmin) - Number(a.isAdmin);
    });
  }, [users, search, sortKey]);

  async function handleSave(payload: UserUpdateRequest) {
    if (!token) return;
    try {
      const updated = await updateUser(payload, token);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Updated ${updated.username}`);
    } catch {
      toast.error('Could not update that user.');
      throw new Error('update failed');
    }
  }

  async function handleDelete(user: User) {
    if (!token) return;
    if (!window.confirm(`Delete ${user.username}? This can't be undone.`)) return;
    try {
      const success = await deleteUser(user.id, token);
      if (success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast.success(`Deleted ${user.username}`);
      } else {
        toast.error('Delete did not succeed.');
      }
    } catch {
      toast.error('Could not delete that user.');
    }
  }

  if (status === 'loading') return <p className="state-msg">Loading users…</p>;
  if (status === 'error') return <p className="state-msg error">Couldn't load users.</p>;

  return (
    <div>
      <div className="admin-controls">
        <input
          className="auth-input admin-search"
          placeholder="Search by name, username, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="name">Sort by name</option>
          <option value="username">Sort by username</option>
          <option value="role">Sort by role</option>
        </select>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="state-msg">No users match "{search}".</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td className="admin-cell-muted">@{user.username}</td>
                <td className="admin-cell-muted">{user.email}</td>
                <td className="admin-cell-muted">{user.phone}</td>
                <td>
                  <span className={`variant-stock ${user.isAdmin ? 'in' : 'low'}`}>
                    {user.isAdmin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-edit-btn" onClick={() => setEditingUser(user)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={() => handleDelete(user)}
                      disabled={user.username === currentUsername}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingUser && (
        <EditUserModal user={editingUser} onSave={handleSave} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}