'use client';
// app/reports/page.jsx
import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import {
  FileText, AlertCircle,
  Plus, Trash2, X, ChevronDown, CheckCircle2, Clock
} from 'lucide-react';
import { format, parse, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

// ── helpers ────────────────────────────────────────────────────
const toMonthLabel = (str) => {
  try { return format(parse(str, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return str; }
};

const isActiveFlat = (f) => f?.status !== 'inactive';

const toMonthKey = (date) =>
  date.toLocaleString('default', { month: 'long', year: 'numeric' });

const last12MonthKeys = () => {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    months.push(toMonthKey(subMonths(new Date(), i)));
  }
  return months;
};

const shortLabel = (monthKey) => {
  try {
    const d = parse(monthKey, 'MMMM yyyy', new Date());
    return format(d, "MMM ''yy");
  } catch { return monthKey.slice(0, 3); }
};

// Returns the "MMMM yyyy" label based on the receipt's actual paymentDate.
// Falls back to r.month if paymentDate is missing or unparseable.
const paymentMonthLabel = (receipt) => {
  try {
    if (!receipt.paymentDate) return receipt.month;
    return format(parse(receipt.paymentDate, 'yyyy-MM-dd', new Date()), 'MMMM yyyy');
  } catch {
    return receipt.month;
  }
};

// April 2026 is the earliest month to check unpaid flats from
const UNPAID_CHECK_START = parse('April 2026', 'MMMM yyyy', new Date());

const isMonthOnOrAfterStart = (monthLabel) => {
  try {
    const d = parse(monthLabel, 'MMMM yyyy', new Date());
    return d >= UNPAID_CHECK_START;
  } catch { return false; }
};

// ── Add Pending Modal ─────────────────────────────────────────
function AddPendingModal({ flats, onSave, onClose }) {
  const currentMonthInput = format(new Date(), 'yyyy-MM');
  const [flatId, setFlatId] = useState('');
  const [month, setMonth] = useState(currentMonthInput);
  const [amountDue, setAmountDue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flatId || !month || !amountDue) {
      toast.error('Flat, month and amount are required');
      return;
    }
    const flat = flats.find((f) => f.id === flatId);
    setSaving(true);
    await onSave({
      flatId,
      flatNumber: flat?.flatNumber || '',
      ownerName: flat?.ownerName || '',
      month: toMonthLabel(month),
      amountDue: Number(amountDue),
      notes,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#1a1a2e]">Add Pending Entry</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Flat *</label>
            <select
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
            >
              <option value="">Select flat…</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flatNumber} — {f.ownerName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Month *</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Amount Due *</label>
              <input
                type="number"
                min="0"
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
                placeholder="1500"
                required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note…"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-[#1a1a2e] text-[#e2b04a] font-medium hover:bg-[#2a2a3e] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add Pending'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────
function TrendChart({ data, currency, onSelect }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
          12-Month Collection Trend
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Click a bar to view that month's details</p>
      </div>
      <div className="px-6 py-5">
        <div className="flex items-end gap-1.5 h-40">
          {data.map((d, i) => {
            const pct = max > 0 ? (d.amount / max) * 100 : 0;
            const isSelected = d.isSelected;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                onClick={() => onSelect(d.monthInput)}
              >
                <div className="relative w-full flex flex-col justify-end" style={{ height: '120px' }}>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                    <div className="bg-[#1a1a2e] text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                      <p className="font-semibold">{currency}{d.amount.toLocaleString('en-IN')}</p>
                      <p className="text-[#e2b04a] text-[9px]">{d.label}</p>
                    </div>
                    <div className="w-1.5 h-1.5 bg-[#1a1a2e] rotate-45 -mt-0.5" />
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${d.isSelected
                      ? 'bg-[#e2b04a]'
                      : d.amount > 0
                        ? 'bg-[#1a1a2e]/20 group-hover:bg-[#1a1a2e]/40'
                        : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}
                    style={{ height: `${Math.max(pct, d.amount > 0 ? 4 : 2)}%` }}
                  />
                </div>
                <span
                  className={`text-[9px] font-medium transition-colors ${isSelected ? 'text-[#b8861f]' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                >
                  {d.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuth();
  const {
    getAllReceipts,
    getFlats,
    getSettings,
    getPendingFlats,
    addPendingFlat,
    deletePendingFlat,
  } = useFirestore();

  const currentMonthInput = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInput);
  const [receipts, setReceipts] = useState([]);
  const [flats, setFlats] = useState([]);
  const [settings, setSettings] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [r, f, s, p] = await Promise.all([
      getAllReceipts(),
      getFlats(),
      getSettings(),
      getPendingFlats(),
    ]);
    setReceipts(r);
    setFlats(f);
    setSettings(s);
    setPendingList(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const currency = settings?.currency || '₹';
  const selectedMonthLabel = toMonthLabel(selectedMonth);

  // ── Active flats only (vacated/inactive flats never count toward pending/reports) ──
  const activeFlats = useMemo(() => flats.filter(isActiveFlat), [flats]);

  // ── Month receipts (by PAYMENT DATE) ─────────────────────
  // Used for: receipt list display, total collected, flats paid count, chart
  const monthReceipts = useMemo(
    () => receipts.filter((r) => paymentMonthLabel(r) === selectedMonthLabel),
    [receipts, selectedMonthLabel]
  );

  // ── Billing month paid flat IDs (by BILLING MONTH) ───────
  // Used for: unpaid flat detection — did this flat settle their dues for this billing cycle?
  const billingMonthPaidFlatIds = useMemo(
    () => new Set(receipts.filter((r) => r.month === selectedMonthLabel).map((r) => r.flatId)),
    [receipts, selectedMonthLabel]
  );

  // Group receipts by flat (payment-date based), sorted by paymentDate ascending
  const receiptsByFlat = useMemo(() => {
    const map = new Map();
    monthReceipts.forEach((r) => {
      if (!map.has(r.flatId)) {
        map.set(r.flatId, {
          flatNumber: r.flatNumber,
          ownerName: r.ownerName,
          receiptNumber: r.receiptNumber,
          modeOfPayment: r.modeOfPayment,
          paymentDate: r.paymentDate,
          total: 0,
        });
      }
      map.get(r.flatId).total += Number(r.paidAmount || 0);
    });
    return Array.from(map.values()).sort((a, b) => {
      const da = a.paymentDate || '';
      const db = b.paymentDate || '';
      if (da < db) return -1;
      if (da > db) return 1;
      // secondary: flat number if same date
      return (a.flatNumber || '').localeCompare(b.flatNumber || '', undefined, { numeric: true });
    });
  }, [monthReceipts]);

  const totalCollected = useMemo(
    () => monthReceipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0),
    [monthReceipts]
  );

  const collectionPct = activeFlats.length > 0
    ? Math.round((receiptsByFlat.length / activeFlats.length) * 100)
    : 0;

  // ── Recorded pending for selected month ───────────────────
  const monthPending = useMemo(
    () => pendingList.filter((p) => p.month === selectedMonthLabel),
    [pendingList, selectedMonthLabel]
  );

  const totalDue = useMemo(
    () => monthPending.reduce((s, p) => s + Number(p.amountDue || 0), 0),
    [monthPending]
  );

  // ── Flats with no receipt AND no pending entry this month ─
  // Uses BILLING MONTH to check if a flat has paid for that period.
  // Only shown for April 2026 onwards. Active flats only.
  const unpaidFlats = useMemo(() => {
    if (!isMonthOnOrAfterStart(selectedMonthLabel)) return [];
    const pendingFlatIds = new Set(monthPending.map((p) => p.flatId));
    return activeFlats
      .filter((f) => !billingMonthPaidFlatIds.has(f.id) && !pendingFlatIds.has(f.id))
      .sort((a, b) =>
        (a.flatNumber || '').localeCompare(b.flatNumber || '', undefined, { numeric: true })
      );
  }, [activeFlats, billingMonthPaidFlatIds, monthPending, selectedMonthLabel]);

  // ── Trend data (12 months, grouped by PAYMENT DATE) ──────
  const trendData = useMemo(() => {
    const keys = last12MonthKeys();
    return keys.map((key) => {
      const amount = receipts
        .filter((r) => paymentMonthLabel(r) === key)
        .reduce((s, r) => s + Number(r.paidAmount || 0), 0);
      return {
        label: key,
        shortLabel: shortLabel(key),
        monthInput: format(parse(key, 'MMMM yyyy', new Date()), 'yyyy-MM'),
        amount,
        isSelected: key === selectedMonthLabel,
      };
    });
  }, [receipts, selectedMonthLabel]);

  // ── Handlers ──────────────────────────────────────────────
  const handleAddPending = async (data) => {
    try {
      await addPendingFlat(data);
      toast.success('Added to pending list');
      setAddOpen(false);
      await load();
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleDeletePending = async (pendingId) => {
    try {
      await deletePendingFlat(pendingId);
      toast.success('Removed from pending');
      await load();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const formatDate = (str) => {
    if (!str) return '—';
    try { return format(parse(str, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy'); }
    catch { return str; }
  };

  const showUnpaidSection = isMonthOnOrAfterStart(selectedMonthLabel);
  const allClear = monthPending.length === 0 && unpaidFlats.length === 0;

  // ─────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <Layout title="Reports">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-5xl space-y-6">

            {/* ── Header + Month Picker ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2
                  className="text-2xl font-bold text-[#1a1a2e]"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  Reports
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Month-wise collection &amp; pending overview
                </p>
              </div>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-[#1a1a2e] focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none bg-white shadow-sm appearance-none cursor-pointer"
                />
                <ChevronDown
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Collected</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">
                  {currency}{totalCollected.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400 mt-1">{selectedMonthLabel}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Flats Paid</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">
                  {receiptsByFlat.length}
                  <span className="text-base text-gray-300">/{activeFlats.length}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{collectionPct}% collected</p>
              </div>

              <div
                className={`rounded-2xl border shadow-sm p-5 ${monthPending.length > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'
                  }`}
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pending</p>
                <p className={`text-2xl font-bold ${monthPending.length > 0 ? 'text-orange-600' : 'text-[#1a1a2e]'}`}>
                  {monthPending.length}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {monthPending.length === 0
                    ? 'None recorded'
                    : `${currency}${totalDue.toLocaleString('en-IN')} due`}
                </p>
              </div>

              <div
                className={`rounded-2xl border shadow-sm p-5 ${showUnpaidSection && unpaidFlats.length > 0
                  ? 'bg-red-50 border-red-100'
                  : 'bg-white border-gray-100'
                  }`}
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Not Paid</p>
                <p className={`text-2xl font-bold ${showUnpaidSection && unpaidFlats.length > 0 ? 'text-red-500' : 'text-[#1a1a2e]'
                  }`}>
                  {showUnpaidSection ? unpaidFlats.length : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {showUnpaidSection
                    ? unpaidFlats.length === 0
                      ? 'All accounted for'
                      : `flat${unpaidFlats.length !== 1 ? 's' : ''} unaccounted`
                    : 'from Apr 2026'}
                </p>
              </div>
            </div>

            {/* ── Trend Chart ── */}
            <TrendChart
              data={trendData}
              currency={currency}
              onSelect={(monthInput) => setSelectedMonth(monthInput)}
            />

            {/* ── Receipt List ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3
                    className="font-semibold text-[#1a1a2e]"
                    style={{ fontFamily: 'Playfair Display, serif' }}
                  >
                    Receipts — {selectedMonthLabel}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {receiptsByFlat.length} flat{receiptsByFlat.length !== 1 ? 's' : ''} paid
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-500">{collectionPct}% collected</span>
                </div>
              </div>

              {receiptsByFlat.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No receipts for {selectedMonthLabel}</p>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="md:hidden divide-y divide-gray-50">
                    {receiptsByFlat.map((r, i) => (
                      <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-[#fdf0d5] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-[#b8861f] font-mono">
                              {r.flatNumber}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1a1a2e] truncate">{r.ownerName}</p>
                            <p className="text-xs text-gray-400">
                              {r.modeOfPayment} · {formatDate(r.paymentDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[#1a1a2e]">
                            {currency}{r.total.toLocaleString('en-IN')}
                          </p>
                          {r.receiptNumber && (
                            <p className="text-[10px] text-gray-400 font-mono">#{r.receiptNumber}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                      <span className="text-sm font-bold text-[#1a1a2e]">
                        {currency}{totalCollected.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                        <tr>
                          <th className="text-left px-6 py-3">Flat</th>
                          <th className="text-left px-6 py-3">Owner</th>
                          <th className="text-left px-6 py-3">Receipt No</th>
                          <th className="text-left px-6 py-3">Mode</th>
                          <th className="text-left px-6 py-3">Date</th>
                          <th className="text-right px-6 py-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptsByFlat.map((r, i) => (
                          <tr
                            key={i}
                            className="border-t border-gray-50 hover:bg-[#fdf6ec]/40 transition-colors"
                          >
                            <td className="px-6 py-3 font-mono text-xs font-bold text-[#b8861f]">
                              {r.flatNumber}
                            </td>
                            <td className="px-6 py-3 font-medium text-[#1a1a2e]">{r.ownerName}</td>
                            <td className="px-6 py-3 font-mono text-xs text-gray-400">
                              {r.receiptNumber || '—'}
                            </td>
                            <td className="px-6 py-3 text-gray-500 capitalize">{r.modeOfPayment}</td>
                            <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(r.paymentDate)}</td>
                            <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                              {currency}{r.total.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-100 bg-gray-50">
                          <td
                            colSpan={5}
                            className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            Total Collected
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-[#1a1a2e]">
                            {currency}{totalCollected.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* ── Pending & Unpaid Section ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3
                    className="font-semibold text-[#1a1a2e]"
                    style={{ fontFamily: 'Playfair Display, serif' }}
                  >
                    Pending — {selectedMonthLabel}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {allClear
                      ? showUnpaidSection
                        ? 'All flats accounted for'
                        : 'No pending entries'
                      : [
                        monthPending.length > 0 &&
                        `${monthPending.length} recorded · ${currency}${totalDue.toLocaleString('en-IN')} due`,
                        unpaidFlats.length > 0 &&
                        `${unpaidFlats.length} unaccounted`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-[#1a1a2e] text-[#e2b04a] rounded-xl hover:bg-[#2a2a3e] transition-colors"
                >
                  <Plus size={15} /> Add Pending
                </button>
              </div>

              {/* Recorded pending entries */}
              {monthPending.length > 0 && (
                <>
                  <div className="px-6 py-2 bg-orange-50/60 border-b border-orange-100">
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                      Recorded Pending · {currency}{totalDue.toLocaleString('en-IN')} due
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {monthPending.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-orange-50/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Clock size={14} className="text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1a1a2e]">
                              {p.flatNumber} — {p.ownerName}
                            </p>
                            {p.notes && (
                              <p className="text-xs text-gray-400 truncate">{p.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-orange-600">
                            {currency}{Number(p.amountDue || 0).toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => handleDeletePending(p.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from pending"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="px-6 py-3 bg-orange-50/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total Due
                      </span>
                      <span className="text-sm font-bold text-orange-600">
                        {currency}{totalDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Flats with no receipt and no pending entry — only from Apr 2026 */}
              {showUnpaidSection && unpaidFlats.length > 0 && (
                <>
                  <div className={`px-6 py-2 border-b border-red-100 bg-red-50/60 ${monthPending.length > 0 ? 'border-t border-gray-100' : ''}`}>
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                      No Receipt &amp; Not in Pending · {unpaidFlats.length} flat{unpaidFlats.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {unpaidFlats.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-red-50/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-red-50 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-red-400 font-mono">
                              {f.flatNumber}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1a1a2e]">{f.ownerName}</p>
                            <p className="text-xs text-gray-400">
                              Flat {f.flatNumber}
                              {f.type ? ` · ${f.type}` : ''}
                              {f.floor ? ` · Floor ${f.floor}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-red-400 font-medium italic shrink-0">
                          Unaccounted
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* All clear state */}
              {allClear && (
                <div className="py-12 text-center text-gray-400">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-green-400 opacity-60" />
                  <p className="text-sm">
                    {showUnpaidSection
                      ? `All flats accounted for in ${selectedMonthLabel}`
                      : `No pending entries for ${selectedMonthLabel}`}
                  </p>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="text-[#b8861f] text-sm font-medium hover:underline mt-1 inline-block"
                  >
                    Add pending anyway →
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {addOpen && (
          <AddPendingModal
            flats={activeFlats}
            onSave={handleAddPending}
            onClose={() => setAddOpen(false)}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}