import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

const PORT = Number(process.env.PORT) || 3000;
const BOOTSTRAPPED_ADMIN_EMAIL = 'teamgsportsapparel@gmail.com';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'siska-db.json');
const TMP_DB_FILE = path.join(DATA_DIR, 'siska-db.json.tmp');

type OrderCategory = 'SETELAN' | 'ATASAN' | 'CELANA' | 'JAKET';
type CustomerType = 'UTAMA' | 'TAMBAHAN';
type LogoOrderStatus = 'BELUM' | 'SUDAH';
type DesignStatus = 'BELUM DESAIN' | 'PROSES DESAIN' | 'REVISI' | 'DESAIN ACC';
type ProductionStatus = 'ANTRIAN' | 'PROSES PRODUKSI' | 'SUDAH SELESAI';
type AdaTidakOption = 'ADA' | 'TIDAK';
type UserRole = 'admin' | 'staff';
type UserAccountStatus = 'active' | 'disabled';
type CalendarNoteCategory = 'catatan' | 'prioritas' | 'libur';

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserAccountStatus;
  provider: string;
  passwordHash: string;
  lastLoginAt: string;
  createdAt: string;
}

interface PublicUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserAccountStatus;
  provider: string;
  lastLoginAt: string;
  createdAt: string;
}

interface ProductionOrderRecord {
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
  createdAt: string;
  updatedAt: string;
}

interface CalendarNoteRecord {
  id: string;
  dateKey: string;
  title: string;
  content: string;
  category: CalendarNoteCategory;
  authorUid: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterSettingsRecord {
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
  updatedAt: string;
}

interface LocalDatabase {
  authSecret: string;
  settings: MasterSettingsRecord;
  users: StoredUser[];
  orders: ProductionOrderRecord[];
  calendarNotes: CalendarNoteRecord[];
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
}

const DEFAULT_SETTINGS: MasterSettingsRecord = {
  paketSetelanList: [
    'PAKET STANDARD',
    'PAKET PRO / PREMIUM',
    'PAKET FULL PRINTING',
    'PAKET KIDS / ANAK',
  ],
  paketAtasanList: ['ATASAN STANDARD', 'ATASAN PRO', 'ATASAN FULL PRINTING'],
  paketCelanaList: ['CELANA STANDARD', 'CELANA FULL PRINTING', 'CELANA PENDEK TRAINING'],
  paketJaketList: ['JAKET TRACKTOP', 'JAKET HOODIE', 'JAKET PARASUT / WINDBREAKER'],
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
  nomorCelanaList: ['PRINTING', 'POLYFLEX', 'DTF', 'TANPA NOMOR'],
  sponsorDepanBelakangList: [
    'PRINTING',
    'TANPA SPONSOR',
    'DTF',
    'POLYFLEX 1 WARNA',
    'POLYFLEX WARNA',
    'BORDIR',
  ],
  sponsorLenganList: ['PRINTING', 'TANPA SPONSOR', 'DTF', 'POLYFLEX'],
  logoJaketList: [
    'PRINTING',
    'BORDIR KOMPUTER',
    'DTF',
    'WOVEN',
    'RUBBER 3D',
    'TANPA LOGO',
  ],
  desainerList: ['Raka', 'Dimas', 'Nadia', 'Fajar'],
  warningDaysAfterLayout: 13,
  urgentDaysBeforeDeadline: 1,
  minEstWeeks: 2,
  maxEstWeeks: 3,
  updatedAt: new Date().toISOString(),
};

function createInitialDatabase(): LocalDatabase {
  return {
    authSecret: crypto.randomBytes(32).toString('hex'),
    settings: { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() },
    users: [],
    orders: [],
    calendarNotes: [],
  };
}

function loadDatabaseSync(): LocalDatabase {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    return {
      authSecret: parsed.authSecret || crypto.randomBytes(32).toString('hex'),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        updatedAt: parsed.settings?.updatedAt || new Date().toISOString(),
      },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      calendarNotes: Array.isArray(parsed.calendarNotes) ? parsed.calendarNotes : [],
    };
  } catch (err) {
    console.error('Failed to read local database, creating fresh instance:', err);
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

let db: LocalDatabase = loadDatabaseSync();
let writeChain: Promise<void> = Promise.resolve();

function persistDatabase(): Promise<void> {
  const snapshot = JSON.stringify(db);
  writeChain = writeChain.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(TMP_DB_FILE, snapshot, 'utf8');
    await fsp.rename(TMP_DB_FILE, DB_FILE);
  });
  return writeChain;
}

// SSE Client Registry for Multi-Device Real-Time Updates
const sseClients = new Map<string, { res: Response; uid: string }>();

function broadcastEvent(event: string, payload: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.res.write(frame);
    } catch {
      sseClients.delete(clientId);
    }
  }
}

function sendEventToUser(targetUid: string, event: string, payload: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [clientId, client] of sseClients.entries()) {
    if (client.uid === targetUid) {
      try {
        client.res.write(frame);
      } catch {
        sseClients.delete(clientId);
      }
    }
  }
}

// Security helpers
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function signToken(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', db.authSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac('sha256', db.authSecret)
    .update(payloadB64)
    .digest('base64url');
  const a = Buffer.from(sigB64, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function toPublicUser(u: StoredUser): PublicUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    status: u.status,
    provider: u.provider,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

function isUserAdmin(u: StoredUser): boolean {
  return (
    u.role === 'admin' ||
    u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

function generateSafeId(prefix: string): string {
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${Date.now()}_${rand}`;
}

// Payload normalization (aligned 1-to-1 with frontend sanitizeOrderPayload)
function isNoQtyLogoType(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const upper = value.trim().toUpperCase();
  return upper === '' || upper === 'PRINTING' || upper.startsWith('TANPA');
}

function normalizeProductionStatus(raw: unknown): ProductionStatus {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'SUDAH SELESAI' || val === 'SELESAI') return 'SUDAH SELESAI';
  if (
    val === 'PROSES PRODUKSI' ||
    val === 'POTONG / PRINTING' ||
    val === 'JAHIT' ||
    val === 'FINISHING / QC'
  ) {
    return 'PROSES PRODUKSI';
  }
  return 'ANTRIAN';
}

function normalizeCategory(raw: unknown): OrderCategory {
  if (raw === 'ATASAN' || raw === 'CELANA' || raw === 'JAKET') return raw;
  return 'SETELAN';
}

function normalizeDesignStatus(raw: unknown): DesignStatus {
  if (raw === 'PROSES DESAIN' || raw === 'REVISI' || raw === 'DESAIN ACC') return raw;
  return 'BELUM DESAIN';
}

function clampNum(val: unknown, max: number): number {
  return Math.min(max, Math.max(0, Math.round(Number(val) || 0)));
}

function clampStr(val: unknown, max: number): string {
  return String(val || '').trim().slice(0, max);
}

function sanitizeOrderInput(
  payload: Record<string, unknown>
): Omit<ProductionOrderRecord, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> {
  const kategori = normalizeCategory(payload.kategori);
  const isSetelan = kategori === 'SETELAN';
  const isAtasan = kategori === 'ATASAN';
  const isCelana = kategori === 'CELANA';
  const isJaket = kategori === 'JAKET';
  const hasAtasan = isSetelan || isAtasan;
  const hasCelana = isSetelan || isCelana;
  const belumLayout = Boolean(payload.belumLayout);
  const belumInvoice = Boolean(payload.belumInvoice);

  const jenisLogoTim = hasAtasan ? clampStr(payload.jenisLogoTim, 100) : 'TANPA LOGO';
  const jenisLogoTimCelana = hasCelana ? clampStr(payload.jenisLogoTimCelana, 100) : 'TANPA LOGO';
  const jenisLogoApparel = hasAtasan ? clampStr(payload.jenisLogoApparel, 100) : 'TANPA LOGO';
  const jenisLogoApparelCelana = hasCelana
    ? clampStr(payload.jenisLogoApparelCelana, 100)
    : 'TANPA LOGO';
  const jenisNomorCelana = hasCelana ? clampStr(payload.jenisNomorCelana, 100) : 'TANPA NOMOR';
  const jenisSponsorDepanBelakang = hasAtasan
    ? clampStr(payload.jenisSponsorDepanBelakang, 120)
    : 'TANPA SPONSOR';
  const jenisSponsorLengan = hasAtasan
    ? clampStr(payload.jenisSponsorLengan, 120)
    : 'TANPA SPONSOR';
  const jenisLogoJaket = isJaket ? clampStr(payload.jenisLogoJaket, 100) : '';

  const statusDesain = normalizeDesignStatus(payload.statusDesain);
  const designNoRevision =
    statusDesain === 'BELUM DESAIN' || statusDesain === 'PROSES DESAIN';
  const statusPesanLogo: LogoOrderStatus = payload.statusPesanLogo === 'SUDAH' ? 'SUDAH' : 'BELUM';

  return {
    kategori,
    paket: clampStr(payload.paket, 100),
    namaCustomer: clampStr(payload.namaCustomer, 150),
    statusCustomer: payload.statusCustomer === 'TAMBAHAN' ? 'TAMBAHAN' : 'UTAMA',
    noInvoice: belumInvoice ? 'BELUM BIKIN' : clampStr(payload.noInvoice, 80),
    belumInvoice,
    tglOrder: clampStr(payload.tglOrder, 20),
    tglMasukLayout: belumLayout ? '' : clampStr(payload.tglMasukLayout, 20),
    belumLayout,
    tglEstimasiSelesai: clampStr(payload.tglEstimasiSelesai, 20),
    qtyOrder: clampNum(payload.qtyOrder, 100000),
    bahanAtasan: hasAtasan ? clampStr(payload.bahanAtasan, 100) : '',
    bahanCelana: hasCelana ? clampStr(payload.bahanCelana, 100) : '',
    jenisCelana: hasCelana
      ? payload.jenisCelana === 'CELANA PANJANG'
        ? 'CELANA PANJANG'
        : 'CELANA PENDEK'
      : '',
    bahanJaket: isJaket ? clampStr(payload.bahanJaket, 100) : '',
    kerah: isCelana ? '' : clampStr(payload.kerah, 100),
    jenisLogoTim,
    jmlLogoTim: hasAtasan && !isNoQtyLogoType(jenisLogoTim) ? clampNum(payload.jmlLogoTim, 10000) : 0,
    jenisLogoTimCelana,
    jmlLogoTimCelana:
      hasCelana && !isNoQtyLogoType(jenisLogoTimCelana)
        ? clampNum(payload.jmlLogoTimCelana, 10000)
        : 0,
    jenisLogoApparel,
    jmlLogoApparel:
      hasAtasan && !isNoQtyLogoType(jenisLogoApparel)
        ? clampNum(payload.jmlLogoApparel, 10000)
        : 0,
    jenisLogoApparelCelana,
    jmlLogoApparelCelana:
      hasCelana && !isNoQtyLogoType(jenisLogoApparelCelana)
        ? clampNum(payload.jmlLogoApparelCelana, 10000)
        : 0,
    jenisNomorCelana,
    jmlNomorCelana:
      hasCelana && !isNoQtyLogoType(jenisNomorCelana)
        ? clampNum(payload.jmlNomorCelana, 10000)
        : 0,
    jenisSponsorDepanBelakang,
    jmlSponsorDepanBelakang:
      hasAtasan && !isNoQtyLogoType(jenisSponsorDepanBelakang)
        ? clampNum(payload.jmlSponsorDepanBelakang, 10000)
        : 0,
    jenisSponsorLengan,
    jmlSponsorLengan:
      hasAtasan && !isNoQtyLogoType(jenisSponsorLengan)
        ? clampNum(payload.jmlSponsorLengan, 10000)
        : 0,
    jenisLogoJaket,
    jmlLogoJaket:
      isJaket && !isNoQtyLogoType(jenisLogoJaket) ? clampNum(payload.jmlLogoJaket, 10000) : 0,
    pecahPola: (hasAtasan || isJaket) && payload.pecahPola === 'ADA' ? 'ADA' : 'TIDAK',
    jmlPecahPola:
      (hasAtasan || isJaket) && payload.pecahPola === 'ADA'
        ? clampNum(payload.jmlPecahPola, 100000)
        : 0,
    lisPiping: (hasAtasan || isJaket) && payload.lisPiping === 'ADA' ? 'ADA' : 'TIDAK',
    jmlLisPiping:
      (hasAtasan || isJaket) && payload.lisPiping === 'ADA'
        ? clampNum(payload.jmlLisPiping, 100000)
        : 0,
    pecahPolaCelana: hasCelana && payload.pecahPolaCelana === 'ADA' ? 'ADA' : 'TIDAK',
    jmlPecahPolaCelana:
      hasCelana && payload.pecahPolaCelana === 'ADA'
        ? clampNum(payload.jmlPecahPolaCelana, 100000)
        : 0,
    lisPipingCelana: hasCelana && payload.lisPipingCelana === 'ADA' ? 'ADA' : 'TIDAK',
    jmlLisPipingCelana:
      hasCelana && payload.lisPipingCelana === 'ADA'
        ? clampNum(payload.jmlLisPipingCelana, 100000)
        : 0,
    statusPesanLogo,
    tglPesanLogo: statusPesanLogo === 'SUDAH' ? clampStr(payload.tglPesanLogo, 20) : '',
    statusDesain,
    revisiKe: designNoRevision ? 0 : Math.min(10, Math.max(0, Math.round(Number(payload.revisiKe) || 0))),
    desainer: clampStr(payload.desainer, 100),
    tglUpdateDesain: clampStr(payload.tglUpdateDesain, 20),
    statusProduksi: normalizeProductionStatus(payload.statusProduksi),
    totalNominal: Math.max(0, Math.round(Number(payload.totalNominal) || 0)),
    dpNominal: Math.max(0, Math.round(Number(payload.dpNominal) || 0)),
    keteranganRequest: clampStr(payload.keteranganRequest, 2000),
  };
}

function sanitizeStringList(list: unknown, fallback: string[]): string[] {
  if (!Array.isArray(list)) return fallback;
  return list
    .map((x) => String(x || '').trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 80);
}

function sanitizeSettingsInput(raw: Record<string, unknown>): MasterSettingsRecord {
  const minW = Math.min(12, Math.max(1, Math.round(Number(raw.minEstWeeks) || 2)));
  const maxW = Math.min(24, Math.max(minW, Math.round(Number(raw.maxEstWeeks) || 3)));
  return {
    paketSetelanList: sanitizeStringList(raw.paketSetelanList, DEFAULT_SETTINGS.paketSetelanList),
    paketAtasanList: sanitizeStringList(raw.paketAtasanList, DEFAULT_SETTINGS.paketAtasanList),
    paketCelanaList: sanitizeStringList(raw.paketCelanaList, DEFAULT_SETTINGS.paketCelanaList),
    paketJaketList: sanitizeStringList(raw.paketJaketList, DEFAULT_SETTINGS.paketJaketList),
    bahanList: sanitizeStringList(raw.bahanList, DEFAULT_SETTINGS.bahanList),
    bahanJaketList: sanitizeStringList(raw.bahanJaketList, DEFAULT_SETTINGS.bahanJaketList),
    kerahList: sanitizeStringList(raw.kerahList, DEFAULT_SETTINGS.kerahList),
    logoTimList: sanitizeStringList(raw.logoTimList, DEFAULT_SETTINGS.logoTimList),
    logoApparelList: sanitizeStringList(raw.logoApparelList, DEFAULT_SETTINGS.logoApparelList),
    nomorCelanaList: sanitizeStringList(raw.nomorCelanaList, DEFAULT_SETTINGS.nomorCelanaList),
    sponsorDepanBelakangList: sanitizeStringList(
      raw.sponsorDepanBelakangList,
      DEFAULT_SETTINGS.sponsorDepanBelakangList
    ),
    sponsorLenganList: sanitizeStringList(raw.sponsorLenganList, DEFAULT_SETTINGS.sponsorLenganList),
    logoJaketList: sanitizeStringList(raw.logoJaketList, DEFAULT_SETTINGS.logoJaketList),
    desainerList: sanitizeStringList(raw.desainerList, DEFAULT_SETTINGS.desainerList),
    warningDaysAfterLayout: Math.min(
      60,
      Math.max(1, Math.round(Number(raw.warningDaysAfterLayout) || 13))
    ),
    urgentDaysBeforeDeadline: Math.min(
      30,
      Math.max(0, Math.round(Number(raw.urgentDaysBeforeDeadline) || 1))
    ),
    minEstWeeks: minW,
    maxEstWeeks: maxW,
    updatedAt: new Date().toISOString(),
  };
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function buildSampleOrderPayloads(): Array<Record<string, unknown>> {
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

// Express Setup
const app = express();
app.use(express.json({ limit: '50mb' }));

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

function requireAuthUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' });
    return;
  }
  const uid = verifyToken(token);
  if (!uid) {
    res.status(401).json({ error: 'Sesi login telah berakhir. Silakan masuk kembali.' });
    return;
  }
  const user = db.users.find((u) => u.uid === uid);
  if (!user) {
    res.status(401).json({ error: 'Akun pengguna tidak ditemukan.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireActiveUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuthUser(req, res, () => {
    const user = req.authUser!;
    if (user.status !== 'active') {
      res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        error: 'Akses akun Anda telah dinonaktifkan oleh Administrator.',
      });
      return;
    }
    next();
  });
}

function requireAdminUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireActiveUser(req, res, () => {
    const user = req.authUser!;
    if (!isUserAdmin(user)) {
      res.status(403).json({ error: 'Hanya Administrator yang memiliki akses untuk aksi ini.' });
      return;
    }
    next();
  });
}

// Auth Routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const rawName = String(req.body?.displayName || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    res.status(400).json({ error: 'Format alamat email tidak valid.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    return;
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email);
  if (existing) {
    res.status(409).json({
      error: 'Email sudah terdaftar. Silakan masuk melalui tab Masuk Email.',
    });
    return;
  }

  const isOwner = email === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  const nowIso = new Date().toISOString();
  const displayName = (rawName || email.split('@')[0] || 'Pengguna').slice(0, 120);

  const newUser: StoredUser = {
    uid: generateSafeId('usr'),
    email,
    displayName,
    role: isOwner ? 'admin' : 'staff',
    status: 'active',
    provider: 'email-lokal',
    passwordHash: hashPassword(password),
    lastLoginAt: nowIso,
    createdAt: nowIso,
  };

  db.users.push(newUser);
  await persistDatabase();

  const publicList = db.users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
  broadcastEvent('users', { users: publicList });

  const token = signToken(newUser.uid);
  res.status(201).json({ token, user: toPublicUser(newUser) });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    if (email === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      res.status(401).json({
        error:
          'Akun Admin utama belum didaftarkan di server lokal. Pilih tab "Daftar Akun Baru" terlebih dahulu untuk membuat kata sandi.',
      });
      return;
    }
    res.status(401).json({
      error: 'Akun email belum terdaftar. Silakan pilih tab Daftar Akun Baru.',
    });
    return;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' });
    return;
  }

  if (user.status === 'active') {
    user.lastLoginAt = new Date().toISOString();
    await persistDatabase();
    const publicList = db.users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
    broadcastEvent('users', { users: publicList });
  }

  const token = signToken(user.uid);
  res.json({ token, user: toPublicUser(user) });
});

app.get('/api/auth/me', requireAuthUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: toPublicUser(req.authUser!) });
});

// Live SSE Stream
app.get('/api/events', requireActiveUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = generateSafeId('sse');
  sseClients.set(clientId, { res, uid: user.uid });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(clientId);
  });
});

// Bootstrap All Data on Authenticated Login
app.get('/api/bootstrap', requireActiveUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const sortedOrders = [...db.orders].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
  const sortedNotes = [...db.calendarNotes].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
  const users = isUserAdmin(user)
    ? db.users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email))
    : [];

  res.json({
    user: toPublicUser(user),
    settings: db.settings,
    orders: sortedOrders,
    calendarNotes: sortedNotes,
    users,
  });
});

// Master Settings Routes
app.get('/api/settings', requireActiveUser, (_req: Request, res: Response) => {
  res.json({ settings: db.settings });
});

app.put('/api/settings', requireActiveUser, async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  db.settings = sanitizeSettingsInput(body);
  await persistDatabase();
  broadcastEvent('settings', { settings: db.settings });
  res.json({ settings: db.settings });
});

// Orders Routes
app.get('/api/orders', requireActiveUser, (_req: Request, res: Response) => {
  const sorted = [...db.orders].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
  res.json({ orders: sorted });
});

app.post('/api/orders', requireActiveUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const raw = (req.body || {}) as Record<string, unknown>;
  const clean = sanitizeOrderInput(raw);

  if (!clean.namaCustomer) {
    res.status(400).json({ error: 'Nama Customer / Tim wajib diisi.' });
    return;
  }
  if (!clean.belumInvoice && !clean.noInvoice) {
    res.status(400).json({ error: 'No. Invoice wajib diisi (atau centang Belum Bikin).' });
    return;
  }

  const nowIso = new Date().toISOString();
  const created: ProductionOrderRecord = {
    id: generateSafeId('ord'),
    ...clean,
    createdBy: user.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.orders.unshift(created);
  await persistDatabase();
  broadcastEvent('order_upsert', { order: created });
  res.status(201).json({ id: created.id, order: created });
});

app.post('/api/orders/seed', requireActiveUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const samples = buildSampleOrderPayloads();
  const baseMs = Date.now();
  const inserted: ProductionOrderRecord[] = [];

  samples.forEach((sample, idx) => {
    const clean = sanitizeOrderInput(sample);
    const ts = new Date(baseMs - idx * 1000).toISOString();
    inserted.push({
      id: generateSafeId('ord'),
      ...clean,
      createdBy: user.uid,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  db.orders = [...inserted, ...db.orders];
  await persistDatabase();
  broadcastEvent('orders', { orders: db.orders });
  res.status(201).json({ orders: db.orders });
});

app.patch('/api/orders/:id', requireActiveUser, async (req: Request, res: Response) => {
  const orderId = String(req.params.id || '');
  const idx = db.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) {
    res.status(404).json({ error: 'Order tidak ditemukan.' });
    return;
  }

  const current = db.orders[idx];
  const raw = (req.body || {}) as Record<string, unknown>;
  const isFullUpdate = Boolean(raw._fullUpdate);
  const { _fullUpdate: _ignored, ...updates } = raw;

  let nextRecord: ProductionOrderRecord;
  if (isFullUpdate) {
    const clean = sanitizeOrderInput(updates);
    if (!clean.namaCustomer) {
      res.status(400).json({ error: 'Nama Customer / Tim wajib diisi.' });
      return;
    }
    if (!clean.belumInvoice && !clean.noInvoice) {
      res.status(400).json({ error: 'No. Invoice wajib diisi (atau centang Belum Bikin).' });
      return;
    }
    nextRecord = {
      ...clean,
      id: current.id,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
  } else {
    const merged = sanitizeOrderInput({ ...current, ...updates });
    nextRecord = {
      ...merged,
      id: current.id,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  db.orders[idx] = nextRecord;
  await persistDatabase();
  broadcastEvent('order_upsert', { order: nextRecord });
  res.json({ order: nextRecord });
});

app.delete('/api/orders/:id', requireActiveUser, async (req: Request, res: Response) => {
  const orderId = String(req.params.id || '');
  const prevLen = db.orders.length;
  db.orders = db.orders.filter((o) => o.id !== orderId);
  if (db.orders.length === prevLen) {
    res.status(404).json({ error: 'Order tidak ditemukan.' });
    return;
  }
  await persistDatabase();
  broadcastEvent('order_delete', { id: orderId });
  res.json({ ok: true });
});

// Calendar Notes Routes
app.get('/api/calendar-notes', requireActiveUser, (_req: Request, res: Response) => {
  const sorted = [...db.calendarNotes].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  res.json({ calendarNotes: sorted });
});

app.post(
  '/api/calendar-notes',
  requireActiveUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const dateKey = String(req.body?.dateKey || '').slice(0, 10);
    const title = String(req.body?.title || '').trim().slice(0, 160);
    const content = String(req.body?.content || '').trim().slice(0, 1500);
    const rawCat = req.body?.category;
    const category: CalendarNoteCategory =
      rawCat === 'prioritas' || rawCat === 'libur' ? rawCat : 'catatan';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !title) {
      res.status(400).json({ error: 'Tanggal dan judul catatan wajib diisi.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const note: CalendarNoteRecord = {
      id: generateSafeId('note'),
      dateKey,
      title,
      content,
      category,
      authorUid: user.uid,
      authorName: (String(req.body?.authorName || '').trim() || user.displayName || 'Tim').slice(
        0,
        120
      ),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.calendarNotes.push(note);
    db.calendarNotes.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    await persistDatabase();
    broadcastEvent('notes', { calendarNotes: db.calendarNotes });
    res.status(201).json({ id: note.id, note });
  }
);

app.patch('/api/calendar-notes/:id', requireActiveUser, async (req: Request, res: Response) => {
  const noteId = String(req.params.id || '');
  const idx = db.calendarNotes.findIndex((n) => n.id === noteId);
  if (idx === -1) {
    res.status(404).json({ error: 'Catatan kalender tidak ditemukan.' });
    return;
  }
  const current = db.calendarNotes[idx];
  const dateKey = String(req.body?.dateKey || current.dateKey).slice(0, 10);
  const title = String(req.body?.title || current.title).trim().slice(0, 160);
  const content = String(req.body?.content ?? current.content).trim().slice(0, 1500);
  const rawCat = req.body?.category;
  const category: CalendarNoteCategory =
    rawCat === 'prioritas' || rawCat === 'libur' || rawCat === 'catatan'
      ? rawCat
      : current.category;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !title) {
    res.status(400).json({ error: 'Tanggal dan judul catatan wajib diisi.' });
    return;
  }

  const updated: CalendarNoteRecord = {
    ...current,
    dateKey,
    title,
    content,
    category,
    updatedAt: new Date().toISOString(),
  };

  db.calendarNotes[idx] = updated;
  db.calendarNotes.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  await persistDatabase();
  broadcastEvent('notes', { calendarNotes: db.calendarNotes });
  res.json({ note: updated });
});

app.delete('/api/calendar-notes/:id', requireActiveUser, async (req: Request, res: Response) => {
  const noteId = String(req.params.id || '');
  const prevLen = db.calendarNotes.length;
  db.calendarNotes = db.calendarNotes.filter((n) => n.id !== noteId);
  if (db.calendarNotes.length === prevLen) {
    res.status(404).json({ error: 'Catatan tidak ditemukan.' });
    return;
  }
  await persistDatabase();
  broadcastEvent('notes', { calendarNotes: db.calendarNotes });
  res.json({ ok: true });
});

// User Management Routes (Admin Only)
app.get('/api/users', requireAdminUser, (_req: Request, res: Response) => {
  const list = db.users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
  res.json({ users: list });
});

app.patch('/api/users/:uid', requireAdminUser, async (req: AuthenticatedRequest, res: Response) => {
  const targetUid = String(req.params.uid || '');
  const target = db.users.find((u) => u.uid === targetUid);
  if (!target) {
    res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    return;
  }

  const isOwner = target.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  const isSelf = target.uid === req.authUser!.uid;
  if (isOwner || isSelf) {
    res.status(400).json({ error: 'Akun Admin Utama atau sesi aktif sendiri tidak dapat diubah.' });
    return;
  }

  if (req.body?.status === 'active' || req.body?.status === 'disabled') {
    target.status = req.body.status;
  }
  if (req.body?.role === 'admin' || req.body?.role === 'staff') {
    target.role = req.body.role;
  }

  await persistDatabase();
  const publicTarget = toPublicUser(target);
  const publicList = db.users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
  broadcastEvent('users', { users: publicList });
  sendEventToUser(target.uid, 'self_user', { user: publicTarget });
  res.json({ user: publicTarget });
});

// Export / Import Backup JSON Routes
app.get('/api/backup', requireActiveUser, (_req: Request, res: Response) => {
  const backup = {
    app: 'SISKA Monitoring',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: db.settings,
    orders: db.orders,
    calendarNotes: db.calendarNotes,
    users: db.users.map(toPublicUser),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="siska-backup-${getTodayDateKey()}.json"`
  );
  res.send(JSON.stringify(backup, null, 2));
});

app.post(
  '/api/backup/import',
  requireAdminUser,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const mode = req.body?.mode === 'merge' ? 'merge' : 'replace';
    const data = req.body?.backup;

    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Format file backup JSON tidak valid.' });
      return;
    }

    const importedOrdersRaw = Array.isArray(data.orders) ? data.orders : [];
    const importedNotesRaw = Array.isArray(data.calendarNotes) ? data.calendarNotes : [];
    const hasSettings = data.settings && typeof data.settings === 'object';

    const sanitizedOrders: ProductionOrderRecord[] = importedOrdersRaw
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: Record<string, unknown>) => {
        const clean = sanitizeOrderInput(item);
        const nowIso = new Date().toISOString();
        return {
          ...clean,
          id:
            typeof item.id === 'string' && /^[a-zA-Z0-9_\-]+$/.test(item.id)
              ? item.id.slice(0, 128)
              : generateSafeId('ord'),
          namaCustomer: clean.namaCustomer || 'TANPA NAMA',
          noInvoice: clean.noInvoice || 'BELUM BIKIN',
          createdBy:
            typeof item.createdBy === 'string' && item.createdBy
              ? item.createdBy.slice(0, 128)
              : adminUser.uid,
          createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : nowIso,
          updatedAt: typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : nowIso,
        };
      });

    const sanitizedNotes: CalendarNoteRecord[] = importedNotesRaw
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: Record<string, unknown>) => {
        const dateKey = String(item.dateKey || getTodayDateKey()).slice(0, 10);
        const rawCat = item.category;
        const nowIso = new Date().toISOString();
        return {
          id:
            typeof item.id === 'string' && /^[a-zA-Z0-9_\-]+$/.test(item.id)
              ? item.id.slice(0, 128)
              : generateSafeId('note'),
          dateKey: /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : getTodayDateKey(),
          title: String(item.title || 'Catatan').trim().slice(0, 160) || 'Catatan',
          content: String(item.content || '').trim().slice(0, 1500),
          category:
            rawCat === 'prioritas' || rawCat === 'libur' ? rawCat : ('catatan' as CalendarNoteCategory),
          authorUid:
            typeof item.authorUid === 'string' && item.authorUid
              ? item.authorUid.slice(0, 128)
              : adminUser.uid,
          authorName: String(item.authorName || adminUser.displayName || 'Tim').slice(0, 120),
          createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : nowIso,
          updatedAt: typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : nowIso,
        };
      });

    if (mode === 'replace') {
      db.orders = sanitizedOrders;
      db.calendarNotes = sanitizedNotes;
      if (hasSettings) {
        db.settings = sanitizeSettingsInput(data.settings as Record<string, unknown>);
      }
    } else {
      const orderMap = new Map(db.orders.map((o) => [o.id, o]));
      for (const ord of sanitizedOrders) {
        orderMap.set(ord.id, ord);
      }
      db.orders = Array.from(orderMap.values()).sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );

      const noteMap = new Map(db.calendarNotes.map((n) => [n.id, n]));
      for (const note of sanitizedNotes) {
        noteMap.set(note.id, note);
      }
      db.calendarNotes = Array.from(noteMap.values()).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      );

      if (hasSettings) {
        db.settings = sanitizeSettingsInput(data.settings as Record<string, unknown>);
      }
    }

    await persistDatabase();
    broadcastEvent('orders', { orders: db.orders });
    broadcastEvent('notes', { calendarNotes: db.calendarNotes });
    broadcastEvent('settings', { settings: db.settings });

    res.json({
      ok: true,
      importedOrders: sanitizedOrders.length,
      importedNotes: sanitizedNotes.length,
      orders: db.orders,
      calendarNotes: db.calendarNotes,
      settings: db.settings,
    });
  }
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SISKA Monitoring server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
