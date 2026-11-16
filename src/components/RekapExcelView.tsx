import { FileDown } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  BULAN_ID,
  CATEGORY_LABELS,
  formatDateId,
  formatRupiah,
  getTodayDateKey,
} from '../constants/defaults';
import type { ComputedOrder, OrderCategory } from '../types';
import { CategoryBadge, PaymentStatusBadge } from './StatusLabels';
import { TablePagination } from './TablePagination';

interface RekapExcelViewProps {
  orders: ComputedOrder[];
}

function getOrderYearMonth(order: ComputedOrder): { year: number; month: number } | null {
  const refDate = order.tglOrder || order.tglMasukLayout || order.tglEstimasiSelesai;
  if (!refDate || !/^\d{4}-\d{2}-\d{2}$/.test(refDate)) return null;
  const [y, m] = refDate.split('-').map(Number);
  if (!y || !m) return null;
  return { year: y, month: m };
}

function buildOrderSpecSummary(o: ComputedOrder): string {
  const jnsCelana = o.jenisCelana || 'CELANA PENDEK';
  const upperExtras: string[] = [];
  if (o.pecahPola === 'ADA') upperExtras.push(`Pecah Pola (${o.jmlPecahPola} pcs)`);
  if (o.lisPiping === 'ADA') upperExtras.push(`Lis Piping (${o.jmlLisPiping} pcs)`);
  const celanaExtras: string[] = [];
  if (o.pecahPolaCelana === 'ADA') celanaExtras.push(`Pecah Pola (${o.jmlPecahPolaCelana} pcs)`);
  if (o.lisPipingCelana === 'ADA') celanaExtras.push(`Lis Piping (${o.jmlLisPipingCelana} pcs)`);

  const fmtExtra = (items: string[]) => (items.length > 0 ? ` [${items.join(', ')}]` : '');

  if (o.kategori === 'SETELAN') {
    return `Atasan: ${o.bahanAtasan || '-'} (${o.kerah || '-'})${fmtExtra(upperExtras)} | Celana: ${jnsCelana} - ${o.bahanCelana || '-'}${fmtExtra(celanaExtras)}`;
  }
  if (o.kategori === 'ATASAN') {
    return `${o.bahanAtasan || '-'} (${o.kerah || '-'})${fmtExtra(upperExtras)}`;
  }
  if (o.kategori === 'CELANA') {
    return `${jnsCelana} - ${o.bahanCelana || '-'} | No: ${o.jenisNomorCelana || '-'}${fmtExtra(celanaExtras)}`;
  }
  return `${o.bahanJaket || '-'} (${o.kerah || '-'})${fmtExtra(upperExtras)}`;
}

function formatPercent(val: number, total: number): string {
  if (total <= 0) return '0.0%';
  return `${((val / total) * 100).toFixed(1)}%`;
}


export const RekapExcelView = memo(function RekapExcelView({ orders }: RekapExcelViewProps) {
  const todayParts = getTodayDateKey().split('-').map(Number);
  const currentYear = todayParts[0] || new Date().getFullYear();
  const currentMonth = todayParts[1] || new Date().getMonth() + 1;

  const [mode, setMode] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<OrderCategory | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const o of orders) {
      const ym = getOrderYearMonth(o);
      if (ym) years.add(ym.year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, currentYear]);

  const filteredByYear = useMemo(() => {
    return orders.filter((o) => {
      const ym = getOrderYearMonth(o);
      if (!ym || ym.year !== selectedYear) return false;
      if (categoryFilter !== 'ALL' && o.kategori !== categoryFilter) return false;
      return true;
    });
  }, [orders, selectedYear, categoryFilter]);

  const monthlyOrders = useMemo(() => {
    return filteredByYear
      .filter((o) => {
        const ym = getOrderYearMonth(o);
        return ym && ym.month === selectedMonth;
      })
      .sort((a, b) => (a.tglOrder || '').localeCompare(b.tglOrder || ''));
  }, [filteredByYear, selectedMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, categoryFilter, mode]);

  const paginatedMonthlyOrders = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(monthlyOrders.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return monthlyOrders.slice(start, start + pageSize);
  }, [monthlyOrders, currentPage, pageSize]);

  const yearlyBreakdown = useMemo(() => {
    return BULAN_ID.map((monthName, idx) => {
      const monthNum = idx + 1;
      const rows = filteredByYear.filter((o) => {
        const ym = getOrderYearMonth(o);
        return ym && ym.month === monthNum;
      });
      return {
        monthNum,
        monthName,
        totalOrder: rows.length,
        totalQty: rows.reduce((sum, r) => sum + r.qtyOrder, 0),
        setelanQty: rows.filter((r) => r.kategori === 'SETELAN').reduce((s, r) => s + r.qtyOrder, 0),
        atasanQty: rows.filter((r) => r.kategori === 'ATASAN').reduce((s, r) => s + r.qtyOrder, 0),
        celanaQty: rows.filter((r) => r.kategori === 'CELANA').reduce((s, r) => s + r.qtyOrder, 0),
        jaketQty: rows.filter((r) => r.kategori === 'JAKET').reduce((s, r) => s + r.qtyOrder, 0),
        totalNominal: rows.reduce((sum, r) => sum + r.totalNominal, 0),
        dpNominal: rows.reduce((sum, r) => sum + r.dpNominal, 0),
        sisaTagihan: rows.reduce((sum, r) => sum + r.sisaTagihan, 0),
      };
    });
  }, [filteredByYear]);

  const activeRows = mode === 'bulanan' ? monthlyOrders : filteredByYear;

  const summary = useMemo(() => {
    return {
      totalOrder: activeRows.length,
      totalQty: activeRows.reduce((s, o) => s + o.qtyOrder, 0),
      totalNominal: activeRows.reduce((s, o) => s + o.totalNominal, 0),
      totalDp: activeRows.reduce((s, o) => s + o.dpNominal, 0),
      totalSisa: activeRows.reduce((s, o) => s + o.sisaTagihan, 0),
    };
  }, [activeRows]);

  const yearlyCategoryTotals = useMemo(
    () => ({
      setelanQty: yearlyBreakdown.reduce((s, r) => s + r.setelanQty, 0),
      atasanQty: yearlyBreakdown.reduce((s, r) => s + r.atasanQty, 0),
      celanaQty: yearlyBreakdown.reduce((s, r) => s + r.celanaQty, 0),
      jaketQty: yearlyBreakdown.reduce((s, r) => s + r.jaketQty, 0),
    }),
    [yearlyBreakdown]
  );


  const mapOrderToExcelRow = (o: ComputedOrder, idx: number) => ({
    No: idx + 1,
    'Tgl. Order': formatDateId(o.tglOrder),
    'No. Invoice': o.noInvoice,
    Kategori: CATEGORY_LABELS[o.kategori],
    Paket: o.paket || '-',
    'Nama Customer / Tim': o.namaCustomer,
    'Status Order': o.statusCustomer,
    'Qty (PCS)': o.qtyOrder,
    'Spesifikasi Bahan': buildOrderSpecSummary(o),
    'Tgl. Layout': o.belumLayout ? 'BELUM LAYOUT' : formatDateId(o.tglMasukLayout),
    'Est. Selesai': formatDateId(o.tglEstimasiSelesai),
    'Status Desain': o.statusDesain,
    Desainer: o.desainer || '-',
    'Status Produksi': o.statusProduksi,
    'Total Nominal (Rp)': o.totalNominal,
    'DP Masuk (Rp)': o.dpNominal,
    'Sisa Tagihan (Rp)': o.sisaTagihan,
    'Status Bayar': o.statusPembayaran,
  });

  const handleDownloadMonthlyExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const monthLabel = BULAN_ID[selectedMonth - 1];
      const detailRows = monthlyOrders.map(mapOrderToExcelRow);

      const summaryByCategory = (['SETELAN', 'ATASAN', 'CELANA', 'JAKET'] as OrderCategory[]).map(
        (cat) => {
          const subset = monthlyOrders.filter((o) => o.kategori === cat);
          const qty = subset.reduce((s, o) => s + o.qtyOrder, 0);
          return {
            Kategori: CATEGORY_LABELS[cat],
            'Jumlah Order': subset.length,
            'Total Qty (PCS)': qty,
            'Persentase Qty': formatPercent(qty, summary.totalQty),
            'Total Omzet (Rp)': subset.reduce((s, o) => s + o.totalNominal, 0),
            'DP Masuk (Rp)': subset.reduce((s, o) => s + o.dpNominal, 0),
            'Sisa Tagihan (Rp)': subset.reduce((s, o) => s + o.sisaTagihan, 0),
          };
        }
      );

      summaryByCategory.push({
        Kategori: 'TOTAL KESELURUHAN',
        'Jumlah Order': summary.totalOrder,
        'Total Qty (PCS)': summary.totalQty,
        'Persentase Qty': summary.totalQty > 0 ? '100.0%' : '0.0%',
        'Total Omzet (Rp)': summary.totalNominal,
        'DP Masuk (Rp)': summary.totalDp,
        'Sisa Tagihan (Rp)': summary.totalSisa,
      });

      const wb = XLSX.utils.book_new();
      const wsDetail = XLSX.utils.json_to_sheet(
        detailRows.length > 0
          ? detailRows
          : [{ Info: `Belum ada order pada bulan ${monthLabel} ${selectedYear}` }]
      );
      wsDetail['!cols'] = [
        { wch: 5 },
        { wch: 13 },
        { wch: 16 },
        { wch: 11 },
        { wch: 22 },
        { wch: 26 },
        { wch: 12 },
        { wch: 10 },
        { wch: 36 },
        { wch: 14 },
        { wch: 14 },
        { wch: 15 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(wb, wsDetail, `Order ${monthLabel}`);

      const wsSummary = XLSX.utils.json_to_sheet(summaryByCategory);
      wsSummary['!cols'] = [
        { wch: 22 },
        { wch: 14 },
        { wch: 16 },
        { wch: 15 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Kategori');

      XLSX.writeFile(wb, `Rekap_Order_SISKA_${monthLabel}_${selectedYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadYearlyExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const monthlySheetRows = yearlyBreakdown.map((m) => ({
        Bulan: m.monthName,
        'Jumlah Order': m.totalOrder,
        'Total Qty (PCS)': m.totalQty,
        'Kontribusi Qty': formatPercent(m.totalQty, summary.totalQty),
        'Setelan (PCS)': m.setelanQty,
        'Atasan (PCS)': m.atasanQty,
        'Celana (PCS)': m.celanaQty,
        'Jaket (PCS)': m.jaketQty,
        'Total Omzet (Rp)': m.totalNominal,
        'DP Masuk (Rp)': m.dpNominal,
        'Sisa Tagihan (Rp)': m.sisaTagihan,
      }));

      monthlySheetRows.push({
        Bulan: `TOTAL TAHUN ${selectedYear}`,
        'Jumlah Order': summary.totalOrder,
        'Total Qty (PCS)': summary.totalQty,
        'Kontribusi Qty': summary.totalQty > 0 ? '100.0%' : '0.0%',
        'Setelan (PCS)': yearlyCategoryTotals.setelanQty,
        'Atasan (PCS)': yearlyCategoryTotals.atasanQty,
        'Celana (PCS)': yearlyCategoryTotals.celanaQty,
        'Jaket (PCS)': yearlyCategoryTotals.jaketQty,
        'Total Omzet (Rp)': summary.totalNominal,
        'DP Masuk (Rp)': summary.totalDp,
        'Sisa Tagihan (Rp)': summary.totalSisa,
      });

      const allDetailRows = [...filteredByYear]
        .sort((a, b) => (a.tglOrder || '').localeCompare(b.tglOrder || ''))
        .map(mapOrderToExcelRow);

      const wb = XLSX.utils.book_new();
      const wsMonthly = XLSX.utils.json_to_sheet(monthlySheetRows);
      wsMonthly['!cols'] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 15 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMonthly, `Rekap Bulanan ${selectedYear}`);

      const wsOrders = XLSX.utils.json_to_sheet(
        allDetailRows.length > 0
          ? allDetailRows
          : [{ Info: `Belum ada order pada tahun ${selectedYear}` }]
      );
      wsOrders['!cols'] = [
        { wch: 5 },
        { wch: 13 },
        { wch: 16 },
        { wch: 11 },
        { wch: 22 },
        { wch: 26 },
        { wch: 12 },
        { wch: 10 },
        { wch: 36 },
        { wch: 14 },
        { wch: 14 },
        { wch: 15 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(wb, wsOrders, `Semua Order ${selectedYear}`);

      XLSX.writeFile(wb, `Rekap_Tahunan_SISKA_${selectedYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const periodLabel =
    mode === 'bulanan' ? `${BULAN_ID[selectedMonth - 1]} ${selectedYear}` : `Tahun ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('bulanan')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'bulanan'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Bulanan
            </button>
            <button
              type="button"
              onClick={() => setMode('tahunan')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'tahunan'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Tahunan
            </button>
          </div>

          {mode === 'bulanan' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {BULAN_ID.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

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
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={mode === 'bulanan' ? handleDownloadMonthlyExcel : handleDownloadYearlyExcel}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
        >
          <FileDown className="h-4 w-4" />
          {exporting
            ? 'Menyiapkan Excel...'
            : mode === 'bulanan'
              ? `Download Excel (${BULAN_ID[selectedMonth - 1]} ${selectedYear})`
              : `Download Excel Tahun ${selectedYear}`}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Order ({periodLabel})</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.totalOrder}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Qty Produksi</p>
          <p className="mt-1 font-mono text-2xl font-bold text-blue-700 tabular-nums">
            {summary.totalQty} <span className="text-sm font-normal text-slate-500">PCS</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Nilai Order</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(summary.totalNominal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">DP Masuk / Sisa Tagihan</p>
          <p className="mt-1 font-mono text-sm font-bold text-emerald-700 tabular-nums">
            DP: {formatRupiah(summary.totalDp)}
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-red-600 tabular-nums">
            Sisa: {formatRupiah(summary.totalSisa)}
          </p>
        </div>
      </div>


      {/* Data Preview Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {mode === 'bulanan' ? (
          monthlyOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Belum ada order tercatat pada bulan {BULAN_ID[selectedMonth - 1]} {selectedYear}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                    <th className="px-4 py-3 whitespace-nowrap">Tgl Order</th>
                    <th className="px-4 py-3 whitespace-nowrap">Kategori &amp; Paket</th>
                    <th className="px-4 py-3 whitespace-nowrap">Customer &amp; Invoice</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3 whitespace-nowrap">Progres</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total Nominal</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Sisa Tagihan</th>
                    <th className="px-4 py-3 whitespace-nowrap">Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMonthlyOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                        {formatDateId(o.tglOrder)}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={o.kategori} />
                        {o.paket && (
                          <div className="mt-1 text-[11px] text-slate-500">{o.paket}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{o.namaCustomer}</div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                          {o.belumInvoice ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-amber-800">
                              BELUM BIKIN
                            </span>
                          ) : (
                            <span>{o.noInvoice}</span>
                          )}
                          <span>· {o.statusCustomer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {o.qtyOrder} pcs
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{o.statusProduksi}</div>
                        <div className="text-[11px] text-slate-500">{o.statusDesain}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                        {formatRupiah(o.totalNominal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {formatRupiah(o.sisaTagihan)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={o.statusPembayaran} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                totalItems={monthlyOrders.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Bulan ({selectedYear})</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Jml Order</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total PCS</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Porsi %</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Setelan</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Atasan</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Celana</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Jaket</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total Omzet</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Sisa Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {yearlyBreakdown.map((m) => (
                  <tr
                    key={m.monthNum}
                    className={`hover:bg-slate-50/70 ${
                      m.totalOrder === 0 ? 'text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-sans font-semibold text-slate-900">
                      {m.monthName}
                    </td>
                    <td className="px-4 py-2.5 text-right">{m.totalOrder}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{m.totalQty}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700 font-semibold">
                      {formatPercent(m.totalQty, summary.totalQty)}
                    </td>
                    <td className="px-4 py-2.5 text-right">{m.setelanQty}</td>
                    <td className="px-4 py-2.5 text-right">{m.atasanQty}</td>
                    <td className="px-4 py-2.5 text-right">{m.celanaQty}</td>
                    <td className="px-4 py-2.5 text-right">{m.jaketQty}</td>
                    <td className="px-4 py-2.5 text-right">{formatRupiah(m.totalNominal)}</td>
                    <td className="px-4 py-2.5 text-right">{formatRupiah(m.sisaTagihan)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td className="px-4 py-3 font-sans">TOTAL {selectedYear}</td>
                  <td className="px-4 py-3 text-right">{summary.totalOrder}</td>
                  <td className="px-4 py-3 text-right">{summary.totalQty}</td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {summary.totalQty > 0 ? '100.0%' : '0.0%'}
                  </td>
                  <td className="px-4 py-3 text-right">{yearlyCategoryTotals.setelanQty}</td>
                  <td className="px-4 py-3 text-right">{yearlyCategoryTotals.atasanQty}</td>
                  <td className="px-4 py-3 text-right">{yearlyCategoryTotals.celanaQty}</td>
                  <td className="px-4 py-3 text-right">{yearlyCategoryTotals.jaketQty}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(summary.totalNominal)}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(summary.totalSisa)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
