import type { MasterSettings, OrderCategory, OrderFormPayload } from '../types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'teamgsportsapparel@gmail.com';

export const DEFAULT_MASTER_SETTINGS: Omit<MasterSettings, 'updatedAt'> = {
  paketSetelanList: [
    'PAKET STANDARD',
    'PAKET PRO / PREMIUM',
    'PAKET FULL PRINTING',
    'PAKET KIDS / ANAK',
  ],
  paketAtasanList: [
    'ATASAN STANDARD',
    'ATASAN PRO',
    'ATASAN FULL PRINTING',
  ],
  paketCelanaList: [
    'CELANA STANDARD',
    'CELANA FULL PRINTING',
    'CELANA PENDEK TRAINING',
  ],
  paketJaketList: [
    'JAKET TRACKTOP',
    'JAKET HOODIE',
    'JAKET PARASUT / WINDBREAKER',
  ],
  bahanList: [
    'DRIFIT MILANO',
    'DRIFIT BRAZIL',
    'DRIFIT WAFFLE',
    'DRIFIT NIKE / SERENA',
    'DRIFIT BENZEMA',
    'DRIFIT EMBOS',
  ],
  bahanJaketList: [
    'LOTTO',
    'DIADORA',
    'PARASUT / TASLAN',
    'FLEECE COTTON',
    'MICRO / DESPO',
    'SCUBA',
  ],
  kerahList: [
    'O-NECK',
    'V-NECK',
    'KERAH POLO / KANCING',
    'KERAH SHANGHAI',
    'KERAH TALI / RETRO',
    'V-NECK LIST RIB',
    'TANPA KERAH (CELANA/JAKET)',
  ],
  logoTimList: [
    'PRINTING',
    'DTF',
    'POLYFLEX',
    'WOVEN / BORDIR KOMPUTER',
    'RUBBER / SILICONE 3D',
    'TANPA LOGO',
  ],
  logoApparelList: [
    'PRINTING',
    'DTF',
    'POLYFLEX',
    'WOVEN / BORDIR',
    'RUBBER 3D',
    'TANPA LOGO',
  ],
  nomorCelanaList: [
    'PRINTING',
    'POLYFLEX',
    'DTF',
    'TANPA NOMOR',
  ],
  sponsorDepanBelakangList: [
    'PRINTING',
    'TANPA SPONSOR',
    'DTF',
    'POLYFLEX 1 WARNA',
    'POLYFLEX WARNA',
    'BORDIR',
  ],
  sponsorLenganList: [
    'PRINTING',
    'TANPA SPONSOR',
    'DTF',
    'POLYFLEX',
  ],
  logoJaketList: [
    'PRINTING',
    'BORDIR KOMPUTER',
    'DTF',
    'WOVEN',
    'RUBBER 3D',
    'TANPA LOGO',
  ],
  desainerList: [
    'Raka',
    'Dimas',
    'Nadia',
    'Fajar',
  ],
  warningDaysAfterLayout: 13,
  urgentDaysBeforeDeadline: 1,
  minEstWeeks: 2,
  maxEstWeeks: 3,
};

export const DESIGN_STATUS_OPTIONS = [
  'BELUM DESAIN',
  'PROSES DESAIN',
  'REVISI',
  'DESAIN ACC',
] as const;

export const PRODUCTION_STATUS_OPTIONS = [
  'ANTRIAN',
  'PROSES PRODUKSI',
  'SUDAH SELESAI',
] as const;

export const JENIS_CELANA_OPTIONS = ['CELANA PENDEK', 'CELANA PANJANG'] as const;
export const ADA_TIDAK_OPTIONS = ['ADA', 'TIDAK'] as const;

export const CATEGORY_LABELS: Record<OrderCategory, string> = {
  SETELAN: 'Setelan',
  ATASAN: 'Atasan',
  CELANA: 'Celana',
  JAKET: 'Jaket',
};

export const CATEGORY_STYLES: Record<
  OrderCategory,
  {
    label: string;
    badgeClass: string;
    cardHeaderClass: string;
    cardBorderClass: string;
    calendarChipClass: string;
  }
> = {
  SETELAN: {
    label: 'Setelan',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    cardHeaderClass: 'bg-indigo-600 text-white',
    cardBorderClass: 'border-indigo-200',
    calendarChipClass: 'bg-indigo-100 text-indigo-800',
  },
  ATASAN: {
    label: 'Atasan',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-700',
    cardHeaderClass: 'bg-teal-600 text-white',
    cardBorderClass: 'border-teal-200',
    calendarChipClass: 'bg-teal-100 text-teal-800',
  },
  CELANA: {
    label: 'Celana',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    cardHeaderClass: 'bg-amber-600 text-white',
    cardBorderClass: 'border-amber-200',
    calendarChipClass: 'bg-amber-100 text-amber-800',
  },
  JAKET: {
    label: 'Jaket',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    cardHeaderClass: 'bg-violet-600 text-white',
    cardBorderClass: 'border-violet-200',
    calendarChipClass: 'bg-violet-100 text-violet-800',
  },
};

export function getPaketListForCategory(
  settings: Omit<MasterSettings, 'updatedAt'>,
  kategori: OrderCategory
): string[] {
  switch (kategori) {
    case 'SETELAN':
      return settings.paketSetelanList || DEFAULT_MASTER_SETTINGS.paketSetelanList;
    case 'ATASAN':
      return settings.paketAtasanList || DEFAULT_MASTER_SETTINGS.paketAtasanList;
    case 'CELANA':
      return settings.paketCelanaList || DEFAULT_MASTER_SETTINGS.paketCelanaList;
    case 'JAKET':
      return settings.paketJaketList || DEFAULT_MASTER_SETTINGS.paketJaketList;
  }
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Format tanggal ke urutan Hari/Bulan/Tahun (DD/MM/YYYY)
 */
export function formatDateId(dateKey: string): string {
  if (!dateKey) return '-';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * Format tanggal lengkap Indonesia: Hari, Tanggal Bulan Tahun (mis. Sabtu, 14 November 2026)
 */
export function formatDateLongId(dateKey: string): string {
  if (!dateKey) return '-';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  const hari = HARI_ID[dt.getDay()];
  const bulan = BULAN_ID[m - 1];
  return `${hari}, ${String(d).padStart(2, '0')} ${bulan} ${y}`;
}

export function buildSampleOrders(): OrderFormPayload[] {
  const today = getTodayDateKey();
  return [
    {
      kategori: 'SETELAN',
      paket: 'PAKET PRO / PREMIUM',
      namaCustomer: 'CONTOH - GARUDA MUDA FC',
      statusCustomer: 'UTAMA',
      noInvoice: 'INV-2026-101',
      belumInvoice: false,
      tglOrder: addDaysToDateKey(today, -16),
      tglMasukLayout: addDaysToDateKey(today, -15),
      belumLayout: false,
      tglEstimasiSelesai: addDaysToDateKey(today, -2),
      qtyOrder: 24,
      bahanAtasan: 'DRIFIT MILANO',
      bahanCelana: 'DRIFIT BRAZIL',
      jenisCelana: 'CELANA PENDEK',
      bahanJaket: '',
      kerah: 'V-NECK',
      jenisLogoTim: 'WOVEN / BORDIR KOMPUTER',
      jmlLogoTim: 24,
      jenisLogoTimCelana: 'WOVEN / BORDIR KOMPUTER',
      jmlLogoTimCelana: 24,
      jenisLogoApparel: 'DTF',
      jmlLogoApparel: 24,
      jenisLogoApparelCelana: 'DTF',
      jmlLogoApparelCelana: 24,
      jenisNomorCelana: 'POLYFLEX',
      jmlNomorCelana: 24,
      jenisSponsorDepanBelakang: 'PRINTING',
      jmlSponsorDepanBelakang: 0,
      jenisSponsorLengan: 'PRINTING',
      jmlSponsorLengan: 0,
      jenisLogoJaket: '',
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
      statusDesain: 'DESAIN ACC',
      revisiKe: 1,
      desainer: 'Raka',
      tglUpdateDesain: addDaysToDateKey(today, -12),
      statusProduksi: 'PROSES PRODUKSI',
      totalNominal: 4200000,
      dpNominal: 2000000,
      keteranganRequest:
        'Warna utama merah marun kombinasi emas.\nNomor punggung font tebal modern.\nNama pemain dicetak di bagian atas punggung.',
    },
    {
      kategori: 'ATASAN',
      paket: 'ATASAN PRO',
      namaCustomer: 'CONTOH - RAJAWALI FUTSAL',
      statusCustomer: 'UTAMA',
      noInvoice: 'INV-2026-102',
      belumInvoice: false,
      tglOrder: addDaysToDateKey(today, -15),
      tglMasukLayout: addDaysToDateKey(today, -14),
      belumLayout: false,
      tglEstimasiSelesai: addDaysToDateKey(today, 1),
      qtyOrder: 18,
      bahanAtasan: 'DRIFIT WAFFLE',
      bahanCelana: '',
      jenisCelana: '',
      bahanJaket: '',
      kerah: 'O-NECK',
      jenisLogoTim: 'DTF',
      jmlLogoTim: 18,
      jenisLogoTimCelana: 'TANPA LOGO',
      jmlLogoTimCelana: 0,
      jenisLogoApparel: 'PRINTING',
      jmlLogoApparel: 0,
      jenisLogoApparelCelana: 'TANPA LOGO',
      jmlLogoApparelCelana: 0,
      jenisNomorCelana: 'TANPA NOMOR',
      jmlNomorCelana: 0,
      jenisSponsorDepanBelakang: 'POLYFLEX 1 WARNA',
      jmlSponsorDepanBelakang: 18,
      jenisSponsorLengan: 'TANPA SPONSOR',
      jmlSponsorLengan: 0,
      jenisLogoJaket: '',
      jmlLogoJaket: 0,
      pecahPola: 'TIDAK',
      jmlPecahPola: 0,
      lisPiping: 'TIDAK',
      jmlLisPiping: 0,
      pecahPolaCelana: 'TIDAK',
      jmlPecahPolaCelana: 0,
      lisPipingCelana: 'TIDAK',
      jmlLisPipingCelana: 0,
      statusPesanLogo: 'SUDAH',
      tglPesanLogo: addDaysToDateKey(today, -10),
      statusDesain: 'REVISI',
      revisiKe: 2,
      desainer: 'Dimas',
      tglUpdateDesain: addDaysToDateKey(today, -3),
      statusProduksi: 'PROSES PRODUKSI',
      totalNominal: 2340000,
      dpNominal: 1200000,
      keteranganRequest:
        'Motif sublim geometris biru navy.\nSponsor depan warna putih solid.',
    },
    {
      kategori: 'JAKET',
      paket: 'JAKET TRACKTOP',
      namaCustomer: 'CONTOH - GARUDA MUDA FC',
      statusCustomer: 'TAMBAHAN',
      noInvoice: 'INV-2026-103',
      belumInvoice: false,
      tglOrder: today,
      tglMasukLayout: '',
      belumLayout: true,
      tglEstimasiSelesai: addDaysToDateKey(today, 14),
      qtyOrder: 20,
      bahanAtasan: '',
      bahanCelana: '',
      jenisCelana: '',
      bahanJaket: 'LOTTO',
      kerah: 'TANPA KERAH (CELANA/JAKET)',
      jenisLogoTim: 'TANPA LOGO',
      jmlLogoTim: 0,
      jenisLogoTimCelana: 'TANPA LOGO',
      jmlLogoTimCelana: 0,
      jenisLogoApparel: 'TANPA LOGO',
      jmlLogoApparel: 0,
      jenisLogoApparelCelana: 'TANPA LOGO',
      jmlLogoApparelCelana: 0,
      jenisNomorCelana: 'TANPA NOMOR',
      jmlNomorCelana: 0,
      jenisSponsorDepanBelakang: 'TANPA SPONSOR',
      jmlSponsorDepanBelakang: 0,
      jenisSponsorLengan: 'TANPA SPONSOR',
      jmlSponsorLengan: 0,
      jenisLogoJaket: 'BORDIR KOMPUTER',
      jmlLogoJaket: 20,
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
      desainer: 'Nadia',
      tglUpdateDesain: today,
      statusProduksi: 'ANTRIAN',
      totalNominal: 4600000,
      dpNominal: 2300000,
      keteranganRequest:
        'Jaket tracktop resleting full YKK.\nSaku kanan kiri pakai resleting.',
    },
  ];
}
