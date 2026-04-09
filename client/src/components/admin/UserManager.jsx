import { useState, useEffect } from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { api } from '../../utils/api';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', full_name: '', password: '', email: '', is_teacher: false });
  const [error, setError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', full_name: '', password: '', email: '', is_teacher: false });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, full_name: u.full_name, password: '', email: u.email || '', is_teacher: !!u.is_teacher });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, form);
      } else {
        await api.post('/users', form);
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSuspend = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { ...u, is_suspended: !u.is_suspended });
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('csv', file);
    try {
      await api.upload('/users/bulk', formData);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create, edit, and manage teacher accounts</p>
        </div>
        <div className="flex gap-sm">
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            📁 CSV Upload
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary" onClick={openCreate} id="btn-create-user">
            + New User
          </button>
        </div>
      </div>

      <LiquidGlass variant="solid">
        <div style={{ padding: 'var(--space-md)' }}>
          {loading ? (
            <div className="flex justify-center" style={{ padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No users yet</div>
              <div className="empty-state-text">Create your first teacher account to get started.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="avatar avatar-sm">{u.full_name?.charAt(0)}</div>
                        {u.full_name}
                      </div>
                    </td>
                    <td className="text-muted">{u.username}</td>
                    <td>
                      <span className={`badge ${u.is_teacher ? 'badge-info' : 'badge-neutral'}`}>
                        {u.is_teacher ? 'Supervisor' : 'Teacher'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_suspended ? 'badge-danger' : 'badge-success'}`}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-xs" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        <button
                          className={`btn btn-sm ${u.is_suspended ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => toggleSuspend(u)}
                        >
                          {u.is_suspended ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </LiquidGlass>

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content liquid-glass-modal" style={{ padding: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
              {editUser ? 'Edit User' : 'Create User'}
            </h2>
            {error && <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-md">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Username</label>
                <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!editUser ? { required: true } : {})} />
              </div>
              <label className="checkbox-wrapper">
                <div className={`checkbox ${form.is_teacher ? 'checked' : ''}`} onClick={() => setForm({ ...form, is_teacher: !form.is_teacher })}>
                  {form.is_teacher && '✓'}
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Supervisor role</span>
              </label>
              <div className="flex gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editUser ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
