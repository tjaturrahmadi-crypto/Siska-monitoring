import {
  addDaysToDateKey,
  CATEGORY_LABELS,
  formatDateId,
  getTodayDateKey,
} from '../constants/defaults';
import type {
  ComputedOrder,
  MasterSettings,
  OrderFormPayload,
  PaymentStatus,
  ProductionOrder,
  ProductionStatus,
  ScheduleStatus,
} from '../types';

export function isNoQtyLogoType(value: string | undefined | null): boolean {
  if (!value) return true;
  const upper = value.trim().toUpperCase();
  return upper === '' || upper === 'PRINTING' || upper.startsWith('TANPA');
}

export function normalizeProductionStatus(raw: string | undefined | null): ProductionStatus {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'SUDAH SELESAI' || val === 'SELESAI') {
    return 'SUDAH SELESAI';
  }
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

function parseDateMs(dateKey: string): number | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function diffDays(laterKey: string, earlierKey: string): number | null {
  const laterMs = parseDateMs(laterKey);
  const earlierMs = parseDateMs(earlierKey);
  if (laterMs === null || earlierMs === null) return null;
  return Math.round((laterMs - earlierMs) / (1000 * 60 * 60 * 24));
}

export function computeAllOrders(
  orders: ProductionOrder[],
  settings: Omit<MasterSettings, 'updatedAt'>
): ComputedOrder[] {
  const todayKey = getTodayDateKey();

  const invoiceCountsByCategory = new Map<string, number>();
  for (const order of orders) {
    const inv = order.noInvoice.trim().toUpperCase();
    const isBelum = Boolean(order.belumInvoice) || inv === 'BELUM BIKIN' || inv === '';
    if (isBelum) continue;
    const key = `${order.kategori}::${inv}`;
    invoiceCountsByCategory.set(key, (invoiceCountsByCategory.get(key) || 0) + 1);
  }

  return orders.map((order) => {
    const belumLayout = Boolean(order.belumLayout);
    const invUpper = (order.noInvoice || '').trim().toUpperCase();
    const belumInvoice = Boolean(order.belumInvoice) || invUpper === 'BELUM BIKIN' || invUpper === '';
    const noInvoice = belumInvoice ? 'BELUM BIKIN' : order.noInvoice;
    const tglOrder = order.tglOrder || order.tglMasukLayout || '';
    const tglMasukLayout = belumLayout ? '' : order.tglMasukLayout || '';
    const statusProduksi = normalizeProductionStatus(order.statusProduksi);

    const sisaHari = diffDays(order.tglEstimasiSelesai, todayKey);
    const hariSejakLayout = belumLayout ? null : diffDays(todayKey, tglMasukLayout);
    const estimasiRangeDays = belumLayout
      ? null
      : diffDays(order.tglEstimasiSelesai, tglMasukLayout);

    const minDays = settings.minEstWeeks * 7;
    const maxDays = settings.maxEstWeeks * 7;
    const estimasiOutOfRange =
      !belumLayout &&
      estimasiRangeDays !== null &&
      (estimasiRangeDays < minDays || estimasiRangeDays > maxDays);

    let statusJadwal: ScheduleStatus = 'ON TRACK';
    if (statusProduksi === 'SUDAH SELESAI') {
      statusJadwal = 'SELESAI';
    } else if (!order.tglEstimasiSelesai || (!belumLayout && !tglMasukLayout)) {
      statusJadwal = 'LENGKAPI TANGGAL';
    } else if (sisaHari !== null && sisaHari < 0) {
      statusJadwal = 'TERLAMBAT';
    } else if (
      !belumLayout &&
      hariSejakLayout !== null &&
      hariSejakLayout > settings.warningDaysAfterLayout
    ) {
      statusJadwal = 'PERINGATAN';
    } else if (sisaHari !== null && sisaHari <= settings.urgentDaysBeforeDeadline) {
      statusJadwal = 'SEGERA';
    } else {
      statusJadwal = 'ON TRACK';
    }

    const totalNominal = Math.max(0, Number(order.totalNominal) || 0);
    const dpNominal = Math.max(0, Number(order.dpNominal) || 0);
    const sisaTagihan = Math.max(0, totalNominal - dpNominal);

    let statusPembayaran: PaymentStatus = 'BELUM DP';
    if (totalNominal > 0 && sisaTagihan === 0) {
      statusPembayaran = 'LUNAS';
    } else if (dpNominal > 0) {
      statusPembayaran = 'DP';
    }

    const invKey = `${order.kategori}::${noInvoice.trim().toUpperCase()}`;
    const isDuplicateInvoice =
      !belumInvoice && (invoiceCountsByCategory.get(invKey) || 0) > 1;

    const peringatanDateKey =
      !belumLayout && tglMasukLayout
        ? addDaysToDateKey(tglMasukLayout, settings.warningDaysAfterLayout)
        : null;

    const jenisLogoTimCelana =
      order.jenisLogoTimCelana ||
      (order.kategori === 'SETELAN' || order.kategori === 'CELANA'
        ? order.jenisLogoTim || 'TANPA LOGO'
        : 'TANPA LOGO');

    const jenisLogoApparelCelana =
      order.jenisLogoApparelCelana ||
      (order.kategori === 'SETELAN' || order.kategori === 'CELANA'
        ? order.jenisLogoApparel || 'TANPA LOGO'
        : 'TANPA LOGO');

    const jenisNomorCelana = order.jenisNomorCelana || 'TANPA NOMOR';
    const jmlNomorCelana = Math.max(0, Number(order.jmlNomorCelana) || 0);
    const jenisCelana =
      order.kategori === 'SETELAN' || order.kategori === 'CELANA'
        ? order.jenisCelana || 'CELANA PENDEK'
        : '';

    const pecahPola = order.pecahPola === 'ADA' ? 'ADA' : 'TIDAK';
    const jmlPecahPola = pecahPola === 'ADA' ? Math.max(0, Number(order.jmlPecahPola) || 0) : 0;
    const lisPiping = order.lisPiping === 'ADA' ? 'ADA' : 'TIDAK';
    const jmlLisPiping = lisPiping === 'ADA' ? Math.max(0, Number(order.jmlLisPiping) || 0) : 0;

    const pecahPolaCelana = order.pecahPolaCelana === 'ADA' ? 'ADA' : 'TIDAK';
    const jmlPecahPolaCelana =
      pecahPolaCelana === 'ADA' ? Math.max(0, Number(order.jmlPecahPolaCelana) || 0) : 0;
    const lisPipingCelana = order.lisPipingCelana === 'ADA' ? 'ADA' : 'TIDAK';
    const jmlLisPipingCelana =
      lisPipingCelana === 'ADA' ? Math.max(0, Number(order.jmlLisPipingCelana) || 0) : 0;

    return {
      ...order,
      paket: order.paket || '',
      noInvoice,
      belumInvoice,
      tglOrder,
      tglMasukLayout,
      belumLayout,
      jenisCelana,
      statusProduksi,
      jenisLogoTimCelana,
      jenisLogoApparelCelana,
      jenisNomorCelana,
      jmlNomorCelana,
      pecahPola,
      jmlPecahPola,
      lisPiping,
      jmlLisPiping,
      pecahPolaCelana,
      jmlPecahPolaCelana,
      lisPipingCelana,
      jmlLisPipingCelana,
      statusJadwal,
      sisaHari,
      hariSejakLayout,
      estimasiOutOfRange,
      estimasiRangeDays,
      sisaTagihan,
      statusPembayaran,
      isDuplicateInvoice,
      peringatanDateKey,
    };
  });
}

export function sanitizeOrderPayload(payload: OrderFormPayload): OrderFormPayload {
  const clampNum = (val: number, max: number) =>
    Math.min(max, Math.max(0, Math.round(Number(val) || 0)));
  const clampStr = (val: string, max: number) => String(val || '').trim().slice(0, max);

  const isSetelan = payload.kategori === 'SETELAN';
  const isAtasan = payload.kategori === 'ATASAN';
  const isCelana = payload.kategori === 'CELANA';
  const isJaket = payload.kategori === 'JAKET';
  const hasAtasan = isSetelan || isAtasan;
  const hasCelana = isSetelan || isCelana;
  const belumLayout = Boolean(payload.belumLayout);
  const belumInvoice = Boolean(payload.belumInvoice);

  const logoTimNoQty = isNoQtyLogoType(payload.jenisLogoTim);
  const logoApparelNoQty = isNoQtyLogoType(payload.jenisLogoApparel);
  const sponsorDbNoQty = isNoQtyLogoType(payload.jenisSponsorDepanBelakang);
  const sponsorLenganNoQty = isNoQtyLogoType(payload.jenisSponsorLengan);

  const nomorCelanaNoQty = isNoQtyLogoType(payload.jenisNomorCelana);
  const logoApparelCelanaNoQty = isNoQtyLogoType(payload.jenisLogoApparelCelana);
  const logoTimCelanaNoQty = isNoQtyLogoType(payload.jenisLogoTimCelana);

  const logoJaketNoQty = isNoQtyLogoType(payload.jenisLogoJaket);

  const designNoRevision =
    payload.statusDesain === 'BELUM DESAIN' || payload.statusDesain === 'PROSES DESAIN';

  return {
    kategori: payload.kategori,
    paket: clampStr(payload.paket, 100),
    namaCustomer: clampStr(payload.namaCustomer, 150),
    statusCustomer: payload.statusCustomer,
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
    jenisLogoTim: hasAtasan ? clampStr(payload.jenisLogoTim, 100) : 'TANPA LOGO',
    jmlLogoTim: hasAtasan && !logoTimNoQty ? clampNum(payload.jmlLogoTim, 10000) : 0,
    jenisLogoTimCelana: hasCelana ? clampStr(payload.jenisLogoTimCelana, 100) : 'TANPA LOGO',
    jmlLogoTimCelana:
      hasCelana && !logoTimCelanaNoQty ? clampNum(payload.jmlLogoTimCelana, 10000) : 0,
    jenisLogoApparel: hasAtasan ? clampStr(payload.jenisLogoApparel, 100) : 'TANPA LOGO',
    jmlLogoApparel: hasAtasan && !logoApparelNoQty ? clampNum(payload.jmlLogoApparel, 10000) : 0,
    jenisLogoApparelCelana: hasCelana
      ? clampStr(payload.jenisLogoApparelCelana, 100)
      : 'TANPA LOGO',
    jmlLogoApparelCelana:
      hasCelana && !logoApparelCelanaNoQty ? clampNum(payload.jmlLogoApparelCelana, 10000) : 0,
    jenisNomorCelana: hasCelana ? clampStr(payload.jenisNomorCelana, 100) : 'TANPA NOMOR',
    jmlNomorCelana: hasCelana && !nomorCelanaNoQty ? clampNum(payload.jmlNomorCelana, 10000) : 0,
    jenisSponsorDepanBelakang: hasAtasan
      ? clampStr(payload.jenisSponsorDepanBelakang, 120)
      : 'TANPA SPONSOR',
    jmlSponsorDepanBelakang:
      hasAtasan && !sponsorDbNoQty ? clampNum(payload.jmlSponsorDepanBelakang, 10000) : 0,
    jenisSponsorLengan: hasAtasan
      ? clampStr(payload.jenisSponsorLengan, 120)
      : 'TANPA SPONSOR',
    jmlSponsorLengan:
      hasAtasan && !sponsorLenganNoQty ? clampNum(payload.jmlSponsorLengan, 10000) : 0,
    jenisLogoJaket: isJaket ? clampStr(payload.jenisLogoJaket, 100) : '',
    jmlLogoJaket: isJaket && !logoJaketNoQty ? clampNum(payload.jmlLogoJaket, 10000) : 0,
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
    statusPesanLogo: payload.statusPesanLogo,
    tglPesanLogo: payload.statusPesanLogo === 'SUDAH' ? clampStr(payload.tglPesanLogo, 20) : '',
    statusDesain: payload.statusDesain,
    revisiKe: designNoRevision ? 0 : Math.min(10, Math.max(0, Math.round(Number(payload.revisiKe) || 0))),
    desainer: clampStr(payload.desainer, 100),
    tglUpdateDesain: clampStr(payload.tglUpdateDesain, 20),
    statusProduksi: normalizeProductionStatus(payload.statusProduksi),
    totalNominal: Math.max(0, Math.round(Number(payload.totalNominal) || 0)),
    dpNominal: Math.max(0, Math.round(Number(payload.dpNominal) || 0)),
    keteranganRequest: clampStr(payload.keteranganRequest, 2000),
  };
}

function formatSpecLine(label: string, jenis: string, qty: number): string {
  const cleanJenis = jenis || '-';
  if (isNoQtyLogoType(cleanJenis)) {
    return `${label} : ${cleanJenis}`;
  }
  return `${label} : ${cleanJenis} (${qty} pcs)`;
}

export function buildWhatsAppPreviewText(order: ComputedOrder): string {
  const lines: string[] = [];
  lines.push(`*${order.statusCustomer} - ${order.namaCustomer}*`);
  lines.push(`No. Invoice : ${order.belumInvoice ? 'BELUM BIKIN' : order.noInvoice}`);
  lines.push(`Kategori : ${CATEGORY_LABELS[order.kategori].toUpperCase()} (${order.qtyOrder} PCS)`);
  if (order.paket) {
    lines.push(`Paket : ${order.paket}`);
  }
  lines.push(`Tgl. Order : ${formatDateId(order.tglOrder)}`);
  lines.push(
    `Tgl. Layout : ${order.belumLayout ? 'BELUM LAYOUT' : formatDateId(order.tglMasukLayout)}`
  );
  lines.push(`Est. Selesai : ${formatDateId(order.tglEstimasiSelesai)}`);

  if (order.kategori === 'SETELAN') {
    lines.push('');
    lines.push('*[SPESIFIKASI ATASAN]*');
    lines.push(`Bahan Atasan : ${order.bahanAtasan || '-'}`);
    lines.push(`Model Kerah : ${order.kerah || '-'}`);
    lines.push(formatSpecLine('Logo Tim', order.jenisLogoTim, order.jmlLogoTim));
    lines.push(formatSpecLine('Logo Apparel', order.jenisLogoApparel, order.jmlLogoApparel));
    lines.push(
      formatSpecLine(
        'Sponsor Dpn/Blk',
        order.jenisSponsorDepanBelakang,
        order.jmlSponsorDepanBelakang
      )
    );
    lines.push(
      formatSpecLine('Sponsor Lengan', order.jenisSponsorLengan, order.jmlSponsorLengan)
    );
    lines.push(
      `Pecah Pola : ${order.pecahPola === 'ADA' ? `ADA (${order.jmlPecahPola} pcs)` : 'TIDAK'}`
    );
    lines.push(
      `Lis Piping : ${order.lisPiping === 'ADA' ? `ADA (${order.jmlLisPiping} pcs)` : 'TIDAK'}`
    );

    lines.push('');
    lines.push('*[SPESIFIKASI CELANA]*');
    lines.push(`Jenis Celana : ${order.jenisCelana || 'CELANA PENDEK'}`);
    lines.push(`Bahan Celana : ${order.bahanCelana || '-'}`);
    lines.push(
      formatSpecLine('Nomor (Celana)', order.jenisNomorCelana, order.jmlNomorCelana)
    );
    lines.push(
      formatSpecLine(
        'Logo Apparel (Celana)',
        order.jenisLogoApparelCelana,
        order.jmlLogoApparelCelana
      )
    );
    lines.push(
      formatSpecLine('Logo Tim (Celana)', order.jenisLogoTimCelana, order.jmlLogoTimCelana)
    );
    lines.push(
      `Pecah Pola (Celana) : ${order.pecahPolaCelana === 'ADA' ? `ADA (${order.jmlPecahPolaCelana} pcs)` : 'TIDAK'}`
    );
    lines.push(
      `Lis Piping (Celana) : ${order.lisPipingCelana === 'ADA' ? `ADA (${order.jmlLisPipingCelana} pcs)` : 'TIDAK'}`
    );
  } else if (order.kategori === 'ATASAN') {
    lines.push('');
    lines.push('*[SPESIFIKASI ATASAN]*');
    lines.push(`Bahan Atasan : ${order.bahanAtasan || '-'}`);
    lines.push(`Model Kerah : ${order.kerah || '-'}`);
    lines.push(formatSpecLine('Logo Tim', order.jenisLogoTim, order.jmlLogoTim));
    lines.push(formatSpecLine('Logo Apparel', order.jenisLogoApparel, order.jmlLogoApparel));
    lines.push(
      formatSpecLine(
        'Sponsor Dpn/Blk',
        order.jenisSponsorDepanBelakang,
        order.jmlSponsorDepanBelakang
      )
    );
    lines.push(
      formatSpecLine('Sponsor Lengan', order.jenisSponsorLengan, order.jmlSponsorLengan)
    );
    lines.push(
      `Pecah Pola : ${order.pecahPola === 'ADA' ? `ADA (${order.jmlPecahPola} pcs)` : 'TIDAK'}`
    );
    lines.push(
      `Lis Piping : ${order.lisPiping === 'ADA' ? `ADA (${order.jmlLisPiping} pcs)` : 'TIDAK'}`
    );
  } else if (order.kategori === 'CELANA') {
    lines.push('');
    lines.push('*[SPESIFIKASI CELANA]*');
    lines.push(`Jenis Celana : ${order.jenisCelana || 'CELANA PENDEK'}`);
    lines.push(`Bahan Celana : ${order.bahanCelana || '-'}`);
    lines.push(
      formatSpecLine('Nomor (Celana)', order.jenisNomorCelana, order.jmlNomorCelana)
    );
    lines.push(
      formatSpecLine(
        'Logo Apparel (Celana)',
        order.jenisLogoApparelCelana,
        order.jmlLogoApparelCelana
      )
    );
    lines.push(
      formatSpecLine('Logo Tim (Celana)', order.jenisLogoTimCelana, order.jmlLogoTimCelana)
    );
    lines.push(
      `Pecah Pola (Celana) : ${order.pecahPolaCelana === 'ADA' ? `ADA (${order.jmlPecahPolaCelana} pcs)` : 'TIDAK'}`
    );
    lines.push(
      `Lis Piping (Celana) : ${order.lisPipingCelana === 'ADA' ? `ADA (${order.jmlLisPipingCelana} pcs)` : 'TIDAK'}`
    );
  } else if (order.kategori === 'JAKET') {
    lines.push('');
    lines.push('*[SPESIFIKASI JAKET]*');
    lines.push(`Bahan Jaket : ${order.bahanJaket || '-'}`);
    lines.push(`Model Kerah : ${order.kerah || '-'}`);
    lines.push(formatSpecLine('Logo Jaket', order.jenisLogoJaket, order.jmlLogoJaket));
    lines.push(
      `Pecah Pola : ${order.pecahPola === 'ADA' ? `ADA (${order.jmlPecahPola} pcs)` : 'TIDAK'}`
    );
    lines.push(
      `Lis Piping : ${order.lisPiping === 'ADA' ? `ADA (${order.jmlLisPiping} pcs)` : 'TIDAK'}`
    );
  }

  if (order.keteranganRequest.trim()) {
    lines.push('');
    lines.push('*[REQUEST DESAIN]*');
    const sentences = order.keteranganRequest
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      lines.push(sentence);
    }
  }

  lines.push('');
  lines.push('MOHON DI CEK KEMBALI TERKAIT SPESIFIKASI DAN LAMPIRAN INVOICE, TERIMA KASIH 😊');

  return lines.join('\n');
}
