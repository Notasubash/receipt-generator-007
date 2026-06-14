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
  Download, Trash2, Plus, IndianRupee, X, AlertTriangle
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

function groupByReceiptNumber(receipts) {
  const map = new Map();
  receipts.forEach((r) => {
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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
          >
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

export default function FlatDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getFlat, updateFlat, deleteFlat, getAllReceiptsByFlat, getReceipts, deleteReceipt, updateReceipt, getSettings } = useFirestore();
  const [flat, setFlat]               = useState(null);
  const [receipts, setReceipts]       = useState([]);
  const [settings, setSettings]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editOpen, setEditOpen]       = useState(false);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [editGroup, setEditGroup]     = useState(null);
  const [confirmFlat, setConfirmFlat] = useState(false);
  const [confirmGroup, setConfirmGroup] = useState(null);

// in load()
const load = async () => {
  const [f, r, s] = await Promise.all([getFlat(id), getAllReceiptsByFlat(id), getSettings()]);
  setFlat(f);
  setReceipts(r);   // r is now always a plain array
  setSettings(s);
  setLoading(false);
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

  // Opens the styled confirm dialog instead of native confirm()
  const handleDeleteFlat = () => {
    setConfirmFlat(true);
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

  // Opens the styled confirm dialog instead of native confirm()
  const handleDeleteGroup = (group) => {
    setConfirmGroup(group);
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

  const downloadGroup = (group) => {
    downloadReceiptPDF(settings || {}, flat, group.rows,
      `receipt_${flat.flatNumber}_${group.receiptNumber}.pdf`);
  };

  const downloadAll = () => {
    if (!receipts.length) return;
    downloadReceiptPDF(settings || {}, flat, [...receipts].reverse(),
      `all_receipts_${flat.flatNumber}.pdf`);
  };

  const currency = settings?.currency || '₹';
  const total    = receipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
  const groups   = groupByReceiptNumber(receipts);

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

          {editGroup && (
            <EditReceiptModal
              group={editGroup}
              currency={currency}
              onSave={handleEditSave}
              onClose={() => setEditGroup(null)}
            />
          )}

          {/* Flat info card */}
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
                  <button onClick={handleDeleteFlat} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

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
            </div>

            {flat.notes && (
              <div className="px-4 sm:px-6 py-3">
                <p className="text-xs text-gray-400 italic">{flat.notes}</p>
              </div>
            )}
          </div>

          {/* Receipt History */}
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
{g.paymentDate && <span>· {formatDate(g.paymentDate)}</span>}                          {g.receiptNumber && <span className="font-mono">· #{g.receiptNumber}</span>}
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
                        <button onClick={() => handleDeleteGroup(g)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
<td className="px-6 py-3 text-gray-400 text-xs">{formatDate(g.paymentDate)}</td>                          <td className="px-6 py-3 text-gray-400 text-xs max-w-[140px] truncate">{g.remarks || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditGroup(g)} className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors" title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => downloadGroup(g)} className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors" title="Download PDF">
                                <Download size={13} />
                              </button>
                              <button onClick={() => handleDeleteGroup(g)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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