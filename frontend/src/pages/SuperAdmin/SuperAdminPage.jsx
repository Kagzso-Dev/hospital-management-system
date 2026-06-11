import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuperadminTenants, createTenant, updateTenantStatus, updateTenantPassword, updateTenantUsername, updateTenantName, deleteTenant, updateTenantSmartPad, updateTenantOcr } from '../../api';

/* ── Shared dark background ── */
function PageWrap({ children }) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2d1b4e 50%, #0f172a 100%)' }}
    >
      {children}
    </div>
  );
}

/* ── Create Tenant Modal ── */
function CreateTenantModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await createTenant(form);
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">New Tenant</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Hospital Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Apollo Hospital"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">
              Username <span className="text-gray-400 font-normal">(used to login)</span>
            </label>
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="apollo_hospital"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 4 characters"
                className="w-full px-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-sm" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showPwd
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold disabled:opacity-60 transition text-sm">
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Tenant Card ── */
function TenantCard({ tenant, onStatusChange, onUsernameChange, onPasswordChange, onNameChange, onDelete, onSmartPadChange, onOcrChange }) {
  const [resetting, setResetting] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [changingUser, setChangingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showChangeUser, setShowChangeUser] = useState(false);
  const [changingName, setChangingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showChangeName, setShowChangeName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingSmartPad, setTogglingSmartPad] = useState(false);
  const [togglingOcr, setTogglingOcr] = useState(false);
  const [revealPwd, setRevealPwd] = useState(false);
  const [revealUser, setRevealUser] = useState(false);
  const isActive = tenant.status === 'active';
  const smartPadOn = tenant.smart_pad_enabled !== 0 && tenant.smart_pad_enabled !== false;
  const ocrOn = tenant.ocr_enabled !== 0 && tenant.ocr_enabled !== false;

  const handleChangeName = async () => {
    if (!newName || newName.trim().length < 2) return alert('Name must be at least 2 characters');
    setChangingName(true);
    try {
      const res = await updateTenantName(tenant.id, newName.trim());
      onNameChange(tenant.id, res.data.name);
      setShowChangeName(false);
      setNewName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setChangingName(false);
    }
  };

  const toggleStatus = async () => {
    const next = isActive ? 'suspended' : 'active';
    try {
      await updateTenantStatus(tenant.id, next);
      onStatusChange(tenant.id, next);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleReset = async () => {
    if (!newPwd || newPwd.length < 4) return alert('Password must be at least 4 characters');
    setResetting(true);
    try {
      await updateTenantPassword(tenant.id, newPwd);
      onPasswordChange(tenant.id, newPwd);
      setShowReset(false);
      setNewPwd('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setResetting(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername || newUsername.trim().length < 3) return alert('Username must be at least 3 characters');
    setChangingUser(true);
    try {
      const res = await updateTenantUsername(tenant.id, newUsername.trim());
      onUsernameChange(tenant.id, res.data.username);
      setShowChangeUser(false);
      setNewUsername('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setChangingUser(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTenant(tenant.id);
      onDelete(tenant.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleToggleSmartPad = async () => {
    setTogglingSmartPad(true);
    try {
      await updateTenantSmartPad(tenant.id, !smartPadOn);
      onSmartPadChange(tenant.id, !smartPadOn);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle Smart Pad');
    } finally {
      setTogglingSmartPad(false);
    }
  };

  const handleToggleOcr = async () => {
    setTogglingOcr(true);
    try {
      await updateTenantOcr(tenant.id, !ocrOn);
      onOcrChange(tenant.id, !ocrOn);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle OCR');
    } finally {
      setTogglingOcr(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
      {/* Coloured header strip */}
      <div className={`px-5 py-4 flex items-center justify-between gap-3 ${isActive ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/30' : 'bg-white/5'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-white/40">#{tenant.id}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold tracking-wide ${isActive ? 'bg-green-400/20 text-green-300 border border-green-400/30' : 'bg-red-400/20 text-red-300 border border-red-400/30'}`}>
              {tenant.status.toUpperCase()}
            </span>
          </div>
          <h3 className="text-white font-extrabold text-lg leading-tight truncate">{tenant.name}</h3>
          <p className="text-purple-300 text-xs font-mono mt-0.5">@{tenant.username}</p>
        </div>
        {/* joined date */}
        <div className="text-right shrink-0">
          <p className="text-white/30 text-[10px]">Joined</p>
          <p className="text-white/60 text-xs font-semibold">{new Date(tenant.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Credentials row */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10 bg-black/20">
        {/* Username */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white/30 text-[10px] mb-0.5">Username</p>
            <p className="text-cyan-300 text-xs font-mono truncate">
              {revealUser ? tenant.username : '•'.repeat(Math.min(tenant.username.length, 12))}
            </p>
          </div>
          <button onClick={() => setRevealUser(v => !v)} className="text-white/30 hover:text-white/70 transition shrink-0">
            {revealUser
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>
        {/* Password */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white/30 text-[10px] mb-0.5">Password</p>
            <p className="text-pink-300 text-xs font-mono truncate">
              {revealPwd ? tenant.password : '•'.repeat(Math.min((tenant.password || '').length, 12))}
            </p>
          </div>
          <button onClick={() => setRevealPwd(v => !v)} className="text-white/30 hover:text-white/70 transition shrink-0">
            {revealPwd
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10">
        <div className="px-5 py-3 text-center">
          <div className="text-2xl font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{tenant.doctor_count}</div>
          <div className="text-white/40 text-[11px] mt-0.5">Doctors</div>
        </div>
        <div className="px-5 py-3 text-center">
          <div className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-300 bg-clip-text text-transparent">{tenant.patient_count}</div>
          <div className="text-white/40 text-[11px] mt-0.5">Patients</div>
        </div>
      </div>

      {/* Actions row */}
      <div className="px-5 py-3 flex flex-wrap gap-2">
        <button onClick={toggleStatus}
          className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold transition ${isActive ? 'bg-red-400/15 text-red-400 hover:bg-red-400/25 border border-red-400/30' : 'bg-green-400/15 text-green-400 hover:bg-green-400/25 border border-green-400/30'}`}>
          {isActive ? 'Suspend' : 'Activate'}
        </button>
        <button onClick={() => { setShowChangeUser(v => !v); setShowReset(false); setShowChangeName(false); setConfirmDelete(false); }}
          className="flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25 border border-cyan-400/30 transition">
          Username
        </button>
        <button onClick={() => { setShowReset(v => !v); setShowChangeUser(false); setShowChangeName(false); setConfirmDelete(false); }}
          className="flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20 border border-white/20 transition">
          Reset Pwd
        </button>
        <button onClick={() => { setShowChangeName(v => !v); setShowReset(false); setShowChangeUser(false); setConfirmDelete(false); }}
          className="flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold bg-purple-400/15 text-purple-300 hover:bg-purple-400/25 border border-purple-400/30 transition">
          Edit Name
        </button>
        <button onClick={handleToggleOcr} disabled={togglingOcr}
          className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold transition disabled:opacity-60 ${ocrOn ? 'bg-blue-400/15 text-blue-300 hover:bg-blue-400/25 border border-blue-400/30' : 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30'}`}>
          {togglingOcr ? '...' : ocrOn ? 'OCR ON' : 'OCR OFF'}
        </button>
        <button onClick={handleToggleSmartPad} disabled={togglingSmartPad}
          className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold transition disabled:opacity-60 ${smartPadOn ? 'bg-green-400/15 text-green-300 hover:bg-green-400/25 border border-green-400/30' : 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30'}`}>
          {togglingSmartPad ? '...' : smartPadOn ? 'SmartPad ON' : 'SmartPad OFF'}
        </button>
        <button onClick={() => { setConfirmDelete(true); setShowReset(false); setShowChangeUser(false); setShowChangeName(false); }}
          className="flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-400/30 transition">
          Delete
        </button>
      </div>

      {/* Reset password panel */}
      {showReset && (
        <div className="px-5 pb-4 flex gap-2 border-t border-white/10 pt-3">
          <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            placeholder="New password" type="password"
            className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition" />
          <button onClick={handleReset} disabled={resetting}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-60 transition">
            {resetting ? '...' : 'Save'}
          </button>
        </div>
      )}

      {/* Change username panel */}
      {showChangeUser && (
        <div className="px-5 pb-4 flex gap-2 border-t border-white/10 pt-3">
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
            placeholder={`New username (current: @${tenant.username})`}
            className="flex-1 px-3 py-2 rounded-lg border border-cyan-400/30 bg-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition" />
          <button onClick={handleChangeUsername} disabled={changingUser}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold disabled:opacity-60 transition">
            {changingUser ? '...' : 'Save'}
          </button>
        </div>
      )}

      {/* Change name panel */}
      {showChangeName && (
        <div className="px-5 pb-4 flex gap-2 border-t border-white/10 pt-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={`New name (current: ${tenant.name})`}
            className="flex-1 px-3 py-2 rounded-lg border border-purple-400/30 bg-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition" />
          <button onClick={handleChangeName} disabled={changingName}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-60 transition">
            {changingName ? '...' : 'Save'}
          </button>
        </div>
      )}

      {/* Delete confirmation panel */}
      {confirmDelete && (
        <div className="px-5 pb-4 border-t border-red-400/20 pt-3">
          <p className="text-sm text-white/80 font-medium mb-1">Delete <span className="font-bold text-red-400">{tenant.name}</span>?</p>
          <p className="text-xs text-white/40 mb-3">Permanently removes all doctors, patients, appointments, prescriptions and payments.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} disabled={deleting}
              className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-60 transition">
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard() {
  const navigate = useNavigate();
  const onLogout = () => { sessionStorage.removeItem('superadmin_token'); navigate('/login'); };
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSuperadminTenants()
      .then((res) => setTenants(res.data))
      .catch(() => { sessionStorage.removeItem('superadmin_token'); navigate('/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleStatusChange = (id, status) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));

  const handleUsernameChange = (id, username) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, username } : t));

  const handlePasswordChange = (id, password) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, password } : t));

  const handleNameChange = (id, name) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, name } : t));

  const handleDelete = (id) =>
    setTenants(prev => prev.filter(t => t.id !== id));

  const handleSmartPadChange = (id, enabled) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, smart_pad_enabled: enabled ? 1 : 0 } : t));

  const handleOcrChange = (id, enabled) =>
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ocr_enabled: enabled ? 1 : 0 } : t));

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.username.toLowerCase().includes(search.toLowerCase())
  );

  const active = tenants.filter(t => t.status === 'active').length;
  const totalDoctors = tenants.reduce((s, t) => s + (t.doctor_count || 0), 0);
  const totalPatients = tenants.reduce((s, t) => s + (t.patient_count || 0), 0);

  return (
    <PageWrap>
      <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Superadmin Dashboard</h1>
              <p className="text-white/50 text-xs sm:text-sm mt-0.5">Manage all hospital tenants</p>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <button onClick={() => setShowCreate(true)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs sm:text-sm font-semibold hover:from-purple-500 hover:to-pink-400 transition shadow-lg whitespace-nowrap">
                + New Tenant
              </button>
              <button onClick={onLogout}
                className="px-3 sm:px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm hover:bg-white/20 transition whitespace-nowrap">
                Logout
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {[
              { label: 'Total Tenants', value: tenants.length, color: 'from-purple-500 to-pink-500' },
              { label: 'Active', value: active, color: 'from-green-500 to-emerald-400' },
              { label: 'Doctors', value: totalDoctors, color: 'from-blue-500 to-cyan-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 text-center">
                <div className={`text-xl sm:text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
                <div className="text-white/60 text-[10px] sm:text-xs mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:bg-white/15 transition text-sm" />
          </div>

          {/* Tenant list */}
          {loading ? (
            <div className="text-white/50 text-center py-20 text-sm">Loading tenants...</div>
          ) : filtered.length === 0 ? (
            <div className="text-white/40 text-center py-20 text-sm">
              {search ? 'No tenants match your search.' : 'No tenants yet. Create the first one.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(t => (
                <TenantCard key={t.id} tenant={t} onStatusChange={handleStatusChange} onUsernameChange={handleUsernameChange} onPasswordChange={handlePasswordChange} onNameChange={handleNameChange} onDelete={handleDelete} onSmartPadChange={handleSmartPadChange} onOcrChange={handleOcrChange} />
              ))}
            </div>
          )}

          <p className="text-center text-white/30 text-xs mt-6">{totalPatients} total patients across all tenants</p>
        </div>
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreate={t => setTenants(prev => [...prev, { ...t, doctor_count: 0, patient_count: 0 }])}
        />
      )}
    </PageWrap>
  );
}

/* ── Root ── */
export default function SuperAdminPage() {
  return <Dashboard />;
}
