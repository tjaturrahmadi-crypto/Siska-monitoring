import {
  Download,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BOOTSTRAPPED_ADMIN_EMAIL, DEFAULT_MASTER_SETTINGS } from '../constants/defaults';
import type { MasterSettings, UserAccountStatus, UserProfile, UserRole } from '../types';

interface PengaturanViewProps {
  settings: MasterSettings;
  currentUser: UserProfile;
  users: UserProfile[];
  usersLoading: boolean;
  totalOrdersCount: number;
  totalNotesCount: number;
  onSaveSettings: (next: Omit<MasterSettings, 'updatedAt'>) => Promise<void>;
  onUpdateUserAccess: (
    uid: string,
    updates: { status?: UserAccountStatus; role?: UserRole }
  ) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (
    backup: unknown,
    mode: 'replace' | 'merge'
  ) => Promise<{ importedOrders: number; importedNotes: number }>;
}

type MasterListKey =
  | 'paketSetelanList'
  | 'paketAtasanList'
  | 'paketCelanaList'
  | 'paketJaketList'
  | 'bahanList'
  | 'bahanJaketList'
  | 'kerahList'
  | 'logoTimList'
  | 'logoApparelList'
  | 'nomorCelanaList'
  | 'sponsorDepanBelakangList'
  | 'sponsorLenganList'
  | 'logoJaketList'
  | 'desainerList';

const MASTER_LIST_SECTIONS: Array<{ key: MasterListKey; label: string; hint: string }> = [
  {
    key: 'paketSetelanList',
    label: 'Opsi Paket — Setelan',
    hint: 'Pilihan paket untuk order kategori SETELAN di form identitas order.',
  },
  {
    key: 'paketAtasanList',
    label: 'Opsi Paket — Atasan',
    hint: 'Pilihan paket untuk order kategori ATASAN.',
  },
  {
    key: 'paketCelanaList',
    label: 'Opsi Paket — Celana',
    hint: 'Pilihan paket untuk order kategori CELANA.',
  },
  {
    key: 'paketJaketList',
    label: 'Opsi Paket — Jaket',
    hint: 'Pilihan paket untuk order kategori JAKET.',
  },
  {
    key: 'bahanList',
    label: 'Daftar Jenis Bahan (Jersey / Atasan & Celana)',
    hint: 'Dipakai di dropdown Bahan Atasan dan Bahan Celana.',
  },
  {
    key: 'bahanJaketList',
    label: 'Daftar Jenis Bahan — Khusus Jaket',
    hint: 'Dipakai khusus di dropdown Bahan Jaket (Lotto, Diadora, Parasut, Fleece, dll).',
  },
  {
    key: 'kerahList',
    label: 'Daftar Model Kerah',
    hint: 'Pilihan kerah jersey (O-Neck, V-Neck, Polo, Shanghai, dll).',
  },
  {
    key: 'logoTimList',
    label: 'Jenis Logo Tim (Atasan & Celana)',
    hint: 'Tambahkan PRINTING atau TANPA LOGO jika tidak butuh jumlah PCS.',
  },
  {
    key: 'logoApparelList',
    label: 'Jenis Logo Apparel (Atasan & Celana)',
    hint: 'Opsi aplikasi logo apparel pada atasan dan celana.',
  },
  {
    key: 'nomorCelanaList',
    label: 'Jenis Nomor (Celana)',
    hint: 'Opsi sablon/printing nomor khusus pada spesifikasi celana.',
  },
  {
    key: 'sponsorDepanBelakangList',
    label: 'Sponsor Depan / Belakang',
    hint: 'Opsi jenis sablon/bordir sponsor utama.',
  },
  {
    key: 'sponsorLenganList',
    label: 'Sponsor Lengan',
    hint: 'Opsi sponsor di bagian lengan kanan/kiri.',
  },
  {
    key: 'logoJaketList',
    label: 'Jenis Logo Jaket',
    hint: 'Opsi aplikasi logo khusus kategori Jaket.',
  },
  {
    key: 'desainerList',
    label: 'Daftar Desainer',
    hint: 'Nama desainer yang tampil pada worksheet Divisi Desain.',
  },
];

function buildNormalizedDraft(settings: MasterSettings): Omit<MasterSettings, 'updatedAt'> {
  return {
    paketSetelanList: settings.paketSetelanList || DEFAULT_MASTER_SETTINGS.paketSetelanList,
    paketAtasanList: settings.paketAtasanList || DEFAULT_MASTER_SETTINGS.paketAtasanList,
    paketCelanaList: settings.paketCelanaList || DEFAULT_MASTER_SETTINGS.paketCelanaList,
    paketJaketList: settings.paketJaketList || DEFAULT_MASTER_SETTINGS.paketJaketList,
    bahanList: settings.bahanList || DEFAULT_MASTER_SETTINGS.bahanList,
    bahanJaketList: settings.bahanJaketList || DEFAULT_MASTER_SETTINGS.bahanJaketList,
    kerahList: settings.kerahList || DEFAULT_MASTER_SETTINGS.kerahList,
    logoTimList: settings.logoTimList || DEFAULT_MASTER_SETTINGS.logoTimList,
    logoApparelList: settings.logoApparelList || DEFAULT_MASTER_SETTINGS.logoApparelList,
    nomorCelanaList: settings.nomorCelanaList || DEFAULT_MASTER_SETTINGS.nomorCelanaList,
    sponsorDepanBelakangList:
      settings.sponsorDepanBelakangList || DEFAULT_MASTER_SETTINGS.sponsorDepanBelakangList,
    sponsorLenganList: settings.sponsorLenganList || DEFAULT_MASTER_SETTINGS.sponsorLenganList,
    logoJaketList: settings.logoJaketList || DEFAULT_MASTER_SETTINGS.logoJaketList,
    desainerList: settings.desainerList || DEFAULT_MASTER_SETTINGS.desainerList,
    warningDaysAfterLayout: settings.warningDaysAfterLayout,
    urgentDaysBeforeDeadline: settings.urgentDaysBeforeDeadline,
    minEstWeeks: settings.minEstWeeks,
    maxEstWeeks: settings.maxEstWeeks,
  };
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return '-';
  let dt: Date | null = null;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) dt = parsed;
  } else if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    dt = (ts as { toDate: () => Date }).toDate();
  }
  if (!dt) return '-';
  return dt.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PengaturanView({
  settings,
  currentUser,
  users,
  usersLoading,
  totalOrdersCount,
  totalNotesCount,
  onSaveSettings,
  onUpdateUserAccess,
  onExportBackup,
  onImportBackup,
}: PengaturanViewProps) {
  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const [activeTab, setActiveTab] = useState<'master' | 'jadwal' | 'akses' | 'backup'>('master');
  const [draft, setDraft] = useState<Omit<MasterSettings, 'updatedAt'>>(() =>
    buildNormalizedDraft(settings)
  );

  const [newItemInputs, setNewItemInputs] = useState<Record<MasterListKey, string>>({
    paketSetelanList: '',
    paketAtasanList: '',
    paketCelanaList: '',
    paketJaketList: '',
    bahanList: '',
    bahanJaketList: '',
    kerahList: '',
    logoTimList: '',
    logoApparelList: '',
    nomorCelanaList: '',
    sponsorDepanBelakangList: '',
    sponsorLenganList: '',
    logoJaketList: '',
    desainerList: '',
  });

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Backup / Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pendingBackup, setPendingBackup] = useState<{
    fileName: string;
    ordersCount: number;
    notesCount: number;
    hasSettings: boolean;
    raw: unknown;
  } | null>(null);
  const [backupError, setBackupError] = useState('');
  const [backupNotice, setBackupNotice] = useState('');

  useEffect(() => {
    setDraft(buildNormalizedDraft(settings));
  }, [settings]);

  const hasUnsavedMasterChanges = useMemo(() => {
    const currentPersisted = buildNormalizedDraft(settings);
    return JSON.stringify(draft) !== JSON.stringify(currentPersisted);
  }, [draft, settings]);

  const persistDraft = async (nextDraft: Omit<MasterSettings, 'updatedAt'>) => {
    setSaving(true);
    setSavedNotice('');
    try {
      await onSaveSettings(nextDraft);
      setSavedNotice('Pengaturan spesifikasi berhasil disimpan & langsung aktif di seluruh form.');
      setTimeout(() => setSavedNotice(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = (key: MasterListKey) => {
    const raw = newItemInputs[key].trim();
    if (!raw) return;
    const formatted = key === 'desainerList' ? raw : raw.toUpperCase();
    if (draft[key].some((x) => x.toUpperCase() === formatted.toUpperCase())) {
      setNewItemInputs((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    setDraft((prev) => ({
      ...prev,
      [key]: [...prev[key], formatted],
    }));
    setNewItemInputs((prev) => ({ ...prev, [key]: '' }));
  };

  const handleRemoveItem = (key: MasterListKey, itemToRemove: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].filter((x) => x !== itemToRemove),
    }));
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_MASTER_SETTINGS);
  };

  const handleSaveMasterSpecs = async () => {
    await persistDraft(draft);
  };

  const handleSaveRules = async (e: FormEvent) => {
    e.preventDefault();
    await persistDraft(draft);
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  const handleExportClick = async () => {
    setExportingBackup(true);
    setBackupError('');
    setBackupNotice('');
    try {
      await onExportBackup();
      setBackupNotice('File backup JSON berhasil diunduh.');
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Gagal mengekspor backup JSON.');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleSelectBackupFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBackupError('');
    setBackupNotice('');
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        orders?: unknown[];
        calendarNotes?: unknown[];
        settings?: unknown;
      };
      if (!parsed || typeof parsed !== 'object' || (!Array.isArray(parsed.orders) && !Array.isArray(parsed.calendarNotes) && !parsed.settings)) {
        setBackupError('Struktur file JSON tidak dikenali sebagai backup SISKA Monitoring.');
        setPendingBackup(null);
        return;
      }
      setPendingBackup({
        fileName: file.name,
        ordersCount: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
        notesCount: Array.isArray(parsed.calendarNotes) ? parsed.calendarNotes.length : 0,
        hasSettings: Boolean(parsed.settings && typeof parsed.settings === 'object'),
        raw: parsed,
      });
    } catch {
      setBackupError('File tidak valid. Pastikan memilih file .json hasil export SISKA Monitoring.');
      setPendingBackup(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingBackup) return;
    setImportingBackup(true);
    setBackupError('');
    setBackupNotice('');
    try {
      const res = await onImportBackup(pendingBackup.raw, importMode);
      setBackupNotice(
        `Restore selesai: ${res.importedOrders} order dan ${res.importedNotes} catatan kalender berhasil dimuat (${importMode === 'replace' ? 'Timpa Data Lama' : 'Gabung Data'}).`
      );
      setPendingBackup(null);
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Gagal mengimpor backup JSON.');
    } finally {
      setImportingBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs & Save Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'master'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Master Paket, Bahan, Kerah &amp; Logo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'jadwal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aturan Jadwal &amp; Peringatan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('akses')}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'akses'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akses Akun Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Backup &amp; Restore JSON
          </button>
        </div>

        {activeTab === 'master' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset ke Standar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveMasterSpecs}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 ${
                hasUnsavedMasterChanges
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Menyimpan...' : 'Save Perubahan Spesifikasi'}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'master' && hasUnsavedMasterChanges && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>
            Ada perubahan spesifikasi yang belum disimpan. Tekan tombol{' '}
            <strong>Save Perubahan Spesifikasi</strong> untuk menyimpan ke database.
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveMasterSpecs}
            className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            Save Sekarang
          </button>
        </div>
      )}

      {savedNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {savedNotice}
        </div>
      )}

      {/* TAB 1: MASTER DATA LISTS (2 kolom kanan & kiri di dalam setiap daftar pilihan) */}
      {activeTab === 'master' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {MASTER_LIST_SECTIONS.map((sec) => (
              <div
                key={sec.key}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{sec.label}</h3>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {draft[sec.key].length} opsi
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{sec.hint}</p>

                  {/* Daftar pilihan disusun rapi 2 kolom kanan & kiri */}
                  {draft[sec.key].length === 0 ? (
                    <p className="mt-4 text-xs text-slate-400">Belum ada item.</p>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {draft[sec.key].map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800"
                        >
                          <span className="truncate" title={item}>
                            {item}
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleRemoveItem(sec.key, item)}
                            aria-label={`Hapus ${item}`}
                            title={`Hapus ${item}`}
                            className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={newItemInputs[sec.key]}
                    onChange={(e) =>
                      setNewItemInputs((prev) => ({ ...prev, [sec.key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem(sec.key);
                      }
                    }}
                    placeholder={`Tambah ${sec.label.toLowerCase()}...`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleAddItem(sec.key)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end rounded-xl border border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveMasterSpecs}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Save Perubahan Spesifikasi'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE THRESHOLDS */}
      {activeTab === 'jadwal' && (
        <form
          onSubmit={handleSaveRules}
          className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900">Aturan Otomatis Status Jadwal</h3>
            <p className="mt-1 text-xs text-slate-500">
              Menentukan kapan order otomatis berubah menjadi status PERINGATAN, SEGERA, atau
              ditandai rentang estimasi tidak wajar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Peringatan Awal Sejak Tgl Layout (Hari)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={draft.warningDaysAfterLayout}
                onChange={(e) =>
                  setDraft({ ...draft, warningDaysAfterLayout: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Default spreadsheet: 13 hari sejak Tgl Masuk Layout.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Status SEGERA Sebelum Deadline (H-)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={draft.urgentDaysBeforeDeadline}
                onChange={(e) =>
                  setDraft({ ...draft, urgentDaysBeforeDeadline: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Default spreadsheet: H-1 sebelum Tgl Estimasi Selesai.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Rentang Estimasi Minimal (Minggu)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={draft.minEstWeeks}
                onChange={(e) => setDraft({ ...draft, minEstWeeks: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Rentang Estimasi Maksimal (Minggu)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={draft.maxEstWeeks}
                onChange={(e) => setDraft({ ...draft, maxEstWeeks: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Save Aturan Jadwal'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: EMAIL ACCESS CONTROL */}
      {activeTab === 'akses' && (
        <div className="space-y-4">
          {!isAdmin ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-sm font-bold text-amber-900">Khusus Administrator</h3>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Akun Anda ({currentUser.email}) saat ini memiliki peran <strong>Staff</strong>.
                Hanya akun dengan peran <strong>Admin</strong> yang dapat melihat daftar seluruh
                akun email dan menonaktifkan akses pengguna lain.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Daftar Akun Email Pengakses Aplikasi
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nonaktifkan akun email tertentu untuk langsung memblokir akses baca/tulis ke
                    database produksi.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Cari email atau nama..."
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Memuat daftar akun email...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Belum ada akun email terdaftar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                        <th className="px-5 py-3">Akun Email &amp; Nama</th>
                        <th className="px-5 py-3">Login Terakhir</th>
                        <th className="px-5 py-3">Peran</th>
                        <th className="px-5 py-3">Status Akses</th>
                        <th className="px-5 py-3 text-right">Kontrol Akses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isOwner =
                          u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
                        const isSelf = u.uid === currentUser.uid;
                        const isProtected = isOwner || isSelf;

                        return (
                          <tr key={u.uid} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900">
                                {u.email}
                                {isSelf && (
                                  <span className="ml-2 text-[11px] font-normal text-blue-600">
                                    (Anda)
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {u.displayName} · via {u.provider}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 tabular-nums">
                              {formatTimestamp(u.lastLoginAt)}
                            </td>

                            <td className="px-5 py-3.5">
                              <select
                                disabled={isProtected}
                                value={u.role}
                                onChange={(e) =>
                                  onUpdateUserAccess(u.uid, { role: e.target.value as UserRole })
                                }
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>

                            <td className="px-5 py-3.5">
                              {u.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                  <ShieldOff className="h-3.5 w-3.5" />
                                  Dinonaktifkan
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              {isProtected ? (
                                <span className="text-[11px] text-slate-400">
                                  {isOwner ? 'Admin Utama' : 'Sesi Aktif'}
                                </span>
                              ) : u.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateUserAccess(u.uid, { status: 'disabled' })
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                                >
                                  Nonaktifkan
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onUpdateUserAccess(u.uid, { status: 'active' })}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  Aktifkan Kembali
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE JSON */}
      {activeTab === 'backup' && (
        <div className="space-y-5 max-w-3xl">
          {backupError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {backupError}
            </div>
          )}
          {backupNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
              {backupNotice}
            </div>
          )}

          {/* Export Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Export Backup Database (JSON)</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Unduh salinan lengkap seluruh data Order ({totalOrdersCount} order), Catatan
                  Kalender ({totalNotesCount} catatan), dan Pengaturan Master dalam format file{' '}
                  <code>.json</code> dari server lokal.
                </p>
              </div>
              <button
                type="button"
                disabled={exportingBackup}
                onClick={handleExportClick}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Download className="h-4 w-4" />
                {exportingBackup ? 'Mengunduh...' : 'Export Backup JSON'}
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Import / Restore Backup (JSON)</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Pulihkan data order, catatan kalender, dan pengaturan master dari file backup{' '}
                <code>.json</code>. Akun email pengguna yang sudah terdaftar tetap aman terjaga.
              </p>
            </div>

            {!isAdmin ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                Hanya akun dengan peran <strong>Admin</strong> yang dapat mengimpor / memulihkan
                backup database.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleSelectBackupFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={importingBackup}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Pilih File Backup (.json)
                  </button>
                </div>

                {pendingBackup && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        File Siap Dipulihkan: <span className="font-mono">{pendingBackup.fileName}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setPendingBackup(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                    <p className="text-xs text-slate-700">
                      Isi file: <strong>{pendingBackup.ordersCount} order</strong>,{' '}
                      <strong>{pendingBackup.notesCount} catatan kalender</strong>
                      {pendingBackup.hasSettings ? ', serta Pengaturan Master' : ''}.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                        />
                        <span>
                          <strong>Gabungkan (Merge)</strong> — tambah/perbarui data tanpa menghapus
                          order lain
                        </span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-red-700 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>
                          <strong>Timpa Semua (Replace)</strong> — ganti seluruh order &amp; catatan
                          dengan isi backup
                        </span>
                      </label>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        disabled={importingBackup}
                        onClick={handleConfirmImport}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {importingBackup ? 'Memulihkan Data...' : 'Restore Data Sekarang'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
