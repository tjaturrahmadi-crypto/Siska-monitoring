import { CheckCircle2, Search } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABELS, formatDateId, formatRupiah } from '../constants/defaults';
import type { ComputedOrder, OrderFormPayload, PaymentStatus } from '../types';
import {
  CategoryBadge,
  CustomerTypeBadge,
  PaymentStatusBadge,
  ScheduleStatusBadge,
} from './StatusLabels';
import { TablePagination } from './TablePagination';

interface PenagihanKeterlambatanViewProps {
  mode: 'keterlambatan' | 'penagihan';
  orders: ComputedOrder[];
  onEditOrder: (order: ComputedOrder) => void;
  onUpdateOrderFields: (orderId: string, updates: Partial<OrderFormPayload>) => Promise<void>;
}

export const PenagihanKeterlambatanView = memo(function PenagihanKeterlambatanView({
  mode,
  orders,
  onEditOrder,
  onUpdateOrderFields,
}: PenagihanKeterlambatanViewProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [dpInput, setDpInput] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const rows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (mode === 'keterlambatan') {
        const isAlert =
          o.statusJadwal === 'TERLAMBAT' ||
          o.statusJadwal === 'PERINGATAN' ||
          o.statusJadwal === 'SEGERA';
        if (!isAlert) return false;
      } else {
        if (paymentFilter !== 'ALL' && o.statusPembayaran !== paymentFilter) return false;
      }

      if (q) {
        const hit =
          o.namaCustomer.toLowerCase().includes(q) ||
          o.noInvoice.toLowerCase().includes(q) ||
          CATEGORY_LABELS[o.kategori].toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    if (mode === 'keterlambatan') {
      return [...list].sort((a, b) => (a.sisaHari ?? 999) - (b.sisaHari ?? 999));
    }

    return [...list].sort((a, b) => {
      if (!a.tglEstimasiSelesai) return 1;
      if (!b.tglEstimasiSelesai) return -1;
      return a.tglEstimasiSelesai.localeCompare(b.tglEstimasiSelesai);
    });
  }, [orders, mode, deferredSearch, paymentFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mode, deferredSearch, paymentFilter]);

  const paginatedRows = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const { totalTagihan, totalDp, totalSisa } = useMemo(
    () => ({
      totalTagihan: rows.reduce((sum, o) => sum + o.totalNominal, 0),
      totalDp: rows.reduce((sum, o) => sum + o.dpNominal, 0),
      totalSisa: rows.reduce((sum, o) => sum + o.sisaTagihan, 0),
    }),
    [rows]
  );

  const handleMarkPaidOff = async (order: ComputedOrder) => {
    await onUpdateOrderFields(order.id, { dpNominal: order.totalNominal });
  };

  const handleSaveDp = async (order: ComputedOrder) => {
    await onUpdateOrderFields(order.id, { dpNominal: Math.max(0, dpInput) });
    setEditingPaymentId(null);
  };

  return (
    <div className="space-y-6">
      {mode === 'penagihan' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Total Nilai Order</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalTagihan)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Total DP / Pembayaran Masuk</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {formatRupiah(totalDp)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Total Sisa Pelunasan</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-600 tabular-nums">
              {formatRupiah(totalSisa)}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari customer atau no. invoice..."
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        {mode === 'penagihan' && (
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(['ALL', 'BELUM DP', 'DP', 'LUNAS'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setPaymentFilter(st)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  paymentFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {mode === 'keterlambatan'
                ? 'Tidak ada order terlambat atau mendekati batas waktu'
                : 'Tidak ada data penagihan yang cocok'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {mode === 'keterlambatan'
                ? 'Seluruh order aktif berada dalam status aman atau sudah selesai.'
                : 'Ubah filter status pembayaran atau kata kunci pencarian.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Kategori</th>
                  <th className="px-4 py-3 whitespace-nowrap">Customer &amp; Paket</th>
                  <th className="px-4 py-3 whitespace-nowrap">Estimasi Selesai</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Jadwal</th>
                  {mode === 'keterlambatan' ? (
                    <>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Sisa Hari</th>
                      <th className="px-4 py-3 whitespace-nowrap">Desain / Produksi</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">DP Masuk</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Sisa Tagihan</th>
                      <th className="px-4 py-3 whitespace-nowrap">Status Bayar</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => onEditOrder(o)}
                        className="cursor-pointer text-left"
                      >
                        <CategoryBadge category={o.kategori} />
                      </button>
                      <div className="mt-1 font-mono text-[11px] text-slate-500">
                        {o.belumInvoice ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-amber-800">
                            BELUM BIKIN
                          </span>
                        ) : (
                          o.noInvoice
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditOrder(o)}
                          className="font-semibold text-blue-700 hover:underline cursor-pointer text-left"
                        >
                          {o.namaCustomer}
                        </button>
                        <CustomerTypeBadge type={o.statusCustomer} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {o.paket ? `Paket: ${o.paket}` : 'Paket belum dipilih'}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top font-mono tabular-nums text-slate-700">
                      {formatDateId(o.tglEstimasiSelesai)}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <ScheduleStatusBadge status={o.statusJadwal} />
                    </td>

                    {mode === 'keterlambatan' ? (
                      <>
                        <td className="px-4 py-3 align-top text-right font-mono tabular-nums">
                          {o.sisaHari === null ? (
                            '-'
                          ) : o.sisaHari < 0 ? (
                            <span className="font-bold text-red-600">
                              Telat {Math.abs(o.sisaHari)} hr
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-700">H-{o.sisaHari}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-slate-800 font-medium">{o.statusProduksi}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            Desain: {o.statusDesain}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <button
                            type="button"
                            onClick={() => onEditOrder(o)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Update Progres
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 align-top text-right font-mono tabular-nums text-slate-800">
                          {formatRupiah(o.totalNominal)}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono tabular-nums text-slate-700">
                          {editingPaymentId === o.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={dpInput}
                                onChange={(e) => setDpInput(Number(e.target.value))}
                                className="w-28 rounded border border-blue-500 px-2 py-1 text-right font-mono text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDp(o)}
                                className="rounded bg-blue-600 px-2 py-1 text-[11px] text-white cursor-pointer"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentId(o.id);
                                setDpInput(o.dpNominal);
                              }}
                              className="hover:text-blue-600 hover:underline cursor-pointer"
                              title="Klik untuk ubah nominal DP/masuk"
                            >
                              {formatRupiah(o.dpNominal)}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono font-semibold tabular-nums text-slate-900">
                          {formatRupiah(o.sisaTagihan)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <PaymentStatusBadge status={o.statusPembayaran} />
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {o.sisaTagihan > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPaidOff(o)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Lunasi
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">Lunas</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              totalItems={rows.length}
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
