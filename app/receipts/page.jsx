'use client';
// app/receipts/page.jsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Button from '../../components/ui/Button';
import { useFirestore } from '../../hooks/useFirestore';
import { downloadReceiptPDF } from '../../lib/pdf';
import toast from 'react-hot-toast';
import { Plus, Search, Download, Trash2, FileText, AlertTriangle, X } from 'lucide-react';

// ── Custom confirmation dialog ─────────────────────────────────────────────
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

export default function ReceiptsPage() {
  const { getReceipts, deleteReceipt, getSettings, getFlats } = useFirestore();
  const [receipts, setReceipts]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [flatsMap, setFlatsMap]     = useState({});
  const [settings, setSettings]     = useState(null);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [confirmId, setConfirmId]   = useState(null); // receipt id pending delete

  const load = async () => {
    const [r, flats, s] = await Promise.all([getReceipts(), getFlats(), getSettings()]);
    const map = {};
    flats.forEach((f) => { map[f.id] = f; });
    setFlatsMap(map);
    setReceipts(r);
    setFiltered(r);
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(receipts.filter((r) =>
      r.flatNumber?.toLowerCase().includes(q) ||
      r.ownerName?.toLowerCase().includes(q) ||
      r.month?.toLowerCase().includes(q) ||
      r.receiptNumber?.toLowerCase().includes(q)
    ));
  }, [search, receipts]);

  const handleDeleteConfirmed = async () => {
    try {
      await deleteReceipt(confirmId);
      toast.success('Receipt deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmId(null);
    }
  };

  const handleDownload = (r) => {
    const flat = flatsMap[r.flatId] || { flatNumber: r.flatNumber, ownerName: r.ownerName };
    downloadReceiptPDF(settings || {}, flat, [r], `receipt_${r.receiptNumber}.pdf`);
  };

  const currency = settings?.currency || '₹';
  const total    = filtered.reduce((s, r) => s + Number(r.paidAmount || 0), 0);

  return (
    <ProtectedRoute>
      <Layout title="Receipts">
        <div className="max-w-6xl space-y-6">

          {/* Custom confirm dialog */}
          <ConfirmDialog
            open={confirmId !== null}
            message="This action cannot be undone. Are you sure you want to delete this receipt?"
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setConfirmId(null)}
          />

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
          {filtered.length > 0 && (
            <div className="flex gap-4 text-sm">
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
                <p className="font-medium">No receipts found</p>
                <Link href="/receipts/new" className="text-[#b8861f] text-sm hover:underline mt-1 inline-block">
                  Generate your first receipt
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                    <tr>
                      <th className="text-left px-6 py-3">Receipt No</th>
                      <th className="text-left px-6 py-3">Flat</th>
                      <th className="text-left px-6 py-3">Owner</th>
                      <th className="text-left px-6 py-3">Month</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Mode</th>
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t border-gray-50 table-row-hover">
                        <td className="px-6 py-3 font-mono text-xs text-gray-400">{r.receiptNumber}</td>
                        <td className="px-6 py-3">
                          <Link href={`/flats/${r.flatId}`} className="font-semibold text-[#1a1a2e] hover:text-[#b8861f] font-mono">
                            {r.flatNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-700">{r.ownerName}</td>
                        <td className="px-6 py-3 text-gray-600">{r.month}</td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                          {currency}{Number(r.paidAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3 text-gray-500 capitalize">{r.modeOfPayment}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{r.paymentDate || '—'}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(r)}
                              className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmId(r.id)}
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