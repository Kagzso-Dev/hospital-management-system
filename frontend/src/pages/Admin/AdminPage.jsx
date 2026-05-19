import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AnalyticsDashboard from './AnalyticsDashboard';
import CollectionReport from './CollectionReport';

const api = axios.create({ baseURL: '/api/admin' });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('tenant_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_info');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// seed new doctor with default Mon-Sat schedule after creation
const seedNewDoctorSchedule = async (doctorId) => {
  for (let day = 1; day <= 6; day++) {
    await api.put('/availability/weekly', {
      doctor_id: doctorId, day_of_week: day,
      is_available: 1, start_time: '09:00', end_time: '17:00', slot_duration: 15,
    });
  }
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_LABEL = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Weekly schedule row ──────────────────────────────────────────────────────
function WeekRow({ doc, row, onSave }) {
  const [form, setForm] = useState({
    is_available: row?.is_available ?? 1,
    start_time: row?.start_time ?? '09:00',
    end_time: row?.end_time ?? '17:00',
    slot_duration: row?.slot_duration ?? 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/availability/weekly', {
        doctor_id: doc.id,
        day_of_week: row.day_of_week,
        ...form,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave();
    } catch {}
    setSaving(false);
  };

  return (
    <div className={`py-2 px-3 rounded-lg text-sm ${form.is_available ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
      {/* Row 1: day + toggle + save (always visible) */}
      <div className="flex items-center gap-2">
        <div className="w-8 font-medium text-gray-700 flex-shrink-0">{DOW_LABEL[row.day_of_week]}</div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={!!form.is_available}
            onChange={(e) => setForm({ ...form, is_available: e.target.checked ? 1 : 0 })}
          />
          <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>

        {/* sm+: inline time fields */}
        {!!form.is_available && (
          <div className="hidden sm:flex items-center gap-2 flex-1">
            <input type="time" className="input py-1 text-xs" value={form.start_time} disabled={!form.is_available}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <input type="time" className="input py-1 text-xs" value={form.end_time} disabled={!form.is_available}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            <select className="input py-1 text-xs" value={form.slot_duration} disabled={!form.is_available}
              onChange={(e) => setForm({ ...form, slot_duration: Number(e.target.value) })}>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>
        )}
        {!form.is_available && <div className="flex-1 text-xs text-gray-400 hidden sm:block">Day off</div>}

        <div className="ml-auto flex-shrink-0">
          <button onClick={save} disabled={saving || saved}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1
              ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}
              disabled:opacity-50`}>
            {saving ? '...' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Row 2 (mobile only): time fields when available */}
      {!!form.is_available && (
        <div className="sm:hidden mt-2 grid grid-cols-1 xs:grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Start</div>
            <input type="time" className="input py-1 text-xs" value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">End</div>
            <input type="time" className="input py-1 text-xs" value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Slot</div>
            <select className="input py-1 text-xs" value={form.slot_duration}
              onChange={(e) => setForm({ ...form, slot_duration: Number(e.target.value) })}>
              <option value={10}>10 m</option>
              <option value={15}>15 m</option>
              <option value={20}>20 m</option>
              <option value={30}>30 m</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Date override panel ──────────────────────────────────────────────────────
function DateOverride({ doc, allDoctors, onClose }) {
  const [date, setDate] = useState(localToday());
  const [override, setOverride] = useState(null);
  const [form, setForm] = useState({ is_available: 1, start_time: '09:00', end_time: '17:00', slot_duration: 15 });
  const [appointments, setAppointments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignDone, setReassignDone] = useState(null);

  const loadDate = async (d) => {
    const [{ data: avail }, { data: apts }] = await Promise.all([
      api.get('/availability', { params: { doctor_id: doc.id, date: d } }),
      api.get('/appointments', { params: { doctor_id: doc.id, date: d } }),
    ]);
    setOverride(avail);
    setForm({
      is_available: avail?.is_available ?? 1,
      start_time: avail?.start_time ?? '09:00',
      end_time: avail?.end_time ?? '17:00',
      slot_duration: avail?.slot_duration ?? 15,
    });
    setAppointments(apts);
    setReassignDone(null);
    setReassignTo('');
  };

  useEffect(() => { loadDate(date); }, [date]);

  const saveOverride = async () => {
    setSaving(true);
    await api.put('/availability/date', { doctor_id: doc.id, date, ...form });
    setSaving(false);
    loadDate(date);
  };

  const doReassign = async () => {
    if (!reassignTo) return;
    setReassigning(true);
    const { data } = await api.post('/reassign', {
      from_doctor_id: doc.id,
      to_doctor_id: Number(reassignTo),
      date,
    });
    setReassignDone(data.reassigned);
    setReassigning(false);
    loadDate(date);
  };

  const waitingApts = appointments.filter((a) => a.status === 'waiting');
  const otherDoctors = allDoctors.filter((d) => d.id !== doc.id && d.is_active);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">{doc.name}</h3>
            <p className="text-sm text-gray-500">{doc.specialization} — Date Override</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Date picker */}
          <div>
            <label className="label">Select Date</label>
            <input
              type="date"
              className="input max-w-xs"
              value={date}
              min={localToday()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Availability toggle */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">Available on this date?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked ? 1 : 0 })}
                />
                <div className="w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            {!!form.is_available && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Start Time</label>
                  <input type="time" className="input py-1 text-sm" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">End Time</label>
                  <input type="time" className="input py-1 text-sm" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">Slot</label>
                  <select className="input py-1 text-sm" value={form.slot_duration}
                    onChange={(e) => setForm({ ...form, slot_duration: Number(e.target.value) })}>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={saveOverride}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? 'Saving...' : 'Save for this Date'}
            </button>
          </div>

          {/* Appointments on this date */}
          {appointments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                Appointments on {date}
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {appointments.length} total
                </span>
                {waitingApts.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {waitingApts.length} waiting
                  </span>
                )}
              </h4>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium">{a.patient_name}</span>
                      <span className="text-gray-500 ml-2 text-xs">{a.patient_code} · {a.time_slot}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                      a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>

              {/* Reassign section — only if doctor is unavailable and there are waiting apts */}
              {!form.is_available && waitingApts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-800">
                    Doctor marked unavailable — reassign {waitingApts.length} waiting appointment{waitingApts.length > 1 ? 's' : ''}?
                  </p>
                  <div className="flex gap-2">
                    <select
                      className="input flex-1"
                      value={reassignTo}
                      onChange={(e) => setReassignTo(e.target.value)}
                    >
                      <option value="">— Select doctor —</option>
                      {otherDoctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                    <button
                      onClick={doReassign}
                      disabled={!reassignTo || reassigning}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                    >
                      {reassigning ? 'Moving...' : 'Reassign'}
                    </button>
                  </div>
                  {reassignDone !== null && (
                    <p className="text-sm text-green-700 font-medium">
                      {reassignDone} appointment{reassignDone !== 1 ? 's' : ''} reassigned successfully.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {appointments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No appointments on this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Doctor Modal ─────────────────────────────────────────────────────────
function AddDoctorModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', specialization: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.password.trim()) { setError('Password is required to protect dashboard access'); return; }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('tenant_token');
      await axios.post('/api/doctors', form, { headers: { Authorization: `Bearer ${token}` } });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add doctor');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add New Doctor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Specialization</label>
            <input className="input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Dashboard Password *</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Required to access doctor dashboard"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Staff will need this password to open the doctor's dashboard.</p>
          </div>
          <p className="text-xs text-gray-400">Default schedule (Mon–Sat, 09:00–17:00, 15 min slots) will be created automatically.</p>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Adding...' : 'Add Doctor'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteDoctorModal({ doc, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/doctors/${doc.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove doctor. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Remove Doctor?</h3>
            <p className="text-gray-500 text-sm mt-1">
              <span className="font-semibold text-gray-700">{doc.name}</span> will be deactivated and hidden from all panels. Existing appointments are preserved.
            </p>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={confirm} disabled={deleting} className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50">
              {deleting ? 'Removing...' : 'Yes, Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ doc, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.trim().length < 4) { setError('Password must be at least 4 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/doctors/${doc.id}/password`, { password });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
    setSaving(false);
  };

  const eyeOpen = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  const eyeOff = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Reset Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">{doc.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-green-600 text-sm bg-green-50 p-2 rounded">Password updated successfully!</div>}
          <div>
            <label className="label">New Password *</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 4 characters"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? eyeOff : eyeOpen}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm Password *</label>
            <div className="relative">
              <input
                className={`input pr-9 ${confirm && password && confirm === password ? 'border-green-400 focus:ring-green-300' : ''}`}
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
              {confirm && password && confirm === password && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
            {confirm && password && confirm === password && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Passwords match
              </p>
            )}
            {confirm && password && confirm !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={saving || success}>
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Substitute Doctor Modal ──────────────────────────────────────────────────
function SubstituteModal({ doc, dow, currentSubId, allDoctors, onClose, onSaved }) {
  const [subId, setSubId] = useState(currentSubId ? String(currentSubId) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const weekly = (doc.availability || []).filter((a) => a.date === null);
    const row = weekly.find((r) => r.day_of_week === dow) || {
      is_available: 0, start_time: '09:00', end_time: '17:00', slot_duration: 15,
    };
    await api.put('/availability/weekly', {
      doctor_id: doc.id,
      day_of_week: dow,
      is_available: row.is_available,
      start_time: row.start_time,
      end_time: row.end_time,
      slot_duration: row.slot_duration,
      substitute_doctor_id: subId ? Number(subId) : null,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const others = allDoctors.filter((d) => d.id !== doc.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Assign Cover Doctor</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {doc.name} · {DAYS[dow - 1]} (Off day)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Cover Doctor</label>
            <select className="input" value={subId} onChange={(e) => setSubId(e.target.value)}>
              <option value="">— No cover assigned —</option>
              {others.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>

          {subId && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {others.find((d) => String(d.id) === subId)?.name} will appear as cover for {DAYS[dow - 1]}.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Timetable View ───────────────────────────────────────────────────────────
const DOC_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  'bg-indigo-500', 'bg-teal-500',
];
const DOC_LIGHT = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-rose-50 border-rose-200 text-rose-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-teal-50 border-teal-200 text-teal-800',
];

function TimetableView({ doctors, onOverride, onLoad }) {
  const [subTarget, setSubTarget] = useState(null); // { doc, dow, slot }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Doctors</p>
        <div className="flex flex-wrap gap-3">
          {doctors.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${DOC_COLORS[i % DOC_COLORS.length]}`} />
              <span className="text-sm text-gray-700 font-medium">{doc.name}</span>
              <span className="text-xs text-gray-400">({doc.specialization})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Days × Doctors */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-20">Day</th>
              {doctors.map((doc, i) => (
                <th key={doc.id} className="px-3 py-3 text-center min-w-[150px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${DOC_COLORS[i % DOC_COLORS.length]}`} />
                    <span className="font-semibold text-gray-800 text-xs leading-tight">{doc.name.replace('Dr. ', '')}</span>
                    <span className="text-gray-400 font-normal text-xs">{doc.specialization}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
              const isWeekend = dow === 7;
              return (
                <tr key={dow} className={`border-b last:border-0 ${isWeekend ? 'bg-gray-50/60' : 'hover:bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    <div>{DAYS[dow - 1]}</div>
                    {isWeekend && <div className="text-xs text-gray-400 font-normal">Weekend</div>}
                  </td>
                  {doctors.map((doc, i) => {
                    const weekly = (doc.availability || []).filter((a) => a.date === null);
                    const slot = weekly.find((r) => r.day_of_week === dow);
                    const on = slot?.is_available;
                    return (
                      <td key={doc.id} className="px-3 py-3 text-center">
                        {on ? (
                          <div
                            className={`inline-flex flex-col items-center rounded-xl border px-3 py-2 cursor-pointer hover:shadow-md transition-shadow ${DOC_LIGHT[i % DOC_LIGHT.length]}`}
                            onClick={() => onOverride(doc)}
                            title="Click to set date override"
                          >
                            <span className="font-semibold text-xs">{slot.start_time} – {slot.end_time}</span>
                            <span className="text-xs opacity-70 mt-0.5">{slot.slot_duration} min slots</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {/* Off badge */}
                            <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium">
                              Off
                            </span>
                            {/* Cover doctor if assigned */}
                            {slot?.substitute_name ? (
                              <button
                                onClick={() => setSubTarget({ doc, dow, slot })}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-semibold hover:bg-amber-200 transition"
                                title="Click to change cover doctor"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {slot.substitute_name.replace('Dr. ', '')}
                              </button>
                            ) : (
                              <button
                                onClick={() => setSubTarget({ doc, dow, slot })}
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border border-dashed border-gray-300 text-gray-400 text-[10px] hover:border-blue-400 hover:text-blue-500 transition"
                                title="Assign cover doctor"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Assign cover
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {doctors.map((doc, i) => {
          const weekly = (doc.availability || []).filter((a) => a.date === null);
          const activeDays = weekly.filter((r) => r.is_available).length;
          const coveredDays = weekly.filter((r) => !r.is_available && r.substitute_name).length;
          const sample = weekly.find((r) => r.is_available);
          return (
            <div key={doc.id} className="card py-3 text-center">
              <div className={`w-8 h-8 rounded-full ${DOC_COLORS[i % DOC_COLORS.length]} text-white flex items-center justify-center font-bold text-xs mx-auto mb-2`}>
                {doc.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="font-semibold text-gray-800 text-sm">{activeDays} days/week</div>
              {coveredDays > 0 && (
                <div className="text-xs text-amber-600 mt-0.5">{coveredDays} day{coveredDays > 1 ? 's' : ''} covered</div>
              )}
              {sample && (
                <div className="text-xs text-gray-400 mt-0.5">{sample.slot_duration} min slots</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Substitute assignment modal */}
      {subTarget && (
        <SubstituteModal
          doc={subTarget.doc}
          dow={subTarget.dow}
          currentSubId={subTarget.slot?.substitute_doctor_id}
          allDoctors={doctors}
          onClose={() => setSubTarget(null)}
          onSaved={onLoad}
        />
      )}
    </div>
  );
}

// ── Analytics View ────────────────────────────────────────────────────────────
function fmtD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function MiniBarChart({ bars, color = '#3b82f6' }) {
  if (!bars?.length) return (
    <div className="flex items-center justify-center h-28 text-gray-400 text-sm">No data</div>
  );
  const max = Math.max(...bars.map(b => Number(b.value)), 1);
  return (
    <div className="flex gap-px sm:gap-0.5 items-end" style={{ height: '112px' }}>
      {bars.map((bar, i) => {
        const val = Number(bar.value);
        const bh = Math.max((val / max) * 78, val > 0 ? 2 : 0);
        return (
          <div key={i} title={`${bar.label}: ${val}`}
            className="flex-1 flex flex-col items-center justify-end"
            style={{ height: '112px' }}
          >
            {val > 0 && (
              <span style={{ fontSize: '8px', color: '#6b7280', lineHeight: 1 }}>{val}</span>
            )}
            <div style={{
              height: `${bh}px`, width: '100%',
              backgroundColor: bar.color || color,
              borderRadius: '2px 2px 0 0',
              minHeight: val > 0 ? '2px' : 0,
            }} />
            <span style={{
              fontSize: '8px', color: '#9ca3af', lineHeight: 1,
              marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: '100%',
            }}>{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsView() {
  const todayStr = fmtD(new Date());
  const [from, setFrom] = useState(todayStr);
  const [to,   setTo  ] = useState(todayStr);
  const [data,    setData   ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState('');

  const load = async (f, t) => {
    setLoading(true); setError('');
    try {
      const { data: res } = await api.get(`/analytics?from=${f}&to=${t}`);
      setData(res);
    } catch { setError('Failed to load analytics'); }
    setLoading(false);
  };

  useEffect(() => { load(from, to); }, []);

  const applyPreset = (days) => {
    const t = new Date();
    const f = new Date(t); f.setDate(f.getDate() - days + 1);
    const tf = fmtD(f), tt = fmtD(t);
    setFrom(tf); setTo(tt); load(tf, tt);
  };

  if (loading && !data) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  );
  if (error) return <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl">{error}</div>;
  if (!data)  return null;

  const { summary, byDoctor, dailyTrend, patientStats, peakHours } = data;

  const cards = [
    { label: 'Total Appointments', value: Number(summary.total      || 0), color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
    { label: 'Completed',          value: Number(summary.completed  || 0), color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100'  },
    { label: 'Pending',            value: Number(summary.waiting    || 0) + Number(summary.in_progress || 0), color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
    { label: 'Cancelled',          value: Number(summary.cancelled  || 0), color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-100'    },
    { label: 'Unique Patients',    value: Number(patientStats.unique_patients || 0), color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  const trendBars = dailyTrend.map(d => ({
    label: String(d.date).slice(5),
    value: Number(d.total),
    color: '#3b82f6',
  }));

  const hourBars = peakHours.map(h => ({
    label: `${h.hour}h`,
    value: Number(h.count),
    color: '#8b5cf6',
  }));

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Date range + presets */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[['Today',1],['7 Days',7],['30 Days',30],['90 Days',90]].map(([lbl, d]) => (
            <button key={lbl} onClick={() => applyPreset(d)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white/60 hover:bg-gray-100 active:scale-95 transition-all">
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <input type="date" value={from} max={to}
            onChange={e => setFrom(e.target.value)} className="input py-1 text-sm w-36" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} min={from}
            onChange={e => setTo(e.target.value)} className="input py-1 text-sm w-36" />
          <button onClick={() => load(from, to)} className="btn-primary px-4 py-1.5 text-sm">Apply</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`card ${c.bg} border ${c.border} flex flex-col items-center py-4 gap-1`}>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 text-center">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Daily Appointments</h3>
          <MiniBarChart bars={trendBars} color="#3b82f6" />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Peak Hours</h3>
          <MiniBarChart bars={hourBars} color="#8b5cf6" />
        </div>
      </div>

      {/* Doctor performance table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Doctor Performance</h3>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b">
              <th className="pb-2 pr-4 font-medium">Doctor</th>
              <th className="pb-2 pr-3 font-medium text-right">Total</th>
              <th className="pb-2 pr-3 font-medium text-right">Completed</th>
              <th className="pb-2 pr-3 font-medium text-right">Pending</th>
              <th className="pb-2 pr-3 font-medium text-right">Cancelled</th>
              <th className="pb-2 font-medium min-w-32">Completion Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {byDoctor.map(doc => {
              const total     = Number(doc.total      || 0);
              const completed = Number(doc.completed  || 0);
              const pending   = Number(doc.waiting    || 0) + Number(doc.in_progress || 0);
              const cancelled = Number(doc.cancelled  || 0);
              const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800">{doc.name}</div>
                    <div className="text-xs text-gray-400">{doc.specialization}</div>
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-gray-700">{total}</td>
                  <td className="py-3 pr-3 text-right text-green-600 font-medium">{completed}</td>
                  <td className="py-3 pr-3 text-right text-amber-600 font-medium">{pending}</td>
                  <td className="py-3 pr-3 text-right text-red-500">{cancelled}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Token Board View ──────────────────────────────────────────────────────────
const BOARD_COLORS = [
  { dot: '#3b82f6', bg: 'bg-blue-50',    ring: 'border-blue-200',   text: 'text-blue-700',    token: 'text-blue-600'    },
  { dot: '#10b981', bg: 'bg-emerald-50', ring: 'border-emerald-200',text: 'text-emerald-700', token: 'text-emerald-600' },
  { dot: '#8b5cf6', bg: 'bg-violet-50',  ring: 'border-violet-200', text: 'text-violet-700',  token: 'text-violet-600'  },
  { dot: '#f59e0b', bg: 'bg-amber-50',   ring: 'border-amber-200',  text: 'text-amber-700',   token: 'text-amber-600'   },
  { dot: '#ef4444', bg: 'bg-rose-50',    ring: 'border-rose-200',   text: 'text-rose-700',    token: 'text-rose-600'    },
  { dot: '#06b6d4', bg: 'bg-cyan-50',    ring: 'border-cyan-200',   text: 'text-cyan-700',    token: 'text-cyan-600'    },
];

function TokenBoardView() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('tenant_token');
      const { data } = await axios.get('/api/tokens/display/all', { headers: { Authorization: `Bearer ${token}` } });
      setDoctors(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const tenantInfo = JSON.parse(localStorage.getItem('tenant_info') || '{}');
    const tenantId = tenantInfo.id || '';
    const socket = io('http://localhost:5000');
    socket.on(`token_update_${tenantId}`, load);
    const poll  = setInterval(load, 10000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { socket.disconnect(); clearInterval(poll); clearInterval(clock); };
  }, [load]);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-56 rounded-2xl" style={{ animationDelay: `${i*60}ms` }} />)}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Board header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-white text-lg">Token Display Board</h2>
          <p className="text-white/60 text-sm">
            Live queue status for all doctors — today
            <span className="ml-2 inline-flex items-center gap-1 text-white/40 text-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Click any card to open TV display
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-mono tracking-wide">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Doctor cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doc, idx) => {
          const c         = BOARD_COLORS[idx % BOARD_COLORS.length];
          const total     = Number(doc.stats?.total      || 0);
          const completed = Number(doc.stats?.completed  || 0);
          const waiting   = Number(doc.stats?.waiting    || 0);
          const inProg    = Number(doc.stats?.in_progress|| 0);
          const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
          const initials  = doc.name.split(' ').map(w => w[0]).slice(0, 2).join('');

          return (
            <div
              key={doc.id}
              className={`rounded-2xl border-2 ${c.ring} ${c.bg} overflow-hidden shadow-sm cursor-pointer group transition-all hover:shadow-lg hover:-translate-y-0.5`}
              onClick={() => window.open(`/token/${doc.id}`, '_blank')}
              title={`Open TV display for ${doc.name}`}
            >
              {/* Doctor header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ backgroundColor: c.dot }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm leading-tight truncate ${c.text}`}>{doc.name}</div>
                    <div className="text-xs text-gray-500 truncate">{doc.specialization}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-700 tabular-nums">{completed}<span className="text-gray-300 font-normal">/{total}</span></div>
                    <div className="text-xs text-gray-400">done</div>
                  </div>
                  {/* TV open button */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white flex items-center justify-center"
                    style={{ backgroundColor: c.dot }}
                    title="Open TV display"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* Now Serving */}
                <div className="relative rounded-xl bg-white/80 border border-white py-3 px-3 text-center shadow-sm">
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-medium">Now Serving</div>
                  {doc.current ? (
                    <>
                      <div className={`text-3xl font-black tracking-wider leading-none ${c.token}`}>
                        {doc.current.token_display}
                      </div>
                      <div className="text-sm text-gray-600 mt-1.5 font-medium truncate px-2">
                        {doc.current.patient?.name}
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-600 text-xs font-semibold">LIVE</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-1">
                      <div className="text-2xl font-bold text-gray-300">— —</div>
                      <div className="text-xs text-gray-400 mt-1">No active patient</div>
                    </div>
                  )}
                </div>

                {/* Next in queue */}
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1.5 flex items-center justify-between">
                    <span>Next in queue</span>
                    {waiting > 0 && (
                      <span className="bg-white/80 border border-gray-200 rounded-full px-1.5 py-0.5 text-gray-600 font-semibold">
                        {waiting} waiting
                      </span>
                    )}
                  </div>
                  {doc.next.length > 0 ? (
                    <div className="flex gap-1.5">
                      {doc.next.map((apt, i) => (
                        <div key={apt.id}
                          className={`flex-1 rounded-lg bg-white/70 border px-1.5 py-1.5 text-center ${i === 0 ? `border-current ${c.ring}` : 'border-white/80'}`}>
                          <div className={`text-sm font-bold leading-tight ${i === 0 ? c.token : 'text-gray-500'}`}>
                            {apt.token_display}
                          </div>
                          <div className="text-gray-400 truncate mt-0.5" style={{ fontSize: '10px' }}>
                            {apt.patient?.name?.split(' ')[0]}
                          </div>
                          {i === 0 && (
                            <div className="mt-0.5">
                              <span className="text-white rounded-full px-1.5 py-px" style={{ fontSize: '9px', backgroundColor: c.dot }}>
                                Up next
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic text-center py-1">Queue empty</div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="pt-1 border-t border-white/60">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span className="font-medium tabular-nums">{pct}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: c.dot }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {doctors.length === 0 && (
        <div className="card text-center py-12 text-gray-400">No active doctors today</div>
      )}
    </div>
  );
}

// ── Doctor Analytics Modal ────────────────────────────────────────────────────
const DOW_NAMES = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DoctorAnalyticsModal({ doc, onClose }) {
  const todayStr = fmtD(new Date());
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return fmtD(d); });
  const [to,   setTo  ] = useState(todayStr);
  const [data,    setData   ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState('');

  const load = async (f, t) => {
    setLoading(true); setError('');
    try {
      const { data: res } = await api.get(`/analytics?from=${f}&to=${t}&doctor_id=${doc.id}`);
      setData(res);
    } catch { setError('Failed to load analytics'); }
    setLoading(false);
  };

  useEffect(() => { load(from, to); }, []);

  const applyPreset = (days) => {
    const t = new Date(); const f = new Date(t); f.setDate(f.getDate() - days + 1);
    const tf = fmtD(f), tt = fmtD(t); setFrom(tf); setTo(tt); load(tf, tt);
  };

  const statCards = !data ? [] : [
    { label: 'Total',     value: Number(data.summary.total       || 0), color: 'text-blue-700',  bg: 'bg-blue-50'  },
    { label: 'Completed', value: Number(data.summary.completed   || 0), color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Pending',   value: Number(data.summary.waiting     || 0) + Number(data.summary.in_progress || 0), color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Cancelled', value: Number(data.summary.cancelled   || 0), color: 'text-red-700',   bg: 'bg-red-50'   },
    { label: 'Patients',  value: Number(data.patientStats?.unique_patients || 0), color: 'text-purple-700', bg: 'bg-purple-50' },
  ];

  const trendBars  = (data?.dailyTrend  || []).map(d => ({ label: String(d.date).slice(5), value: Number(d.total),  color: '#3b82f6' }));
  const hourBars   = (data?.peakHours   || []).map(h => ({ label: `${h.hour}h`,            value: Number(h.count),  color: '#8b5cf6' }));
  const dowBars    = (data?.dayOfWeek   || []).map(d => ({ label: DOW_NAMES[Number(d.dow)], value: Number(d.total), color: '#f59e0b' }));

  const total = data ? Number(data.summary.total || 0) : 0;
  const rate  = total > 0 ? Math.round((Number(data.summary.completed || 0) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {doc.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{doc.name}</h3>
              <p className="text-xs text-gray-500">{doc.specialization} · Analytics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Date range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {[['Today',1],['7D',7],['30D',30],['90D',90]].map(([lbl, d]) => (
                <button key={lbl} onClick={() => applyPreset(d)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all">
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="input py-1 text-xs w-32" />
              <span className="text-gray-400">→</span>
              <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="input py-1 text-xs w-32" />
              <button onClick={() => load(from, to)} className="btn-primary px-3 py-1 text-xs">Apply</button>
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          )}
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

          {data && !loading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-5 gap-2">
                {statCards.map(c => (
                  <div key={c.label} className={`${c.bg} rounded-xl p-3 flex flex-col items-center gap-1`}>
                    <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-gray-500 text-center leading-tight">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Completion rate bar */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-600">Completion Rate</span>
                  <span className={`text-sm font-bold ${rate >= 70 ? 'text-green-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Daily Appointments</p>
                  <MiniBarChart bars={trendBars} color="#3b82f6" />
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Peak Hours</p>
                  <MiniBarChart bars={hourBars} color="#8b5cf6" />
                </div>
              </div>

              {/* Day-of-week chart */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Appointments by Day of Week</p>
                <MiniBarChart bars={dowBars} color="#f59e0b" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [overrideDoc, setOverrideDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [resetPwDoc, setResetPwDoc] = useState(null);
  const [analyticsDoc, setAnalyticsDoc] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('admin_tab') || 'doctors'); // 'doctors' | 'timetable' | etc

  React.useEffect(() => {
    sessionStorage.setItem('admin_tab', activeTab);
  }, [activeTab]);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/doctors');
    setDoctors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-4">
        <div className="flex justify-between items-center animate-fade-up">
          <div className="space-y-2">
            <div className="skeleton h-7 w-40 rounded" />
            <div className="skeleton h-4 w-64 rounded" />
          </div>
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="skeleton h-11 w-64 rounded-xl" />
        {[1,2,3].map(i => (
          <div key={i} className="card animate-fade-up" style={{ animationDelay: `${i*80}ms` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="space-y-2"><div className="skeleton h-4 w-32 rounded"/><div className="skeleton h-3 w-24 rounded"/></div>
              </div>
              <div className="flex gap-2"><div className="skeleton h-8 w-28 rounded-lg"/><div className="skeleton h-8 w-28 rounded-lg"/></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">Manage doctor timetables and date-specific availability</p>
        </div>
        <button
          onClick={() => setShowAddDoctor(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Doctor
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1 animate-fade-up delay-75 border border-white/20 w-full sm:w-fit overflow-x-auto">
        {[
          { key: 'doctors',    label: 'Doctor Schedules', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { key: 'timetable',  label: 'Timetable View',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { key: 'analytics',  label: 'Analytics',        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { key: 'tokenboard', label: 'Token Board',      icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
          { key: 'collection', label: 'Collection',       icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === tab.key
                ? 'bg-white shadow-md text-blue-700'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden xs:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Doctor Schedules */}
      {activeTab === 'doctors' && (
        <div className="space-y-3 sm:space-y-4">
          {doctors.map((doc, idx) => {
            const weeklyRows = (doc.availability || []).filter((a) => a.date === null);
            const isExpanded = expandedDoc === doc.id;

            return (
              <div key={doc.id} className="card animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {doc.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-sm text-gray-500">{doc.specialization}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnalyticsDoc(doc)}
                      className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
                      title="View analytics"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setResetPwDoc(doc)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all whitespace-nowrap"
                      title="Reset dashboard password"
                    >
                      <span className="hidden sm:inline">Reset Password</span>
                      <span className="sm:hidden">Password</span>
                    </button>
                    <button
                      onClick={() => setOverrideDoc(doc)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Set Date Override</span>
                      <span className="sm:hidden">Override</span>
                    </button>
                    <button
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white/60 hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap"
                    >
                      {isExpanded ? 'Hide Schedule' : 'Edit Schedule'}
                    </button>
                    <button
                      onClick={() => setDeleteDoc(doc)}
                      className="p-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all"
                      title="Remove doctor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                      const row = weeklyRows.find((r) => r.day_of_week === dow);
                      const on = row?.is_available ?? 0;
                      return (
                        <span key={dow} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {DAYS[dow - 1]}
                        </span>
                      );
                    })}
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-4 space-y-1 border-t pt-4">
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-3 mb-1">
                      <div className="col-span-1">Day</div>
                      <div className="col-span-2">Active</div>
                      <div className="col-span-3">Start</div>
                      <div className="col-span-3">End</div>
                      <div className="col-span-2">Slot</div>
                      <div className="col-span-1"></div>
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                      const row = weeklyRows.find((r) => r.day_of_week === dow) || {
                        day_of_week: dow, is_available: 0, start_time: '09:00', end_time: '17:00', slot_duration: 15,
                      };
                      return <WeekRow key={dow} doc={doc} row={row} onSave={load} />;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Timetable View */}
      {activeTab === 'timetable' && (
        <TimetableView doctors={doctors} onOverride={setOverrideDoc} onLoad={load} />
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {/* Tab: Token Board */}
      {activeTab === 'tokenboard' && <TokenBoardView />}

      {/* Tab: Collection Report */}
      {activeTab === 'collection' && <CollectionReport />}

      {overrideDoc && (
        <DateOverride
          doc={overrideDoc}
          allDoctors={doctors}
          onClose={() => { setOverrideDoc(null); load(); }}
        />
      )}

      {showAddDoctor && (
        <AddDoctorModal
          onClose={() => setShowAddDoctor(false)}
          onAdded={async () => {
            const { data: all } = await api.get('/doctors');
            const newest = all[all.length - 1];
            if (newest) await seedNewDoctorSchedule(newest.id);
            load();
          }}
        />
      )}

      {deleteDoc && (
        <DeleteDoctorModal
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onDeleted={load}
        />
      )}

      {resetPwDoc && (
        <ResetPasswordModal
          doc={resetPwDoc}
          onClose={() => setResetPwDoc(null)}
        />
      )}

      {analyticsDoc && (
        <DoctorAnalyticsModal
          doc={analyticsDoc}
          onClose={() => setAnalyticsDoc(null)}
        />
      )}
    </div>
  );
}
