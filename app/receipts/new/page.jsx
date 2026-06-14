'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Button from '../../../components/ui/Button';
import { useFirestore } from '../../../hooks/useFirestore';
import { downloadReceiptPDF } from '../../../lib/pdf';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, FileDown, Save, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { format, addMonths, parse } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';

const RECEIPT_START = 1739;
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

const blankEntry = () => ({
  month: format(new Date(), 'MMMM yyyy'),
  paidAmount: '',
  modeOfPayment: 'Cash',
  paymentDate: format(new Date(), 'yyyy-MM-dd'),
  remarks: '',
});

function getNextReceiptNumber(existingReceipts) {
  if (!existingReceipts || existingReceipts.length === 0) return RECEIPT_START;
  const max = existingReceipts.reduce((highest, r) => {
    const n = parseInt(r.receiptNumber, 10);
    return isNaN(n) ? highest : Math.max(highest, n);
  }, RECEIPT_START - 1);
  return Math.max(max + 1, RECEIPT_START);
}

function NewReceiptPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getFlats, getReceipts, addReceipt, getSettings, getPendingFlats, deletePendingFlat } = useFirestore();
  const { user } = useAuth();
  const [flats, setFlats]                   = useState([]);
  const [settings, setSettings]             = useState(null);
  const [nextReceiptNo, setNextReceiptNo]   = useState(RECEIPT_START);
  const [selectedFlatId, setSelectedFlatId] = useState(searchParams.get('flatId') || '');
  const [flatSearchQ, setFlatSearchQ]       = useState('');
  const [flatDropdown, setFlatDropdown]     = useState(false);
  const [selectedFlat, setSelectedFlat]     = useState(null);
  const [entries, setEntries]               = useState([blankEntry()]);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [savedReceipts, setSavedReceipts]   = useState([]);
  const [flatReceiptMonths, setFlatReceiptMonths]   = useState(new Set());
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([getFlats(), getReceipts(), getSettings()]).then(([f, allReceipts, s]) => {
      setFlats(f);
      setSettings(s);
      setNextReceiptNo(getNextReceiptNumber(allReceipts));
      if (s?.maintenanceAmount) {
        setEntries([{ ...blankEntry(), paidAmount: s.maintenanceAmount }]);
      }
      const preId = searchParams.get('flatId');
      if (preId) {
        const found = f.find((fl) => fl.id === preId);
        if (found) {
          setSelectedFlat(found);
          setSelectedFlatId(found.id);
          setFlatSearchQ(found.flatNumber);
          loadFlatReceiptMonths(found.id, allReceipts);
        }
      }
    });
  }, [user]);

  const loadFlatReceiptMonths = useCallback(async (flatId, cachedReceipts = null) => {
    setCheckingDuplicates(true);
    try {
      const allReceipts = cachedReceipts ?? await getReceipts();
      const months = new Set(
        allReceipts.filter((r) => r.flatId === flatId).map((r) => r.month)
      );
      setFlatReceiptMonths(months);
    } catch (err) {
      console.error('Failed to load flat receipts', err);
    } finally {
      setCheckingDuplicates(false);
    }
  }, [getReceipts]);

  const filteredFlats = flats.filter((f) =>
    f.flatNumber?.toLowerCase().includes(flatSearchQ.toLowerCase()) ||
    f.ownerName?.toLowerCase().includes(flatSearchQ.toLowerCase())
  );

  const handleFlatSelect = (flat) => {
    setSelectedFlat(flat);
    setSelectedFlatId(flat.id);
    setFlatSearchQ(flat.flatNumber);
    setFlatDropdown(false);
    loadFlatReceiptMonths(flat.id);
  };

  const clearFlat = () => {
    setSelectedFlat(null);
    setSelectedFlatId('');
    setFlatSearchQ('');
    setFlatReceiptMonths(new Set());
  };

  const updateEntry = (idx, key, value) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [key]: value } : e));
  };

  const addEntry = () => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      let nextMonth = last.month;
      try {
        const d = parse(last.month, 'MMMM yyyy', new Date());
        nextMonth = format(addMonths(d, 1), 'MMMM yyyy');
      } catch { }
      return [
        ...prev,
        {
          ...blankEntry(),
          month: nextMonth,
          paidAmount: last.paidAmount,
          modeOfPayment: last.modeOfPayment,
        },
      ];
    });
  };

  const removeEntry = (idx) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const getDuplicateInfo = () => {
    const seenInForm = new Map();
    return entries.map((entry, idx) => {
      const month = entry.month;
      if (flatReceiptMonths.has(month)) {
        return { type: 'firestore', message: `Receipt for ${month} already exists for this flat.` };
      }
      if (seenInForm.has(month)) {
        return { type: 'form', message: `${month} is already added in entry #${seenInForm.get(month) + 1}.` };
      }
      seenInForm.set(month, idx);
      return null;
    });
  };

  const duplicateInfo = getDuplicateInfo();
  const hasDuplicates = duplicateInfo.some(Boolean);

  const handleSaveAndDownload = async (download = false) => {
    if (!selectedFlat) { toast.error('Please select a flat'); return; }
    const invalid = entries.find((e) => !e.month || !e.paidAmount);
    if (invalid) { toast.error('Please fill month and amount for all entries'); return; }
    if (hasDuplicates) {
      const dupes = entries.filter((_, i) => duplicateInfo[i]).map((e) => e.month);
      toast.error(`Duplicate receipt${dupes.length > 1 ? 's' : ''}: ${dupes.join(', ')}. Remove or change the month before saving.`);
      return;
    }

    setSaving(true);
    try {
      // ── Single receipt number for the entire batch ──────────────
      const receiptNumber = String(nextReceiptNo);
      const created = [];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        await addReceipt({
          flatId: selectedFlat.id,
          flatNumber: selectedFlat.flatNumber,
          ownerName: selectedFlat.ownerName,
          email: selectedFlat.email || '',
          phone: selectedFlat.phone || '',
          receiptNumber, // same for all entries in this batch
          ...entry,
        });
        created.push({ ...entry, receiptNumber });
      }

      // ── Auto-delete matching pending entries ──────────────────────
      try {
        const allPending = await getPendingFlats();
        const matchingPending = allPending.filter(
          (p) => p.flatId === selectedFlat.id && created.some((c) => c.month === p.month)
        );
        if (matchingPending.length > 0) {
          await Promise.all(matchingPending.map((p) => deletePendingFlat(p.id)));
          toast.success(
            `Cleared ${matchingPending.length} pending entr${matchingPending.length > 1 ? 'ies' : 'y'} automatically`
          );
        }
      } catch (err) {
        // Pending cleanup failure should never block the main save flow
        console.warn('Could not clean up pending entries:', err);
      }
      // ─────────────────────────────────────────────────────────────

      setSavedReceipts(created);
      setSaved(true);
      toast.success(`${entries.length} receipt${entries.length > 1 ? 's' : ''} saved!`);

      if (download) {
        downloadReceiptPDF(
          settings || {},
          selectedFlat,
          created,
          `receipts_${selectedFlat.flatNumber}_${Date.now()}.pdf`,
          nextReceiptNo
        );
      }
    } catch (err) {
      toast.error('Failed to save receipts');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSaved = () => {
    if (!savedReceipts.length || !selectedFlat) return;
    downloadReceiptPDF(
      settings || {},
      selectedFlat,
      savedReceipts,
      `receipts_${selectedFlat.flatNumber}_${Date.now()}.pdf`,
      nextReceiptNo
    );
  };

  const resetForm = () => {
    setSaved(false);
    setSavedReceipts([]);
    setSelectedFlat(null);
    setSelectedFlatId('');
    setFlatSearchQ('');
    setEntries([blankEntry()]);
    setFlatReceiptMonths(new Set());
    // ── Only increment by 1 since the whole batch used one receipt number ──
    setNextReceiptNo((prev) => prev + 1);
  };

  const currency = settings?.currency || '₹';

  return (
    <ProtectedRoute>
      <Layout title="New Receipt">
        <div className="max-w-3xl space-y-6">
          <Link href="/receipts" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#b8861f]">
            <ArrowLeft size={16} /> All Receipts
          </Link>

          {saved ? (
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                {savedReceipts.length > 1
                  ? `${savedReceipts.length} Months Saved!`
                  : 'Receipt Saved!'}
              </h2>
              <p className="text-gray-400 text-sm mb-1">
                For {selectedFlat?.ownerName} · Flat {selectedFlat?.flatNumber}
              </p>
              <p className="text-xs text-[#b8861f] font-mono mb-6">
                Receipt No. {savedReceipts[0].receiptNumber}
                {savedReceipts.length > 1 && (
                  <span className="text-gray-400 ml-1">
                    · {savedReceipts[0].month} → {savedReceipts[savedReceipts.length - 1].month}
                  </span>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleDownloadSaved} variant="secondary">
                  <FileDown size={16} /> Download PDF
                </Button>
                <Button onClick={resetForm} variant="outline">
                  <Plus size={16} /> New Receipt
                </Button>
                <Link href={`/flats/${selectedFlat?.id}`}>
                  <Button variant="ghost">View Flat →</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Flat selector */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="font-semibold text-[#1a1a2e] text-sm uppercase tracking-wide text-[#555577]">
                  Select Flat
                </h3>
                <div className="relative">
                  <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide block mb-1">
                    Flat Number / Owner Name
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={flatSearchQ}
                        onChange={(e) => { setFlatSearchQ(e.target.value); setFlatDropdown(true); }}
                        onFocus={() => setFlatDropdown(true)}
                        onBlur={() => setTimeout(() => setFlatDropdown(false), 150)}
                        placeholder="Type flat number or owner name..."
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                      />
                      {flatDropdown && filteredFlats.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                          {filteredFlats.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onMouseDown={() => handleFlatSelect(f)}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#fdf0d5] flex items-center justify-between text-sm"
                            >
                              <span className="font-semibold text-[#1a1a2e]">{f.ownerName}</span>
                              <span className="text-gray-500">{f.flatNumber}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedFlat && (
                      <button onClick={clearFlat} className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {selectedFlat && (
                  <div className="bg-[#fdf6ec] rounded-xl p-4 border border-[#e2b04a]/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Flat No</p>
                        <p className="font-semibold text-[#1a1a2e] font-mono">{selectedFlat.flatNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Owner</p>
                        <p className="font-semibold text-[#1a1a2e]">{selectedFlat.ownerName}</p>
                      </div>
                      {selectedFlat.phone && (
                        <div>
                          <p className="text-xs text-gray-400">Phone</p>
                          <p className="text-[#1a1a2e]">{selectedFlat.phone}</p>
                        </div>
                      )}
                      {selectedFlat.type && (
                        <div>
                          <p className="text-xs text-gray-400">Type</p>
                          <p className="text-[#1a1a2e]">{selectedFlat.type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedFlat && flatReceiptMonths.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-gray-400 self-center">Already paid:</span>
                    {[...flatReceiptMonths].sort().map((m) => (
                      <span key={m} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Next receipt number preview */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-gray-400">Receipt number for this batch:</span>
                <span className="text-xs font-mono font-semibold text-[#b8861f] bg-[#fdf6ec] px-2 py-0.5 rounded-lg border border-[#e2b04a]/30">
                  {nextReceiptNo}
                </span>
                {entries.length > 1 && (
                  <span className="text-xs text-gray-400">— shared across all {entries.length} months</span>
                )}
              </div>

              {/* Receipt entries */}
              <div className="space-y-4">
                {entries.map((entry, idx) => {
                  const dupInfo = duplicateInfo[idx];
                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-2xl border shadow-sm p-6 transition-colors ${
                        dupInfo ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dupInfo ? 'bg-red-500' : 'bg-[#1a1a2e]'}`}>
                            {dupInfo
                              ? <AlertTriangle size={13} className="text-white" />
                              : <span className="text-[#e2b04a] text-xs font-bold">{idx + 1}</span>
                            }
                          </div>
                          <span className="text-sm font-semibold text-[#1a1a2e]">
                            {entry.month || 'Receipt Entry'}
                          </span>
                          {/* All entries share the same receipt number */}
                          <span className="text-xs font-mono text-gray-400">#{nextReceiptNo}</span>
                        </div>
                        {entries.length > 1 && (
                          <button
                            onClick={() => removeEntry(idx)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {dupInfo && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          <span>{dupInfo.message} Please change the month or remove this entry.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Month *</label>
                          <input
                            type="month"
                            value={toMonthInput(entry.month)}
                            onChange={(e) => updateEntry(idx, 'month', fromMonthInput(e.target.value))}
                            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-colors ${
                              dupInfo
                                ? 'border-red-300 focus:border-red-400 focus:ring-red-200 bg-red-50'
                                : 'border-gray-200 focus:border-[#e2b04a] focus:ring-[#e2b04a]/20'
                            }`}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">
                            Amount ({currency}) *
                          </label>
                          <input
                            type="number"
                            value={entry.paidAmount}
                            onChange={(e) => updateEntry(idx, 'paidAmount', e.target.value)}
                            placeholder="1500"
                            min="0"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Mode of Payment</label>
                          <select
                            value={entry.modeOfPayment}
                            onChange={(e) => updateEntry(idx, 'modeOfPayment', e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                          >
                            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Payment Date</label>
                          <input
                            type="date"
                            value={entry.paymentDate}
                            onChange={(e) => updateEntry(idx, 'paymentDate', e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Remarks</label>
                          <input
                            value={entry.remarks}
                            onChange={(e) => updateEntry(idx, 'remarks', e.target.value)}
                            placeholder="Optional note..."
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addEntry}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-[#e2b04a] hover:text-[#b8861f] hover:bg-[#fdf6ec] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Another Month
              </button>

              <div className={`rounded-2xl p-6 text-white transition-colors ${hasDuplicates ? 'bg-red-900' : 'bg-[#1a1a2e]'}`}>
                {hasDuplicates && (
                  <div className="flex items-center gap-2 bg-red-700/50 border border-red-500/40 rounded-xl px-4 py-2.5 mb-4 text-sm">
                    <AlertTriangle size={15} className="shrink-0 text-red-300" />
                    <span className="text-red-100">
                      {duplicateInfo.filter(Boolean).length} duplicate month{duplicateInfo.filter(Boolean).length > 1 ? 's' : ''} detected.
                      Fix the highlighted entries before saving.
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[#8888aa] text-xs mb-1">
                      {entries.length} month{entries.length > 1 ? 's' : ''} · {selectedFlat?.ownerName || 'No flat selected'}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {currency}{entries.reduce((s, e) => s + Number(e.paidAmount || 0), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right text-[#8888aa] text-sm">
                    {entries.length > 1 && (
                      <p>{entries[0].month} → {entries[entries.length - 1].month}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleSaveAndDownload(false)}
                    disabled={saving || !selectedFlat || hasDuplicates || checkingDuplicates}
                    variant="outline"
                    size="lg"
                    className="flex-1 border-white/20 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : checkingDuplicates ? 'Checking...' : 'Save Only'}
                  </Button>
                  <Button
                    onClick={() => handleSaveAndDownload(true)}
                    disabled={saving || !selectedFlat || hasDuplicates || checkingDuplicates}
                    size="lg"
                    className="flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileDown size={16} />
                    {saving ? 'Saving...' : checkingDuplicates ? 'Checking...' : 'Save & Download PDF'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

export default function NewReceiptPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading...</div>}>
      <NewReceiptPageInner />
    </Suspense>
  );
}