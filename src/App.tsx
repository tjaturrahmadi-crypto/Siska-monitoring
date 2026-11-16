import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  ClockAlert,
  FileDown,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Plus,
  Receipt,
  Settings,
  Stamp,
  X,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { DashboardRekapView } from './components/DashboardRekapView';
import { BOOTSTRAPPED_ADMIN_EMAIL, DEFAULT_MASTER_SETTINGS } from './constants/defaults';
import {
  ApiError,
  createCalendarNote,
  createOrder,
  deleteCalendarNote,
  deleteOrder,
  downloadBackupJson,
  fetchBootstrapData,
  fetchCurrentUser,
  importBackupJson,
  logoutUser,
  saveMasterSettings,
  seedSampleOrders,
  subscribeRealtimeUpdates,
  updateCalendarNote,
  updateFullOrder,
  updateOrderFields,
  updateUserAccess,
} from './services/apiService';

const DesainView = lazy(() =>
  import('./components/DesainView').then((m) => ({ default: m.DesainView }))
);
const KalenderView = lazy(() =>
  import('./components/KalenderView').then((m) => ({ default: m.KalenderView }))
);
const OrderFormModal = lazy(() =>
  import('./components/OrderFormModal').then((m) => ({ default: m.OrderFormModal }))
);
const PenagihanKeterlambatanView = lazy(() =>
  import('./components/PenagihanKeterlambatanView').then((m) => ({
    default: m.PenagihanKeterlambatanView,
  }))
);
const PengaturanView = lazy(() =>
  import('./components/PengaturanView').then((m) => ({ default: m.PengaturanView }))
);
const PesanLogoView = lazy(() =>
  import('./components/PesanLogoView').then((m) => ({ default: m.PesanLogoView }))
);
const PreviewTimView = lazy(() =>
  import('./components/PreviewTimView').then((m) => ({ default: m.PreviewTimView }))
);
const RekapExcelView = lazy(() =>
  import('./components/RekapExcelView').then((m) => ({ default: m.RekapExcelView }))
);

function ViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
import type {
  CalendarNote,
  ComputedOrder,
  MasterSettings,
  NavTab,
  OrderCategory,
  OrderFormPayload,
  ProductionOrder,
  UserProfile,
} from './types';
import { computeAllOrders } from './utils/orderCalculations';

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    title: 'Utama',
    items: [
      { id: 'rekap', label: 'Rekap & Dashboard', icon: LayoutDashboard },
      { id: 'kalender', label: 'Kalender & Catatan', icon: CalendarDays },
    ],
  },
  {
    title: 'Divisi Operasional',
    items: [
      { id: 'admin', label: 'Order Admin', icon: ClipboardList },
      { id: 'desain', label: 'Divisi Desain', icon: Palette },
      { id: 'pesan_logo', label: 'Pesan Logo', icon: Stamp },
    ],
  },
  {
    title: 'Monitoring & Output',
    items: [
      { id: 'keterlambatan', label: 'Keterlambatan', icon: ClockAlert },
      { id: 'penagihan', label: 'Penagihan', icon: Receipt },
      { id: 'preview_tim', label: 'Preview Tim & WA', icon: FileSpreadsheet },
      { id: 'rekap_excel', label: 'Rekap Excel (Bln/Thn)', icon: FileDown },
    ],
  },
  {
    title: 'Sistem',
    items: [{ id: 'pengaturan', label: 'Pengaturan', icon: Settings }],
  },
];

const TAB_HEADERS: Record<NavTab, { title: string; subtitle: string }> = {
  rekap: {
    title: 'Rekap & Dashboard Produksi',
    subtitle: 'Ringkasan seluruh order aktif, jadwal, desain, dan tagihan berjalan',
  },
  admin: {
    title: 'Divisi Administrasi Order',
    subtitle: 'Kelola order per sheet kategori Setelan, Atasan, Celana, dan Jaket',
  },
  desain: {
    title: 'Divisi Desain & Layout',
    subtitle: 'Pembaruan status desain, revisi ke-1 s/d 10, desainer, dan tanggal update',
  },
  pesan_logo: {
    title: 'Pesan Logo & Sponsor',
    subtitle: 'Rekap otomatis kebutuhan logo dan sponsor di luar opsi printing',
  },
  kalender: {
    title: 'Kalender Produksi & Catatan',
    subtitle: 'Pantau target selesai, cek keterlambatan H+13, dan catatan harian tim',
  },
  keterlambatan: {
    title: 'Pantauan Keterlambatan',
    subtitle: 'Urutan prioritas order terlambat, peringatan awal, dan tenggat segera',
  },
  penagihan: {
    title: 'Penagihan & Pelunasan',
    subtitle: 'Urutan tagihan berdasarkan tanggal estimasi selesai terdekat',
  },
  preview_tim: {
    title: 'Preview Tim & Info WhatsApp',
    subtitle: 'Kartu spesifikasi A4 per customer dan teks siap-salin untuk WhatsApp',
  },
  rekap_excel: {
    title: 'Rekap Order Bulanan & Tahunan (Excel)',
    subtitle: 'Pantau ringkasan order jersey per bulan maupun per tahun dan download file .xlsx',
  },
  pengaturan: {
    title: 'Pengaturan Sistem & Akses Akun',
    subtitle: 'Atur master paket, bahan, kerah, logo, sponsor, aturan jadwal, dan akses email',
  },
};

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('rekap');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settings, setSettings] = useState<MasterSettings>({
    ...DEFAULT_MASTER_SETTINGS,
  });
  const [rawOrders, setRawOrders] = useState<ProductionOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Modal & Action State
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ComputedOrder | null>(null);
  const [defaultOrderCategory, setDefaultOrderCategory] = useState<OrderCategory>('SETELAN');
  const [deleteTarget, setDeleteTarget] = useState<ComputedOrder | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  // Preview Tim deep-link state
  const [previewCustomer, setPreviewCustomer] = useState<string | undefined>(undefined);
  const [previewOrderId, setPreviewOrderId] = useState<string | undefined>(undefined);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg('');
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Verify saved session token on initial boot
  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (!active) return;
        setUserProfile(user);
      })
      .catch(() => {
        if (!active) return;
        setUserProfile(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isAuthorizedActive = !!userProfile && userProfile.status === 'active';

  const isAdmin =
    isAuthorizedActive &&
    (userProfile?.role === 'admin' ||
      userProfile?.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase());

  const handleLogout = useCallback(() => {
    logoutUser();
    setUserProfile(null);
    setRawOrders([]);
    setCalendarNotes([]);
    setUsersList([]);
  }, []);

  // Load bootstrap data & subscribe to real-time SSE updates when active
  useEffect(() => {
    if (!isAuthorizedActive) return;

    let cancelled = false;
    setOrdersLoading(true);
    if (isAdmin) setUsersLoading(true);

    fetchBootstrapData()
      .then((data) => {
        if (cancelled) return;
        setUserProfile(data.user);
        setSettings(data.settings);
        setRawOrders(data.orders);
        setCalendarNotes(data.calendarNotes);
        if (isAdmin) setUsersList(data.users);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403 && err.code === 'ACCOUNT_DISABLED') {
          setUserProfile((prev) => (prev ? { ...prev, status: 'disabled' } : null));
        } else if (err instanceof ApiError && err.status === 401) {
          handleLogout();
        } else {
          showToast(err instanceof Error ? err.message : 'Gagal memuat data server.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrdersLoading(false);
          setUsersLoading(false);
        }
      });

    const unsubEvents = subscribeRealtimeUpdates({
      onOrders: (orders) => setRawOrders(orders),
      onOrderUpsert: (order) =>
        setRawOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === order.id);
          if (idx === -1) return [order, ...prev];
          const next = [...prev];
          next[idx] = order;
          return next;
        }),
      onOrderDelete: (id) =>
        setRawOrders((prev) => prev.filter((o) => o.id !== id)),
      onNotes: (notes) => setCalendarNotes(notes),
      onSettings: (nextSettings) => setSettings(nextSettings),
      onUsers: (users) => setUsersList(users),
      onSelfUser: (updatedSelf) => setUserProfile(updatedSelf),
    });

    return () => {
      cancelled = true;
      unsubEvents();
    };
  }, [isAuthorizedActive, isAdmin, handleLogout, showToast]);

  const computedOrders = useMemo(
    () => computeAllOrders(rawOrders, settings),
    [rawOrders, settings]
  );

  const overdueCount = useMemo(
    () => computedOrders.filter((o) => o.statusJadwal === 'TERLAMBAT').length,
    [computedOrders]
  );

  const openCreateModal = useCallback((cat: OrderCategory = 'SETELAN') => {
    setEditingOrder(null);
    setDefaultOrderCategory(cat);
    setOrderModalOpen(true);
  }, []);

  const openEditModal = useCallback((order: ComputedOrder) => {
    setEditingOrder(order);
    setDefaultOrderCategory(order.kategori);
    setOrderModalOpen(true);
  }, []);

  const closeOrderModal = useCallback(() => {
    setOrderModalOpen(false);
  }, []);

  const handleSaveOrder = useCallback(
    async (payload: OrderFormPayload, existingId?: string) => {
      if (existingId) {
        const updated = await updateFullOrder(existingId, payload);
        setRawOrders((prev) => prev.map((o) => (o.id === existingId ? updated : o)));
        showToast(
          `Order ${payload.namaCustomer} (${payload.belumInvoice ? 'BELUM BIKIN' : payload.noInvoice}) berhasil diperbarui.`
        );
        return;
      }
      const created = await createOrder(payload);
      setRawOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
      showToast(
        `Order baru ${payload.namaCustomer} (${payload.belumInvoice ? 'BELUM BIKIN' : payload.noInvoice}) berhasil ditambahkan.`
      );
    },
    [showToast]
  );

  const handleUpdateProductionStatus = useCallback(
    async (id: string, updates: Partial<OrderFormPayload>) => {
      const updated = await updateOrderFields(id, updates);
      setRawOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Status produksi diperbarui.');
    },
    [showToast]
  );

  const handleRequestDelete = useCallback(async (order: ComputedOrder) => {
    setDeleteTarget(order);
  }, []);

  const handleOpenPreviewTim = useCallback((customer: string, id: string) => {
    setPreviewCustomer(customer);
    setPreviewOrderId(id);
    setActiveTab('preview_tim');
  }, []);

  const handleSeedSamples = useCallback(async () => {
    const updatedList = await seedSampleOrders();
    setRawOrders(updatedList);
    showToast('3 contoh order berhasil dimuat.');
  }, [showToast]);

  const handleUpdateDesignFields = useCallback(
    async (id: string, updates: Partial<OrderFormPayload>) => {
      const updated = await updateOrderFields(id, updates);
      setRawOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Status desain berhasil diperbarui.');
    },
    [showToast]
  );

  const handleUpdateLogoFields = useCallback(
    async (id: string, updates: Partial<OrderFormPayload>) => {
      const updated = await updateOrderFields(id, updates);
      setRawOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Status pemesanan logo diperbarui.');
    },
    [showToast]
  );

  const handleUpdateLateFields = useCallback(async (id: string, updates: Partial<OrderFormPayload>) => {
    const updated = await updateOrderFields(id, updates);
    setRawOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  }, []);

  const handleUpdatePaymentFields = useCallback(
    async (id: string, updates: Partial<OrderFormPayload>) => {
      const updated = await updateOrderFields(id, updates);
      setRawOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Data pembayaran diperbarui.');
    },
    [showToast]
  );

  if (!isAuthorizedActive) {
    return (
      <AuthGate
        userProfile={userProfile}
        authLoading={authLoading}
        onAuthenticated={(user) => setUserProfile(user)}
        onLogout={handleLogout}
      />
    );
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    await deleteOrder(deletedId);
    setRawOrders((prev) => prev.filter((o) => o.id !== deletedId));
    showToast(`Order ${deleteTarget.namaCustomer} (${deleteTarget.noInvoice}) telah dihapus.`);
    setDeleteTarget(null);
  };

  const headerInfo = TAB_HEADERS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SISKA Monitoring
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.id === 'keterlambatan' && overdueCount > 0 && (
                        <span className="font-mono text-xs font-semibold text-red-600 tabular-nums">
                          {overdueCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3">
            <p className="truncate text-xs font-semibold text-slate-900">
              {userProfile.displayName}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {userProfile.email} · {userProfile.role === 'admin' ? 'Admin' : 'Staff'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex w-64 flex-col bg-white border-r border-slate-200">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-display text-base font-bold text-slate-900">
                SISKA Monitoring
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                            active
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          {item.id === 'keterlambatan' && overdueCount > 0 && (
                            <span className="font-mono text-xs font-semibold text-red-600">
                              {overdueCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-200 p-4">
              <p className="truncate text-xs font-semibold text-slate-900">
                {userProfile.displayName}
              </p>
              <p className="truncate text-[11px] text-slate-500 mb-3">{userProfile.email}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {headerInfo.title}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('SETELAN')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Order Baru
          </button>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'rekap' && (
            <DashboardRekapView
              mode="rekap"
              orders={computedOrders}
              loading={ordersLoading}
              onCreateOrder={openCreateModal}
              onEditOrder={openEditModal}
              onUpdateOrderFields={handleUpdateProductionStatus}
              onDeleteOrder={handleRequestDelete}
              onOpenPreviewTim={handleOpenPreviewTim}
              onSeedSamples={handleSeedSamples}
            />
          )}

          {activeTab === 'admin' && (
            <DashboardRekapView
              mode="admin"
              orders={computedOrders}
              loading={ordersLoading}
              onCreateOrder={openCreateModal}
              onEditOrder={openEditModal}
              onUpdateOrderFields={handleUpdateProductionStatus}
              onDeleteOrder={handleRequestDelete}
              onOpenPreviewTim={handleOpenPreviewTim}
              onSeedSamples={handleSeedSamples}
            />
          )}

          {activeTab !== 'rekap' && activeTab !== 'admin' && (
            <Suspense fallback={<ViewSkeleton />}>
              {activeTab === 'desain' && (
                <DesainView
                  orders={computedOrders}
                  settings={settings}
                  onUpdateOrderFields={handleUpdateDesignFields}
                  onEditOrder={openEditModal}
                />
              )}

              {activeTab === 'pesan_logo' && (
                <PesanLogoView
                  orders={computedOrders}
                  onUpdateOrderFields={handleUpdateLogoFields}
                />
              )}

              {activeTab === 'kalender' && (
                <KalenderView
                  orders={computedOrders}
                  notes={calendarNotes}
                  userProfile={userProfile}
                  onCreateNote={async (input) => {
                    const id = await createCalendarNote(input);
                    showToast('Catatan kalender disimpan.');
                    return id;
                  }}
                  onUpdateNote={async (id, input) => {
                    await updateCalendarNote(id, input);
                    showToast('Catatan kalender diperbarui.');
                  }}
                  onDeleteNote={async (id) => {
                    await deleteCalendarNote(id);
                    showToast('Catatan kalender dihapus.');
                  }}
                  onEditOrder={openEditModal}
                />
              )}

              {activeTab === 'keterlambatan' && (
                <PenagihanKeterlambatanView
                  mode="keterlambatan"
                  orders={computedOrders}
                  onEditOrder={openEditModal}
                  onUpdateOrderFields={handleUpdateLateFields}
                />
              )}

              {activeTab === 'penagihan' && (
                <PenagihanKeterlambatanView
                  mode="penagihan"
                  orders={computedOrders}
                  onEditOrder={openEditModal}
                  onUpdateOrderFields={handleUpdatePaymentFields}
                />
              )}

              {activeTab === 'preview_tim' && (
                <PreviewTimView
                  orders={computedOrders}
                  initialCustomer={previewCustomer}
                  initialOrderId={previewOrderId}
                />
              )}

              {activeTab === 'rekap_excel' && <RekapExcelView orders={computedOrders} />}

              {activeTab === 'pengaturan' && (
                <PengaturanView
                  settings={settings}
                  currentUser={userProfile}
                  users={usersList}
                  usersLoading={usersLoading}
                  totalOrdersCount={rawOrders.length}
                  totalNotesCount={calendarNotes.length}
                  onSaveSettings={async (next) => {
                    const updated = await saveMasterSettings(next);
                    setSettings(updated);
                  }}
                  onUpdateUserAccess={async (uid, updates) => {
                    const updatedUser = await updateUserAccess(uid, updates);
                    setUsersList((prev) =>
                      prev.map((u) => (u.uid === uid ? updatedUser : u))
                    );
                    showToast('Hak akses akun diperbarui.');
                  }}
                  onExportBackup={downloadBackupJson}
                  onImportBackup={async (backup, mode) => {
                    const res = await importBackupJson(backup, mode);
                    setRawOrders(res.orders);
                    setCalendarNotes(res.calendarNotes);
                    setSettings(res.settings);
                    showToast('Data backup JSON berhasil dipulihkan.');
                    return {
                      importedOrders: res.importedOrders,
                      importedNotes: res.importedNotes,
                    };
                  }}
                />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Order Form Modal (mounted only when open for lower memory & zero idle re-renders) */}
      {orderModalOpen && (
        <Suspense fallback={null}>
          <OrderFormModal
            isOpen={orderModalOpen}
            initialOrder={editingOrder}
            defaultCategory={defaultOrderCategory}
            allOrders={computedOrders}
            settings={settings}
            onClose={closeOrderModal}
            onSave={handleSaveOrder}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Hapus Order {deleteTarget.namaCustomer}?</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Order atas nama <strong>{deleteTarget.namaCustomer}</strong> ({deleteTarget.noInvoice})
              akan dihapus permanen dari database.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
              >
                Ya, Hapus Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="no-print fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
