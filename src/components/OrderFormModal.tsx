import { AlertTriangle, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ADA_TIDAK_OPTIONS,
  addDaysToDateKey,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  DESIGN_STATUS_OPTIONS,
  formatRupiah,
  getPaketListForCategory,
  getTodayDateKey,
  JENIS_CELANA_OPTIONS,
  PRODUCTION_STATUS_OPTIONS,
} from '../constants/defaults';
import type {
  ComputedOrder,
  CustomerType,
  DesignStatus,
  LogoOrderStatus,
  MasterSettings,
  OrderCategory,
  OrderFormPayload,
  ProductionStatus,
} from '../types';
import { isNoQtyLogoType } from '../utils/orderCalculations';
import { IndonesianDateInput } from './IndonesianDateInput';
import { CategoryIcon } from './StatusLabels';

interface OrderFormModalProps {
  isOpen: boolean;
  initialOrder: ComputedOrder | null;
  defaultCategory?: OrderCategory;
  allOrders: ComputedOrder[];
  settings: MasterSettings;
  onClose: () => void;
  onSave: (payload: OrderFormPayload, existingOrderId?: string) => Promise<void>;
}

export function OrderFormModal({
  isOpen,
  initialOrder,
  defaultCategory = 'SETELAN',
  allOrders,
  settings,
  onClose,
  onSave,
}: OrderFormModalProps) {
  const today = getTodayDateKey();

  const buildInitialState = (): OrderFormPayload => {
    if (initialOrder) {
      const isBelumInv =
        Boolean(initialOrder.belumInvoice) ||
        initialOrder.noInvoice.trim().toUpperCase() === 'BELUM BIKIN';
      return {
        kategori: initialOrder.kategori,
        paket: initialOrder.paket || getPaketListForCategory(settings, initialOrder.kategori)[0] || '',
        namaCustomer: initialOrder.namaCustomer,
        statusCustomer: initialOrder.statusCustomer,
        noInvoice: isBelumInv ? '' : initialOrder.noInvoice,
        belumInvoice: isBelumInv,
        tglOrder: initialOrder.tglOrder || initialOrder.tglMasukLayout || today,
        tglMasukLayout: initialOrder.tglMasukLayout,
        belumLayout: Boolean(initialOrder.belumLayout),
        tglEstimasiSelesai: initialOrder.tglEstimasiSelesai,
        qtyOrder: initialOrder.qtyOrder,
        bahanAtasan: initialOrder.bahanAtasan,
        bahanCelana: initialOrder.bahanCelana,
        jenisCelana: initialOrder.jenisCelana || 'CELANA PENDEK',
        bahanJaket: initialOrder.bahanJaket,
        kerah: initialOrder.kerah,
        jenisLogoTim: initialOrder.jenisLogoTim,
        jmlLogoTim: initialOrder.jmlLogoTim,
        jenisLogoTimCelana: initialOrder.jenisLogoTimCelana || initialOrder.jenisLogoTim || 'TANPA LOGO',
        jmlLogoTimCelana: initialOrder.jmlLogoTimCelana,
        jenisLogoApparel: initialOrder.jenisLogoApparel,
        jmlLogoApparel: initialOrder.jmlLogoApparel,
        jenisLogoApparelCelana:
          initialOrder.jenisLogoApparelCelana || initialOrder.jenisLogoApparel || 'TANPA LOGO',
        jmlLogoApparelCelana: initialOrder.jmlLogoApparelCelana,
        jenisNomorCelana: initialOrder.jenisNomorCelana || 'TANPA NOMOR',
        jmlNomorCelana: initialOrder.jmlNomorCelana || 0,
        jenisSponsorDepanBelakang: initialOrder.jenisSponsorDepanBelakang,
        jmlSponsorDepanBelakang: initialOrder.jmlSponsorDepanBelakang,
        jenisSponsorLengan: initialOrder.jenisSponsorLengan,
        jmlSponsorLengan: initialOrder.jmlSponsorLengan,
        jenisLogoJaket: initialOrder.jenisLogoJaket,
        jmlLogoJaket: initialOrder.jmlLogoJaket,
        pecahPola: initialOrder.pecahPola || 'TIDAK',
        jmlPecahPola: initialOrder.jmlPecahPola || 0,
        lisPiping: initialOrder.lisPiping || 'TIDAK',
        jmlLisPiping: initialOrder.jmlLisPiping || 0,
        pecahPolaCelana: initialOrder.pecahPolaCelana || 'TIDAK',
        jmlPecahPolaCelana: initialOrder.jmlPecahPolaCelana || 0,
        lisPipingCelana: initialOrder.lisPipingCelana || 'TIDAK',
        jmlLisPipingCelana: initialOrder.jmlLisPipingCelana || 0,
        statusPesanLogo: initialOrder.statusPesanLogo,
        tglPesanLogo: initialOrder.tglPesanLogo,
        statusDesain: initialOrder.statusDesain,
        revisiKe:
          initialOrder.statusDesain === 'BELUM DESAIN' ||
          initialOrder.statusDesain === 'PROSES DESAIN'
            ? 0
            : initialOrder.revisiKe,
        desainer: initialOrder.desainer,
        tglUpdateDesain: initialOrder.tglUpdateDesain,
        statusProduksi: initialOrder.statusProduksi,
        totalNominal: initialOrder.totalNominal,
        dpNominal: initialOrder.dpNominal,
        keteranganRequest: initialOrder.keteranganRequest,
      };
    }

    const firstBahan = settings.bahanList[0] || '';
    const firstBahanJaket = settings.bahanJaketList[0] || '';
    const firstKerah = settings.kerahList[0] || '';
    const firstLogoTim = settings.logoTimList[0] || 'PRINTING';
    const firstLogoApparel = settings.logoApparelList[0] || 'PRINTING';
    const firstNomorCelana = settings.nomorCelanaList[0] || 'PRINTING';
    const firstSponsorDb = settings.sponsorDepanBelakangList[0] || 'PRINTING';
    const firstSponsorLengan = settings.sponsorLenganList[0] || 'PRINTING';
    const firstLogoJaket = settings.logoJaketList[0] || 'PRINTING';
    const firstPaket = getPaketListForCategory(settings, defaultCategory)[0] || '';
    const defaultEstDays = Math.round(((settings.minEstWeeks + settings.maxEstWeeks) / 2) * 7);

    return {
      kategori: defaultCategory,
      paket: firstPaket,
      namaCustomer: '',
      statusCustomer: 'UTAMA',
      noInvoice: '',
      belumInvoice: false,
      tglOrder: today,
      tglMasukLayout: today,
      belumLayout: false,
      tglEstimasiSelesai: addDaysToDateKey(today, defaultEstDays),
      qtyOrder: 12,
      bahanAtasan: firstBahan,
      bahanCelana: firstBahan,
      jenisCelana: 'CELANA PENDEK',
      bahanJaket: firstBahanJaket,
      kerah: firstKerah,
      jenisLogoTim: firstLogoTim,
      jmlLogoTim: 0,
      jenisLogoTimCelana: firstLogoTim,
      jmlLogoTimCelana: 0,
      jenisLogoApparel: firstLogoApparel,
      jmlLogoApparel: 0,
      jenisLogoApparelCelana: firstLogoApparel,
      jmlLogoApparelCelana: 0,
      jenisNomorCelana: firstNomorCelana,
      jmlNomorCelana: 0,
      jenisSponsorDepanBelakang: firstSponsorDb,
      jmlSponsorDepanBelakang: 0,
      jenisSponsorLengan: firstSponsorLengan,
      jmlSponsorLengan: 0,
      jenisLogoJaket: firstLogoJaket,
      jmlLogoJaket: 0,
      pecahPola: 'TIDAK',
      jmlPecahPola: 0,
      lisPiping: 'TIDAK',
      jmlLisPiping: 0,
      pecahPolaCelana: 'TIDAK',
      jmlPecahPolaCelana: 0,
      lisPipingCelana: 'TIDAK',
      jmlLisPipingCelana: 0,
      statusPesanLogo: 'BELUM',
      tglPesanLogo: '',
      statusDesain: 'BELUM DESAIN',
      revisiKe: 0,
      desainer: settings.desainerList[0] || '',
      tglUpdateDesain: today,
      statusProduksi: 'ANTRIAN',
      totalNominal: 0,
      dpNominal: 0,
      keteranganRequest: '',
    };
  };

  const [form, setForm] = useState<OrderFormPayload>(buildInitialState);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState());
      setErrorMsg('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialOrder, defaultCategory]);

  const paketOptions = useMemo(() => {
    const list = getPaketListForCategory(settings, form.kategori);
    if (form.paket && !list.includes(form.paket)) {
      return [form.paket, ...list];
    }
    return list;
  }, [settings, form.kategori, form.paket]);

  const existingCustomerNames = useMemo(() => {
    const names = new Set<string>();
    for (const o of allOrders) {
      if (o.namaCustomer.trim()) names.add(o.namaCustomer.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allOrders]);

  const deferredCustomerName = useDeferredValue(form.namaCustomer);
  const deferredNoInvoice = useDeferredValue(form.noInvoice);

  const customerHasPreviousOrder = useMemo(() => {
    const target = deferredCustomerName.trim().toLowerCase();
    if (!target) return false;
    return allOrders.some(
      (o) => o.id !== initialOrder?.id && o.namaCustomer.trim().toLowerCase() === target
    );
  }, [allOrders, deferredCustomerName, initialOrder]);

  const duplicateInvoiceWarning = useMemo(() => {
    if (form.belumInvoice) return false;
    const inv = deferredNoInvoice.trim().toUpperCase();
    if (!inv || inv === 'BELUM BIKIN') return false;
    return allOrders.some(
      (o) =>
        o.id !== initialOrder?.id &&
        !o.belumInvoice &&
        o.kategori === form.kategori &&
        o.noInvoice.trim().toUpperCase() === inv
    );
  }, [allOrders, form.belumInvoice, form.kategori, deferredNoInvoice, initialOrder]);

  const estimasiWarning = useMemo(() => {
    if (form.belumLayout || !form.tglMasukLayout || !form.tglEstimasiSelesai) return null;
    const [y1, m1, d1] = form.tglMasukLayout.split('-').map(Number);
    const [y2, m2, d2] = form.tglEstimasiSelesai.split('-').map(Number);
    const diff = Math.round(
      (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const minD = settings.minEstWeeks * 7;
    const maxD = settings.maxEstWeeks * 7;
    if (diff < minD || diff > maxD) {
      return `Jarak Layout → Estimasi ${diff} hari (di luar rentang standar ${settings.minEstWeeks}–${settings.maxEstWeeks} minggu / ${minD}–${maxD} hari).`;
    }
    return null;
  }, [
    form.belumLayout,
    form.tglMasukLayout,
    form.tglEstimasiSelesai,
    settings.minEstWeeks,
    settings.maxEstWeeks,
  ]);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: OrderCategory) => {
    const nextPaketList = getPaketListForCategory(settings, cat);
    setForm((prev) => ({
      ...prev,
      kategori: cat,
      paket: nextPaketList[0] || '',
    }));
  };

  const handleCustomerNameChange = (name: string) => {
    const normalized = name.trim().toLowerCase();
    const exists =
      normalized !== '' &&
      allOrders.some(
        (o) => o.id !== initialOrder?.id && o.namaCustomer.trim().toLowerCase() === normalized
      );
    setForm((prev) => ({
      ...prev,
      namaCustomer: name,
      statusCustomer: !initialOrder && exists ? 'TAMBAHAN' : prev.statusCustomer,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.namaCustomer.trim()) {
      setErrorMsg('Nama Customer / Tim wajib diisi.');
      return;
    }
    if (!form.belumInvoice && !form.noInvoice.trim()) {
      setErrorMsg('No. Invoice wajib diisi (atau centang Belum Bikin).');
      return;
    }
    if ((Number(form.qtyOrder) || 0) < 0 || (Number(form.totalNominal) || 0) < 0 || (Number(form.dpNominal) || 0) < 0) {
      setErrorMsg('Nilai Qty, Total Nominal, dan DP Masuk tidak boleh kurang dari 0.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await onSave(form, initialOrder?.id);
      onClose();
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Gagal menyimpan order.';
      let displayMsg = rawMsg;
      try {
        const parsed = JSON.parse(rawMsg) as { error?: string };
        if (parsed && typeof parsed.error === 'string') {
          displayMsg = `Gagal menyimpan order ke database (${parsed.error}). Pastikan akun Anda aktif dan terverifikasi.`;
        }
      } catch {
        // Keep rawMsg if not JSON
      }
      setErrorMsg(displayMsg);
    } finally {
      setSaving(false);
    }
  };

  const logoTimLocked = isNoQtyLogoType(form.jenisLogoTim);
  const logoApparelLocked = isNoQtyLogoType(form.jenisLogoApparel);
  const sponsorDbLocked = isNoQtyLogoType(form.jenisSponsorDepanBelakang);
  const sponsorLenganLocked = isNoQtyLogoType(form.jenisSponsorLengan);

  const nomorCelanaLocked = isNoQtyLogoType(form.jenisNomorCelana);
  const logoApparelCelanaLocked = isNoQtyLogoType(form.jenisLogoApparelCelana);
  const logoTimCelanaLocked = isNoQtyLogoType(form.jenisLogoTimCelana);

  const logoJaketLocked = isNoQtyLogoType(form.jenisLogoJaket);

  const revisionDisabled =
    form.statusDesain === 'BELUM DESAIN' || form.statusDesain === 'PROSES DESAIN';

  const sisaTagihan = Math.max(0, (Number(form.totalNominal) || 0) - (Number(form.dpNominal) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialOrder ? `Edit Order — ${initialOrder.namaCustomer}` : 'Form Input Order Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              Format tanggal Hari/Bulan/Tahun (HH/BB/TTTT). Kolom jumlah otomatis terkunci jika
              memilih PRINTING atau opsi TANPA.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Bagian 1: Identitas Order, Tanggal Order & Pembayaran */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              1. Identitas Order, Tanggal Order &amp; Pembayaran
            </h3>

            {/* Pemilih Kategori Berwarna & Berikon */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Kategori Orderan
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(['SETELAN', 'ATASAN', 'CELANA', 'JAKET'] as OrderCategory[]).map((cat) => {
                  const active = form.kategori === cat;
                  const style = CATEGORY_STYLES[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? style.badgeClass + ' ring-2 ring-offset-1 ring-slate-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CategoryIcon category={cat} className="h-4 w-4 shrink-0" />
                      {CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nama Customer / Tim
                </label>
                <input
                  type="text"
                  required
                  list="existing-customers-list"
                  value={form.namaCustomer}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Ketik atau pilih customer..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <datalist id="existing-customers-list">
                  {existingCustomerNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {customerHasPreviousOrder && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Customer sudah pernah order sebelumnya (disarankan pilih TAMBAHAN).
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Status Order</label>
                <select
                  value={form.statusCustomer}
                  onChange={(e) =>
                    setForm({ ...form, statusCustomer: e.target.value as CustomerType })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="UTAMA">UTAMA (Order Pertama)</option>
                  <option value="TAMBAHAN">TAMBAHAN (Order Lanjutan)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Qty Order (PCS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.qtyOrder}
                  onChange={(e) => setForm({ ...form, qtyOrder: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">No. Invoice</label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.belumInvoice}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          belumInvoice: checked,
                          noInvoice: checked ? '' : form.noInvoice,
                        });
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    Belum Bikin
                  </label>
                </div>
                <input
                  type="text"
                  required={!form.belumInvoice}
                  disabled={form.belumInvoice}
                  value={form.belumInvoice ? 'BELUM BIKIN' : form.noInvoice}
                  onChange={(e) => setForm({ ...form, noInvoice: e.target.value })}
                  placeholder="INV-2026-..."
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none disabled:cursor-not-allowed disabled:border-amber-300 disabled:bg-amber-50 disabled:font-sans disabled:font-semibold disabled:text-amber-800 ${
                    duplicateInvoiceWarning
                      ? 'border-red-400 bg-red-50 text-red-900'
                      : 'border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
                {duplicateInvoiceWarning && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    Perhatian: No. Invoice duplikat di kategori {CATEGORY_LABELS[form.kategori]}!
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Opsi Paket ({CATEGORY_LABELS[form.kategori]})
                </label>
                <select
                  value={form.paket}
                  onChange={(e) => setForm({ ...form, paket: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Pilih Paket --</option>
                  {paketOptions.map((pkt) => (
                    <option key={pkt} value={pkt}>
                      {pkt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tgl. Order (HH/BB/TTTT)
                </label>
                <IndonesianDateInput
                  value={form.tglOrder}
                  onChange={(val) => setForm({ ...form, tglOrder: val })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tgl. Estimasi Selesai (HH/BB/TTTT)
                </label>
                <IndonesianDateInput
                  value={form.tglEstimasiSelesai}
                  onChange={(val) => setForm({ ...form, tglEstimasiSelesai: val })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Total Nominal (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.totalNominal}
                  onChange={(e) => setForm({ ...form, totalNominal: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  DP Masuk (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.dpNominal}
                  onChange={(e) => setForm({ ...form, dpNominal: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1 font-mono text-[11px] font-medium text-slate-600 tabular-nums">
                  Sisa Tagihan: {formatRupiah(sisaTagihan)}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Bagian 2: Spesifikasi Bahan, Kerah & Kebutuhan Logo */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              2. Spesifikasi Bahan, Kerah &amp; Kebutuhan Logo
            </h3>

            {form.kategori === 'JAKET' ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-4 space-y-4">
                <p className="text-xs font-bold text-violet-800 uppercase tracking-wide">
                  Spesifikasi Jaket
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Bahan Jaket
                    </label>
                    <select
                      value={form.bahanJaket}
                      onChange={(e) => setForm({ ...form, bahanJaket: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">-- Pilih Bahan Jaket --</option>
                      {(form.bahanJaket && !settings.bahanJaketList.includes(form.bahanJaket)
                        ? [form.bahanJaket, ...settings.bahanJaketList]
                        : settings.bahanJaketList
                      ).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Kerah</label>
                    <select
                      value={form.kerah}
                      onChange={(e) => setForm({ ...form, kerah: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">-- Pilih Kerah --</option>
                      {settings.kerahList.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Logo Jaket
                    </label>
                    <select
                      value={form.jenisLogoJaket}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({
                          ...form,
                          jenisLogoJaket: val,
                          jmlLogoJaket: isNoQtyLogoType(val) ? 0 : form.jmlLogoJaket || form.qtyOrder,
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      {settings.logoJaketList.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Jml Logo Jaket (PCS)
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={logoJaketLocked}
                      value={logoJaketLocked ? 0 : form.jmlLogoJaket}
                      onChange={(e) => setForm({ ...form, jmlLogoJaket: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-slate-700">Pecah Pola</label>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {ADA_TIDAK_OPTIONS.map((opt) => {
                          const active = form.pecahPola === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  pecahPola: opt,
                                  jmlPecahPola:
                                    opt === 'ADA' ? form.jmlPecahPola || form.qtyOrder : 0,
                                })
                              }
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                active
                                  ? opt === 'ADA'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="mb-1 block text-[11px] text-slate-500">
                        Jml Pecah Pola (PCS)
                      </span>
                      <input
                        type="number"
                        min={0}
                        disabled={form.pecahPola !== 'ADA'}
                        value={form.pecahPola === 'ADA' ? form.jmlPecahPola : 0}
                        onChange={(e) => setForm({ ...form, jmlPecahPola: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-slate-700">Lis Piping</label>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {ADA_TIDAK_OPTIONS.map((opt) => {
                          const active = form.lisPiping === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  lisPiping: opt,
                                  jmlLisPiping:
                                    opt === 'ADA' ? form.jmlLisPiping || form.qtyOrder : 0,
                                })
                              }
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                active
                                  ? opt === 'ADA'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="mb-1 block text-[11px] text-slate-500">
                        Jml Lis Piping (PCS)
                      </span>
                      <input
                        type="number"
                        min={0}
                        disabled={form.lisPiping !== 'ADA'}
                        value={form.lisPiping === 'ADA' ? form.jmlLisPiping : 0}
                        onChange={(e) => setForm({ ...form, jmlLisPiping: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Panel ATASAN (tampil untuk SETELAN dan ATASAN) */}
                {(form.kategori === 'SETELAN' || form.kategori === 'ATASAN') && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/20 p-4 space-y-4">
                    <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                      Spesifikasi Atasan
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Bahan Atasan
                        </label>
                        <select
                          value={form.bahanAtasan}
                          onChange={(e) => setForm({ ...form, bahanAtasan: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Atasan --</option>
                          {settings.bahanList.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Model Kerah
                        </label>
                        <select
                          value={form.kerah}
                          onChange={(e) => setForm({ ...form, kerah: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Kerah --</option>
                          {settings.kerahList.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Logo Tim (Atasan)
                        </label>
                        <select
                          value={form.jenisLogoTim}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisLogoTim: val,
                              jmlLogoTim: locked ? 0 : form.jmlLogoTim || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.logoTimList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Logo Tim Atasan (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={logoTimLocked}
                            value={logoTimLocked ? 0 : form.jmlLogoTim}
                            onChange={(e) => setForm({ ...form, jmlLogoTim: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Logo Apparel (Atasan)
                        </label>
                        <select
                          value={form.jenisLogoApparel}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisLogoApparel: val,
                              jmlLogoApparel: locked ? 0 : form.jmlLogoApparel || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.logoApparelList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Logo Apparel Atasan (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={logoApparelLocked}
                            value={logoApparelLocked ? 0 : form.jmlLogoApparel}
                            onChange={(e) =>
                              setForm({ ...form, jmlLogoApparel: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Sponsor Depan / Belakang
                        </label>
                        <select
                          value={form.jenisSponsorDepanBelakang}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisSponsorDepanBelakang: val,
                              jmlSponsorDepanBelakang: locked
                                ? 0
                                : form.jmlSponsorDepanBelakang || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.sponsorDepanBelakangList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">Jml (PCS)</span>
                          <input
                            type="number"
                            min={0}
                            disabled={sponsorDbLocked}
                            value={sponsorDbLocked ? 0 : form.jmlSponsorDepanBelakang}
                            onChange={(e) =>
                              setForm({ ...form, jmlSponsorDepanBelakang: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Sponsor Lengan
                        </label>
                        <select
                          value={form.jenisSponsorLengan}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisSponsorLengan: val,
                              jmlSponsorLengan: locked ? 0 : form.jmlSponsorLengan || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.sponsorLenganList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">Jml (PCS)</span>
                          <input
                            type="number"
                            min={0}
                            disabled={sponsorLenganLocked}
                            value={sponsorLenganLocked ? 0 : form.jmlSponsorLengan}
                            onChange={(e) =>
                              setForm({ ...form, jmlSponsorLengan: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700">
                            Pecah Pola{form.kategori === 'SETELAN' ? ' (Atasan)' : ''}
                          </label>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {ADA_TIDAK_OPTIONS.map((opt) => {
                              const active = form.pecahPola === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() =>
                                    setForm({
                                      ...form,
                                      pecahPola: opt,
                                      jmlPecahPola:
                                        opt === 'ADA' ? form.jmlPecahPola || form.qtyOrder : 0,
                                    })
                                  }
                                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                    active
                                      ? opt === 'ADA'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-slate-700 text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Pecah Pola (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={form.pecahPola !== 'ADA'}
                            value={form.pecahPola === 'ADA' ? form.jmlPecahPola : 0}
                            onChange={(e) =>
                              setForm({ ...form, jmlPecahPola: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700">
                            Lis Piping{form.kategori === 'SETELAN' ? ' (Atasan)' : ''}
                          </label>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {ADA_TIDAK_OPTIONS.map((opt) => {
                              const active = form.lisPiping === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() =>
                                    setForm({
                                      ...form,
                                      lisPiping: opt,
                                      jmlLisPiping:
                                        opt === 'ADA' ? form.jmlLisPiping || form.qtyOrder : 0,
                                    })
                                  }
                                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                    active
                                      ? opt === 'ADA'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-slate-700 text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Lis Piping (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={form.lisPiping !== 'ADA'}
                            value={form.lisPiping === 'ADA' ? form.jmlLisPiping : 0}
                            onChange={(e) =>
                              setForm({ ...form, jmlLisPiping: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel CELANA (format seragam untuk SETELAN dan CELANA: Jenis Celana, Bahan Celana, Nomor Celana + jml, Logo Apparel Celana + jml, Logo Tim Celana + jml) */}
                {(form.kategori === 'SETELAN' || form.kategori === 'CELANA') && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/25 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                        Spesifikasi Celana
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">Jenis Celana:</span>
                        <div className="inline-flex rounded-lg border border-amber-200 bg-white p-0.5">
                          {JENIS_CELANA_OPTIONS.map((opt) => {
                            const active = (form.jenisCelana || 'CELANA PENDEK') === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setForm({ ...form, jenisCelana: opt })}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-amber-600 text-white'
                                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* 1. Bahan Celana */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Bahan Celana
                        </label>
                        <select
                          value={form.bahanCelana}
                          onChange={(e) => setForm({ ...form, bahanCelana: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Celana --</option>
                          {settings.bahanList.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Nomor (Celana) + Jumlah */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Nomor (Celana)
                        </label>
                        <select
                          value={form.jenisNomorCelana}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisNomorCelana: val,
                              jmlNomorCelana: locked ? 0 : form.jmlNomorCelana || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.nomorCelanaList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Nomor Celana (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={nomorCelanaLocked}
                            value={nomorCelanaLocked ? 0 : form.jmlNomorCelana}
                            onChange={(e) =>
                              setForm({ ...form, jmlNomorCelana: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 3. Logo Apparel (Celana) + Jumlah */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Logo Apparel (Celana)
                        </label>
                        <select
                          value={form.jenisLogoApparelCelana}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisLogoApparelCelana: val,
                              jmlLogoApparelCelana: locked
                                ? 0
                                : form.jmlLogoApparelCelana || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.logoApparelList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Logo Apparel Celana (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={logoApparelCelanaLocked}
                            value={logoApparelCelanaLocked ? 0 : form.jmlLogoApparelCelana}
                            onChange={(e) =>
                              setForm({ ...form, jmlLogoApparelCelana: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 4. Logo Tim (Celana) + Jumlah */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Logo Tim (Celana)
                        </label>
                        <select
                          value={form.jenisLogoTimCelana}
                          onChange={(e) => {
                            const val = e.target.value;
                            const locked = isNoQtyLogoType(val);
                            setForm({
                              ...form,
                              jenisLogoTimCelana: val,
                              jmlLogoTimCelana: locked
                                ? 0
                                : form.jmlLogoTimCelana || form.qtyOrder,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        >
                          {settings.logoTimList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Logo Tim Celana (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={logoTimCelanaLocked}
                            value={logoTimCelanaLocked ? 0 : form.jmlLogoTimCelana}
                            onChange={(e) =>
                              setForm({ ...form, jmlLogoTimCelana: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 5. Pecah Pola (Celana) */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700">
                            Pecah Pola (Celana)
                          </label>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {ADA_TIDAK_OPTIONS.map((opt) => {
                              const active = form.pecahPolaCelana === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() =>
                                    setForm({
                                      ...form,
                                      pecahPolaCelana: opt,
                                      jmlPecahPolaCelana:
                                        opt === 'ADA'
                                          ? form.jmlPecahPolaCelana || form.qtyOrder
                                          : 0,
                                    })
                                  }
                                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                    active
                                      ? opt === 'ADA'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-700 text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Pecah Pola Celana (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={form.pecahPolaCelana !== 'ADA'}
                            value={form.pecahPolaCelana === 'ADA' ? form.jmlPecahPolaCelana : 0}
                            onChange={(e) =>
                              setForm({ ...form, jmlPecahPolaCelana: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* 6. Lis Piping (Celana) */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700">
                            Lis Piping (Celana)
                          </label>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {ADA_TIDAK_OPTIONS.map((opt) => {
                              const active = form.lisPipingCelana === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() =>
                                    setForm({
                                      ...form,
                                      lisPipingCelana: opt,
                                      jmlLisPipingCelana:
                                        opt === 'ADA'
                                          ? form.jmlLisPipingCelana || form.qtyOrder
                                          : 0,
                                    })
                                  }
                                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                                    active
                                      ? opt === 'ADA'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-700 text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="mb-1 block text-[11px] text-slate-500">
                            Jml Lis Piping Celana (PCS)
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={form.lisPipingCelana !== 'ADA'}
                            value={form.lisPipingCelana === 'ADA' ? form.jmlLisPipingCelana : 0}
                            onChange={(e) =>
                              setForm({ ...form, jmlLisPipingCelana: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200" />

          {/* Bagian 3: Status Desain, Tgl Masuk Layout (+ Belum Layout), Produksi & Pemesanan Logo */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              3. Status Desain, Layout, Produksi &amp; Pemesanan Logo
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Tgl Masuk Layout + Belum Layout Option */}
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    Tgl. Masuk Layout (HH/BB/TTTT)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.belumLayout}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          belumLayout: checked,
                          tglMasukLayout: checked ? '' : form.tglMasukLayout || today,
                        });
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    Belum Layout
                  </label>
                </div>
                <IndonesianDateInput
                  disabled={form.belumLayout}
                  disabledText="BELUM LAYOUT"
                  value={form.tglMasukLayout}
                  onChange={(val) => setForm({ ...form, tglMasukLayout: val })}
                />
                {estimasiWarning && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{estimasiWarning}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Status Desain
                </label>
                <select
                  value={form.statusDesain}
                  onChange={(e) => {
                    const nextStatus = e.target.value as DesignStatus;
                    const noRev =
                      nextStatus === 'BELUM DESAIN' || nextStatus === 'PROSES DESAIN';
                    setForm({
                      ...form,
                      statusDesain: nextStatus,
                      revisiKe: noRev ? 0 : form.revisiKe,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {DESIGN_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Revisi Ke-</label>
                <select
                  disabled={revisionDisabled}
                  value={revisionDisabled ? 0 : form.revisiKe}
                  onChange={(e) => setForm({ ...form, revisiKe: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num === 0
                        ? revisionDisabled
                          ? 'Nonaktif'
                          : '0 (Belum Revisi)'
                        : `Revisi ${num}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Desainer</label>
                <select
                  value={form.desainer}
                  onChange={(e) => setForm({ ...form, desainer: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Pilih Desainer --</option>
                  {settings.desainerList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Status Produksi
                </label>
                <select
                  value={form.statusProduksi}
                  onChange={(e) =>
                    setForm({ ...form, statusProduksi: e.target.value as ProductionStatus })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {PRODUCTION_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Status Pemesanan Logo
                </label>
                <select
                  value={form.statusPesanLogo}
                  onChange={(e) => {
                    const status = e.target.value as LogoOrderStatus;
                    setForm({
                      ...form,
                      statusPesanLogo: status,
                      tglPesanLogo: status === 'SUDAH' ? form.tglPesanLogo || today : '',
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="BELUM">BELUM</option>
                  <option value="SUDAH">SUDAH</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tgl. Pemesanan Logo
                </label>
                <IndonesianDateInput
                  disabled={form.statusPesanLogo === 'BELUM'}
                  disabledText="-"
                  value={form.statusPesanLogo === 'SUDAH' ? form.tglPesanLogo : ''}
                  onChange={(val) => setForm({ ...form, tglPesanLogo: val })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Keterangan Request Desain &amp; Catatan Produksi
              </label>
              <textarea
                rows={3}
                value={form.keteranganRequest}
                onChange={(e) => setForm({ ...form, keteranganRequest: e.target.value })}
                placeholder="Tulis detail request warna, font, posisi sponsor, atau catatan ukuran..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : initialOrder ? 'Simpan Perubahan' : 'Simpan Order Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
