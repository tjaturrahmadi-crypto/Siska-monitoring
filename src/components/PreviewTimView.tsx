import { Check, Copy, MessageSquare, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  formatDateId,
  formatRupiah,
} from '../constants/defaults';
import type { ComputedOrder } from '../types';
import { buildWhatsAppPreviewText, isNoQtyLogoType } from '../utils/orderCalculations';
import {
  CategoryBadge,
  CategoryIcon,
  CustomerTypeBadge,
  PaymentStatusBadge,
  ScheduleStatusBadge,
} from './StatusLabels';

interface PreviewTimViewProps {
  orders: ComputedOrder[];
  initialCustomer?: string;
  initialOrderId?: string;
}

function formatSpecValue(jenis: string, qty: number): string {
  const cleanJenis = jenis || '-';
  if (isNoQtyLogoType(cleanJenis)) {
    return cleanJenis;
  }
  return `${cleanJenis} (${qty} pcs)`;
}

export function PreviewTimView({
  orders,
  initialCustomer,
  initialOrderId,
}: PreviewTimViewProps) {
  const customerNames = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.namaCustomer.trim()) set.add(o.namaCustomer.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const [customerSearch, setCustomerSearch] = useState('');
  const filteredCustomerNames = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customerNames;
    return customerNames.filter((name) => name.toLowerCase().includes(q));
  }, [customerNames, customerSearch]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    initialCustomer || customerNames[0] || ''
  );

  useEffect(() => {
    if (initialCustomer && customerNames.includes(initialCustomer)) {
      setSelectedCustomer(initialCustomer);
    } else if (!selectedCustomer && customerNames.length > 0) {
      setSelectedCustomer(customerNames[0]);
    }
  }, [initialCustomer, customerNames, selectedCustomer]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) => o.namaCustomer.trim().toLowerCase() === selectedCustomer.trim().toLowerCase()
    );
  }, [orders, selectedCustomer]);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || '');

  useEffect(() => {
    if (initialOrderId && customerOrders.some((o) => o.id === initialOrderId)) {
      setSelectedOrderId(initialOrderId);
    } else if (
      customerOrders.length > 0 &&
      !customerOrders.some((o) => o.id === selectedOrderId)
    ) {
      setSelectedOrderId(customerOrders[0].id);
    }
  }, [initialOrderId, customerOrders, selectedOrderId]);

  const activeOrder = customerOrders.find((o) => o.id === selectedOrderId) || customerOrders[0];
  const [copied, setCopied] = useState(false);

  const whatsAppText = useMemo(() => {
    return activeOrder ? buildWhatsAppPreviewText(activeOrder) : '';
  }, [activeOrder]);

  const handleCopy = async () => {
    if (!whatsAppText) return;
    await navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-900">Belum ada data order untuk preview tim</p>
        <p className="mt-1 text-xs text-slate-500">
          Tambahkan order terlebih dahulu untuk melihat Kartu Produksi A4 dan teks WhatsApp.
        </p>
      </div>
    );
  }

  const catStyle = activeOrder ? CATEGORY_STYLES[activeOrder.kategori] : CATEGORY_STYLES.SETELAN;

  return (
    <div className="space-y-6">
      {/* Selector Bar (hidden on print) */}
      <div className="no-print flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Pilih Nama Customer / Tim ({customerNames.length} tim)
            </label>
            <div className="space-y-1.5">
              {customerNames.length > 15 && (
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerSearch(val);
                    const q = val.trim().toLowerCase();
                    if (q) {
                      const firstMatch = customerNames.find((n) => n.toLowerCase().includes(q));
                      if (firstMatch) setSelectedCustomer(firstMatch);
                    }
                  }}
                  placeholder="Ketik untuk saring nama tim..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              )}
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {filteredCustomerNames.slice(0, 500).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {filteredCustomerNames.length > 500 && (
                  <option disabled value="">
                    ... ketik nama di kotak cari untuk menyaring ({filteredCustomerNames.length} tim)
                  </option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Pilih Invoice ({customerOrders.length} pesanan atas nama tim ini)
            </label>
            <select
              value={activeOrder?.id || ''}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {customerOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.noInvoice} · {CATEGORY_LABELS[o.kategori]} ({o.statusCustomer})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Tersalin!' : 'Copy Info Order (WA)'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Cetak Kartu A4
          </button>
        </div>
      </div>

      {activeOrder && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* A4 Production Card */}
          <div
            className={`print-only-card lg:col-span-8 overflow-hidden rounded-xl border bg-white ${catStyle.cardBorderClass}`}
          >
            {/* Category Colored Header Banner */}
            <div className={`px-7 py-5 ${catStyle.cardHeaderClass}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
                    <CategoryIcon category={activeOrder.kategori} className="h-4 w-4" />
                    <span>{CATEGORY_LABELS[activeOrder.kategori]}</span>
                    {activeOrder.paket && (
                      <>
                        <span>·</span>
                        <span>{activeOrder.paket}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{activeOrder.statusCustomer}</span>
                  </div>
                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight">
                    {activeOrder.namaCustomer}
                  </h2>
                  <p className="mt-1 font-mono text-xs opacity-90">
                    Invoice:{' '}
                    {activeOrder.belumInvoice ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans font-bold text-amber-900">
                        BELUM BIKIN
                      </span>
                    ) : (
                      activeOrder.noInvoice
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-white/95 px-3.5 py-2.5 text-right text-slate-900">
                  <ScheduleStatusBadge status={activeOrder.statusJadwal} />
                  <p className="mt-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums">
                    Total Qty: {activeOrder.qtyOrder} PCS
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7 space-y-6">
              {/* Timeline & Progres Strip */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Tgl. Order</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {formatDateId(activeOrder.tglOrder)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Tgl. Masuk Layout</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {activeOrder.belumLayout ? (
                      <span className="font-sans text-xs font-bold text-amber-700">
                        BELUM LAYOUT
                      </span>
                    ) : (
                      formatDateId(activeOrder.tglMasukLayout)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Estimasi Selesai</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {formatDateId(activeOrder.tglEstimasiSelesai)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Status Desain / Prod</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-900">
                    {activeOrder.statusDesain}
                  </p>
                  <p className="text-[11px] text-slate-600">{activeOrder.statusProduksi}</p>
                </div>
              </div>

              {/* Structured Specifications */}
              {activeOrder.kategori === 'SETELAN' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Blok ATASAN */}
                  <div className="rounded-lg border border-teal-200 bg-teal-50/20 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-teal-200 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-teal-800">
                        Spesifikasi Atasan
                      </h3>
                      <CategoryBadge category="ATASAN" />
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Bahan Atasan</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.bahanAtasan || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Model Kerah</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.kerah || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Logo Tim</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(activeOrder.jenisLogoTim, activeOrder.jmlLogoTim)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Logo Apparel</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisLogoApparel,
                            activeOrder.jmlLogoApparel
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Sponsor Dpn/Blk</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisSponsorDepanBelakang,
                            activeOrder.jmlSponsorDepanBelakang
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Sponsor Lengan</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisSponsorLengan,
                            activeOrder.jmlSponsorLengan
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Pecah Pola</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.pecahPola === 'ADA'
                            ? `ADA (${activeOrder.jmlPecahPola} pcs)`
                            : 'TIDAK'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Lis Piping</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.lisPiping === 'ADA'
                            ? `ADA (${activeOrder.jmlLisPiping} pcs)`
                            : 'TIDAK'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Blok CELANA (4 item standar: Bahan Celana, Nomor Celana, Logo Apparel Celana, Logo Tim Celana) */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/20 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-amber-200 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                        Spesifikasi Celana
                      </h3>
                      <CategoryBadge category="CELANA" />
                    </div>
                    <dl className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Jenis Celana</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.jenisCelana || 'CELANA PENDEK'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Bahan Celana</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.bahanCelana || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Nomor (Celana)</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisNomorCelana,
                            activeOrder.jmlNomorCelana
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Logo Apparel (Celana)</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisLogoApparelCelana,
                            activeOrder.jmlLogoApparelCelana
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Logo Tim (Celana)</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {formatSpecValue(
                            activeOrder.jenisLogoTimCelana,
                            activeOrder.jmlLogoTimCelana
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Pecah Pola (Celana)</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.pecahPolaCelana === 'ADA'
                            ? `ADA (${activeOrder.jmlPecahPolaCelana} pcs)`
                            : 'TIDAK'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Lis Piping (Celana)</dt>
                        <dd className="font-semibold text-slate-900 text-right">
                          {activeOrder.lisPipingCelana === 'ADA'
                            ? `ADA (${activeOrder.jmlLisPipingCelana} pcs)`
                            : 'TIDAK'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : activeOrder.kategori === 'CELANA' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/20 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-amber-200 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Spesifikasi Celana
                    </h3>
                    <CategoryBadge category="CELANA" />
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    <div className="flex justify-between border-b border-amber-100 py-1.5 sm:col-span-2">
                      <dt className="text-slate-500">Jenis Celana</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeOrder.jenisCelana || 'CELANA PENDEK'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Bahan Celana</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeOrder.bahanCelana || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Nomor (Celana)</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatSpecValue(
                          activeOrder.jenisNomorCelana,
                          activeOrder.jmlNomorCelana
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Logo Apparel (Celana)</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatSpecValue(
                          activeOrder.jenisLogoApparelCelana,
                          activeOrder.jmlLogoApparelCelana
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Logo Tim (Celana)</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatSpecValue(
                          activeOrder.jenisLogoTimCelana,
                          activeOrder.jmlLogoTimCelana
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Pecah Pola (Celana)</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeOrder.pecahPolaCelana === 'ADA'
                          ? `ADA (${activeOrder.jmlPecahPolaCelana} pcs)`
                          : 'TIDAK'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 py-1.5">
                      <dt className="text-slate-500">Lis Piping (Celana)</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeOrder.lisPipingCelana === 'ADA'
                          ? `ADA (${activeOrder.jmlLisPipingCelana} pcs)`
                          : 'TIDAK'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                    Spesifikasi {CATEGORY_LABELS[activeOrder.kategori]}
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    {activeOrder.bahanAtasan && (
                      <div className="flex justify-between border-b border-slate-100 py-1.5">
                        <dt className="text-slate-500">Bahan Atasan</dt>
                        <dd className="font-semibold text-slate-900">{activeOrder.bahanAtasan}</dd>
                      </div>
                    )}
                    {activeOrder.bahanJaket && (
                      <div className="flex justify-between border-b border-slate-100 py-1.5">
                        <dt className="text-slate-500">Bahan Jaket</dt>
                        <dd className="font-semibold text-slate-900">{activeOrder.bahanJaket}</dd>
                      </div>
                    )}
                    {activeOrder.kerah && (
                      <div className="flex justify-between border-b border-slate-100 py-1.5">
                        <dt className="text-slate-500">Model Kerah</dt>
                        <dd className="font-semibold text-slate-900">{activeOrder.kerah}</dd>
                      </div>
                    )}
                    {activeOrder.kategori === 'JAKET' ? (
                      <>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Logo Jaket</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatSpecValue(activeOrder.jenisLogoJaket, activeOrder.jmlLogoJaket)}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Pecah Pola</dt>
                          <dd className="font-semibold text-slate-900">
                            {activeOrder.pecahPola === 'ADA'
                              ? `ADA (${activeOrder.jmlPecahPola} pcs)`
                              : 'TIDAK'}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Lis Piping</dt>
                          <dd className="font-semibold text-slate-900">
                            {activeOrder.lisPiping === 'ADA'
                              ? `ADA (${activeOrder.jmlLisPiping} pcs)`
                              : 'TIDAK'}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Logo Tim</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatSpecValue(activeOrder.jenisLogoTim, activeOrder.jmlLogoTim)}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Logo Apparel</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatSpecValue(
                              activeOrder.jenisLogoApparel,
                              activeOrder.jmlLogoApparel
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Sponsor Dpn/Blk</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatSpecValue(
                              activeOrder.jenisSponsorDepanBelakang,
                              activeOrder.jmlSponsorDepanBelakang
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Sponsor Lengan</dt>
                          <dd className="font-semibold text-slate-900">
                            {formatSpecValue(
                              activeOrder.jenisSponsorLengan,
                              activeOrder.jmlSponsorLengan
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Pecah Pola</dt>
                          <dd className="font-semibold text-slate-900">
                            {activeOrder.pecahPola === 'ADA'
                              ? `ADA (${activeOrder.jmlPecahPola} pcs)`
                              : 'TIDAK'}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1.5">
                          <dt className="text-slate-500">Lis Piping</dt>
                          <dd className="font-semibold text-slate-900">
                            {activeOrder.lisPiping === 'ADA'
                              ? `ADA (${activeOrder.jmlLisPiping} pcs)`
                              : 'TIDAK'}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* Request Desain */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Request Desain &amp; Catatan Khusus
                </h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                  {activeOrder.keteranganRequest || 'Tidak ada catatan request tambahan.'}
                </div>
              </div>

              {/* Footer: Desainer, Logo Order & Pembayaran */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-600">
                  <span>
                    Desainer: <strong className="text-slate-900">{activeOrder.desainer || '-'}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Pesan Logo:{' '}
                    <strong className="text-slate-900">{activeOrder.statusPesanLogo}</strong>
                  </span>
                  <span>·</span>
                  <CustomerTypeBadge type={activeOrder.statusCustomer} />
                </div>

                <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                  <span>Total: {formatRupiah(activeOrder.totalNominal)}</span>
                  <span>DP: {formatRupiah(activeOrder.dpNominal)}</span>
                  <span className="font-bold text-slate-900">
                    Sisa: {formatRupiah(activeOrder.sisaTagihan)}
                  </span>
                  <PaymentStatusBadge status={activeOrder.statusPembayaran} />
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Copy Box (hidden on print) */}
          <div className="no-print lg:col-span-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Teks Siap-Copy WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Disalin' : 'Salin'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Format konfirmasi spesifikasi order &amp; lampiran invoice siap kirim ke WhatsApp
              pelanggan.
            </p>
            <pre className="mt-3 flex-1 overflow-x-auto whitespace-pre-wrap rounded-lg border border-emerald-200 bg-white p-4 font-mono text-xs text-slate-800 leading-relaxed">
              {whatsAppText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
