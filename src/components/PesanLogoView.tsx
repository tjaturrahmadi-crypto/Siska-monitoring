import { CheckCircle2, Clock, Search } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABELS, formatDateId, getTodayDateKey } from '../constants/defaults';
import type { ComputedOrder, LogoOrderStatus, OrderCategory, OrderFormPayload } from '../types';
import { isNoQtyLogoType } from '../utils/orderCalculations';
import { CategoryBadge, CustomerTypeBadge } from './StatusLabels';
import { TablePagination } from './TablePagination';

interface PesanLogoViewProps {
  orders: ComputedOrder[];
  onUpdateOrderFields: (orderId: string, updates: Partial<OrderFormPayload>) => Promise<void>;
}

function formatSingleLogoSpec(jenis: string, qty: number): string | null {
  if (!jenis || jenis.toUpperCase().startsWith('TANPA')) return null;
  if (isNoQtyLogoType(jenis)) {
    return `${jenis} (PRINTING)`;
  }
  return `${jenis} — ${qty} pcs`;
}

export const PesanLogoView = memo(function PesanLogoView({
  orders,
  onUpdateOrderFields,
}: PesanLogoViewProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState<OrderCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LogoOrderStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (categoryFilter !== 'ALL' && o.kategori !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && o.statusPesanLogo !== statusFilter) return false;
      if (q) {
        const hit =
          o.namaCustomer.toLowerCase().includes(q) ||
          o.noInvoice.toLowerCase().includes(q) ||
          CATEGORY_LABELS[o.kategori].toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, deferredSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, categoryFilter, statusFilter]);

  const paginated = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const { belumCount, sudahCount } = useMemo(() => {
    let belum = 0;
    let sudah = 0;
    for (const o of orders) {
      if (o.statusPesanLogo === 'BELUM') belum++;
      else if (o.statusPesanLogo === 'SUDAH') sudah++;
    }
    return { belumCount: belum, sudahCount: sudah };
  }, [orders]);

  const toggleLogoOrderStatus = async (order: ComputedOrder) => {
    const nextStatus: LogoOrderStatus = order.statusPesanLogo === 'BELUM' ? 'SUDAH' : 'BELUM';
    await onUpdateOrderFields(order.id, {
      statusPesanLogo: nextStatus,
      tglPesanLogo: nextStatus === 'SUDAH' ? getTodayDateKey() : '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Belum Dipesan</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {belumCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Sudah Dipesan</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {sudahCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Catatan Printing</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Logo/sponsor bertipe <span className="font-semibold">PRINTING</span> tampil otomatis
            tanpa jumlah PCS, terpisah antara Atasan dan Celana.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
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

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as OrderCategory | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="ALL">Semua Kategori</option>
          <option value="SETELAN">Setelan</option>
          <option value="ATASAN">Atasan</option>
          <option value="CELANA">Celana</option>
          <option value="JAKET">Jaket</option>
        </select>

        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(['ALL', 'BELUM', 'SUDAH'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'SEMUA' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Tidak ada data kebutuhan logo yang cocok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Kategori</th>
                  <th className="px-4 py-3 whitespace-nowrap">Customer &amp; Invoice</th>
                  <th className="px-4 py-3 whitespace-nowrap">Kebutuhan Logo &amp; Sponsor (Atasan / Celana)</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Pemesanan</th>
                  <th className="px-4 py-3 whitespace-nowrap">Tgl Pesan</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((o) => {
                  const hasAtasan = o.kategori === 'SETELAN' || o.kategori === 'ATASAN';
                  const hasCelana = o.kategori === 'SETELAN' || o.kategori === 'CELANA';
                  const isJaket = o.kategori === 'JAKET';

                  const atasanItems = hasAtasan
                    ? [
                        {
                          label: 'Logo Tim',
                          text: formatSingleLogoSpec(o.jenisLogoTim, o.jmlLogoTim),
                        },
                        {
                          label: 'Logo Apparel',
                          text: formatSingleLogoSpec(o.jenisLogoApparel, o.jmlLogoApparel),
                        },
                        {
                          label: 'Sponsor Dpn/Blk',
                          text: formatSingleLogoSpec(
                            o.jenisSponsorDepanBelakang,
                            o.jmlSponsorDepanBelakang
                          ),
                        },
                        {
                          label: 'Sponsor Lengan',
                          text: formatSingleLogoSpec(o.jenisSponsorLengan, o.jmlSponsorLengan),
                        },
                      ].filter((x) => x.text !== null)
                    : [];

                  const celanaItems = hasCelana
                    ? [
                        {
                          label: 'Nomor Celana',
                          text: formatSingleLogoSpec(o.jenisNomorCelana, o.jmlNomorCelana),
                        },
                        {
                          label: 'Logo Apparel',
                          text: formatSingleLogoSpec(
                            o.jenisLogoApparelCelana,
                            o.jmlLogoApparelCelana
                          ),
                        },
                        {
                          label: 'Logo Tim',
                          text: formatSingleLogoSpec(o.jenisLogoTimCelana, o.jmlLogoTimCelana),
                        },
                      ].filter((x) => x.text !== null)
                    : [];

                  const jaketItems = isJaket
                    ? [
                        {
                          label: 'Logo Jaket',
                          text: formatSingleLogoSpec(o.jenisLogoJaket, o.jmlLogoJaket),
                        },
                      ].filter((x) => x.text !== null)
                    : [];

                  const hasAnySpec =
                    atasanItems.length > 0 || celanaItems.length > 0 || jaketItems.length > 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70">
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
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {o.noInvoice}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {!hasAnySpec ? (
                          <span className="text-slate-400">Tanpa logo tambahan</span>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {hasAtasan && (
                              <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-2.5">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                  Atasan
                                </p>
                                {atasanItems.length === 0 ? (
                                  <p className="text-[11px] text-slate-400">Tanpa logo atasan</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {atasanItems.map((item) => (
                                      <li key={item.label} className="text-slate-700">
                                        <span className="font-medium text-slate-900">
                                          {item.label}:
                                        </span>{' '}
                                        <span className="font-mono text-[11px]">{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {hasCelana && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-2.5">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                  Celana
                                </p>
                                {celanaItems.length === 0 ? (
                                  <p className="text-[11px] text-slate-400">Tanpa logo celana</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {celanaItems.map((item) => (
                                      <li key={item.label} className="text-slate-700">
                                        <span className="font-medium text-slate-900">
                                          {item.label}:
                                        </span>{' '}
                                        <span className="font-mono text-[11px]">{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {isJaket && (
                              <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-2.5">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                                  Jaket
                                </p>
                                <ul className="space-y-1">
                                  {jaketItems.map((item) => (
                                    <li key={item.label} className="text-slate-700">
                                      <span className="font-medium text-slate-900">
                                        {item.label}:
                                      </span>{' '}
                                      <span className="font-mono text-[11px]">{item.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {o.statusPesanLogo === 'SUDAH' ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            SUDAH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            <Clock className="h-3.5 w-3.5" />
                            BELUM
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top font-mono tabular-nums text-slate-600">
                        {o.statusPesanLogo === 'SUDAH' ? formatDateId(o.tglPesanLogo) : '-'}
                      </td>

                      <td className="px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => toggleLogoOrderStatus(o)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            o.statusPesanLogo === 'BELUM'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {o.statusPesanLogo === 'BELUM' ? 'Tandai Sudah Pesan' : 'Batalkan'}
                        </button>
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
