'use client';
// app/flats/[id]/page.jsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import {Input, Select} from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { useFirestore } from '../../../hooks/useFirestore';
import { downloadReceiptPDF } from '../../../lib/pdf';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Building2, Pencil, FileText,
  Download, Trash2, Plus, IndianRupee
} from 'lucide-react';

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Commercial'];

export default function FlatDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getFlat, updateFlat, deleteFlat, getReceipts, deleteReceipt, getSettings } = useFirestore();
  const [flat, setFlat] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [f, r, s] = await Promise.all([
      getFlat(id),
      getReceipts(id),
      getSettings(),
    ]);
    setFlat(f);
    setReceipts(r);
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

  const handleDeleteFlat = async () => {
    if (!confirm('Delete this flat and all its data? This cannot be undone.')) return;
    try {
      await deleteFlat(id);
      toast.success('Flat deleted');
      router.replace('/flats');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!confirm('Delete this receipt?')) return;
    try {
      await deleteReceipt(receiptId);
      toast.success('Receipt deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const downloadSingle = (receipt) => {
    downloadReceiptPDF(settings || {}, flat, [receipt],
      `receipt_${flat.flatNumber}_${receipt.month?.replace(' ', '_')}.pdf`);
  };

  const downloadAll = () => {
    if (!receipts.length) return;
    downloadReceiptPDF(settings || {}, flat, [...receipts].reverse(),
      `all_receipts_${flat.flatNumber}.pdf`);
  };

  const currency = settings?.currency || '₹';
  const total = receipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout title="Flat Details">
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!flat) {
    return (
      <ProtectedRoute>
        <Layout title="Flat Not Found">
          <div className="text-center py-20">
            <p className="text-gray-400">Flat not found.</p>
            <Link href="/flats" className="text-[#b8861f] hover:underline text-sm mt-2 inline-block">
              ← Back to Flats
            </Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout title={`Flat ${flat.flatNumber}`}>
        <div className="max-w-4xl space-y-6">
          {/* Back */}
          <Link href="/flats" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#b8861f]">
            <ArrowLeft size={16} /> All Flats
          </Link>

          {/* Flat info card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#1a1a2e] px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#e2b04a] rounded-xl flex items-center justify-center">
                  <span className="text-[#1a1a2e] font-bold text-lg font-mono">{flat.flatNumber}</span>
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {flat.ownerName}
                  </h2>
                  <div className="flex gap-2 mt-1">
                    {flat.type && <Badge color="gray">{flat.type}</Badge>}
                    <Badge color={flat.ownershipType === 'owner' ? 'gold' : 'blue'}>
                      {flat.ownershipType === 'owner' ? 'Owner' : 'Tenant'}
                    </Badge>
                    {flat.floor && <Badge color="gray">Floor {flat.floor}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openEdit}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={handleDeleteFlat}
                  className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <IndianRupee size={14} className="text-gray-400" />
                Total Paid: <span className="font-semibold text-[#1a1a2e]">{currency}{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={14} className="text-gray-400" />
                {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
              </div>
            </div>
            {flat.notes && (
              <div className="px-6 pb-5">
                <p className="text-xs text-gray-400 italic">{flat.notes}</p>
              </div>
            )}
          </div>

          {/* Receipt History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Receipt History
              </h3>
              <div className="flex gap-2">
                {receipts.length > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadAll}>
                    <Download size={14} /> Download All
                  </Button>
                )}
                <Link href={`/receipts/new?flatId=${id}`}>
                  <Button size="sm">
                    <Plus size={14} /> New Receipt
                  </Button>
                </Link>
              </div>
            </div>

            {receipts.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No receipts yet for this flat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                    <tr>
                      <th className="text-left px-6 py-3">Receipt No</th>
                      <th className="text-left px-6 py-3">Month</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Mode</th>
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-left px-6 py-3">Remarks</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} className="border-t border-gray-50 table-row-hover">
                        <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.receiptNumber}</td>
                        <td className="px-6 py-3 font-medium text-[#1a1a2e]">{r.month}</td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                          {currency}{Number(r.paidAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3 text-gray-500 capitalize">{r.modeOfPayment}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{r.paymentDate || '—'}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs max-w-[140px] truncate">{r.remarks || '—'}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => downloadSingle(r)}
                              className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteReceipt(r.id)}
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

        {/* Edit Modal */}
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