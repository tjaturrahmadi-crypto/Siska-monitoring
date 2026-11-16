import { Search } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  DESIGN_STATUS_OPTIONS,
  formatDateId,
  getTodayDateKey,
} from '../constants/defaults';
import type { ComputedOrder, DesignStatus, MasterSettings, OrderFormPayload } from '../types';
import { IndonesianDateInput } from './IndonesianDateInput';
import { CategoryBadge, CustomerTypeBadge, ScheduleStatusBadge } from './StatusLabels';
import { TablePagination } from './TablePagination';

interface DesainViewProps {
  orders: ComputedOrder[];
  settings: MasterSettings;
  onUpdateOrderFields: (orderId: string, updates: Partial<OrderFormPayload>) => Promise<void>;
  onEditOrder: (order: ComputedOrder) => void;
}

export const DesainView = memo(function DesainView({
  orders,
  settings,
  onUpdateOrderFields,
  onEditOrder,
}: DesainViewProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<DesignStatus | 'ALL'>('ALL');
  const [designerFilter, setDesignerFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const counts = useMemo(() => {
    const map: Record<DesignStatus, number> = {
      'BELUM DESAIN': 0,
      'PROSES DESAIN': 0,
      REVISI: 0,
      'DESAIN ACC': 0,
    };
    for (const o of orders) {
      map[o.statusDesain]++;
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.statusDesain !== statusFilter) return false;
      if (designerFilter !== 'ALL' && o.desainer !== designerFilter) return false;
      if (q) {
        const hit =
          o.namaCustomer.toLowerCase().includes(q) ||
          o.noInvoice.toLowerCase().includes(q) ||
          CATEGORY_LABELS[o.kategori].toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, deferredSearch, statusFilter, designerFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, designerFilter]);

  const paginated = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleQuickDesignUpdate = async (
    orderId: string,
    patch: Partial<Pick<OrderFormPayload, 'statusDesain' | 'revisiKe' | 'desainer' | 'tglUpdateDesain'>>
  ) => {
    await onUpdateOrderFields(orderId, {
      ...patch,
      tglUpdateDesain: patch.tglUpdateDesain ?? getTodayDateKey(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Segmented Status Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DESIGN_STATUS_OPTIONS.map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(active ? 'ALL' : st)}
              className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-medium text-slate-500">{st}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {counts[st]}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tim, customer, atau no. invoice..."
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DesignStatus | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="ALL">Semua Status Desain</option>
          {DESIGN_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={designerFilter}
          onChange={(e) => setDesignerFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="ALL">Semua Desainer</option>
          {settings.desainerList.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Design Queue Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Tidak ada antrean desain pada filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Kategori / Qty</th>
                  <th className="px-4 py-3 whitespace-nowrap">Customer &amp; Request</th>
                  <th className="px-4 py-3 whitespace-nowrap">Layout &amp; Jadwal</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Desain</th>
                  <th className="px-4 py-3 whitespace-nowrap">Revisi Ke-</th>
                  <th className="px-4 py-3 whitespace-nowrap">Desainer</th>
                  <th className="px-4 py-3 whitespace-nowrap">Tgl Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((o) => {
                  const isRevisionDisabled =
                    o.statusDesain === 'BELUM DESAIN' || o.statusDesain === 'PROSES DESAIN';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => onEditOrder(o)}
                          className="cursor-pointer text-left"
                          title="Klik untuk buka detail order"
                        >
                          <CategoryBadge category={o.kategori} />
                        </button>
                        <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                          {o.qtyOrder} pcs
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top max-w-xs">
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
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {o.noInvoice} {o.kerah ? `· Kerah: ${o.kerah}` : ''}
                        </div>
                        {o.keteranganRequest && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                            {o.keteranganRequest}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <ScheduleStatusBadge status={o.statusJadwal} />
                        <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                          {o.belumLayout ? (
                            <span className="font-sans font-semibold text-amber-700">
                              BELUM LAYOUT
                            </span>
                          ) : (
                            `Layout: ${formatDateId(o.tglMasukLayout)}`
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          Est: {formatDateId(o.tglEstimasiSelesai)}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <select
                          value={o.statusDesain}
                          onChange={(e) => {
                            const nextStatus = e.target.value as DesignStatus;
                            const noRev =
                              nextStatus === 'BELUM DESAIN' || nextStatus === 'PROSES DESAIN';
                            handleQuickDesignUpdate(o.id, {
                              statusDesain: nextStatus,
                              ...(noRev ? { revisiKe: 0 } : {}),
                            });
                          }}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {DESIGN_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <select
                          disabled={isRevisionDisabled}
                          value={isRevisionDisabled ? 0 : o.revisiKe}
                          onChange={(e) =>
                            handleQuickDesignUpdate(o.id, {
                              revisiKe: Number(e.target.value),
                            })
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={num}>
                              {num === 0 ? (isRevisionDisabled ? 'Nonaktif' : '0') : `Rev ${num}`}
                            </option>
                          ))}
                        </select>
                      </td>

                    <td className="px-4 py-3 align-top">
                      <select
                        value={o.desainer}
                        onChange={(e) =>
                          handleQuickDesignUpdate(o.id, { desainer: e.target.value })
                        }
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="">-- Pilih --</option>
                        {settings.desainerList.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 align-top w-36">
                      <IndonesianDateInput
                        compact
                        value={o.tglUpdateDesain}
                        onChange={(val) =>
                          handleQuickDesignUpdate(o.id, { tglUpdateDesain: val })
                        }
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              totalItems={filtered.length}
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
