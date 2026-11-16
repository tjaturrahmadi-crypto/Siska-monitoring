import { Edit3, Eye, Plus, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  DESIGN_STATUS_OPTIONS,
  formatDateId,
  formatRupiah,
  PRODUCTION_STATUS_OPTIONS,
} from '../constants/defaults';
import type {
  ComputedOrder,
  CustomerType,
  DesignStatus,
  OrderCategory,
  OrderFormPayload,
  ProductionStatus,
  ScheduleStatus,
} from '../types';
import {
  CategoryBadge,
  CategoryIcon,
  CustomerTypeBadge,
  DesignStatusText,
  PaymentStatusBadge,
  ScheduleStatusBadge,
} from './StatusLabels';
import { TablePagination } from './TablePagination';

interface DashboardRekapViewProps {
  mode: 'rekap' | 'admin';
  orders: ComputedOrder[];
  loading: boolean;
  onCreateOrder: (defaultCategory?: OrderCategory) => void;
  onEditOrder: (order: ComputedOrder) => void;
  onUpdateOrderFields: (orderId: string, updates: Partial<OrderFormPayload>) => Promise<void>;
  onDeleteOrder: (order: ComputedOrder) => Promise<void>;
  onOpenPreviewTim: (customerName: string, orderId: string) => void;
  onSeedSamples: () => Promise<void>;
}

export const DashboardRekapView = memo(function DashboardRekapView({
  mode,
  orders,
  loading,
  onCreateOrder,
  onEditOrder,
  onUpdateOrderFields,
  onDeleteOrder,
  onOpenPreviewTim,
  onSeedSamples,
}: DashboardRekapViewProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState<OrderCategory | 'ALL'>('ALL');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleStatus | 'ALL'>('ALL');
  const [designFilter, setDesignFilter] = useState<DesignStatus | 'ALL'>('ALL');
  const [prodFilter, setProdFilter] = useState<ProductionStatus | 'ALL'>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | 'ALL'>('ALL');
  const [seeding, setSeeding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.statusProduksi !== 'SUDAH SELESAI');
    const overdue = orders.filter((o) => o.statusJadwal === 'TERLAMBAT').length;
    const warningOrUrgent = orders.filter(
      (o) => o.statusJadwal === 'PERINGATAN' || o.statusJadwal === 'SEGERA'
    ).length;
    const pendingDesign = orders.filter(
      (o) => o.statusDesain !== 'DESAIN ACC' && o.statusProduksi !== 'SUDAH SELESAI'
    ).length;
    const totalUnpaid = orders.reduce((acc, o) => acc + o.sisaTagihan, 0);

    return {
      totalActive: activeOrders.length,
      overdue,
      warningOrUrgent,
      pendingDesign,
      totalUnpaid,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (categoryFilter !== 'ALL' && o.kategori !== categoryFilter) return false;
      if (scheduleFilter !== 'ALL' && o.statusJadwal !== scheduleFilter) return false;
      if (designFilter !== 'ALL' && o.statusDesain !== designFilter) return false;
      if (prodFilter !== 'ALL' && o.statusProduksi !== prodFilter) return false;
      if (customerTypeFilter !== 'ALL' && o.statusCustomer !== customerTypeFilter) return false;
      if (q) {
        const match =
          o.namaCustomer.toLowerCase().includes(q) ||
          o.noInvoice.toLowerCase().includes(q) ||
          CATEGORY_LABELS[o.kategori].toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    orders,
    deferredSearch,
    categoryFilter,
    scheduleFilter,
    designFilter,
    prodFilter,
    customerTypeFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, categoryFilter, scheduleFilter, designFilter, prodFilter, customerTypeFilter, mode]);

  const paginatedOrders = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const hasFilters =
    search !== '' ||
    categoryFilter !== 'ALL' ||
    scheduleFilter !== 'ALL' ||
    designFilter !== 'ALL' ||
    prodFilter !== 'ALL' ||
    customerTypeFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setScheduleFilter('ALL');
    setDesignFilter('ALL');
    setProdFilter('ALL');
    setCustomerTypeFilter('ALL');
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedSamples();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip on Rekap View */}
      {mode === 'rekap' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Order Aktif</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.totalActive}
            </p>
            <p className="mt-1 text-xs text-slate-500">Dari total {orders.length} order</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Terlambat</p>
            <p
              className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                metrics.overdue > 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {metrics.overdue}
            </p>
            <p className="mt-1 text-xs text-slate-500">Lewat Tgl Estimasi</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Peringatan &amp; Segera</p>
            <p
              className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                metrics.warningOrUrgent > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {metrics.warningOrUrgent}
            </p>
            <p className="mt-1 text-xs text-slate-500">Perlu cek prioritas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Antrean Desain</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.pendingDesign}
            </p>
            <p className="mt-1 text-xs text-slate-500">Belum ACC Desain</p>
          </div>
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
            <p className="text-xs font-medium text-slate-500">Total Sisa Tagihan</p>
            <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(metrics.totalUnpaid)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Piutang berjalan</p>
          </div>
        </div>
      )}

      {/* Category Sheet Tabs with Icons & Distinct Colors for Admin Mode */}
      {mode === 'admin' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Semua Kategori
            </button>
            {(['SETELAN', 'ATASAN', 'CELANA', 'JAKET'] as OrderCategory[]).map((cat) => {
              const active = categoryFilter === cat;
              const style = CATEGORY_STYLES[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? style.badgeClass
                      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <CategoryIcon category={cat} className="h-3.5 w-3.5 shrink-0" />
                  ADM {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onCreateOrder(categoryFilter === 'ALL' ? 'SETELAN' : categoryFilter)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Input {categoryFilter === 'ALL' ? 'Order' : CATEGORY_LABELS[categoryFilter]}
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama tim, customer, atau no. invoice..."
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {mode === 'rekap' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as OrderCategory | 'ALL')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SETELAN">Setelan</option>
              <option value="ATASAN">Atasan</option>
              <option value="CELANA">Celana</option>
              <option value="JAKET">Jaket</option>
            </select>
          )}

          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value as ScheduleStatus | 'ALL')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">Semua Status Jadwal</option>
            <option value="TERLAMBAT">TERLAMBAT</option>
            <option value="PERINGATAN">PERINGATAN</option>
            <option value="SEGERA">SEGERA</option>
            <option value="ON TRACK">ON TRACK</option>
            <option value="LENGKAPI TANGGAL">LENGKAPI TANGGAL</option>
            <option value="SELESAI">SELESAI</option>
          </select>

          <select
            value={designFilter}
            onChange={(e) => setDesignFilter(e.target.value as DesignStatus | 'ALL')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">Semua Status Desain</option>
            {DESIGN_STATUS_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value as CustomerType | 'ALL')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">Semua Tipe Customer</option>
            <option value="UTAMA">UTAMA</option>
            <option value="TAMBAHAN">TAMBAHAN</option>
          </select>

          {mode === 'admin' && (
            <select
              value={prodFilter}
              onChange={(e) => setProdFilter(e.target.value as ProductionStatus | 'ALL')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Produksi</option>
              {PRODUCTION_STATUS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredOrders.length}</strong> dari{' '}
              {orders.length} order
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main High-Density Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {orders.length === 0
                ? 'Belum ada data order produksi'
                : 'Tidak ada order yang cocok dengan filter'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {orders.length === 0
                ? 'Mulai input order pertama Anda atau muat 3 contoh data awal untuk mencoba alur kerja.'
                : 'Ubah kata kunci pencarian atau reset filter untuk melihat seluruh order.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onCreateOrder('SETELAN')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Input Order Pertama
              </button>
              {orders.length === 0 && (
                <button
                  type="button"
                  disabled={seeding}
                  onClick={handleSeed}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {seeding ? 'Memuat Contoh...' : 'Muat Contoh Data Awal'}
                </button>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Kategori / Qty</th>
                  <th className="px-4 py-3 whitespace-nowrap">Customer &amp; Invoice</th>
                  <th className="px-4 py-3 whitespace-nowrap">Order / Layout / Estimasi</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Jadwal</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Sisa Hari</th>
                  <th className="px-4 py-3 whitespace-nowrap">Desain</th>
                  <th className="px-4 py-3 whitespace-nowrap">Produksi</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Tagihan</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <CategoryBadge category={o.kategori} />
                      <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                        {o.qtyOrder} pcs
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{o.namaCustomer}</span>
                        <CustomerTypeBadge type={o.statusCustomer} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        {o.belumInvoice ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-amber-800">
                            BELUM BIKIN INVOICE
                          </span>
                        ) : (
                          <>
                            <span
                              className={
                                o.isDuplicateInvoice
                                  ? 'rounded bg-red-100 px-1 text-red-700 font-semibold'
                                  : ''
                              }
                              title={o.isDuplicateInvoice ? 'Invoice kembar terdeteksi!' : ''}
                            >
                              {o.noInvoice}
                            </span>
                            {o.isDuplicateInvoice && (
                              <span className="text-[10px] font-sans font-semibold text-red-600">
                                (Duplikat)
                              </span>
                            )}
                          </>
                        )}
                        {o.paket && (
                          <span className="font-sans text-[11px] font-medium text-slate-600">
                            · {o.paket}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top font-mono tabular-nums space-y-0.5">
                      <div className="text-[11px] text-slate-500">
                        Order: <span className="text-slate-700">{formatDateId(o.tglOrder)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Layout:{' '}
                        {o.belumLayout ? (
                          <span className="font-sans font-semibold text-amber-700">
                            BELUM LAYOUT
                          </span>
                        ) : (
                          <span className="text-slate-700">{formatDateId(o.tglMasukLayout)}</span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] ${
                          o.estimasiOutOfRange
                            ? 'font-semibold text-amber-700'
                            : 'text-slate-600'
                        }`}
                        title={
                          o.estimasiOutOfRange
                            ? 'Rentang estimasi di luar standar 2–3 minggu'
                            : ''
                        }
                      >
                        Est: {formatDateId(o.tglEstimasiSelesai)}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <ScheduleStatusBadge status={o.statusJadwal} />
                    </td>

                    <td className="px-4 py-3 align-top text-right font-mono tabular-nums">
                      {o.statusProduksi === 'SUDAH SELESAI' ? (
                        <span className="text-emerald-700 font-medium">Selesai</span>
                      ) : o.sisaHari === null ? (
                        <span className="text-slate-400">-</span>
                      ) : o.sisaHari < 0 ? (
                        <span className="font-semibold text-red-600">{o.sisaHari} hr</span>
                      ) : (
                        <span className="font-medium text-slate-800">H-{o.sisaHari}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <DesignStatusText status={o.statusDesain} />
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {o.desainer || '-'} {o.revisiKe > 0 ? `· Rev ${o.revisiKe}` : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <select
                        value={o.statusProduksi}
                        onChange={(e) =>
                          onUpdateOrderFields(o.id, {
                            statusProduksi: e.target.value as ProductionStatus,
                          })
                        }
                        aria-label={`Ubah status produksi ${o.namaCustomer}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                      >
                        {PRODUCTION_STATUS_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 align-top text-right font-mono tabular-nums">
                      <div className="flex justify-end">
                        <PaymentStatusBadge status={o.statusPembayaran} />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        Sisa: {formatRupiah(o.sisaTagihan)}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenPreviewTim(o.namaCustomer, o.id)}
                          title="Preview Tim & Copy WhatsApp"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditOrder(o)}
                          title="Edit Order"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteOrder(o)}
                          title="Hapus Order"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              totalItems={filteredOrders.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
});
