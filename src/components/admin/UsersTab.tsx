import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getAdminUsers, updateUser, deleteUser } from '../../api';
import UserRow from './UserRow';
import type { User, UserUpdateRequest } from '../../types';

type Status = 'loading' | 'ready' | 'error';
type SortKey = 'name' | 'username' | 'role';

export default function UsersTab() {
  const { token, username: currentUsername } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

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
        <div className="admin-user-list">
          {visibleUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentUsername={currentUsername}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}