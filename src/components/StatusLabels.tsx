import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Columns2,
  HelpCircle,
  Layers,
  Shield,
  Shirt,
  XCircle,
} from 'lucide-react';
import { CATEGORY_STYLES } from '../constants/defaults';
import type {
  CustomerType,
  DesignStatus,
  OrderCategory,
  PaymentStatus,
  ScheduleStatus,
} from '../types';

export function CategoryIcon({
  category,
  className = 'h-3.5 w-3.5 shrink-0',
}: {
  category: OrderCategory;
  className?: string;
}) {
  switch (category) {
    case 'SETELAN':
      return <Layers className={className} />;
    case 'ATASAN':
      return <Shirt className={className} />;
    case 'CELANA':
      return <Columns2 className={className} />;
    case 'JAKET':
      return <Shield className={className} />;
  }
}

export function CategoryBadge({ category }: { category: OrderCategory }) {
  const style = CATEGORY_STYLES[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.badgeClass}`}
    >
      <CategoryIcon category={category} className="h-3.5 w-3.5 shrink-0" />
      {style.label}
    </span>
  );
}

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  switch (status) {
    case 'SELESAI':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          SELESAI
        </span>
      );
    case 'TERLAMBAT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          TERLAMBAT
        </span>
      );
    case 'PERINGATAN':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          PERINGATAN
        </span>
      );
    case 'SEGERA':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          SEGERA
        </span>
      );
    case 'LENGKAPI TANGGAL':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          LENGKAPI TGL
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ON TRACK
        </span>
      );
  }
}

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  if (type === 'UTAMA') {
    return (
      <span className="inline-block rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
        UTAMA
      </span>
    );
  }
  return (
    <span className="inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap">
      TAMBAHAN
    </span>
  );
}

export function DesignStatusText({ status }: { status: DesignStatus }) {
  const colorMap: Record<DesignStatus, string> = {
    'BELUM DESAIN': 'text-slate-600',
    'PROSES DESAIN': 'text-blue-700 font-medium',
    REVISI: 'text-amber-700 font-semibold',
    'DESAIN ACC': 'text-emerald-700 font-semibold',
  };
  return <span className={`text-xs whitespace-nowrap ${colorMap[status]}`}>{status}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'LUNAS') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        LUNAS
      </span>
    );
  }
  if (status === 'DP') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
        DP MASUK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap">
      BELUM DP
    </span>
  );
}
