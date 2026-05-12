import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctors, verifyDoctorPassword } from '../../api';
import { SkeletonCard } from '../../components/Skeleton';

function PasswordModal({ doctor, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      const { data } = await verifyDoctorPassword(doctor.id, password);
      if (data.ok) {
        onSuccess();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Verification failed. Please try again.');
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
        <div className="p-6 space-y-5">
          {/* Icon + heading */}
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{doctor.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5">{doctor.specialization}</p>
            <p className="text-gray-400 text-xs mt-2">Enter the dashboard password to continue</p>
          </div>

          <form onSubmit={verify} className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            <div className="relative">
              <input
                autoFocus
                className="input pr-10 w-full"
                type={showPw ? 'text' : 'password'}
                placeholder="Dashboard password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
            <button type="submit" disabled={checking || !password} className="btn-primary w-full">
              {checking ? 'Verifying...' : 'Open Dashboard'}
            </button>
          </form>

          <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorSelect() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDoctors().then(({ data }) => { setDoctors(data); setLoading(false); });
  }, []);

  const handleDoctorClick = (d) => {
    setSelectedDoctor(d);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="page-title mb-6 animate-fade-up">Select Doctor</h1>

      <div className="grid gap-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : (
          doctors.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => handleDoctorClick(d)}
              className="card text-left flex items-center gap-3 sm:gap-4 hover:border-blue-300 hover:shadow-xl border border-transparent transition-all group animate-fade-up active:scale-[0.98]"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="bg-blue-100 text-blue-700 rounded-full w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-base sm:text-lg font-bold flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {d.name.split(' ').pop()[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{d.name}</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">{d.specialization}</div>
              </div>
              <div className="text-blue-600 text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0 group-hover:gap-2 transition-all">
                <span className="hidden sm:inline">Open Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedDoctor && (
        <PasswordModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onSuccess={() => navigate(`/doctor/${selectedDoctor.id}`)}
        />
      )}
    </div>
  );
}
