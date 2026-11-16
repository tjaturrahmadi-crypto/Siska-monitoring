export type OrderCategory = 'SETELAN' | 'ATASAN' | 'CELANA' | 'JAKET';
export type CustomerType = 'UTAMA' | 'TAMBAHAN';
export type LogoOrderStatus = 'BELUM' | 'SUDAH';
export type DesignStatus = 'BELUM DESAIN' | 'PROSES DESAIN' | 'REVISI' | 'DESAIN ACC';
export type ProductionStatus = 'ANTRIAN' | 'PROSES PRODUKSI' | 'SUDAH SELESAI';
export type AdaTidakOption = 'ADA' | 'TIDAK';

export type ScheduleStatus =
  | 'SELESAI'
  | 'TERLAMBAT'
  | 'PERINGATAN'
  | 'SEGERA'
  | 'ON TRACK'
  | 'LENGKAPI TANGGAL';

export type PaymentStatus = 'BELUM DP' | 'DP' | 'LUNAS';
export type UserRole = 'admin' | 'staff';
export type UserAccountStatus = 'active' | 'disabled';
export type CalendarNoteCategory = 'catatan' | 'prioritas' | 'libur';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserAccountStatus;
  provider: string;
  lastLoginAt: unknown;
  createdAt: unknown;
}

export interface ProductionOrder {
  id: string;
  kategori: OrderCategory;
  paket: string;
  namaCustomer: string;
  statusCustomer: CustomerType;
  noInvoice: string;
  belumInvoice: boolean;
  tglOrder: string;
  tglMasukLayout: string;
  belumLayout: boolean;
  tglEstimasiSelesai: string;
  qtyOrder: number;
  bahanAtasan: string;
  bahanCelana: string;
  jenisCelana: string;
  bahanJaket: string;
  kerah: string;
  jenisLogoTim: string;
  jmlLogoTim: number;
  jenisLogoTimCelana: string;
  jmlLogoTimCelana: number;
  jenisLogoApparel: string;
  jmlLogoApparel: number;
  jenisLogoApparelCelana: string;
  jmlLogoApparelCelana: number;
  jenisNomorCelana: string;
  jmlNomorCelana: number;
  jenisSponsorDepanBelakang: string;
  jmlSponsorDepanBelakang: number;
  jenisSponsorLengan: string;
  jmlSponsorLengan: number;
  jenisLogoJaket: string;
  jmlLogoJaket: number;
  pecahPola: AdaTidakOption;
  jmlPecahPola: number;
  lisPiping: AdaTidakOption;
  jmlLisPiping: number;
  pecahPolaCelana: AdaTidakOption;
  jmlPecahPolaCelana: number;
  lisPipingCelana: AdaTidakOption;
  jmlLisPipingCelana: number;
  statusPesanLogo: LogoOrderStatus;
  tglPesanLogo: string;
  statusDesain: DesignStatus;
  revisiKe: number;
  desainer: string;
  tglUpdateDesain: string;
  statusProduksi: ProductionStatus;
  totalNominal: number;
  dpNominal: number;
  keteranganRequest: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type OrderFormPayload = Omit<ProductionOrder, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export interface ComputedOrder extends ProductionOrder {
  statusJadwal: ScheduleStatus;
  sisaHari: number | null;
  hariSejakLayout: number | null;
  estimasiOutOfRange: boolean;
  estimasiRangeDays: number | null;
  sisaTagihan: number;
  statusPembayaran: PaymentStatus;
  isDuplicateInvoice: boolean;
  peringatanDateKey: string | null;
}

export interface CalendarNote {
  id: string;
  dateKey: string;
  title: string;
  content: string;
  category: CalendarNoteCategory;
  authorUid: string;
  authorName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MasterSettings {
  paketSetelanList: string[];
  paketAtasanList: string[];
  paketCelanaList: string[];
  paketJaketList: string[];
  bahanList: string[];
  bahanJaketList: string[];
  kerahList: string[];
  logoTimList: string[];
  logoApparelList: string[];
  nomorCelanaList: string[];
  sponsorDepanBelakangList: string[];
  sponsorLenganList: string[];
  logoJaketList: string[];
  desainerList: string[];
  warningDaysAfterLayout: number;
  urgentDaysBeforeDeadline: number;
  minEstWeeks: number;
  maxEstWeeks: number;
  updatedAt?: unknown;
}

export type NavTab =
  | 'rekap'
  | 'admin'
  | 'desain'
  | 'pesan_logo'
  | 'kalender'
  | 'keterlambatan'
  | 'penagihan'
  | 'preview_tim'
  | 'rekap_excel'
  | 'pengaturan';
