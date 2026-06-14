'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Button from '../../components/ui/Button';
import { useFirestore } from '../../hooks/useFirestore';
import { downloadReceiptPDF } from '../../lib/pdf';
import toast from 'react-hot-toast';
import { Plus, Search, Download, Trash2, FileText, AlertTriangle, X, Pencil } from 'lucide-react';
import { format, parse } from 'date-fns';

const MODES = ['Cash', 'Bank Transfer'];

const formatDate = (str) => {
  if (!str) return '—';
  try { return format(parse(str, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy'); }
  catch { return str; }
};

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

function groupByReceiptNumber(receipts) {
  const map = new Map();
  (receipts ?? []).forEach((r) => {
    const key = r.receiptNumber || r.id;
    if (!map.has(key)) {
      map.set(key, {
        receiptNumber: r.receiptNumber,
        flatId: r.flatId,
        flatNumber: r.flatNumber,
        ownerName: r.ownerName,
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
  if (months.length === 1) return <span className="text-gray-600">{months[0]}</span>;
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
            <h3 className="font-semibold text-[#1a1a2e] text-base mb-1">Delete Receipt</h3>
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
              #{group.receiptNumber} · {group.flatNumber} · {group.ownerName}
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
                  <p className="text-xs font-semibold text-[#555577] uppercase tracking-wide">
                    Entry {i + 1}
                  </p>
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
              {saving ? 'Saving...' : 'Update Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { getReceipts, deleteReceipt, updateReceipt, getSettings, getFlats } = useFirestore();

  const [groups, setGroups]             = useState([]);
  const [flatsMap, setFlatsMap]         = useState({});
  const [settings, setSettings]         = useState(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [confirmGroup, setConfirmGroup] = useState(null);
  const [editGroup, setEditGroup]       = useState(null);

  const loadAll = async () => {
    setLoading(true);
    const [receipts, flats, s] = await Promise.all([
      getReceipts(),
      getFlats(),
      getSettings(),
    ]);
    const map = {};
    flats.forEach((f) => { map[f.id] = f; });
    setFlatsMap(map);
    setSettings(s);
    setGroups(groupByReceiptNumber(receipts));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = search.trim()
    ? groups.filter((g) => {
        const q = search.toLowerCase();
        return (
          g.flatNumber?.toLowerCase().includes(q) ||
          g.ownerName?.toLowerCase().includes(q)  ||
          g.receiptNumber?.toLowerCase().includes(q) ||
          g.months.some((m) => m.toLowerCase().includes(q))
        );
      })
    : groups;

  const handleDeleteConfirmed = async () => {
    try {
      await Promise.all(confirmGroup.ids.map((id) => deleteReceipt(id)));
      toast.success('Receipt deleted');
      await loadAll();
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
      await loadAll();
    } catch {
      toast.error('Failed to update receipt');
    }
  };

  const handleDownload = (group) => {
    const flat = flatsMap[group.flatId] || { flatNumber: group.flatNumber, ownerName: group.ownerName };
    downloadReceiptPDF(settings || {}, flat, group.rows, `receipt_${group.receiptNumber}.pdf`);
  };

  const currency = settings?.currency || '₹';
  const total    = filtered.reduce((s, g) => s + g.totalAmount, 0);

  return (
    <ProtectedRoute>
      <Layout title="Receipts">
        <div className="max-w-6xl space-y-6">

          <ConfirmDialog
            open={confirmGroup !== null}
            message={
              confirmGroup?.ids.length > 1
                ? `This will delete all ${confirmGroup.ids.length} month entries under receipt #${confirmGroup.receiptNumber}. This cannot be undone.`
                : 'This action cannot be undone. Are you sure you want to delete this receipt?'
            }
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setConfirmGroup(null)}
          />

          {editGroup && (
            <EditReceiptModal
              group={editGroup}
              currency={currency}
              onSave={handleEditSave}
              onClose={() => setEditGroup(null)}
            />
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipts..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none bg-white"
              />
            </div>
            <Link href="/receipts/new">
              <Button><Plus size={16} /> New Receipt</Button>
            </Link>
          </div>

          {/* Summary */}
          {groups.length > 0 && (
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[#1a1a2e]">
                <span className="font-semibold">{filtered.length}</span>
                <span className="text-gray-400"> receipts</span>
              </span>
              <span className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[#1a1a2e]">
                <span className="font-semibold">{currency}{total.toLocaleString('en-IN')}</span>
                <span className="text-gray-400"> total</span>
              </span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText size={36} className="mx-auto mb-3 opacity-25" />
                <p className="font-medium">
                  {search ? 'No receipts match your search' : 'No receipts found'}
                </p>
                {!search && (
                  <Link href="/receipts/new" className="text-[#b8861f] text-sm hover:underline mt-1 inline-block">
                    Generate your first receipt
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                    <tr>
                      <th className="text-left px-6 py-3">Receipt No</th>
                      <th className="text-left px-6 py-3">Owner</th>
                      <th className="text-left px-6 py-3">Month(s)</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Mode</th>
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g) => (
                      <tr key={g.receiptNumber} className="border-t border-gray-50 hover:bg-[#fdf6ec]/40 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-gray-400">{g.receiptNumber}</td>
                        <td className="px-6 py-3 font-semibold text-[#1a1a2e] hover:text-[#b8861f] font-mono">
                          <Link href={`/flats/${g.flatId}`}>
                            {g.flatNumber} - {g.ownerName}
                          </Link>
                        </td>
                        <td className="px-6 py-3"><MonthBadges months={g.months} /></td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                          {currency}{g.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3 text-gray-500 capitalize">{g.modeOfPayment}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(g.paymentDate)}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditGroup(g)}
                              className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDownload(g)}
                              className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmGroup(g)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}