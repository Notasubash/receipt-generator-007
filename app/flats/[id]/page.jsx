'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { useFirestore } from '../../../hooks/useFirestore';
import { downloadReceiptPDF } from '../../../lib/pdf';
import toast from 'react-hot-toast';
import { format, parse } from 'date-fns';
import {
  ArrowLeft, Pencil, FileText,
  Download, Trash2, Plus, IndianRupee, X, AlertTriangle, Clock
} from 'lucide-react';

const formatDate = (str) => {
  if (!str) return '—';
  try { return format(parse(str, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy'); }
  catch { return str; }
};

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Commercial'];
const MODES = ['Cash', 'Bank Transfer'];

const toMonthInput = (str) => {
  if (!str) return '';
  try { return format(parse(str, 'MMMM yyyy', new Date()), 'yyyy-MM'); }
  catch { return ''; }
};

const fromMonthInput = (str) => {
  if (!str) return '';
  try { return format(parse(str, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return ''; }
};

const toMonthLabel = (str) => {
  try { return format(parse(str, 'yyyy-MM', new Date()), 'MMMM yyyy'); }
  catch { return str; }
};

function groupByReceiptNumber(receipts) {
  const map = new Map();
  (receipts ?? []).forEach((r) => {
    const key = r.receiptNumber || r.id;
    if (!map.has(key)) {
      map.set(key, {
        receiptNumber: r.receiptNumber,
        modeOfPayment: r.modeOfPayment,
        paymentDate: r.paymentDate,
        remarks: r.remarks,
        months: [],
        totalAmount: 0,
        ids: [],
        rows: [],
      });
    }
    const g = map.get(key);
    if (r.month && !g.months.includes(r.month)) g.months.push(r.month);
    g.totalAmount += Number(r.paidAmount || 0);
    g.ids.push(r.id);
    g.rows.push(r);
  });
  return Array.from(map.values());
}

function MonthBadges({ months }) {
  if (!months || months.length === 0) return <span className="text-gray-400">—</span>;
  if (months.length === 1) return <span>{months[0]}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {months.map((m) => (
        <span key={m} className="inline-block px-2 py-0.5 rounded-md bg-[#fdf0d5] text-[#b8861f] text-xs font-medium">
          {m}
        </span>
      ))}
    </div>
  );
}

function ConfirmDialog({ open, title = 'Confirm Delete', message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-start gap-4 p-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1a1a2e] text-base mb-1">{title}</h3>
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditReceiptModal({ group, currency, onSave, onClose }) {
  const [rows, setRows]     = useState(group.rows.map((r) => ({ ...r })));
  const [saving, setSaving] = useState(false);

  const setRow = (index, key, value) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const r of rows) {
      if (!r.month || !r.paidAmount) {
        toast.error('Month and amount are required for all entries');
        return;
      }
    }
    setSaving(true);
    await onSave(rows);
    setSaving(false);
  };

  const isMulti = rows.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-semibold text-[#1a1a2e]">Edit Receipt</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              #{group.receiptNumber}
              {isMulti && <span className="ml-1 text-[#b8861f]">· {rows.length} months</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-5">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className={isMulti ? 'pb-5 border-b border-gray-100 last:border-0 last:pb-0 space-y-3' : 'space-y-3'}
              >
                {isMulti && (
                  <p className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Entry {i + 1}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Month *</label>
                    <input
                      type="month"
                      value={toMonthInput(row.month)}
                      onChange={(e) => setRow(i, 'month', fromMonthInput(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Amount ({currency}) *</label>
                    <input
                      type="number"
                      value={row.paidAmount || ''}
                      onChange={(e) => setRow(i, 'paidAmount', e.target.value)}
                      min="0"
                      placeholder="1500"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Mode</label>
                    <select
                      value={row.modeOfPayment || 'Cash'}
                      onChange={(e) => setRow(i, 'modeOfPayment', e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                    >
                      {MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Payment Date</label>
                    <input
                      type="date"
                      value={row.paymentDate || ''}
                      onChange={(e) => setRow(i, 'paymentDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Remarks</label>
                  <input
                    value={row.remarks || ''}
                    onChange={(e) => setRow(i, 'remarks', e.target.value)}
                    placeholder="Optional note..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-[#1a1a2e] text-[#e2b04a] font-medium hover:bg-[#2a2a3e] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Update Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Pending Modal (flat-scoped) ──────────────────────────
function AddPendingModal({ flat, onSave, onClose }) {
  const currentMonthInput = format(new Date(), 'yyyy-MM');
  const [month, setMonth]         = useState(currentMonthInput);
  const [amountDue, setAmountDue] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!month || !amountDue) { toast.error('Month and amount are required'); return; }
    setSaving(true);
    await onSave({
      flatId:    flat.id,
      flatNumber: flat.flatNumber,
      ownerName:  flat.ownerName,
      month:      toMonthLabel(month),
      amountDue:  Number(amountDue),
      notes,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-[#1a1a2e]">Add Pending Entry</h3>
            <p className="text-xs text-gray-400 mt-0.5">Flat {flat.flatNumber} · {flat.ownerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-[#1a1a2e] text-[#e2b04a] font-medium hover:bg-[#2a2a3e] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Pending'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FlatDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    getFlat, updateFlat, deleteFlat,
    getAllReceiptsByFlat, deleteReceipt, updateReceipt,
    getPendingFlats, addPendingFlat, deletePendingFlat,
    getSettings,
  } = useFirestore();

  const [flat, setFlat]               = useState(null);
  const [receipts, setReceipts]       = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [settings, setSettings]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editOpen, setEditOpen]       = useState(false);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [editGroup, setEditGroup]     = useState(null);
  const [addPendingOpen, setAddPendingOpen] = useState(false);

  // Confirm dialogs
  const [confirmFlat, setConfirmFlat]       = useState(false);
  const [confirmGroup, setConfirmGroup]     = useState(null);
  const [confirmPendingId, setConfirmPendingId] = useState(null);

  const load = async () => {
    const [f, r, s, allPending] = await Promise.all([
      getFlat(id),
      getAllReceiptsByFlat(id),
      getSettings(),
      getPendingFlats(),
    ]);
    setFlat(f);
    setReceipts(r ?? []);
    setSettings(s);
    // Filter pending to only this flat
setPendingList(
  (allPending ?? [])
    .filter((p) => p.flatId === id)
    .sort((a, b) => {
      const parseMonth = (str) => {
        try { return parse(str, 'MMMM yyyy', new Date()).getTime(); }
        catch { return 0; }
      };
      return parseMonth(a.month) - parseMonth(b.month);
    })
);    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => { setForm(flat); setEditOpen(true); };
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFlat(id, form);
      toast.success('Flat updated');
      setEditOpen(false);
      await load();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlatConfirmed = async () => {
    try {
      await deleteFlat(id);
      toast.success('Flat deleted');
      router.replace('/flats');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmFlat(false);
    }
  };

  const handleDeleteGroupConfirmed = async () => {
    try {
      await Promise.all(confirmGroup.ids.map((rid) => deleteReceipt(rid)));
      toast.success('Receipt deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmGroup(null);
    }
  };

  const handleEditSave = async (rows) => {
    try {
      await Promise.all(rows.map((r) => updateReceipt(r.id, r)));
      toast.success('Receipt updated');
      setEditGroup(null);
      await load();
    } catch {
      toast.error('Failed to update receipt');
    }
  };

  const handleAddPending = async (data) => {
    try {
      await addPendingFlat(data);
      toast.success('Pending entry added');
      setAddPendingOpen(false);
      await load();
    } catch {
      toast.error('Failed to add pending');
    }
  };

  const handleDeletePendingConfirmed = async () => {
    try {
      await deletePendingFlat(confirmPendingId);
      toast.success('Pending entry removed');
      await load();
    } catch {
      toast.error('Failed to remove');
    } finally {
      setConfirmPendingId(null);
    }
  };

  const downloadGroup = (group) => {
    downloadReceiptPDF(settings || {}, flat, group.rows,
      `receipt_${flat.flatNumber}_${group.receiptNumber}.pdf`);
  };

  const downloadAll = () => {
    if (!receipts.length) return;
    downloadReceiptPDF(settings || {}, flat, [...receipts].reverse(),
      `all_receipts_${flat.flatNumber}.pdf`);
  };

  const currency    = settings?.currency || '₹';
  const total       = receipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
  const totalPending = pendingList.reduce((s, p) => s + Number(p.amountDue || 0), 0);
  const groups      = groupByReceiptNumber(receipts);

  const confirmPendingEntry = pendingList.find((p) => p.id === confirmPendingId);

  if (loading) {
    return (
      <ProtectedRoute><Layout title="Flat Details">
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout></ProtectedRoute>
    );
  }

  if (!flat) {
    return (
      <ProtectedRoute><Layout title="Flat Not Found">
        <div className="text-center py-20">
          <p className="text-gray-400">Flat not found.</p>
          <Link href="/flats" className="text-[#b8861f] hover:underline text-sm mt-2 inline-block">← Back to Flats</Link>
        </div>
      </Layout></ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout title={`Flat ${flat.flatNumber}`}>
        <div className="max-w-4xl space-y-4 sm:space-y-6">

          <Link href="/flats" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#b8861f] transition-colors">
            <ArrowLeft size={16} /> All Flats
          </Link>

          {/* Confirm: Delete Flat */}
          <ConfirmDialog
            open={confirmFlat}
            title="Delete Flat"
            message="Delete this flat and all its data? This cannot be undone."
            onConfirm={handleDeleteFlatConfirmed}
            onCancel={() => setConfirmFlat(false)}
          />

          {/* Confirm: Delete Receipt Group */}
          <ConfirmDialog
            open={confirmGroup !== null}
            title="Delete Receipt"
            message={
              confirmGroup?.ids.length > 1
                ? `This will delete all ${confirmGroup.ids.length} month entries under receipt #${confirmGroup.receiptNumber}. This cannot be undone.`
                : 'This action cannot be undone. Are you sure you want to delete this receipt?'
            }
            onConfirm={handleDeleteGroupConfirmed}
            onCancel={() => setConfirmGroup(null)}
          />

          {/* Confirm: Delete Pending Entry */}
          <ConfirmDialog
            open={confirmPendingId !== null}
            title="Remove Pending Entry"
            message={
              confirmPendingEntry
                ? `Remove pending entry for ${confirmPendingEntry.month}? This cannot be undone.`
                : 'This cannot be undone.'
            }
            onConfirm={handleDeletePendingConfirmed}
            onCancel={() => setConfirmPendingId(null)}
          />

          {editGroup && (
            <EditReceiptModal
              group={editGroup}
              currency={currency}
              onSave={handleEditSave}
              onClose={() => setEditGroup(null)}
            />
          )}

          {addPendingOpen && flat && (
            <AddPendingModal
              flat={flat}
              onSave={handleAddPending}
              onClose={() => setAddPendingOpen(false)}
            />
          )}

          {/* ── Flat info card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#1a1a2e] px-4 sm:px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-[#e2b04a] rounded-xl flex items-center justify-center">
                    <span className="text-[#1a1a2e] font-bold text-xs sm:text-sm font-mono text-center leading-tight px-1">
                      {flat.flatNumber}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-white text-lg sm:text-xl font-semibold truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {flat.ownerName}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {flat.type && <Badge color="gray">{flat.type}</Badge>}
                      <Badge color={flat.ownershipType === 'owner' ? 'gold' : 'blue'}>
                        {flat.ownershipType === 'owner' ? 'Owner' : 'Tenant'}
                      </Badge>
                      {flat.floor && <Badge color="gray">Floor {flat.floor}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={openEdit} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmFlat(true)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="px-4 sm:px-6 py-4 flex flex-wrap gap-4 sm:gap-6 border-b border-gray-50">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <IndianRupee size={14} className="text-gray-400" />
                <span>Total Paid:</span>
                <span className="font-semibold text-[#1a1a2e]">{currency}{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <FileText size={14} className="text-gray-400" />
                <span>
                  {groups.length} receipt{groups.length !== 1 ? 's' : ''}
                  {receipts.length !== groups.length && (
                    <span className="text-gray-400"> · {receipts.length} months</span>
                  )}
                </span>
              </div>
              {pendingList.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock size={14} className="text-orange-400" />
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold text-orange-600">
                    {currency}{totalPending.toLocaleString('en-IN')}
                  </span>
                  <span className="text-gray-400 text-xs">({pendingList.length} entr{pendingList.length !== 1 ? 'ies' : 'y'})</span>
                </div>
              )}
            </div>

            {flat.notes && (
              <div className="px-4 sm:px-6 py-3">
                <p className="text-xs text-gray-400 italic">{flat.notes}</p>
              </div>
            )}
          </div>

          {/* ── Pending Section ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 gap-2">
              <div>
                <h3 className="font-semibold text-[#1a1a2e] text-base sm:text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Pending Payments
                </h3>
                {pendingList.length > 0 && (
                  <p className="text-xs text-orange-500 mt-0.5">
                    {pendingList.length} entr{pendingList.length !== 1 ? 'ies' : 'y'} · {currency}{totalPending.toLocaleString('en-IN')} due
                  </p>
                )}
              </div>
              <button
                onClick={() => setAddPendingOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-orange-50 text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} /> Add Pending
              </button>
            </div>

            {pendingList.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending entries for this flat.</p>
                <button
                  onClick={() => setAddPendingOpen(true)}
                  className="text-[#b8861f] text-sm font-medium hover:underline mt-1 inline-block"
                >
                  Add one →
                </button>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-gray-50 md:hidden">
                  {pendingList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-orange-50 flex items-center justify-center">
                          <Clock size={14} className="text-orange-400" />
                        </div>
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
                          onClick={() => setConfirmPendingId(p.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-orange-50/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Due</span>
                    <span className="text-sm font-bold text-orange-600">{currency}{totalPending.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                      <tr>
                        <th className="text-left px-6 py-3">Month</th>
                        <th className="text-right px-6 py-3">Amount Due</th>
                        <th className="text-left px-6 py-3">Notes</th>
                        <th className="text-right px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingList.map((p) => (
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
                              onClick={() => setConfirmPendingId(p.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-100 bg-orange-50/50">
                        <td colSpan={3} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Due</td>
                        <td className="px-6 py-3 text-right font-bold text-orange-600">
                          {currency}{totalPending.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ── Receipt History ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 gap-2">
              <h3 className="font-semibold text-[#1a1a2e] text-base sm:text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                Receipt History
              </h3>
              <div className="flex gap-2 flex-wrap justify-end">
                {receipts.length > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadAll} className="hidden sm:flex items-center gap-1.5">
                    <Download size={14} /> Download All
                  </Button>
                )}
                <Link href={`/receipts/new?flatId=${id}`}>
                  <Button size="sm" className="flex items-center gap-1.5">
                    <Plus size={14} />
                    <span className="hidden sm:inline">New Receipt</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </Link>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No receipts yet for this flat.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="flex flex-col divide-y divide-gray-50 md:hidden">
                  {groups.map((g) => (
                    <div key={g.receiptNumber} className="px-4 py-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0"><MonthBadges months={g.months} /></div>
                          <span className="font-bold text-[#1a1a2e] text-sm shrink-0">
                            {currency}{g.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
                          <span className="capitalize">{g.modeOfPayment}</span>
                          {g.paymentDate && <span>· {formatDate(g.paymentDate)}</span>}
                          {g.receiptNumber && <span className="font-mono">· #{g.receiptNumber}</span>}
                        </div>
                        {g.remarks && <p className="text-xs text-gray-400 italic truncate">{g.remarks}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditGroup(g)} className="p-2 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => downloadGroup(g)} className="p-2 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors">
                          <Download size={15} />
                        </button>
                        <button onClick={() => setConfirmGroup(g)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3">
                    <button onClick={downloadAll} className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[#b8861f] font-medium border border-[#e2b04a]/40 rounded-xl hover:bg-[#fdf6ec] transition-colors">
                      <Download size={14} /> Download All Receipts
                    </button>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                      <tr>
                        <th className="text-left px-6 py-3">Receipt No</th>
                        <th className="text-left px-6 py-3">Month(s)</th>
                        <th className="text-right px-6 py-3">Amount</th>
                        <th className="text-left px-6 py-3">Mode</th>
                        <th className="text-left px-6 py-3">Date</th>
                        <th className="text-left px-6 py-3">Remarks</th>
                        <th className="text-right px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g.receiptNumber} className="border-t border-gray-50 hover:bg-[#fdf6ec]/40 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-gray-500">{g.receiptNumber}</td>
                          <td className="px-6 py-3 font-medium text-[#1a1a2e]"><MonthBadges months={g.months} /></td>
                          <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                            {currency}{g.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3 text-gray-500 capitalize">{g.modeOfPayment}</td>
                          <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(g.paymentDate)}</td>
                          <td className="px-6 py-3 text-gray-400 text-xs max-w-[140px] truncate">{g.remarks || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditGroup(g)} className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors" title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => downloadGroup(g)} className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors" title="Download PDF">
                                <Download size={13} />
                              </button>
                              <button onClick={() => setConfirmGroup(g)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Edit Flat Modal */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Flat" size="md">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Flat Number *" value={form.flatNumber || ''} onChange={(e) => set('flatNumber', e.target.value)} required />
              <Input label="Floor" value={form.floor || ''} onChange={(e) => set('floor', e.target.value)} />
            </div>
            <Input label="Owner / Resident Name *" value={form.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Flat Type" value={form.type || ''} onChange={(e) => set('type', e.target.value)}>
                <option value="">Select</option>
                {FLAT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Select label="Ownership" value={form.ownershipType || 'owner'} onChange={(e) => set('ownershipType', e.target.value)}>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
            </div>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}