import { Lock, LogOut, Mail, ShieldAlert, User as UserIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../constants/defaults';
import { loginWithEmail, registerWithEmail } from '../services/apiService';
import type { UserProfile } from '../types';

interface AuthGateProps {
  userProfile: UserProfile | null;
  authLoading: boolean;
  onAuthenticated: (user: UserProfile) => void;
  onLogout: () => void;
}

export function AuthGate({
  userProfile,
  authLoading,
  onAuthenticated,
  onLogout,
}: AuthGateProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-700">Memverifikasi sesi akun Anda...</p>
        </div>
      </div>
    );
  }

  // Account exists and has been disabled by Admin
  if (userProfile && userProfile.status === 'disabled') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Akses Akun Dinonaktifkan</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Akun email <span className="font-semibold text-slate-900">{userProfile.email}</span> saat
            ini dinonaktifkan oleh Administrator SISKA Monitoring. Hubungi admin apabila Anda
            memerlukan akses kembali.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar dari Akun Ini
          </button>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      if (authMode === 'login') {
        const user = await loginWithEmail(email.trim(), password);
        onAuthenticated(user);
      } else {
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          setSubmitting(false);
          return;
        }
        const user = await registerWithEmail(email.trim(), password, displayName.trim());
        onAuthenticated(user);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SISKA Monitoring</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Tracking Jadwal Produksi Jersey · Divisi Admin &amp; Desain
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg('');
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg('');
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Nama Lengkap / Divisi
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Admin Rina"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Alamat Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Kata Sandi</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Memproses...'
                : authMode === 'login'
                  ? 'Masuk ke Dashboard'
                  : 'Daftar & Langsung Masuk'}
            </button>
          </form>

          {authMode === 'register' && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed">
              Pendaftaran dengan email <span className="font-semibold">{BOOTSTRAPPED_ADMIN_EMAIL}</span> otomatis menjadi <strong>Admin Utama</strong>. Akun tim lainnya langsung aktif sebagai <strong>Staff</strong> dan dapat dikelola oleh Admin di menu Pengaturan.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Database lokal tersimpan di server aplikasi (multi-user HP &amp; Desktop). Setiap email yang masuk tercatat di Pengaturan Akses dan dapat dinonaktifkan kapan saja oleh Administrator.
        </p>
      </div>
    </div>
  );
}
