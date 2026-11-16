import { ChevronLeft, ChevronRight, Edit3, Plus, StickyNote, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { CATEGORY_LABELS, CATEGORY_STYLES, formatDateId, formatDateLongId, getTodayDateKey } from '../constants/defaults';
import type { CalendarNote, CalendarNoteCategory, ComputedOrder, UserProfile } from '../types';
import { CategoryBadge, ScheduleStatusBadge } from './StatusLabels';

interface KalenderViewProps {
  orders: ComputedOrder[];
  notes: CalendarNote[];
  userProfile: UserProfile;
  onCreateNote: (input: {
    dateKey: string;
    title: string;
    content: string;
    category: CalendarNoteCategory;
    authorUid: string;
    authorName: string;
  }) => Promise<string>;
  onUpdateNote: (
    noteId: string,
    input: { dateKey: string; title: string; content: string; category: CalendarNoteCategory }
  ) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onEditOrder: (order: ComputedOrder) => void;
}

const MONTH_NAMES = [
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

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function KalenderView({
  orders,
  notes,
  userProfile,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onEditOrder,
}: KalenderViewProps) {
  const todayKey = getTodayDateKey();
  const [todayY, todayM] = todayKey.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState(todayY);
  const [currentMonth, setCurrentMonth] = useState(todayM - 1);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [showLayer, setShowLayer] = useState<'ALL' | 'DEADLINE' | 'WARNING' | 'NOTES'>('ALL');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<CalendarNoteCategory>('catatan');
  const [savingNote, setSavingNote] = useState(false);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ dateKey: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateKey: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ dateKey: toDateKey(currentYear, currentMonth, d), dayNum: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateKey: null, dayNum: null });
    }
    return cells;
  }, [currentYear, currentMonth]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, ComputedOrder[]>();
    for (const o of orders) {
      if (!o.tglEstimasiSelesai) continue;
      const list = map.get(o.tglEstimasiSelesai) || [];
      list.push(o);
      map.set(o.tglEstimasiSelesai, list);
    }
    return map;
  }, [orders]);

  const warningsByDate = useMemo(() => {
    const map = new Map<string, ComputedOrder[]>();
    for (const o of orders) {
      if (!o.peringatanDateKey || o.statusProduksi === 'SUDAH SELESAI') continue;
      const list = map.get(o.peringatanDateKey) || [];
      list.push(o);
      map.set(o.peringatanDateKey, list);
    }
    return map;
  }, [orders]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, CalendarNote[]>();
    for (const n of notes) {
      const list = map.get(n.dateKey) || [];
      list.push(n);
      map.set(n.dateKey, list);
    }
    return map;
  }, [notes]);

  const selectedDeadlines = deadlinesByDate.get(selectedDateKey) || [];
  const selectedWarnings = warningsByDate.get(selectedDateKey) || [];
  const selectedNotes = notesByDate.get(selectedDateKey) || [];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(todayY);
    setCurrentMonth(todayM - 1);
    setSelectedDateKey(todayKey);
  };

  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      if (editingNoteId) {
        await onUpdateNote(editingNoteId, {
          dateKey: selectedDateKey,
          title: noteTitle,
          content: noteContent,
          category: noteCategory,
        });
      } else {
        await onCreateNote({
          dateKey: selectedDateKey,
          title: noteTitle,
          content: noteContent,
          category: noteCategory,
          authorUid: userProfile.uid,
          authorName: userProfile.displayName || userProfile.email,
        });
      }
      setEditingNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteCategory('catatan');
    } finally {
      setSavingNote(false);
    }
  };

  const startEditNote = (note: CalendarNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('catatan');
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Calendar Grid Column */}
      <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="ml-2 inline-flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Bulan sebelumnya"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={jumpToToday}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Bulan berikutnya"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'DEADLINE', label: 'Target Selesai' },
                { id: 'WARNING', label: 'Cek H+13' },
                { id: 'NOTES', label: 'Catatan' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setShowLayer(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  showLayer === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-semibold text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell, idx) => {
            if (!cell.dateKey || !cell.dayNum) {
              return <div key={`empty-${idx}`} className="min-h-[92px] rounded-lg bg-slate-50/50" />;
            }

            const dateKey = cell.dateKey;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDateKey;
            const deadlines =
              showLayer === 'ALL' || showLayer === 'DEADLINE'
                ? deadlinesByDate.get(dateKey) || []
                : [];
            const warnings =
              showLayer === 'ALL' || showLayer === 'WARNING'
                ? warningsByDate.get(dateKey) || []
                : [];
            const dayNotes =
              showLayer === 'ALL' || showLayer === 'NOTES' ? notesByDate.get(dateKey) || [] : [];

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  setSelectedDateKey(dateKey);
                  cancelEditNote();
                }}
                className={`min-h-[96px] flex flex-col items-start rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40'
                    : isToday
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums ${
                      isToday
                        ? 'rounded bg-slate-900 px-1.5 py-0.5 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {dayNotes.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700">
                      <StickyNote className="h-3 w-3" />
                      {dayNotes.length}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 w-full space-y-1 overflow-hidden">
                  {deadlines.slice(0, 2).map((o) => (
                    <div
                      key={`dl-${o.id}`}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        o.statusProduksi === 'SUDAH SELESAI'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.statusJadwal === 'TERLAMBAT'
                            ? 'bg-red-100 text-red-800'
                            : CATEGORY_STYLES[o.kategori].calendarChipClass
                      }`}
                    >
                      {CATEGORY_LABELS[o.kategori]} · {o.namaCustomer}
                    </div>
                  ))}
                  {warnings.slice(0, 1).map((o) => (
                    <div
                      key={`wr-${o.id}`}
                      className="truncate rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                    >
                      Cek H+13: {o.namaCustomer}
                    </div>
                  ))}
                  {deadlines.length + warnings.length > 3 && (
                    <div className="text-[10px] font-medium text-slate-500">
                      +{deadlines.length + warnings.length - 3} lainnya
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right-Hand Day Inspector & Notes Panel */}
      <div className="xl:col-span-4 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Detail Tanggal Dipilih</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {formatDateLongId(selectedDateKey)}
          </h3>
          <p className="font-mono text-xs text-slate-500">{formatDateId(selectedDateKey)}</p>

          {/* Orders Due Today */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold text-slate-700">
              Target Selesai Produksi ({selectedDeadlines.length})
            </h4>
            {selectedDeadlines.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Tidak ada jadwal selesai produksi pada tanggal ini.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {selectedDeadlines.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onEditOrder(o)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CategoryBadge category={o.kategori} />
                      <ScheduleStatusBadge status={o.statusJadwal} />
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-900">{o.namaCustomer}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {o.qtyOrder} pcs · {o.statusProduksi} · {o.noInvoice}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* H+13 Warning Checks */}
          {selectedWarnings.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold text-amber-800">
                Cek Keterlambatan Awal ({selectedWarnings.length})
              </h4>
              <div className="mt-2 space-y-2">
                {selectedWarnings.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onEditOrder(o)}
                    className="w-full rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-left hover:bg-amber-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-900">{o.namaCustomer}</span>
                      <CategoryBadge category={o.kategori} />
                    </div>
                    <p className="mt-1 text-[11px] text-amber-800">
                      Masuk layout {formatDateId(o.tglMasukLayout)} · Status: {o.statusProduksi}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Notes Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-900">
            Catatan Produksi ({selectedNotes.length})
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Simpan pengingat lembur, antrean mesin, atau catatan bahan pada tanggal ini.
          </p>

          {selectedNotes.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {selectedNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          n.category === 'prioritas'
                            ? 'bg-amber-100 text-amber-800'
                            : n.category === 'libur'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {n.category}
                      </span>
                      <p className="mt-1 font-semibold text-slate-900">{n.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditNote(n)}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-800 cursor-pointer"
                        title="Edit catatan"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600 cursor-pointer"
                        title="Hapus catatan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {n.content && (
                    <p className="mt-1.5 whitespace-pre-line text-slate-600">{n.content}</p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">Oleh {n.authorName}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSaveNote} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-800">
              {editingNoteId ? 'Edit Catatan' : 'Tambah Catatan Baru'}
            </p>
            <div>
              <input
                type="text"
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Judul catatan (mis. Prioritas Jahit Tim A)..."
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as CalendarNoteCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="catatan">Catatan Umum</option>
                <option value="prioritas">Prioritas Produksi</option>
                <option value="libur">Libur / Maintenance Mesin</option>
              </select>
            </div>
            <div>
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Detail catatan untuk tanggal ini..."
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingNote}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {savingNote ? 'Menyimpan...' : editingNoteId ? 'Simpan Perubahan' : 'Simpan Catatan'}
              </button>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={cancelEditNote}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
