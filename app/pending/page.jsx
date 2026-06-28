'use client';
// app/pending/page.jsx
import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, Plus, Trash2, X, Search, AlertCircle, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format, parse } from 'date-fns';
import toast from 'react-hot-toast';

const toMonthLabel = (str) => {
  try { return format(parse(str, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return str; }
};

// add helper
const isActiveFlat = (f) => f?.status !== 'inactive';

// ── Add Pending Modal ────────────────────────────────────────
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

// ── Confirm Dialog ───────────────────────────────────────────
function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-start gap-4 p-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1a1a2e] text-base mb-1">Remove Pending Entry</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
          <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2 px-6 pb-5 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function PendingPage() {
  const { user } = useAuth();
  const { getFlats, getSettings, getPendingFlats, addPendingFlat, deletePendingFlat } = useFirestore();

  const [pendingList, setPendingList] = useState([]);
  const [flats, setFlats] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    if (!user) return;
    const [p, f, s] = await Promise.all([getPendingFlats(), getFlats(), getSettings()]);
    setPendingList(p);
    setFlats(f);
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const currency = settings?.currency || '₹';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingList;
    return pendingList.filter((p) =>
      p.flatNumber?.toLowerCase().includes(q) ||
      p.ownerName?.toLowerCase().includes(q) ||
      p.month?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
    );
  }, [pendingList, search]);

  const byFlat = useMemo(() => {
    const parseMonth = (str) => {
      try { return parse(str, 'MMMM yyyy', new Date()).getTime(); }
      catch { return 0; }
    };
    const map = new Map();
    filtered.forEach((p) => {
      if (!map.has(p.flatId)) {
        map.set(p.flatId, { flatNumber: p.flatNumber, ownerName: p.ownerName, entries: [], total: 0 });
      }
      map.get(p.flatId).entries.push(p);
      map.get(p.flatId).total += Number(p.amountDue || 0);
    });
    return Array.from(map.values())
      .map((flat) => ({
        ...flat,
        entries: [...flat.entries].sort((a, b) => parseMonth(a.month) - parseMonth(b.month)),
      }))
      .sort((a, b) =>
        (a.flatNumber || '').localeCompare(b.flatNumber || '', undefined, { numeric: true })
      );
  }, [filtered]);

  const grandTotal = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amountDue || 0), 0),
    [filtered]
  );

  const handleAdd = async (data) => {
    try {
      await addPendingFlat(data);
      toast.success('Added to pending list');
      setAddOpen(false);
      await load();
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deletePendingFlat(confirmId);
      toast.success('Removed from pending');
      await load();
    } catch {
      toast.error('Failed to remove');
    } finally {
      setConfirmId(null);
    }
  };

  const confirmEntry = pendingList.find((p) => p.id === confirmId);

  return (
    <ProtectedRoute>
      <Layout title="Pending">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-5xl space-y-6">

            <ConfirmDialog
              open={confirmId !== null}
              message={
                confirmEntry
                  ? `Remove pending entry for Flat ${confirmEntry.flatNumber} (${confirmEntry.ownerName}) — ${confirmEntry.month}? This cannot be undone.`
                  : 'This cannot be undone.'
              }
              onConfirm={handleDeleteConfirmed}
              onCancel={() => setConfirmId(null)}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2
                  className="text-2xl font-bold text-[#1a1a2e]"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  Pending Payments
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Track overdue &amp; upcoming maintenance dues
                </p>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#1a1a2e] text-[#e2b04a] rounded-xl hover:bg-[#2a2a3e] transition-colors self-start sm:self-auto"
              >
                <Plus size={15} /> Add Pending
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Total Due</p>
                <p className="text-2xl font-bold text-orange-600">
                  {currency}{grandTotal.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400 mt-1">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Flats Pending</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">{byFlat.length}</p>
                <p className="text-xs text-gray-400 mt-1">unique flats</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Avg Due / Flat</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">
                  {byFlat.length > 0
                    ? `${currency}${Math.round(grandTotal / byFlat.length).toLocaleString('en-IN')}`
                    : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">per flat</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by flat, owner, month…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none bg-white"
              />
            </div>

            {/* Content */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-green-400 opacity-60" />
                <p className="font-medium">
                  {search ? 'No entries match your search' : 'No pending entries'}
                </p>
                {!search && (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="text-[#b8861f] text-sm font-medium hover:underline mt-1 inline-block"
                  >
                    Add one →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {byFlat.map((flat) => (
                  <div key={flat.flatNumber} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Flat header */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-orange-50/60 border-b border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-orange-600 font-mono">
                            {flat.flatNumber}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1a1a2e]">{flat.ownerName}</p>
                          <p className="text-xs text-gray-400">Flat {flat.flatNumber} · {flat.entries.length} entr{flat.entries.length !== 1 ? 'ies' : 'y'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {currency}{flat.total.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-400">total due</p>
                      </div>
                    </div>

                    {/* Entries — mobile */}
                    <div className="divide-y divide-gray-50 md:hidden">
                      {flat.entries.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock size={14} className="text-orange-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1a1a2e]">{p.month}</p>
                              {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-orange-600">
                              {currency}{Number(p.amountDue || 0).toLocaleString('en-IN')}
                            </span>
                            <button
                              onClick={() => setConfirmId(p.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Entries — desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                          <tr>
                            <th className="text-left px-6 py-2.5">Month</th>
                            <th className="text-right px-6 py-2.5">Amount Due</th>
                            <th className="text-left px-6 py-2.5">Notes</th>
                            <th className="text-right px-6 py-2.5">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flat.entries.map((p) => (
                            <tr key={p.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <Clock size={13} className="text-orange-400 shrink-0" />
                                  <span className="font-medium text-[#1a1a2e]">{p.month}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-orange-600">
                                {currency}{Number(p.amountDue || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-3 text-gray-400 text-xs max-w-[200px] truncate">
                                {p.notes || '—'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button
                                  onClick={() => setConfirmId(p.id)}
                                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {addOpen && (
          <AddPendingModal
            flats={flats.filter(isActiveFlat)}
            onSave={handleAdd}
            onClose={() => setAddOpen(false)}
          />
        )}      </Layout>
    </ProtectedRoute>
  );
}